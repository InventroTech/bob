#!/usr/bin/env python3
"""
Alternative script to copy data from Pyro support ticket dump using Supabase client.
This approach uses Supabase's REST API instead of direct database connections.
"""

import os
import sys
import json
import logging
import time
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
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
        
        # Load mappings from environment or use defaults
        self.assigned_to_mapping = self._load_mapping_from_env('ASSIGNED_TO_MAPPING', {
            "admin@pyro.com": "admin@staging.com",
            "support@pyro.com": "support@staging.com",
        })
        
        self.tenant_id_mapping = self._load_mapping_from_env('TENANT_ID_MAPPING', {
            "pyro-tenant-1": "staging-tenant-1",
            "pyro-tenant-2": "staging-tenant-2",
        })
        
        # Configuration
        self.batch_size = int(os.getenv('BATCH_SIZE', '100'))
        self.max_retries = int(os.getenv('MAX_RETRIES', '3'))
        self.retry_delay = float(os.getenv('RETRY_DELAY', '1.0'))

    def _load_mapping_from_env(self, env_var: str, default_mapping: Dict[str, str]) -> Dict[str, str]:
        """Load mapping from environment variable or use default."""
        mapping_str = os.getenv(env_var)
        if mapping_str:
            try:
                return json.loads(mapping_str)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in {env_var}, using default mapping")
        return default_mapping

    def _make_request(self, url: str, key: str, method: str = 'GET', data: Dict = None) -> Dict:
        """Make a request to Supabase API with retry logic."""
        headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        
        for attempt in range(self.max_retries):
            try:
                if method == 'GET':
                    response = requests.get(url, headers=headers, timeout=30)
                elif method == 'POST':
                    response = requests.post(url, headers=headers, json=data, timeout=30)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.HTTPError as e:
                # Log detailed error information
                error_detail = ""
                try:
                    error_detail = response.text if 'response' in locals() else "No response body"
                except:
                    error_detail = "Could not read response body"
                
                logger.error(f"HTTP Error {e.response.status_code}: {error_detail}")
                
                if attempt == self.max_retries - 1:
                    raise
                logger.warning(f"Request attempt {attempt + 1} failed: {e}")
                time.sleep(self.retry_delay)
            except Exception as e:
                if attempt == self.max_retries - 1:
                    logger.error(f"Failed to make request after {self.max_retries} attempts: {e}")
                    raise
                logger.warning(f"Request attempt {attempt + 1} failed: {e}")
                time.sleep(self.retry_delay)

    def fetch_source_tickets(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Fetch tickets from source support_ticket_dump table using Supabase API, with pagination.
        
        Args:
            limit: Optional limit on number of records to fetch
            
        Returns:
            List of ticket dictionaries
        """
        url = f"{self.source_url}/rest/v1/support_ticket_dump"
        params = {'select': '*'}
        batch_size = 1000  # Supabase max is usually 1000
        tickets = []
        offset = 0
        total_fetched = 0
        consecutive_empty_batches = 0
        previous_batch_ids = set()  # Track IDs to detect duplicates
        
        while True:
            # If a limit is set, don't fetch more than needed
            fetch_size = min(batch_size, limit - total_fetched) if limit else batch_size
            range_header = {'Range': f'items={offset}-{offset + fetch_size - 1}'}
            headers = {
                'apikey': self.source_key,
                'Authorization': f'Bearer {self.source_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
                **range_header
            }
            try:
                response = requests.get(url, headers=headers, params=params, timeout=30)
                response.raise_for_status()
                batch = response.json()
                logger.info(f"Batch request: offset={offset}, requested_size={fetch_size}, actual_size={len(batch)}")
                
                if not batch:
                    consecutive_empty_batches += 1
                    logger.info(f"Empty batch at offset {offset}, consecutive empty: {consecutive_empty_batches}")
                    if consecutive_empty_batches >= 3:
                        logger.info("Stopping after 3 consecutive empty batches")
                        break
                else:
                    consecutive_empty_batches = 0
                    
                    # Check for duplicate data by comparing IDs
                    current_batch_ids = {ticket.get('id') for ticket in batch if ticket.get('id')}
                    if current_batch_ids and current_batch_ids == previous_batch_ids:
                        logger.info(f"Detected duplicate batch at offset {offset}, stopping")
                        break
                    
                    previous_batch_ids = current_batch_ids
                    tickets.extend(batch)
                    logger.info(f"Fetched {len(batch)} tickets (offset {offset})")
                    total_fetched += len(batch)
                    if limit and total_fetched >= limit:
                        logger.info(f"Reached limit of {limit} tickets")
                        break
                
                if len(batch) < fetch_size and len(batch) > 0:
                    logger.info(f"Partial batch received ({len(batch)} < {fetch_size}), continuing to next batch")
                elif len(batch) == 0:
                    logger.info(f"No more data at offset {offset}")
                    break
                offset += fetch_size
            except Exception as e:
                logger.error(f"Failed to fetch tickets from source (offset {offset}): {e}")
                break
        logger.info(f"Fetched {len(tickets)} tickets from source database")
        return tickets

    def transform_ticket_for_staging(self, ticket: Dict[str, Any], staging_columns: List[str] = None) -> Dict[str, Any]:
        """
        Transform a ticket for staging environment.
        
        Args:
            ticket: Original ticket data
            staging_columns: List of columns that exist in staging table
            
        Returns:
            Transformed ticket data
        """
        # Create a copy to avoid modifying the original
        transformed_ticket = ticket.copy()
        
        # Transform assigned_to field
        original_assigned_to = transformed_ticket.get('assigned_to')
        if original_assigned_to:
            new_assigned_to = self.assigned_to_mapping.get(
                original_assigned_to, 
                "staging-default@staging.com"
            )
            transformed_ticket['assigned_to'] = new_assigned_to
            logger.debug(f"Transformed assigned_to: {original_assigned_to} -> {new_assigned_to}")
        
        # Transform tenant_id field
        original_tenant_id = transformed_ticket.get('tenant_id')
        if original_tenant_id:
            new_tenant_id = self.tenant_id_mapping.get(
                original_tenant_id,
                self.staging_tenant_id
            )
            transformed_ticket['tenant_id'] = new_tenant_id
            logger.debug(f"Transformed tenant_id: {original_tenant_id} -> {new_tenant_id}")
        
        # Reset for staging
        transformed_ticket['resolution_status'] = 'Pending'
        transformed_ticket['cse_name'] = None
        transformed_ticket['assigned_to'] = None
        
        # Update timestamps
        current_time = datetime.now().isoformat()
        transformed_ticket['created_at'] = current_time
        transformed_ticket['ticket_date'] = current_time
        
        # Reset dump-specific fields for staging
        transformed_ticket['is_processed'] = False
        transformed_ticket['dumped_at'] = current_time
        
        # Filter out columns that don't exist in staging table
        if staging_columns:
            filtered_ticket = {}
            for key, value in transformed_ticket.items():
                if key in staging_columns and key != 'id':
                    filtered_ticket[key] = value
                else:
                    logger.debug(f"Filtering out column '{key}' (not in staging table or is 'id')")
            transformed_ticket = filtered_ticket
        # Always remove 'id' if present
        if 'id' in transformed_ticket:
            del transformed_ticket['id']
        return transformed_ticket

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

    def copy_tickets(self, limit: Optional[int] = None, dry_run: bool = False) -> Dict[str, Any]:
        """
        Main method to copy tickets from source to staging.
        
        Args:
            limit: Optional limit on number of records to process
            dry_run: If True, only fetch and transform data without inserting
            
        Returns:
            Dictionary with operation results
        """
        start_time = time.time()
        
        try:
            logger.info("Starting Supabase ticket copy process...")
            
            # Check existing tickets in staging
            existing_check = self.check_existing_tickets()
            existing_count = existing_check.get('count', 0)
            
            # Get staging table schema
            staging_columns = self.get_staging_schema()
            if staging_columns:
                logger.info(f"Using staging table columns: {staging_columns}")
            else:
                logger.warning("Could not determine staging table schema, proceeding with all columns")
            
            # Fetch ALL tickets from source in one call
            logger.info("Fetching all tickets from source...")
            all_tickets = self.fetch_source_tickets(limit)
            
            if not all_tickets:
                logger.warning("No tickets found in source database")
                return {"status": "no_tickets", "duration": time.time() - start_time}
            
            logger.info(f"Fetched {len(all_tickets)} tickets from source")
            
            # Check for existing tickets to avoid duplicates
            existing_keys = self.get_existing_ticket_keys()
            new_tickets = self.filter_new_tickets(all_tickets, existing_keys)
            
            if not new_tickets:
                logger.info("No new tickets to insert - all tickets already exist in staging")
                return {
                    "status": "no_new_tickets",
                    "source_count": len(all_tickets),
                    "existing_count": existing_count,
                    "new_count": 0,
                    "duration": time.time() - start_time
                }
            
            # Transform new tickets for staging
            logger.info("Transforming new tickets for staging...")
            transformed_tickets = []
            for ticket in new_tickets:
                transformed_ticket = self.transform_ticket_for_staging(ticket, staging_columns)
                transformed_tickets.append(transformed_ticket)
            
            logger.info(f"Transformed {len(transformed_tickets)} new tickets for staging")
            
            if dry_run:
                logger.info(f"DRY RUN: Would insert {len(transformed_tickets)} new tickets")
                return {
                    "status": "dry_run",
                    "source_count": len(all_tickets),
                    "existing_count": existing_count,
                    "new_count": len(transformed_tickets),
                    "duration": time.time() - start_time
                }
            
            # Insert new tickets to staging
            logger.info("Inserting new tickets to staging...")
            inserted_count = self.insert_tickets_to_staging(transformed_tickets)
            
            duration = time.time() - start_time
            
            return {
                "status": "success",
                "source_count": len(all_tickets),
                "existing_count": existing_count,
                "new_count": len(transformed_tickets),
                "inserted_count": inserted_count,
                "duration": duration
            }
            
        except Exception as e:
            logger.error(f"Failed to copy tickets: {e}")
            return {"status": "error", "error": str(e), "duration": time.time() - start_time}

    def fetch_source_tickets_batch(self, offset: int, batch_size: int) -> List[Dict[str, Any]]:
        """
        Fetch a single batch of tickets from source.
        
        Args:
            offset: Starting offset for this batch
            batch_size: Number of tickets to fetch
            
        Returns:
            List of ticket dictionaries
        """
        url = f"{self.source_url}/rest/v1/support_ticket_dump"
        params = {'select': '*', 'order': 'id.asc'}
        
        range_header = {'Range': f'items={offset}-{offset + batch_size - 1}'}
        headers = {
            'apikey': self.source_key,
            'Authorization': f'Bearer {self.source_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            **range_header
        }
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            batch = response.json()
            
            # If we get fewer records than requested, we've reached the end
            if len(batch) < batch_size:
                logger.info(f"Reached end of data: got {len(batch)} records (requested {batch_size})")
            
            if not batch:
                return []
            
            logger.debug(f"Fetched {len(batch)} tickets (offset {offset})")
            return batch
            
        except Exception as e:
            logger.error(f"Failed to fetch batch from source (offset {offset}): {e}")
            return []

    def test_connection(self) -> Dict[str, Any]:
        """Test connection to both source and staging databases."""
        results = {}
        
        # Test source connection
        try:
            source_url = f"{self.source_url}/rest/v1/support_ticket_dump?select=count"
            source_data = self._make_request(source_url, self.source_key, 'GET')
            results['source'] = {'status': 'success', 'data': source_data}
            logger.info("✅ Source connection successful")
        except Exception as e:
            results['source'] = {'status': 'error', 'error': str(e)}
            logger.error(f"❌ Source connection failed: {e}")
        
        # Test staging connection
        try:
            staging_url = f"{self.staging_url}/rest/v1/support_ticket_dump?select=count"
            staging_data = self._make_request(staging_url, self.staging_key, 'GET')
            results['staging'] = {'status': 'success', 'data': staging_data}
            logger.info("✅ Staging connection successful")
        except Exception as e:
            results['staging'] = {'status': 'error', 'error': str(e)}
            logger.error(f"❌ Staging connection failed: {e}")
        
        return results

    def get_table_info(self) -> Dict[str, Any]:
        """Get information about the support_ticket_dump table structure."""
        results = {}
        
        # Get source table info
        try:
            source_url = f"{self.source_url}/rest/v1/support_ticket_dump?select=*&limit=1"
            source_data = self._make_request(source_url, self.source_key, 'GET')
            if source_data and len(source_data) > 0:
                results['source_columns'] = list(source_data[0].keys())
                logger.info(f"Source table columns: {results['source_columns']}")
        except Exception as e:
            logger.error(f"Failed to get source table info: {e}")
        
        # Get staging table info
        try:
            staging_url = f"{self.staging_url}/rest/v1/support_ticket_dump?select=*&limit=1"
            staging_data = self._make_request(staging_url, self.staging_key, 'GET')
            if staging_data and len(staging_data) > 0:
                results['staging_columns'] = list(staging_data[0].keys())
                logger.info(f"Staging table columns: {results['staging_columns']}")
            else:
                # If no data, try to get schema info
                staging_url = f"{self.staging_url}/rest/v1/support_ticket_dump?select=id&limit=0"
                staging_data = self._make_request(staging_url, self.staging_key, 'GET')
                results['staging_empty'] = True
                logger.info("Staging table exists but is empty")
        except Exception as e:
            logger.error(f"Failed to get staging table info: {e}")
        
        return results

    def get_staging_schema(self) -> List[str]:
        """Get the actual column list from the staging table."""
        try:
            # Try to get schema information
            staging_url = f"{self.staging_url}/rest/v1/support_ticket_dump?select=*&limit=0"
            staging_data = self._make_request(staging_url, self.staging_key, 'GET')
            
            # If we get here, the table exists but might be empty
            # Let's try a different approach - try to insert a minimal record to see what columns are required
            logger.info("Attempting to get staging table schema...")
            
            # Try with just the essential fields
            test_data = {
                "name": "test",
                "phone": "test",
                "source": "test",
                "tenant_id": "test"
            }
            
            url = f"{self.staging_url}/rest/v1/support_ticket_dump"
            headers = {
                'apikey': self.staging_key,
                'Authorization': f'Bearer {self.staging_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
            
            response = requests.post(url, headers=headers, json=test_data, timeout=30)
            
            if response.status_code == 201 or response.status_code == 200:
                # Success! Let's see what was actually inserted
                inserted_data = response.json()
                if isinstance(inserted_data, list) and len(inserted_data) > 0:
                    columns = list(inserted_data[0].keys())
                    logger.info(f"Staging table columns (from test insert): {columns}")
                    return columns
                else:
                    logger.info("Test insert successful but no data returned")
                    return []
            else:
                error_detail = response.text
                logger.error(f"Test insert failed: {response.status_code} - {error_detail}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to get staging schema: {e}")
            return []

    def test_single_insert(self) -> Dict[str, Any]:
        """Test inserting a single ticket to get detailed error information."""
        try:
            # Fetch one ticket from source
            source_tickets = self.fetch_source_tickets(limit=1)
            if not source_tickets:
                return {"status": "error", "error": "No tickets found in source"}
            
            # Get staging schema
            staging_columns = self.get_staging_schema()
            
            # Transform the ticket
            transformed_ticket = self.transform_ticket_for_staging(source_tickets[0], staging_columns)
            
            # Try to insert
            url = f"{self.staging_url}/rest/v1/support_ticket_dump"
            
            logger.info("Testing single ticket insert...")
            logger.info(f"Transformed ticket keys: {list(transformed_ticket.keys())}")
            
            # Try with different approaches
            headers = {
                'apikey': self.staging_key,
                'Authorization': f'Bearer {self.staging_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
            
            # First, try without the id field (let the database generate it)
            test_ticket = transformed_ticket.copy()
            if 'id' in test_ticket:
                del test_ticket['id']
            
            logger.info(f"Attempting insert with {len(test_ticket)} fields...")
            
            response = requests.post(url, headers=headers, json=test_ticket, timeout=30)
            
            if response.status_code == 201 or response.status_code == 200:
                logger.info("Single ticket insert successful!")
                return {"status": "success", "data": response.json()}
            else:
                error_detail = response.text
                logger.error(f"Single ticket insert failed: {response.status_code}")
                logger.error(f"Error details: {error_detail}")
                return {"status": "error", "code": response.status_code, "error": error_detail}
                
        except Exception as e:
            logger.error(f"Single ticket insert test failed: {e}")
            return {"status": "error", "error": str(e)}

    def check_existing_tickets(self) -> Dict[str, Any]:
        """Check how many tickets already exist in staging."""
        try:
            url = f"{self.staging_url}/rest/v1/support_ticket_dump?select=count"
            data = self._make_request(url, self.staging_key, 'GET')
            # Supabase count returns a list with one object containing the count
            count = data[0]['count'] if data and len(data) > 0 else 0
            logger.info(f"Found {count} existing tickets in staging")
            return {"count": count, "status": "success"}
        except Exception as e:
            logger.error(f"Failed to check existing tickets: {e}")
            return {"count": 0, "status": "error", "error": str(e)}

    def get_existing_ticket_keys(self) -> Set[str]:
        """Get unique keys (display_pic_url only) of tickets that already exist in staging."""
        try:
            url = f"{self.staging_url}/rest/v1/support_ticket_dump?select=display_pic_url"
            data = self._make_request(url, self.staging_key, 'GET')
            existing_keys = set()
            for ticket in data:
                display_pic_url = str(ticket.get('display_pic_url', '')).strip()
                # Use only display picture URL as the unique key
                if display_pic_url:  # Only add non-empty URLs
                    existing_keys.add(display_pic_url)
            logger.info(f"Found {len(existing_keys)} existing ticket keys in staging")
            return existing_keys
        except Exception as e:
            logger.error(f"Failed to get existing ticket keys: {e}")
            return set()

    def filter_new_tickets(self, tickets: List[Dict[str, Any]], existing_keys: Set[str]) -> List[Dict[str, Any]]:
        """Filter out tickets that already exist in staging based on display_pic_url only."""
        new_tickets = []
        skipped_count = 0
        
        logger.info(f"Filtering {len(tickets)} tickets against {len(existing_keys)} existing keys")
        
        for ticket in tickets:
            display_pic_url = str(ticket.get('display_pic_url', '')).strip()
            
            if display_pic_url and display_pic_url in existing_keys:
                skipped_count += 1
                logger.debug(f"Skipping existing ticket with display_pic_url: {display_pic_url}")
            else:
                new_tickets.append(ticket)
        
        logger.info(f"Filtered tickets: {len(new_tickets)} new, {skipped_count} already exist")
        return new_tickets

def load_config_from_file(config_file: str) -> Dict[str, str]:
    """Load Supabase configuration from JSON file."""
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        if 'source' not in config or 'staging' not in config:
            raise ValueError("Configuration must contain 'source' and 'staging' sections")
        
        return config
    except Exception as e:
        logger.error(f"Failed to load config from {config_file}: {e}")
        raise

def main():
    parser = argparse.ArgumentParser(description='Supabase Pyro support ticket copy script')
    parser.add_argument('--config', '-c', required=True, help='Path to configuration JSON file')
    parser.add_argument('--limit', '-l', type=int, help='Limit number of tickets to process')
    parser.add_argument('--dry-run', action='store_true', help='Dry run - don\'t actually insert data')
    parser.add_argument('--test', action='store_true', help='Test connections and table structure')
    parser.add_argument('--test-single', action='store_true', help='Test inserting a single ticket')
    
    args = parser.parse_args()
    
    try:
        # Load configuration
        config = load_config_from_file(args.config)
        
        # Create copier instance
        copier = SupabaseTicketCopier(
            source_url=config['source']['url'],
            source_key=config['source']['key'],
            staging_url=config['staging']['url'],
            staging_key=config['staging']['key']
        )
        
        if args.test:
            # Test connections and table structure
            logger.info("Testing connections and table structure...")
            connection_results = copier.test_connection()
            table_info = copier.get_table_info()
            
            logger.info("=== Connection Test Results ===")
            for db, result in connection_results.items():
                status = "PASS" if result['status'] == 'success' else "FAIL"
                logger.info(f"{db.upper()}: {status}")
                if result['status'] == 'error':
                    logger.error(f"  Error: {result['error']}")
            
            logger.info("=== Table Structure ===")
            if 'source_columns' in table_info:
                logger.info(f"Source columns: {table_info['source_columns']}")
            if 'staging_columns' in table_info:
                logger.info(f"Staging columns: {table_info['staging_columns']}")
            elif 'staging_empty' in table_info:
                logger.info("Staging table exists but is empty")
            
            return
        
        if args.test_single:
            # Test single ticket insertion
            logger.info("Testing single ticket insertion...")
            result = copier.test_single_insert()
            
            if result['status'] == 'success':
                logger.info("Single ticket insert test PASSED!")
            else:
                logger.error(f"Single ticket insert test FAILED: {result.get('error', 'Unknown error')}")
            
            return
        
        # Run the copy operation
        result = copier.copy_tickets(limit=args.limit, dry_run=args.dry_run)
        
        # Print results
        duration = result.get('duration', 0)
        if result['status'] == 'success':
            logger.info(f"Successfully copied {result['inserted_count']} new tickets in {duration:.2f}s")
            logger.info(f"   Source tickets: {result['source_count']}")
            logger.info(f"   Existing in staging: {result['existing_count']}")
            logger.info(f"   New tickets found: {result['new_count']}")
            logger.info(f"   Success rate: {(result['inserted_count']/result['new_count']*100):.1f}%")
        elif result['status'] == 'dry_run':
            logger.info(f"Dry run completed in {duration:.2f}s")
            logger.info(f"   Source tickets: {result['source_count']}")
            logger.info(f"   Existing in staging: {result['existing_count']}")
            logger.info(f"   Would copy {result['new_count']} new tickets")
        elif result['status'] == 'no_tickets':
            logger.warning("No tickets found in source database")
        elif result['status'] == 'no_new_tickets':
            logger.info(f"No new tickets to insert - all {result['source_count']} tickets already exist in staging")
        else:
            logger.error(f"Error: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        logger.error(f"Script failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 