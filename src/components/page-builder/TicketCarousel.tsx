import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Tag, ChevronDown, Phone, Star, Clock, MessageSquare, Award, CheckCircle2, XCircle, AlertCircle, PieChart, Coffee } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { API_URI } from '@/const';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  other_reasons: string[] | string;
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

// Predefined other reasons options
const OTHER_REASONS_OPTIONS = [
  "Technical Issue",
  "Billing Problem",
  "Account Access",
  "Feature Request",
  "Bug Report",
  "Performance Issue",
  "Security Concern",
  "Data Issue",
  "Integration Problem",
  "User Training",
  "Documentation Request",
  "Service Outage",
  "Configuration Issue",
  "Compatibility Problem",
  "Other"
];

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
    other_reasons: ["Technical Issue", "Account Access"],
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
    other_reasons: ["Billing Problem", "Feature Request"],
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
    other_reasons: ["Feature Request", "User Training"],
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

// Helper function to convert other_reasons to array
const parseOtherReasons = (otherReasons: any): string[] => {
  if (!otherReasons) return [];
  if (Array.isArray(otherReasons)) return otherReasons;
  if (typeof otherReasons === 'string') {
    // Try to parse as JSON, fallback to comma-separated
    try {
      return JSON.parse(otherReasons);
    } catch {
      return otherReasons.split(',').map((r: string) => r.trim()).filter(Boolean);
    }
  }
  return [];
};

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

// Pending tickets data interface
interface TicketStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  notPossible: number;
}

