import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Tag, ChevronDown, Phone, Star, Clock, MessageSquare, Award, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { API_URI } from '@/const';
import { Input } from "@/components/ui/input";

interface Ticket {
  id: number;
  ticket_date: string;
  user_id: string;
  name: string;
  phone: string;
  source: string;
  subscription_status: string;
  atleast_paid_once: boolean;
  reason: string;
  other_reasons: string;
  badge: string;
  poster: string;
  tenant_id: string;
  layout_status: string;
  resolution_status: "Resolved" | "WIP" | "Pending" | "Already Resolved" | "No Issue" | "Not Possible" | "Feature Requested";
  resolution_time: string | null;
  cse_name: string;
  cse_remarks: string;
  cse_called_date: string | null;
  call_status: "Connected" | "Call Not Answering" | "Call Waiting" | "Call busy" | "Switch Off" | "Not Reachable" | "Out Of Service";
  call_duration: string;
  call_attempts: number;
  rm_name: string;
}

// Demo data for fallback
const DEMO_TICKETS: Ticket[] = [
  {
    id: 1,
    ticket_date: new Date().toISOString(),
    user_id: "PRAJA501",
    name: "Sameer Anand",
    phone: "9876554321",
    source: "WebApp Login",
    subscription_status: "Premium",
    atleast_paid_once: true,
    reason: "User is unable to log in after the recent password reset.",
    other_reasons: "Receiving 'Invalid Credentials' message despite using the new password.",
    badge: "Gold Tier",
    poster: "N/A",
    tenant_id: "demo-tenant",
    layout_status: "Standard View",
    resolution_status: "Pending",
    resolution_time: null,
    cse_name: "Auto-Generated",
    cse_remarks: "Initial ticket created via API webhook.",
    cse_called_date: null,
    call_status: "Call Waiting",
    call_duration: "0s",
    call_attempts: 0,
    rm_name: "John Doe"
  },
  {
    id: 2,
    ticket_date: new Date(Date.now() - 86400000).toISOString(),
    user_id: "PRAJA502",
    name: "Priya Sharma",
    phone: "8765432109",
    source: "Mobile App",
    subscription_status: "Basic",
    atleast_paid_once: true,
    reason: "Unable to access premium features after subscription renewal.",
    other_reasons: "Payment was successful but features are still locked.",
    badge: "Silver Tier",
    poster: "N/A",
    tenant_id: "demo-tenant",
    layout_status: "Standard View",
    resolution_status: "WIP",
    resolution_time: null,
    cse_name: "Rahul Kumar",
    cse_remarks: "Investigating subscription status.",
    cse_called_date: new Date().toISOString(),
    call_status: "Connected",
    call_duration: "5m",
    call_attempts: 1,
    rm_name: "Jane Smith"
  },
  {
    id: 3,
    ticket_date: new Date(Date.now() - 172800000).toISOString(),
    user_id: "PRAJA503",
    name: "Amit Patel",
    phone: "7654321098",
    source: "Email Support",
    subscription_status: "Premium",
    atleast_paid_once: false,
    reason: "Request for custom dashboard layout.",
    other_reasons: "Need specific widgets and data visualization options.",
    badge: "Bronze Tier",
    poster: "N/A",
    tenant_id: "demo-tenant",
    layout_status: "Custom View",
    resolution_status: "Not Possible",
    resolution_time: null,
    cse_name: "Auto-Generated",
    cse_remarks: "Feature request logged for review.",
    cse_called_date: null,
    call_status: "Not Reachable",
    call_duration: "0s",
    call_attempts: 0,
    rm_name: "Alice Johnson"
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
    readOnly?: boolean;
  };
  initialTicket?: any;
  onUpdate?: (updatedTicket: any) => void;
}

