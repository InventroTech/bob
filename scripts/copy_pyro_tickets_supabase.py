#!/usr/bin/env python3
import os
import sys
import json
import logging
import time
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from pathlib import Path
import requests
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('pyro_ticket_copy_supabase.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class SupabaseTicketCopier:
    def __init__(self, source_url: str, source_key: str, staging_url: str, staging_key: str):
        """
        Initialize the Supabase ticket copier.
        
        Args:
            source_url: Supabase project URL for source
            source_key: Supabase anon key for source
            staging_url: Supabase project URL for staging
            staging_key: Supabase anon key for staging
        """
        self.source_url = source_url.rstrip('/')
        self.source_key = source_key
        self.staging_url = staging_url.rstrip('/')
        self.staging_key = staging_key
        
        # Default staging tenant ID
        self.staging_tenant_id = os.getenv('STAGING_TENANT_ID', 'e35e7279-d92d-4cdf-8014-98deaab639c0')
        

        
        # Configuration
        self.batch_size = int(os.getenv('BATCH_SIZE', '100'))
        self.max_retries = int(os.getenv('MAX_RETRIES', '3'))
        self.retry_delay = float(os.getenv('RETRY_DELAY', '1.0'))



    def _make_request(self, url: str, api_key: str, method: str = 'GET', data: Any = None) -> Any:
        """
        Make HTTP request to Supabase REST API.
        
        Args:
            url: Full URL to request
            api_key: Supabase anon key
            method: HTTP method
            data: Request data (for POST/PUT)
            
        Returns:
            Response data
            
        Raises:
            Exception: If request fails
        """
        headers = {
            'apikey': api_key,
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        
        for attempt in range(self.max_retries):
            try:
                if method.upper() == 'GET':
                    response = requests.get(url, headers=headers, timeout=30)
                elif method.upper() == 'POST':
                    response = requests.post(url, headers=headers, json=data, timeout=30)
                elif method.upper() == 'PUT':
                    response = requests.put(url, headers=headers, json=data, timeout=30)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                response.raise_for_status()
                
                # Handle empty responses
                if response.status_code == 204:
                    return None
                
                return response.json()
                
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                else:
                    raise Exception(f"Request failed after {self.max_retries} attempts: {e}")

    def fetch_tickets_from_source(self, limit: int = None) -> List[Dict[str, Any]]:
        """
        Fetch tickets from source Supabase project.
        
        Args:
            limit: Maximum number of tickets to fetch (None for all tickets)
            
        Returns:
            List of ticket data
        """
        all_tickets = []
        offset = 0
        page_size = 1000
        
        while True:
            if limit and len(all_tickets) >= limit:
                break
                
            current_limit = min(page_size, limit - len(all_tickets) if limit else page_size)
            url = f"{self.source_url}/rest/v1/support_ticket_dump?select=*&limit={current_limit}&offset={offset}"
            
            try:
                data = self._make_request(url, self.source_key, 'GET')
                if not data or len(data) == 0:
                    break
                    
                all_tickets.extend(data)
                logger.info(f"Fetched {len(data)} tickets (offset: {offset})")
                
                if len(data) < current_limit:
                    break  # No more data
                    
                offset += len(data)
                
            except Exception as e:
                logger.error(f"Failed to fetch tickets from source: {e}")
                break
        
        logger.info(f"Total fetched: {len(all_tickets)} tickets from source")
        return all_tickets



    def fetch_tickets_from_staging(self, limit: int = None) -> List[Dict[str, Any]]:
        """
        Fetch tickets from staging Supabase project.
        
        Args:
            limit: Maximum number of tickets to fetch (None for all tickets)
            
        Returns:
            List of ticket data
        """
        all_tickets = []
        offset = 0
        page_size = 1000
        
        while True:
            if limit and len(all_tickets) >= limit:
                break
                
            current_limit = min(page_size, limit - len(all_tickets) if limit else page_size)
            url = f"{self.staging_url}/rest/v1/support_ticket_dump?select=*&limit={current_limit}&offset={offset}"
            
            try:
                data = self._make_request(url, self.staging_key, 'GET')
                if not data or len(data) == 0:
                    break
                    
                all_tickets.extend(data)
                logger.info(f"Fetched {len(data)} tickets from staging (offset: {offset})")
                
                if len(data) < current_limit:
                    break  # No more data
                    
                offset += len(data)
                
            except Exception as e:
                logger.error(f"Failed to fetch tickets from staging: {e}")
                break
        
        logger.info(f"Total fetched: {len(all_tickets)} tickets from staging")
        return all_tickets

    def find_missing_tickets(self, source_tickets: List[Dict[str, Any]], staging_tickets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Find tickets that exist in source but not in staging.
        
        Args:
            source_tickets: List of tickets from source
            staging_tickets: List of tickets from staging
            
        Returns:
            List of tickets that need to be copied
        """
        # Create sets of ticket IDs for comparison
        source_ids = {ticket.get('id') for ticket in source_tickets if ticket.get('id')}
        staging_ids = {ticket.get('id') for ticket in staging_tickets if ticket.get('id')}
        
        # Find missing IDs
        missing_ids = source_ids - staging_ids
        
        # Get the full ticket data for missing tickets
        missing_tickets = [ticket for ticket in source_tickets if ticket.get('id') in missing_ids]
        
        logger.info(f"Missing tickets: {len(missing_tickets)}")
        
        return missing_tickets

    def transform_ticket_data(self, tickets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform ticket data for staging environment.
        
        Args:
            tickets: Raw ticket data from source
            
        Returns:
            Transformed ticket data for staging
        """
        transformed_tickets = []
        
        for ticket in tickets:
            # Create a copy of the ticket data
            transformed_ticket = ticket.copy()
            
            # Set tenant_id to staging tenant for all tickets
            transformed_ticket['tenant_id'] = self.staging_tenant_id
            
            # Add staging-specific fields
            transformed_ticket['is_processed'] = False
            transformed_ticket['dumped_at'] = datetime.now().isoformat()
            
            transformed_tickets.append(transformed_ticket)
        
        logger.info(f"Transformed {len(transformed_tickets)} tickets")
        return transformed_tickets

    def insert_tickets_to_staging(self, tickets: List[Dict[str, Any]]) -> int:
        """
        Insert transformed tickets into staging support_ticket_dump table.
        
        Args:
            tickets: List of transformed tickets
            
        Returns:
            Number of successfully inserted tickets
        """
        url = f"{self.staging_url}/rest/v1/support_ticket_dump"
        
        total_inserted = 0
        total_batches = (len(tickets) + self.batch_size - 1) // self.batch_size
        
        for i in range(0, len(tickets), self.batch_size):
            batch = tickets[i:i + self.batch_size]
            batch_num = (i // self.batch_size) + 1
            
            logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} tickets)")
            
            try:
                data = self._make_request(url, self.staging_key, 'POST', batch)
                inserted_count = len(data) if isinstance(data, list) else 1
                total_inserted += inserted_count
                
                logger.info(f"Batch {batch_num}: Inserted {inserted_count}/{len(batch)} tickets")
                
            except Exception as e:
                logger.error(f"Failed to insert batch {batch_num}: {e}")
                continue
        
        logger.info(f"Total inserted: {total_inserted}/{len(tickets)} tickets")
        return total_inserted

    def copy_tickets(self, limit: int = 1000, check_missing: bool = False) -> Dict[str, Any]:
        """
        Main method to copy tickets from source to staging.
        
        Args:
            limit: Maximum number of tickets to copy
            check_missing: If True, only copy tickets that don't exist in staging
            
        Returns:
            Summary of the copy operation
        """
        logger.info("Starting ticket copy process...")
        
        # Step 1: Fetch tickets from source
        source_tickets = self.fetch_tickets_from_source(limit)
        if not source_tickets:
            logger.warning("No tickets found in source")
            return {"success": False, "message": "No tickets found in source"}
        
        # Step 2: If checking for missing tickets, fetch staging tickets and compare
        tickets_to_copy = source_tickets
        if check_missing:
            staging_tickets = self.fetch_tickets_from_staging(None)
            tickets_to_copy = self.find_missing_tickets(source_tickets, staging_tickets)
            
            if not tickets_to_copy:
                logger.info("No missing tickets found")
                return {
                    "success": True,
                    "message": "No missing tickets to copy",
                    "source_count": len(source_tickets),
                    "inserted_count": 0
                }
        
        # Step 3: Transform tickets
        transformed_tickets = self.transform_ticket_data(tickets_to_copy)
        
        # Step 4: Insert tickets to staging
        inserted_count = self.insert_tickets_to_staging(transformed_tickets)
        
        # Step 5: Return summary
        success = inserted_count > 0
        message = f"Copied {inserted_count}/{len(tickets_to_copy)} tickets"
        
        logger.info(f"Copy process completed: {message}")
        
        return {
            "success": success,
            "message": message,
            "source_count": len(source_tickets),
            "inserted_count": inserted_count
        }

def load_config_from_file():
    """Load configuration from supabase-config.json file"""
    config_path = Path(__file__).parent.parent / "supabase-config.json"
    
    if not config_path.exists():
        return None
    
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return None

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description='Copy tickets from Pyro to staging Supabase')
    parser.add_argument('--source-url', help='Source Supabase project URL')
    parser.add_argument('--source-key', help='Source Supabase anon key')
    parser.add_argument('--staging-url', help='Staging Supabase project URL')
    parser.add_argument('--staging-key', help='Staging Supabase anon key')
    parser.add_argument('--limit', type=int, default=1000, help='Maximum tickets to copy')
    parser.add_argument('--config-file', action='store_true', help='Use configuration from supabase-config.json file')
    parser.add_argument('--check-missing', action='store_true', help='Only copy tickets that don\'t exist in staging')
    
    args = parser.parse_args()
    
    # Load configuration from file if requested or if no command line args provided
    config = None
    if args.config_file or (not args.source_url and not args.source_key and not args.staging_url and not args.staging_key):
        config = load_config_from_file()
        if not config:
            print("❌ Configuration file 'supabase-config.json' not found or invalid")
            print("Please create the file or provide command line arguments")
            sys.exit(1)
        
        # Use config file values
        source_url = config['source_url']
        source_key = config['source_key']
        staging_url = config['staging_url']
        staging_key = config['staging_key']
        
        # Override with command line args if provided
        if args.source_url:
            source_url = args.source_url
        if args.source_key:
            source_key = args.source_key
        if args.staging_url:
            staging_url = args.staging_url
        if args.staging_key:
            staging_key = args.staging_key
    else:
        # Use command line arguments
        if not args.source_url or not args.source_key or not args.staging_url or not args.staging_key:
            print("❌ All Supabase credentials are required when not using config file")
            parser.print_help()
            sys.exit(1)
        
        source_url = args.source_url
        source_key = args.source_key
        staging_url = args.staging_url
        staging_key = args.staging_key
    
    # Create copier instance
    copier = SupabaseTicketCopier(
        source_url=source_url,
        source_key=source_key,
        staging_url=staging_url,
        staging_key=staging_key
    )
    
    # If using config file, set the additional configuration
    if config:
        copier.staging_tenant_id = config.get('staging_tenant_id', copier.staging_tenant_id)
    
    # Execute copy operation
    result = copier.copy_tickets(args.limit, args.check_missing)
    
    # Print result
    if result["success"]:
        print(f"✅ {result['message']}")
        sys.exit(0)
    else:
        print(f"❌ {result['message']}")
        sys.exit(1)

if __name__ == "__main__":
    main() 