// Simple pie chart component
const PieChartComponent = ({ data }: { data: TicketStats }) => {
  const total = data.total;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-2xl font-bold">0</div>
          <div className="text-xs">No tickets</div>
        </div>
      </div>
    );
  }

  const pendingPercent = (data.pending / total) * 100;
  const inProgressPercent = (data.inProgress / total) * 100;
  const resolvedPercent = (data.resolved / total) * 100;
  const notPossiblePercent = (data.notPossible / total) * 100;

  return (
    <div className="flex items-center justify-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Pending - Yellow */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="8"
            strokeDasharray={`${(pendingPercent / 100) * 251.2} 251.2`}
            strokeDashoffset="0"
          />
          {/* In Progress - Blue */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeDasharray={`${(inProgressPercent / 100) * 251.2} 251.2`}
            strokeDashoffset={`-${(pendingPercent / 100) * 251.2}`}
          />
          {/* Resolved - Green */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            strokeDasharray={`${(resolvedPercent / 100) * 251.2} 251.2`}
            strokeDashoffset={`-${((pendingPercent + inProgressPercent) / 100) * 251.2}`}
          />
          {/* Not Possible - Red */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#ef4444"
            strokeWidth="8"
            strokeDasharray={`${(notPossiblePercent / 100) * 251.2} 251.2`}
            strokeDashoffset={`-${((pendingPercent + inProgressPercent + resolvedPercent) / 100) * 251.2}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{data.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pending tickets card component
const PendingTicketsCard = ({ onGetFirstTicket, loading, ticketStats }: { 
  onGetFirstTicket: () => void, 
  loading: boolean,
  ticketStats: TicketStats
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <PieChart className="h-8 w-8 text-primary mr-2" />
              <h2 className="text-2xl font-semibold text-gray-800">Pending Tickets</h2>
            </div>
            <p className="text-gray-600 mb-6">Click to start working on tickets</p>
          </div>

          <div className="mb-6">
            <PieChartComponent data={ticketStats} />
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">Pending</span>
              </div>
              <span className="text-sm font-medium">{ticketStats.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">Others</span>
              </div>
              <span className="text-sm font-medium">{ticketStats.inProgress}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">Resolved</span>
              </div>
              <span className="text-sm font-medium">{ticketStats.resolved}</span>
            </div>
            
          </div>

          <Button 
            onClick={onGetFirstTicket} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading...
              </>
            ) : (
              'Get Tickets'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export const TicketCarousel: React.FC<TicketCarouselProps> = ({ config, initialTicket, onUpdate }) => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [currentTicket, setCurrentTicket] = useState<any>(initialTicket || null);
  const [showPendingCard, setShowPendingCard] = useState(!initialTicket);
  const [ticketStats, setTicketStats] = useState<TicketStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    notPossible: 0
  });
  const [resolutionStatus, setResolutionStatus] = useState<"Resolved" | "WIP" | "Pending" | "Already Resolved" | "No Issue" | "Not Possible" | "Feature Requested">(initialTicket?.resolution_status || "Pending");
  const [callStatus, setCallStatus] = useState<"Connected" | "Call Not Answering" | "Call Waiting" | "Call busy" | "Switch Off" | "Not Reachable" | "Out Of Service">(initialTicket?.call_status || "Call Waiting");
  const [cseRemarks, setCseRemarks] = useState(initialTicket?.cse_remarks || "");
  const [callDuration, setCallDuration] = useState(initialTicket?.call_duration || "");
  const [resolutionTime, setResolutionTime] = useState(initialTicket?.resolution_time || "");
  const [selectedOtherReasons, setSelectedOtherReasons] = useState<string[]>(parseOtherReasons(initialTicket?.other_reasons));
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // If initialTicket is provided, use it instead of fetching
  const isReadOnly = config?.readOnly || false;

  // Function to unassign current ticket
  const unassignTicket = async (ticketId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('support_ticket')
        .update({
          assigned_to: null,
          cse_name: null
        })
        .eq('id', ticketId);

      console.log('Ticket unassigned successfully');
    } catch (error) {
      console.error('Error unassigning ticket:', error);
    }
  };

  // Function to fetch ticket statistics
  const fetchTicketStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch ticket statistics from the Edge Function
      const response = await fetch('https://hihrftwrriygnbrsvlrr.supabase.co/functions/v1/get-ticket-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the API response to match our TicketStats interface
      const stats: TicketStats = {
        total: data.total_tickets || 0,
        pending: data.total_pending_tickets || 0,
        inProgress: 0, // Not provided by API, will be calculated
        resolved: data.total_completed_tickets || 0,
        notPossible: 0 // Not provided by API, will be calculated
      };

      // Calculate inProgress and notPossible from the difference
      const calculatedInProgress = Math.max(0, stats.total - stats.pending - stats.resolved);
      stats.inProgress = calculatedInProgress;

      setTicketStats(stats);
    } catch (error) {
      console.error('Error fetching ticket statistics:', error);
      // Set default stats on error
      setTicketStats({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        notPossible: 0
      });
    }
  };

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const endpoint = config?.apiEndpoint || '/api/tickets';
      const apiUrl = `${API_URI}${endpoint}`;
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ticketData = await response.json();
      
      if (ticketData && typeof ticketData === 'object') {
        setCurrentTicket(ticketData);
        setResolutionStatus(ticketData.resolution_status || "Pending");
        setCseRemarks(ticketData.cse_remarks || "");
        setCallStatus(ticketData.call_status || "Call Waiting");
        setCallDuration(ticketData.call_duration || "");
        setResolutionTime(ticketData.resolution_time || "");
        setSelectedOtherReasons(parseOtherReasons(ticketData.other_reasons));
        setShowPendingCard(false);
        toast.success('Ticket loaded successfully');
      } else {
        throw new Error('Invalid ticket data received');
      }
    } catch (error: any) {
      console.error('Error fetching ticket:', error);
      toast.error(error.message || 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeBreak = async () => {
    try {
      // Unassign the current ticket if it exists
      if (currentTicket?.id) {
        await unassignTicket(currentTicket.id);
        toast.info('Ticket unassigned. Taking a break.');
      }
      
      setShowPendingCard(true);
      setCurrentTicket(null);
      
      // Refresh ticket statistics
      await fetchTicketStats();
      
      toast.info('Taking a break. Click "Get Tickets" when ready to continue.');
    } catch (error) {
      console.error('Error taking break:', error);
      toast.error('Error taking break. Please try again.');
    }
  };

  // Handle tab visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && currentTicket?.id) {
        // User switched tabs or minimized window
        await unassignTicket(currentTicket.id);
        setShowPendingCard(true);
        setCurrentTicket(null);
        await fetchTicketStats();
        toast.info('Ticket unassigned due to tab change. Click "Get Tickets" to continue.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentTicket?.id]);

  // Fetch ticket statistics on component mount
  useEffect(() => {
    fetchTicketStats();
  }, []);

  // Update state when initialTicket changes
  useEffect(() => {
    if (initialTicket) {
      setCurrentTicket(initialTicket);
      setResolutionStatus(initialTicket.resolution_status || "Pending");
      setCseRemarks(initialTicket.cse_remarks || "");
      setCallStatus(initialTicket.call_status || "Call Waiting");
      setCallDuration(initialTicket.call_duration || "");
      setResolutionTime(initialTicket.resolution_time || "");
      setSelectedOtherReasons(parseOtherReasons(initialTicket.other_reasons));
      setShowPendingCard(false);
    }
  }, [initialTicket]);

  const handleOtherReasonChange = (reason: string, checked: boolean) => {
    if (checked) {
      setSelectedOtherReasons(prev => [...prev, reason]);
    } else {
      setSelectedOtherReasons(prev => prev.filter(r => r !== reason));
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

      // Step 1: Update ticket data from frontend side using Supabase
      const { data: updatedTicket, error: updateError } = await supabase
        .from('support_ticket')
        .update({
          resolution_status: resolutionStatus,
          assigned_to: null,
          cse_remarks: cseRemarks,
          cse_name: user?.email || 'Unknown CSE',
          cse_called_date: currentTime,
          call_status: callStatus,
          call_duration: callDuration,
          resolution_time: resolutionTime || null,
          call_attempts: currentTicket.call_attempts + 1,
          completed_at: currentTime,
          snooze_until: snoozeUntil,
          other_reasons: selectedOtherReasons
        })
        .eq('id', currentTicket.id)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;

      // Update local state with the updated ticket
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
        snooze_until: snoozeUntil,
        other_reasons: selectedOtherReasons
      };

      setCurrentTicket(updatedTicketData);
      toast.success('Ticket saved successfully');

      // Call the onUpdate callback if provided
      if (onUpdate) {
        onUpdate(updatedTicketData);
      }

      // Fetch next ticket
      await fetchTicket();
      
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

  if (showPendingCard) {
    return <PendingTicketsCard onGetFirstTicket={fetchTicket} loading={loading} ticketStats={ticketStats} />;
  }

  if (!currentTicket) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <p>No ticket available</p>
        <Button onClick={fetchTicket} disabled={loading}>
          Get Tickets
        </Button>
      </div>
    );
  }

  // Get formatted date with fallback
  const formattedDate = currentTicket?.ticket_date 
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
                  {currentTicket?.badge || 'N/A'}
                </Badge>
                <Badge variant="outline" className={`
                  ${currentTicket?.subscription_status === 'Premium' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                    currentTicket?.subscription_status === 'Basic' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                    'bg-gray-50 text-gray-700 border-gray-200'}
                `}>
                  {currentTicket?.subscription_status || 'N/A'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleTakeBreak}
                variant="outline"
                className="flex items-center gap-2"
                disabled={updating || isReadOnly}
              >
                <Coffee className="h-4 w-4" />
                Take a Break
              </Button>
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
                  <p className="font-medium">{currentTicket?.name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">ID: {currentTicket?.user_id || 'N/A'}</p>
                </div>
              </div>
              {currentTicket?.rm_name && (
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
                <span className="font-medium">{currentTicket?.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                <Tag className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">{currentTicket?.source || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-3 rounded-md">
                {currentTicket?.atleast_paid_once ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                )}
                <span className="font-medium">
                  Payment Status (Atleast once): {currentTicket?.atleast_paid_once ? "Paid" : "Never Paid"}
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
                      Attempts: <span className="font-medium">{currentTicket?.call_attempts || 0}</span>
                    </p>
                    {currentTicket?.cse_called_date && (
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
                    {currentTicket?.reason || 'No reason provided'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Other Reasons</p>
                  <div className="space-y-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between"
                          disabled={updating || isReadOnly}
                        >
                          <span>
                            {selectedOtherReasons.length > 0 
                              ? `${selectedOtherReasons.length} reason(s) selected`
                              : 'Select other reasons'
                            }
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4" align="start">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Select Other Reasons</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {OTHER_REASONS_OPTIONS.map((reason) => (
                              <div key={reason} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`reason-${reason}`}
                                  checked={selectedOtherReasons.includes(reason)}
                                  onCheckedChange={(checked) => handleOtherReasonChange(reason, checked as boolean)}
                                  disabled={updating || isReadOnly}
                                />
                                <label
                                  htmlFor={`reason-${reason}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {reason}
                                </label>
                              </div>
                            ))}
                          </div>
                          {selectedOtherReasons.length > 0 && (
                            <div className="pt-2 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOtherReasons([])}
                                disabled={updating || isReadOnly}
                                className="text-xs"
                              >
                                Clear All
                              </Button>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    {/* Display selected reasons as badges */}
                    {selectedOtherReasons.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedOtherReasons.map((reason) => (
                          <Badge 
                            key={reason} 
                            variant="secondary"
                            className="text-xs"
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
          <Button
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
          </Button>
        </div>
      </div>
    </div>
  );
}; 