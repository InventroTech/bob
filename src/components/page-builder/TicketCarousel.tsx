import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Tag, ChevronDown, Phone, Star, Clock, MessageSquare, Award, CheckCircle2, XCircle, AlertCircle, PieChart, Coffee, Waypoints } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { API_URI } from '@/const';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PendingTicketsCard, TicketStats } from "@/components/ui/PendingTicketsCard";

interface Ticket {
  id: number;
  created_at: string;
  ticket_date: string;
  user_id: string;
  name: string;
  phone: string;
  source: string;
  subscription_status: string | null;
  atleast_paid_once: boolean | null;
  reason: string;
  other_reasons: string[] | string | null;
  badge: string | null;
  poster: string | null;
  tenant_id: string;
  assigned_to: string | null;
  layout_status: string;
  resolution_status: "Resolved" | "WIP" | "Pending" | "Already Resolved" | "No Issue" | "Not Possible" | "Feature Requested";
  resolution_time: string | null;
  cse_name: string | null;
  cse_remarks: string | null;
  call_status: string | null;
  call_attempts: number | null;
  rm_name: string | null;
  completed_at: string | null;
  snooze_until: string | null;
  praja_dashboard_user_link: string | null;
  display_pic_url: string | null;
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
    created_at: new Date().toISOString(),
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
    poster: null,
    tenant_id: "demo-tenant",
    assigned_to: null,
    layout_status: "Standard View",
    resolution_status: "Pending",
    resolution_time: null,
    cse_name: null,
    cse_remarks: null,
    call_status: null,
    call_attempts: null,
    rm_name: null,
    completed_at: null,
    snooze_until: null,
    praja_dashboard_user_link: null,
    display_pic_url: null
  },
  {
    id: 2,
    created_at: new Date(Date.now() - 86400000).toISOString(),
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
    poster: null,
    tenant_id: "demo-tenant",
    assigned_to: "demo-cse@example.com",
    layout_status: "Standard View",
    resolution_status: "WIP",
    resolution_time: null,
    cse_name: "Rahul Kumar",
    cse_remarks: "Investigating subscription status.",
    call_status: "Connected",
    call_attempts: 1,
    rm_name: null,
    completed_at: null,
    snooze_until: null,
    praja_dashboard_user_link: null,
    display_pic_url: null
  },
  {
    id: 3,
    created_at: new Date(Date.now() - 172800000).toISOString(),
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
    poster: null,
    tenant_id: "demo-tenant",
    assigned_to: null,
    layout_status: "Custom View",
    resolution_status: "Not Possible",
    resolution_time: null,
    cse_name: null,
    cse_remarks: null,
    call_status: "Not Reachable",
    call_attempts: 0,
    rm_name: null,
    completed_at: null,
    snooze_until: null,
    praja_dashboard_user_link: null,
    display_pic_url: null
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
  const [resolutionStatus, setResolutionStatus] = useState<"WIP" | "Resolved" | "Can't Resolved">(initialTicket?.resolution_status === "Resolved" ? "Resolved" : initialTicket?.resolution_status === "WIP" ? "WIP" : "Can't Resolved");
  const [callStatus, setCallStatus] = useState<"Connected" | "Not Connected">(initialTicket?.call_status === "Connected" ? "Connected" : "Not Connected");
  const [cseRemarks, setCseRemarks] = useState(initialTicket?.cse_remarks || "");
  const [selectedOtherReasons, setSelectedOtherReasons] = useState<string[]>(parseOtherReasons(initialTicket?.other_reasons));
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [ticketStartTime, setTicketStartTime] = useState<Date | null>(null);

  // If initialTicket is provided, use it instead of fetching
  const isReadOnly = config?.readOnly || false;

  // Function to calculate resolution time
  const calculateResolutionTime = (): string => {
    if (!ticketStartTime) return "";
    
    const endTime = new Date();
    const diffInSeconds = Math.floor((endTime.getTime() - ticketStartTime.getTime()) / 1000);
    
    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

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
        setResolutionStatus(ticketData.resolution_status === "Resolved" ? "Resolved" : ticketData.resolution_status === "WIP" ? "WIP" : "Can't Resolved");
        setCseRemarks(ticketData.cse_remarks || "");
        setCallStatus(ticketData.call_status === "Connected" ? "Connected" : "Not Connected");
        setSelectedOtherReasons(parseOtherReasons(ticketData.other_reasons));
        setShowPendingCard(false);
        // Set the start time when ticket is fetched
        setTicketStartTime(new Date());
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
      // Only unassign if the ticket is not in WIP status
      if (currentTicket?.id && resolutionStatus !== "WIP") {
        await unassignTicket(currentTicket.id);
        toast.info('Ticket unassigned. Taking a break.');
      } else if (resolutionStatus === "WIP") {
        toast.info('Ticket is in progress. Taking a break without unassigning.');
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
        // Only unassign if the ticket is not in WIP status
        if (resolutionStatus !== "WIP") {
          await unassignTicket(currentTicket.id);
          toast.info('Ticket unassigned due to tab change. Click "Get Tickets" to continue.');
        } else {
          toast.info('Ticket is in progress. Tab change detected but ticket remains assigned.');
        }
        
        setShowPendingCard(true);
        setCurrentTicket(null);
        await fetchTicketStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentTicket?.id, resolutionStatus]);

  // Fetch ticket statistics on component mount
  useEffect(() => {
    fetchTicketStats();
  }, []);

  // Refresh ticket statistics every 30 seconds when showing pending card
  useEffect(() => {
    if (!showPendingCard) return; // Only refresh when showing pending card

    const interval = setInterval(() => {
      fetchTicketStats();
      toast.info('Ticket statistics refreshed');
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [showPendingCard]);

  // Update state when initialTicket changes
  useEffect(() => {
    if (initialTicket) {
      setCurrentTicket(initialTicket);
      setResolutionStatus(initialTicket.resolution_status === "Resolved" ? "Resolved" : initialTicket.resolution_status === "WIP" ? "WIP" : "Can't Resolved");
      setCseRemarks(initialTicket.cse_remarks || "");
      setCallStatus(initialTicket.call_status === "Connected" ? "Connected" : "Not Connected");
      setSelectedOtherReasons(parseOtherReasons(initialTicket.other_reasons));
      setShowPendingCard(false);
      // Set the start time when initial ticket is provided
      setTicketStartTime(new Date());
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
      
      // Calculate resolution time automatically
      const calculatedResolutionTime = calculateResolutionTime();
      
      // Calculate snooze_until based on call status and attempts
      let snoozeUntil = null;
      const isCallNotConnected = callStatus === "Not Connected";
      
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

      // Determine assignment based on resolution status
      const shouldAssign = resolutionStatus === "WIP";
      const assignedTo = shouldAssign ? user?.id || 'Unknown CSE' : null;

      // Step 1: Update ticket data from frontend side using Supabase
      const { data: updatedTicket, error: updateError } = await supabase
        .from('support_ticket')
        .update({
          resolution_status: resolutionStatus,
          assigned_to: assignedTo,
          cse_remarks: cseRemarks,
          cse_name: user?.email || 'Unknown CSE',
          call_status: callStatus,
          resolution_time: calculatedResolutionTime || null,
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
        assigned_to: assignedTo,
        cse_remarks: cseRemarks,
        cse_name: user?.email || 'Unknown CSE',
        call_status: callStatus,
        resolution_time: calculatedResolutionTime || null,
        call_attempts: currentTicket.call_attempts + 1,
        completed_at: currentTime,
        snooze_until: snoozeUntil,
        other_reasons: selectedOtherReasons
      };

      setCurrentTicket(updatedTicketData);
      
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
      <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white p-4">
        <div className="space-y-4">
          {/* Header Section */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-primary">
                {config?.title || 'Support Tickets'}
              </h2>
              <div className="flex items-center gap-4 mt-1">
                {currentTicket?.badge && currentTicket.badge !== 'N/A' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Badge:</span>
                    <span className="text-xs font-medium">{currentTicket.badge}</span>
                  </div>
                )}
                {currentTicket?.subscription_status && currentTicket.subscription_status !== 'N/A' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Subscription:</span>
                    <span className="text-xs font-medium">{currentTicket.subscription_status}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleTakeBreak}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={updating || isReadOnly}
              >
                <Coffee className="h-3 w-3" />
                Take a Break
              </Button>
              <Select 
                value={resolutionStatus} 
                onValueChange={async (value: "WIP" | "Resolved" | "Can't Resolved") => {
                  setResolutionStatus(value);
                  
                  // If WIP is selected, immediately assign the ticket to the CSE
                  if (value === "WIP" && currentTicket?.id && !isReadOnly) {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (session) {
                        await supabase
                          .from('support_ticket')
                          .update({
                            assigned_to: user?.id || 'Unknown CSE',
                            cse_name: user?.email || 'Unknown CSE'
                          })
                          .eq('id', currentTicket.id);
                        
                        // Update local state
                        setCurrentTicket(prev => ({
                          ...prev,
                          assigned_to: user?.id || 'Unknown CSE',
                          cse_name: user?.email || 'Unknown CSE'
                        }));
                        
                      }
                    } catch (error) {
                      console.error('Error assigning ticket:', error);
                      toast.error('Failed to assign ticket');
                    }
                  }
                }}
                disabled={updating || isReadOnly}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WIP">Work in Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Can't Resolved">Can't Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                {currentTicket?.display_pic_url ? (
                  <img 
                    src={currentTicket.display_pic_url} 
                    alt={`${currentTicket.name || 'User'} profile`}
                    className="h-6 w-6 rounded-full mr-2 object-cover"
                    onError={(e) => {
                      // Fallback to User icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <User className={`h-3 w-3 mr-2 text-primary ${currentTicket?.display_pic_url ? 'hidden' : ''}`} />
                <div>
                  <p className="font-medium text-sm">{currentTicket?.name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">ID: {currentTicket?.user_id || 'N/A'}</p>
                </div>
              </div>
              {currentTicket?.rm_name && (
                <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                  <User className="h-3 w-3 mr-2 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">RM Name</p>
                    <p className="font-medium text-sm">{currentTicket.rm_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                <Phone className="h-3 w-3 mr-2 text-primary" />
                <span className="font-medium text-sm">{currentTicket?.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                <Waypoints className="h-3 w-3 mr-2 text-primary" />
                <span className="font-medium text-sm">{currentTicket?.source || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                {currentTicket?.atleast_paid_once ? (
                  <CheckCircle2 className="h-3 w-3 mr-2 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 mr-2 text-red-500" />
                )}
                <span className="font-medium text-sm">
                  Payment Status (Atleast once): {currentTicket?.atleast_paid_once ? "Paid" : "Never Paid"}
                </span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                <Clock className="h-3 w-3 mr-2 text-primary" />
                <span className="font-medium text-sm">
                  Attempts: {currentTicket?.call_attempts || 0}
                </span>
              </div>
            </div>

            {/* Issue Details */}
            <div className="space-y-3">
              <div className="bg-muted/30 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-3 w-3 text-primary" />
                  <p className="font-medium text-sm">Issue Details</p>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Primary Reason</p>
                    <p className="text-sm bg-muted/50 p-2 rounded-md">
                      {currentTicket?.reason || 'No reason provided'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Other Reasons</p>
                    <div className="space-y-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full justify-between"
                            disabled={updating || isReadOnly}
                          >
                            <span className="text-sm">
                              {selectedOtherReasons.length > 0 
                                ? `${selectedOtherReasons.length} reason(s) selected`
                                : 'Select other reasons'
                              }
                            </span>
                            <ChevronDown className="h-3 w-3 opacity-50" />
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
                        <div className="flex flex-wrap gap-1">
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
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-3 w-3 text-primary" />
                  CSE Remarks
                </label>
                <Textarea
                  value={cseRemarks}
                  onChange={(e) => setCseRemarks(e.target.value)}
                  placeholder="Add your remarks about this ticket..."
                  className="min-h-[80px]"
                  disabled={updating || isReadOnly}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-3 mt-4 pt-3 border-t">
          <div className="flex gap-2">
            <Button
              onClick={() => setCallStatus("Connected")}
              size="sm"
              variant={callStatus === "Connected" ? "default" : "outline"}
              className={`${
                callStatus === "Connected" 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-white text-green-600 border-green-600 hover:bg-green-50"
              } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={updating || isReadOnly}
            >
              Connected
            </Button>
            <Button
              onClick={() => setCallStatus("Not Connected")}
              size="sm"
              variant={callStatus === "Not Connected" ? "default" : "outline"}
              className={`${
                callStatus === "Not Connected" 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "bg-white text-red-600 border-red-600 hover:bg-red-50"
              } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={updating || isReadOnly}
            >
              Not Connected
            </Button>
          </div>
          <Button
            onClick={handleSubmit}
            size="sm"
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={updating || isReadOnly}
          >
            {updating ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
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