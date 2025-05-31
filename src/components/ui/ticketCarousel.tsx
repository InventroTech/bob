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
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email_id: string;
  ticket_type: string;
  actual_ticket_type: string[];
  created_at: string;
  assigned_to: string;
  status: "Completed" | "Pending";
  description: string;
  notes?: string;
}

// Demo data for fallback
const DEMO_TICKETS: Ticket[] = [
  {
    id: "TICK-001",
    first_name: "John",
    last_name: "Doe",
    phone_number: "+91 98765 43210",
    email_id: "john.doe@example.com",
    ticket_type: "Support",
    actual_ticket_type: ["Technical", "Hardware"],
    created_at: "2024-03-15T10:30:00Z",
    assigned_to: "Support Team",
    status: "Pending",
    description: "Issue with login functionality",
    notes: "Customer reported login issues on mobile app"
  },
  {
    id: "TICK-002",
    first_name: "Jane",
    last_name: "Smith",
    phone_number: "+91 87654 32109",
    email_id: "jane.smith@example.com",
    ticket_type: "Billing",
    actual_ticket_type: ["Payment", "Invoice"],
    created_at: "2024-03-14T15:45:00Z",
    assigned_to: "Billing Team",
    status: "Completed",
    description: "Payment gateway integration issue",
    notes: "Resolved payment processing error"
  },
  {
    id: "TICK-003",
    first_name: "Mike",
    last_name: "Johnson",
    phone_number: "+91 76543 21098",
    email_id: "mike.j@example.com",
    ticket_type: "Feature Request",
    actual_ticket_type: ["Enhancement", "UI"],
    created_at: "2024-03-13T09:15:00Z",
    assigned_to: "Product Team",
    status: "Pending",
    description: "Request for new dashboard features",
    notes: "Customer wants additional analytics features"
  },
  {
    id: "TICK-004",
    first_name: "Sarah",
    last_name: "Williams",
    phone_number: "+91 98765 12340",
    email_id: "sarah.w@example.com",
    ticket_type: "Support",
    actual_ticket_type: ["Software", "Bug"],
    created_at: "2024-03-12T11:20:00Z",
    assigned_to: "Development Team",
    status: "Pending",
    description: "Application crashes on startup",
    notes: "Issue occurs only on Windows 11"
  },
  {
    id: "TICK-005",
    first_name: "David",
    last_name: "Brown",
    phone_number: "+91 87654 56789",
    email_id: "david.b@example.com",
    ticket_type: "Feature Request",
    actual_ticket_type: ["Enhancement", "API"],
    created_at: "2024-03-11T14:30:00Z",
    assigned_to: "API Team",
    status: "Completed",
    description: "Need additional API endpoints",
    notes: "Implemented new endpoints for data export"
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
            setStatus(data[0].status);
            setNotes(data[0].notes || "");
          }
        } else if (data.tickets && Array.isArray(data.tickets)) {
          setTickets(data.tickets);
          if (data.tickets.length > 0) {
            setStatus(data.tickets[0].status);
            setNotes(data.tickets[0].notes || "");
          }
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (error) {
        toast.error('Failed to load tickets. Using demo data.');
        setTickets(DEMO_TICKETS);
        if (DEMO_TICKETS.length > 0) {
          setStatus(DEMO_TICKETS[0].status);
          setNotes(DEMO_TICKETS[0].notes || "");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user?.id, tenantId, config?.apiEndpoint]);

  const currentTicket = tickets[currentIndex];

  const nextSlide = async () => {
    setCurrentIndex((prev) => (prev + 1) % tickets.length);
    if (tickets[(currentIndex + 1) % tickets.length]) {
      setStatus(tickets[(currentIndex + 1) % tickets.length].status);
      setNotes(tickets[(currentIndex + 1) % tickets.length].notes || "");
    }
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + tickets.length) % tickets.length);
    if (tickets[(currentIndex - 1 + tickets.length) % tickets.length]) {
      setStatus(tickets[(currentIndex - 1 + tickets.length) % tickets.length].status);
      setNotes(tickets[(currentIndex - 1 + tickets.length) % tickets.length].notes || "");
    }
  };

  const handleSubmit = async () => {
    try {
      if (!currentTicket?.id) {
        toast.error('No ticket ID available');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const endpoint = config?.apiEndpoint || '/api/tickets';
      const apiUrl = `${API_URI}${endpoint}`;
      
      const response = await fetch(`${apiUrl}/${currentTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          notes: notes,
          status: status
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setTickets(tickets.map(ticket => 
        ticket.id === currentTicket.id 
          ? { ...ticket, notes: notes, status: status }
          : ticket
      ));

      toast.success('Ticket updated successfully');
      nextSlide();
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tickets found
      </div>
    );
  }

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
              <p className="text-sm text-muted-foreground">{currentTicket.id}</p>
            </div>
            {config?.showFilters !== false && (
              <div className="flex items-center gap-4">
                <Select value={status} onValueChange={(value: "Completed" | "Pending") => setStatus(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Ticket Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                <Tag className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">{currentTicket.actual_ticket_type[0]}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                <User className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">{currentTicket.assigned_to}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">
                  {new Date(currentTicket.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Contact Information</p>
                <p className="text-sm text-muted-foreground">{currentTicket.phone_number}</p>
                <p className="text-sm text-muted-foreground">{currentTicket.email_id}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-muted/30 p-4 rounded-md">
            <p className="text-sm font-medium mb-2">Description</p>
            <p className="text-sm text-muted-foreground">{currentTicket.description}</p>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this ticket..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
          <button
            onClick={prevSlide}
            className="bg-gray-200 text-black px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={handleSubmit}
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}; 