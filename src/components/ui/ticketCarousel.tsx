import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Tag, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { API_URI } from '@/const';

interface Ticket {
  id: number;
  created_at: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email_id: string;
  praja_user_id: string;
  ticket_type: string;
  assigned_to: string;
  status: "Completed" | "Pending";
  Description: string;
  snooze_until: string | null;
  retry_count: number;
}

// Demo data for fallback
const DEMO_TICKETS: Ticket[] = [
  {
    id: 1,
    created_at: "2024-03-15T10:30:00Z",
    tenant_id: "",
    first_name: "John",
    last_name: "Doe",
    phone_number: "+91 98765 43210",
    email_id: "john.doe@example.com",
    praja_user_id: "",
    ticket_type: "Support",
    assigned_to: "Support Team",
    status: "Pending",
    Description: "Issue with login functionality",
    snooze_until: null,
    retry_count: 0
  },
  {
    id: 2,
    created_at: "2024-03-14T15:45:00Z",
    tenant_id: "",
    first_name: "Jane",
    last_name: "Smith",
    phone_number: "+91 87654 32109",
    email_id: "jane.smith@example.com",
    praja_user_id: "",
    ticket_type: "Billing",
    assigned_to: "Billing Team",
    status: "Completed",
    Description: "Payment gateway integration issue",
    snooze_until: null,
    retry_count: 0
  },
  {
    id: 3,
    created_at: "2024-03-13T09:15:00Z",
    tenant_id: "",
    first_name: "Mike",
    last_name: "Johnson",
    phone_number: "+91 76543 21098",
    email_id: "mike.j@example.com",
    praja_user_id: "",
    ticket_type: "Feature Request",
    assigned_to: "Product Team",
    status: "Pending",
    Description: "Request for new dashboard features",
    snooze_until: null,
    retry_count: 0
  },
  {
    id: 4,
    created_at: "2024-03-12T11:20:00Z",
    tenant_id: "",
    first_name: "Sarah",
    last_name: "Williams",
    phone_number: "+91 98765 12340",
    email_id: "sarah.w@example.com",
    praja_user_id: "",
    ticket_type: "Support",
    assigned_to: "Development Team",
    status: "Pending",
    Description: "Application crashes on startup",
    snooze_until: null,
    retry_count: 0
  },
  {
    id: 5,
    created_at: "2024-03-11T14:30:00Z",
    tenant_id: "",
    first_name: "David",
    last_name: "Brown",
    phone_number: "+91 87654 56789",
    email_id: "david.b@example.com",
    praja_user_id: "",
    ticket_type: "Feature Request",
    assigned_to: "API Team",
    status: "Completed",
    Description: "Need additional API endpoints",
    snooze_until: null,
    retry_count: 0
  }
];

interface ComponentConfig {
  apiEndpoint?: string;      // Custom API endpoint
  columns?: Array<{         // For tables
    key: string;
    label: string;
    type: 'text' | 'chip' | 'date' | 'number';
  }>;
  title?: string;           // Component title
  description?: string;     // Component description
  refreshInterval?: number; // Auto-refresh interval
  showFilters?: boolean;    // Show/hide filters
  customFields?: Record<string, any>; // For future extensibility
}

interface TicketCarouselProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
    showFilters?: boolean;
  };
}