export const TicketCarousel: React.FC<TicketCarouselProps> = ({ config, initialTicket, onUpdate }) => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutionStatus, setResolutionStatus] = useState<"Resolved" | "WIP" | "Pending" | "Already Resolved" | "No Issue" | "Not Possible" | "Feature Requested">("Pending");
  const [callStatus, setCallStatus] = useState<"Connected" | "Call Not Answering" | "Call Waiting" | "Call busy" | "Switch Off" | "Not Reachable" | "Out Of Service">("Call Waiting");
  const [cseRemarks, setCseRemarks] = useState("");
  const [callDuration, setCallDuration] = useState("");
  const [resolutionTime, setResolutionTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // If initialTicket is provided, use it instead of fetching
  const isReadOnly = config?.readOnly || false;

  useEffect(() => {
    if (initialTicket) {
      // Use the provided ticket data
      setTickets([initialTicket]);
      setResolutionStatus(initialTicket.resolution_status || "Pending");
      setCseRemarks(initialTicket.cse_remarks || "");
      setCallStatus(initialTicket.call_status || "Call Waiting");
      setCallDuration(initialTicket.call_duration || "");
      setResolutionTime(initialTicket.resolution_time || "");
      setLoading(false);
    } else {
      // Fetch tickets as before
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
              setResolutionStatus(data[0].resolution_status);
              setCseRemarks(data[0].cse_remarks || "");
              setCallStatus(data[0].call_status);
              setCallDuration(data[0].call_duration);
              setResolutionTime(data[0].resolution_time || "");
            }
          } else {
            throw new Error('Invalid data format received');
          }
        } catch (error) {
          toast.error('Failed to load tickets. Using demo data.');
          setTickets(DEMO_TICKETS);
          if (DEMO_TICKETS.length > 0) {
            setResolutionStatus(DEMO_TICKETS[0].resolution_status);
            setCseRemarks(DEMO_TICKETS[0].cse_remarks || "");
            setCallStatus(DEMO_TICKETS[0].call_status);
            setCallDuration(DEMO_TICKETS[0].call_duration);
            setResolutionTime(DEMO_TICKETS[0].resolution_time || "");
          }
        } finally {
          setLoading(false);
        }
      };

      fetchTickets();
    }
  }, [user?.id, tenantId, config?.apiEndpoint, initialTicket]);

  // Get current ticket with fallback
  const currentTicket = tickets[currentIndex] || {
    id: 0,
    ticket_date: new Date().toISOString(),
    user_id: "",
    name: "",
    phone: "",
    source: "",
    subscription_status: "",
    atleast_paid_once: false,
    reason: "",
    other_reasons: "",
    badge: "",
    poster: "N/A",
    tenant_id: "",
    layout_status: "Standard View",
    resolution_status: "Open",
    resolution_time: null,
    cse_name: "",
    cse_remarks: "",
    cse_called_date: null,
    call_status: "Pending",
    call_duration: "0s",
    call_attempts: 0,
    rm_name: ""
  };

  const nextSlide = async () => {
    setCurrentIndex((prev) => (prev + 1) % tickets.length);
    if (tickets[(currentIndex + 1) % tickets.length]) {
      const nextTicket = tickets[(currentIndex + 1) % tickets.length];
      setResolutionStatus(nextTicket.resolution_status);
      setCseRemarks(nextTicket.cse_remarks || "");
      setCallStatus(nextTicket.call_status);
      setCallDuration(nextTicket.call_duration);
      setResolutionTime(nextTicket.resolution_time || "");
    }
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + tickets.length) % tickets.length);
    if (tickets[(currentIndex - 1 + tickets.length) % tickets.length]) {
      const prevTicket = tickets[(currentIndex - 1 + tickets.length) % tickets.length];
      setResolutionStatus(prevTicket.resolution_status);
      setCseRemarks(prevTicket.cse_remarks || "");
      setCallStatus(prevTicket.call_status);
      setCallDuration(prevTicket.call_duration);
      setResolutionTime(prevTicket.resolution_time || "");
    }
  };

  const handleSubmit = async () => {
    try {
      if (!currentTicket?.id) {
        toast.error('No ticket ID available');
        return;
      }

      if (isReadOnly) {
        toast.error('This ticket is read-only');
        return;
      }

      setUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      const currentTime = new Date().toISOString();
      
      // Calculate snooze_until based on call status and attempts
      let snoozeUntil = null;
      const isCallNotConnected = callStatus === "Call Not Answering";
      
      if (isCallNotConnected) {
        const currentDate = new Date();
        
        // First attempt - snooze for 1 hour
        if (currentTicket.call_attempts === 0) {
          currentDate.setHours(currentDate.getHours() + 1);
          snoozeUntil = currentDate.toISOString();
        } 
        // Subsequent attempts - snooze for 10 days
        else {
          currentDate.setDate(currentDate.getDate() + 10);
          snoozeUntil = currentDate.toISOString();
        }
      }

      const { data: updatedTicket, error: updateError } = await supabase
        .from('support_ticket')
        .update({
          resolution_status: resolutionStatus,
          cse_remarks: cseRemarks,
          cse_name: user?.email || 'Unknown CSE',
          cse_called_date: currentTime,
          call_status: callStatus,
          call_duration: callDuration,
          resolution_time: resolutionTime || null,
          call_attempts: currentTicket.call_attempts + 1,
          completed_at: currentTime,
          snooze_until: snoozeUntil
        })
        .eq('id', currentTicket.id)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;

      // Update local state
      const updatedTicketData = {
        ...currentTicket,
        resolution_status: resolutionStatus,
        cse_remarks: cseRemarks,
        cse_name: user?.email || 'Unknown CSE',
        cse_called_date: currentTime,
        call_status: callStatus,
        call_duration: callDuration,
        resolution_time: resolutionTime || null,
        call_attempts: currentTicket.call_attempts + 1,
        completed_at: currentTime,
        snooze_until: snoozeUntil
      };

      setTickets(tickets.map(ticket => 
        ticket.id === currentTicket.id ? updatedTicketData : ticket
      ));

      // Call the onUpdate callback if provided
      if (onUpdate) {
        onUpdate(updatedTicketData);
      }

      toast.success('Ticket updated successfully');
      
      // Only navigate to next slide if not in modal mode
      if (!initialTicket) {
        nextSlide();
      }
    } catch (err: any) {
      console.error('Update error:', err);
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
  const formattedDate = currentTicket.ticket_date 
    ? new Date(currentTicket.ticket_date).toLocaleDateString('en-US', {
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
                {config?.title || 'Support Tickets'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {currentTicket.badge}
                </Badge>
                <Badge variant="outline" className={`
                  ${currentTicket.subscription_status === 'Premium' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                    currentTicket.subscription_status === 'Basic' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                    'bg-gray-50 text-gray-700 border-gray-200'}
                `}>
                  {currentTicket.subscription_status}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select 
                value={resolutionStatus} 
                onValueChange={(value: "Resolved" | "WIP" | "Pending" | "Already Resolved" | "No Issue" | "Not Possible" | "Feature Requested") => setResolutionStatus(value)}
                disabled={updating || isReadOnly}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="WIP">Work in Progress</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Already Resolved">Already Resolved</SelectItem>
                  <SelectItem value="No Issue">No Issue</SelectItem>
                  <SelectItem value="Not Possible">Not Possible</SelectItem>
                  <SelectItem value="Feature Requested">Feature Requested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                <User className="h-4 w-4 mr-2 text-primary" />
                <div>
                  <p className="font-medium">{currentTicket.name}</p>
                  <p className="text-xs text-muted-foreground">ID: {currentTicket.user_id}</p>
                </div>
              </div>
              {currentTicket.rm_name && (
                <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                  <User className="h-4 w-4 mr-2 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">RM Name</p>
                    <p className="font-medium">{currentTicket.rm_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                <Phone className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">{currentTicket.phone}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                <Tag className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">{currentTicket.source}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                {currentTicket.atleast_paid_once ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                )}
                <span className="font-medium">
                  Payment Status (Atleast once): {currentTicket.atleast_paid_once ? "Paid" : "Never Paid"}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-muted/50 p-4 rounded-md space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Call Information</p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Call Status</label>
                    <Select 
                      value={callStatus} 
                      onValueChange={(value: "Connected" | "Call Not Answering" | "Call Waiting" | "Call busy" | "Switch Off" | "Not Reachable" | "Out Of Service") => setCallStatus(value)}
                      disabled={updating || isReadOnly}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select call status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Connected">Connected</SelectItem>
                        <SelectItem value="Call Not Answering">Call Not Answering</SelectItem>
                        <SelectItem value="Call Waiting">Call Waiting</SelectItem>
                        <SelectItem value="Call busy">Call Busy</SelectItem>
                        <SelectItem value="Switch Off">Switch Off</SelectItem>
                        <SelectItem value="Not Reachable">Not Reachable</SelectItem>
                        <SelectItem value="Out Of Service">Out Of Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Call Duration</label>
                    <Input
                      type="text"
                      value={callDuration}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow partial input while typing, but ensure it follows the pattern
                        if (value === '' || /^\d{0,2}(:\d{0,2})?$/.test(value)) {
                          setCallDuration(value);
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        // Ensure proper format on blur - if not valid, clear it
                        if (value && !/^\d{1,2}:\d{2}$/.test(value)) {
                          setCallDuration('');
                        }
                      }}
                      placeholder="e.g., 1:23, 23:45"
                      disabled={updating || isReadOnly}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Resolution Time</label>
                    <Input
                      type="text"
                      value={resolutionTime}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow partial input while typing, but ensure it follows the pattern
                        if (value === '' || /^\d{0,2}(:\d{0,2})?$/.test(value)) {
                          setResolutionTime(value);
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        // Ensure proper format on blur - if not valid, clear it
                        if (value && !/^\d{1,2}:\d{2}$/.test(value)) {
                          setResolutionTime('');
                        }
                      }}
                      placeholder="e.g., 1:23, 23:45"
                      disabled={updating || isReadOnly}
                      className="w-full"
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm">
                      Attempts: <span className="font-medium">{currentTicket.call_attempts}</span>
                    </p>
                    {currentTicket.cse_called_date && (
                      <p className="text-sm mt-1">
                        Last Call: <span className="font-medium">
                          {new Date(currentTicket.cse_called_date).toLocaleString()}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Issue Details */}
          <div className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-md">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-primary" />
                <p className="font-medium">Issue Details</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Primary Reason</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-md">
                    {currentTicket.reason || 'No reason provided'}
                  </p>
                </div>
                {currentTicket.other_reasons && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Other Reasons</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-md">
                      {currentTicket.other_reasons}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* CSE Remarks */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                CSE Remarks
              </label>
              <Textarea
                value={cseRemarks}
                onChange={(e) => setCseRemarks(e.target.value)}
                placeholder="Add your remarks about this ticket..."
                className="min-h-[100px]"
                disabled={updating || isReadOnly}
              />
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
          {/* <button
            onClick={prevSlide}
            className="bg-gray-200 text-black px-6 py-2 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={updating}
          >
            Previous
          </button> */}
          <button
            onClick={handleSubmit}
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={updating || isReadOnly}
          >
            {updating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </>
            ) : isReadOnly ? (
              'Close'
            ) : (
              'Save & Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}; 