export const TicketCarousel: React.FC<TicketCarouselProps> = ({ config }) => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<"Completed" | "Pending">("Pending");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const endpoint = config?.apiEndpoint || '/api/tickets';
        const apiUrl = `${API_URI}${endpoint}`;
        
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) {
          throw new Error('Authentication required');
        }

        const response = await fetch(`${apiUrl}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (Array.isArray(data)) {
          setTickets(data);
          if (data.length > 0) {
            setStatus(data[0].status as "Completed" | "Pending");
            setNotes(data[0].Description || "");
          }
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (error) {
        toast.error('Failed to load tickets. Using demo data.');
        setTickets(DEMO_TICKETS);
        if (DEMO_TICKETS.length > 0) {
          setStatus(DEMO_TICKETS[0].status);
          setNotes(DEMO_TICKETS[0].Description || "");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user?.id, tenantId, config?.apiEndpoint]);

  // Get current ticket with fallback
  const currentTicket = tickets[currentIndex] || {
    id: 0,
    created_at: new Date().toISOString(),
    tenant_id: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    email_id: "",
    praja_user_id: "",
    ticket_type: "",
    assigned_to: "",
    status: "Pending",
    Description: "",
    snooze_until: null,
    retry_count: 0
  };

  const nextSlide = async () => {
    setCurrentIndex((prev) => (prev + 1) % tickets.length);
    if (tickets[(currentIndex + 1) % tickets.length]) {
      setStatus(tickets[(currentIndex + 1) % tickets.length].status);
      setNotes(tickets[(currentIndex + 1) % tickets.length].Description || "");
    }
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + tickets.length) % tickets.length);
    if (tickets[(currentIndex - 1 + tickets.length) % tickets.length]) {
      setStatus(tickets[(currentIndex - 1 + tickets.length) % tickets.length].status);
      setNotes(tickets[(currentIndex - 1 + tickets.length) % tickets.length].Description || "");
    }
  };

  const handleSubmit = async () => {
    try {
      if (!currentTicket?.id) {
        toast.error('No ticket ID available');
        return;
      }

      setUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // First verify the ticket exists
      const { data: existingTickets, error: fetchError } = await supabase
        .from('support_ticket')
        .select('*')
        .eq('id', currentTicket.id);

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw new Error(`Failed to verify ticket: ${fetchError.message}`);
      }

      if (!existingTickets || existingTickets.length === 0) {
        throw new Error(`Ticket not found with ID: ${currentTicket.id}`);
      }

      // Use the first ticket if multiple exist
      const existingTicket = existingTickets[0];

      // Perform the update
      const { data: updatedTicket, error: updateError } = await supabase
        .from('support_ticket')
        .update({
          status: status,
          Description: notes,
          ...(status === "Completed" && { completed_at: new Date().toISOString() })
        })
        .eq('id', currentTicket.id)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('Update error details:', {
          error: updateError,
          ticketId: currentTicket.id,
          status,
          notes
        });
        throw new Error(`Failed to update ticket: ${updateError.message}`);
      }

      if (!updatedTicket) {
        throw new Error('No data returned after update');
      }

      // Update the local state
      setTickets(tickets.map(ticket => 
        ticket.id === currentTicket.id 
          ? { 
              ...ticket, 
              status: status, 
              Description: notes
            }
          : ticket
      ));

      toast.success('Ticket updated successfully');
      nextSlide();
    } catch (err: any) {
      console.error('Update error:', {
        error: err,
        message: err.message,
        ticketId: currentTicket?.id,
        status,
        notes
      });
      toast.error(err.message || 'Failed to update ticket. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tickets found
      </div>
    );
  }

  // Get formatted date with fallback
  const formattedDate = currentTicket.created_at 
    ? new Date(currentTicket.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'N/A';

  return (
    <div className="relative w-full h-full">
      <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white p-6">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold text-primary">
                {config?.title || 'Tickets'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentTicket.first_name} {currentTicket.last_name}
              </p>
              <p className="text-sm text-muted-foreground">PRAJA ID: {currentTicket.praja_user_id || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-4">
              <Select 
                value={status} 
                onValueChange={(value: "Completed" | "Pending") => setStatus(value)}
                disabled={updating}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                <Tag className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">{currentTicket.ticket_type || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                <User className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">{currentTicket.assigned_to || 'Unassigned'}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">{formattedDate}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Contact Information</p>
                <p className="text-sm text-muted-foreground">{currentTicket.phone_number || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{currentTicket.email_id || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-muted/30 p-4 rounded-md">
            <p className="text-sm font-medium mb-2">Description</p>
            <p className="text-sm text-muted-foreground">{currentTicket.Description || 'No description available'}</p>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this ticket..."
              className="min-h-[100px]"
              disabled={updating}
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
          <button
            onClick={prevSlide}
            className="bg-gray-200 text-black px-6 py-2 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={updating}
          >
            Previous
          </button>
          <button
            onClick={handleSubmit}
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={updating}
          >
            {updating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </>
            ) : (
              'Save & Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}; 