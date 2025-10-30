import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { timePicker } from "analogue-time-picker";
import Lottie from "lottie-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Coffee,
  ChevronDown,
  X,
  Clock,
  Calendar as CalendarLucide,
  ExternalLink,
} from "lucide-react";

interface LeadCardCarouselProps {
  config?: {
    title?: string;
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
  };
}

interface LeadData {
  id: number;
  created_at: string;
  name: string;
  email: string;
  phone?: string;
  phone_no?: string;
  company: string;
  position: string;
  source?: string;
  lead_source?: string;
  status: string;
  priority: string;
  notes: string;
  budget: number;
  location: string;
  tags: string[];
  display_pic_url: string;
  linkedin_profile: string;
  website: string;
  next_follow_up: string;
  // New fields as per requirements
  lead_stage: string;
  customer_full_name: string;
  user_id: string;
  affiliated_party: string;
  rm_dashboard: string;
  user_profile_link: string;
  whatsapp_link: string;
  package_to_pitch: string;
  premium_poster_count: number;
  last_active_date?: string;
  last_active_date_time?: string;
  latest_remarks: string;
}

interface LeadStats {
  total: number;
  fresh_leads: number;
  leads_won: number;
  wip_leads: number;
  lost_leads: number;
}

interface LeadState {
  leadStatus: string;
  priority: string;
  notes: string;
  selectedTags: string[];
  nextFollowUp: string;
  leadStartTime: Date;
}

const LeadCardCarousel: React.FC<LeadCardCarouselProps> = ({ config }) => {
  const { toast } = useToast();
  const [currentLead, setCurrentLead] = useState<LeadData | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStats>({
    total: 0,
    fresh_leads: 0,
    leads_won: 0,
    wip_leads: 0,
    lost_leads: 0,
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fetchingNext, setFetchingNext] = useState(false);
  const [showPendingCard, setShowPendingCard] = useState(true);
  const [hasCheckedForLeads, setHasCheckedForLeads] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHour, setSelectedHour] = useState<number>(12);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [isAM, setIsAM] = useState<boolean>(true);
  const [clockMode, setClockMode] = useState<'hour' | 'minute'>('hour'); // Toggle between hour and minute
  const [inspirationalMessage, setInspirationalMessage] = useState<string>('');
  const [showTime, setShowTime] = useState<any>(null);
  const [animationData, setAnimationData] = useState<any>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const clockRef = useRef<HTMLDivElement | null>(null);
  
  // Reset showTime when popover opens to ensure fresh initialization
  useEffect(() => {
    if (popoverOpen) {
      setShowTime(null);
      // Wait a bit for the DOM to be ready
      setTimeout(() => {
        if (clockRef.current) {
          try {
            const instance = timePicker({
              element: clockRef.current,
              mode: 12,
              width: "300px",
              time: { hour: selectedHour, minute: selectedMinute }
            });
            setShowTime(instance);
          } catch (error) {
            console.error('Error initializing clock:', error);
          }
        }
      }, 200);
    }
  }, [popoverOpen]);
  
  // Callback ref to set the ref
  const setClockRef = (element: HTMLDivElement | null) => {
    clockRef.current = element;
  };
  const [lead, setLead] = useState<LeadState>({
    leadStatus: "New",
    priority: "Medium",
    notes: "",
    selectedTags: [],
    nextFollowUp: "",
    leadStartTime: new Date(),
  });

  const isInitialized = useRef(false);

  // Inspirational messages for workers
  const inspirationalMessages = [
    "Every call brings you closer to success! 💪",
    "Your dedication drives results! 🚀",
    "Turn challenges into opportunities! 🌟",
    "Every lead is a chance to make a difference! 💎",
    "You're building relationships that matter! 🤝",
    "Success is calling - answer it! 📞",
    "Each interaction creates value! ✨",
    "You've got this! Keep pushing forward! 💯"
  ];

  // Utility functions
  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return "N/A";
    return phone.replace(/(\d{2})(\d{5})(\d{5})/, "$1 $2 $3");
  };

  const parseTags = (tags: string[] | string) => {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string") return tags.split(",").map(tag => tag.trim());
    return [];
  };

  // Fetching the lead stats
  const fetchLeadStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use configured status data API endpoint or fallback to default
      const statusEndpoint = config?.statusDataApiEndpoint || "/get-lead-status";
      
      const response = await fetch(
        `${import.meta.env.VITE_RENDER_API_URL}${statusEndpoint}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLeadStats(data);
    } catch (error) {
      console.error("Error fetching lead stats:", error);
    }
  };

  // Fetching the first lead
  const fetchFirstLead = async () => {
    try {
      setLoading(true);
      setPopoverOpen(false);
      
      const endpoint = config?.apiEndpoint || "/api/leads";
      const apiUrl = `${import.meta.env.VITE_RENDER_API_URL}${endpoint}`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setHasCheckedForLeads(true);
          setShowPendingCard(true);
          setCurrentLead(null);
          resetLeadState();
          isInitialized.current = false;
          await fetchLeadStats();
          toast({
            title: "Info",
            description: "No leads available at the moment.",
            variant: "default",
          });
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const leadData = await response.json();

      // Check if leadData is empty (handles null, undefined, empty object, empty array)
      const isEmpty = !leadData || 
                      (Array.isArray(leadData) && leadData.length === 0) ||
                      (typeof leadData === "object" && !Array.isArray(leadData) && Object.keys(leadData).length === 0) ||
                      (typeof leadData === "string" && leadData.trim() === "");

      if (isEmpty) {
        setHasCheckedForLeads(true);
        setShowPendingCard(true);
        setCurrentLead(null);
        resetLeadState();
        isInitialized.current = false;
        await fetchLeadStats();
        toast({
          title: "Info",
          description: "No leads available at the moment.",
          variant: "default",
        });
        return;
      }

      setHasCheckedForLeads(true);

      setCurrentLead(leadData);
      setShowPendingCard(false);
      setLead(prev => ({
        ...prev,
        leadStatus: leadData.status || "New",
        priority: leadData.priority || "Medium",
        notes: leadData.notes || "",
        selectedTags: parseTags(leadData.tags || []),
        nextFollowUp: leadData.next_follow_up || "",
        leadStartTime: new Date(),
      }));

      isInitialized.current = true;
      await fetchLeadStats();
      
    } catch (error) {
      console.error("Error fetching lead:", error);
      toast({
        title: "Error",
        description: "Failed to load lead. Please try again.",
        variant: "destructive",
      });
      setShowPendingCard(true);
      setCurrentLead(null);
      resetLeadState();
      isInitialized.current = false;
      await fetchLeadStats();
    } finally {
      setLoading(false);
    }
  };

  const resetLeadState = () => {
    setLead({
      leadStatus: "New",
      priority: "Medium",
      notes: "",
      selectedTags: [],
      nextFollowUp: "",
      leadStartTime: new Date(),
    });
  };

  const handleActionButton = async (action: "Not Connected" | "Call Later" | "Lost" | "Won") => {
    if (!currentLead?.id) {
      toast({ title: "Error", description: "No lead to act on", variant: "destructive" });
      return;
    }

    // For Not Connected, send call_later event with user's notes
    if (action === "Not Connected") {
      try {
        setUpdating(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Authentication required");

        const base = import.meta.env.VITE_RENDER_API_URL;
        const url = `${base}/crm-records/records/events/`;
        const body = {
          event: "lead.call_later_clicked",
          record_id: currentLead.id,
          payload: {
            latest_remarks: lead.notes || "",
          },
        };

        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        toast({ title: "Success", description: "Sent: Not Connected", variant: "default" });
        await fetchFirstLead();
      } catch (error: any) {
        console.error("Error sending not connected event:", error);
        toast({ title: "Error", description: error.message || "Failed to send event", variant: "destructive" });
      } finally {
        setUpdating(false);
      }
      return;
    }

    // For Won/Lost, send events to backend as specified
    if (action === "Won" || action === "Lost") {
      try {
        setUpdating(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Authentication required");

        const base = import.meta.env.VITE_RENDER_API_URL;
        const url = `${base}/crm-records/records/events/`;
        const body = {
          event: action === "Won" ? "lead.win_clicked" : "lead.lost_clicked",
          record_id: currentLead.id,
          payload: {
            latest_remarks: action === "Won" ? "I just love praja's product" : "I just hate praja's product",
          },
        };

        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        toast({ title: "Success", description: `Sent: ${action}`, variant: "default" });
        await fetchFirstLead();
      } catch (error: any) {
        console.error("Error sending event:", error);
        toast({ title: "Error", description: error.message || "Failed to send event", variant: "destructive" });
      } finally {
        setUpdating(false);
      }
      return;
    }

    // Default behavior for other actions stays as-is (simulated)
    try {
      setUpdating(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: "Success", description: `Lead marked as: ${action}`, variant: "default" });
      await fetchFirstLead();
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({ title: "Error", description: "Failed to update lead. Please try again.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleTakeBreak = async () => {
    if (!currentLead?.id) {
      toast({ title: "Error", description: "No lead to act on", variant: "destructive" });
      return;
    }
    try {
      setUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Authentication required");

      const base = import.meta.env.VITE_RENDER_API_URL;
      const url = `${base}/crm-records/records/events/`;
      const body = {
        event: "agent.take_break",
        record_id: currentLead.id,
        payload: {
          latest_remarks: "Man i am taking break",
        },
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      toast({ title: "Taking break!", description: "", variant: "default" });
      // Return to landing (pending) screen
      setShowPendingCard(true);
      setCurrentLead(null);
      resetLeadState();
      isInitialized.current = false;
      await fetchLeadStats();
    } catch (error: any) {
      console.error("Error sending break event:", error);
      toast({ title: "Error", description: error.message || "Failed to send break event", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const buildNextCallISO = (): string | null => {
    if (!selectedDate) return null;
    let hour24 = selectedHour % 12;
    hour24 = isAM ? hour24 : hour24 + 12;
    const dt = new Date(selectedDate);
    dt.setHours(hour24, selectedMinute, 0, 0);
    try {
      return dt.toISOString();
    } catch {
      return null;
    }
  };

  const handleScheduleCall = async () => {
    if (!currentLead?.id) {
      toast({ title: "Error", description: "No lead to act on", variant: "destructive" });
      return;
    }
    const nextCallIso = buildNextCallISO();
    if (!nextCallIso) {
      toast({ title: "Missing time", description: "Select date and time before scheduling.", variant: "destructive" });
      return;
    }
    try {
      setUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Authentication required");

      const base = import.meta.env.VITE_RENDER_API_URL;
      const url = `${base}/crm-records/records/events/`;
      const body = {
        event: "lead.call_scheduled",
        record_id: currentLead.id,
        payload: {
          next_call_at: nextCallIso,
        },
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      toast({ title: "Scheduled!", description: "Call scheduled successfully.", variant: "default" });
      setPopoverOpen(false);
      setSelectedDate(undefined);
      setSelectedHour(12);
      setSelectedMinute(0);
      await fetchFirstLead();
    } catch (error: any) {
      console.error("Error sending schedule event:", error);
      toast({ title: "Error", description: error.message || "Failed to schedule call", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
  };

  const handleOpenProfile = () => {
    if (currentLead?.linkedin_profile || currentLead?.website) {
      setShowProfileModal(true);
    }
  };


  // Load Lottie animation
  useEffect(() => {
    // Try multiple Lottie animation URLs for motivation/success themes
    const animationUrls = [
      'https://lottie.host/embed/c7676df8-1c6b-4703-b6dd-3e861d2c90a2/tl7ZtL4MJc.json',
      'https://assets5.lottiefiles.com/packages/lf20_jcikwtux.json', // Success/motivation animation
      'https://assets5.lottiefiles.com/packages/lf20_qp1spzqv.json', // Celebration animation
    ];

    const loadAnimation = async (urlIndex = 0) => {
      if (urlIndex >= animationUrls.length) {
        console.warn('All Lottie animation URLs failed to load');
        return;
      }

      try {
        const response = await fetch(animationUrls[urlIndex], {
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAnimationData(data);
        } else {
          // Try next URL
          loadAnimation(urlIndex + 1);
        }
      } catch (error) {
        console.error(`Error loading Lottie animation from URL ${urlIndex + 1}:`, error);
        // Try next URL
        loadAnimation(urlIndex + 1);
      }
    };

    loadAnimation();
  }, []);

  // Initialize component - fetch stats only, don't fetch lead yet
  useEffect(() => {
    fetchLeadStats();
    setShowPendingCard(true);
    // Set random inspirational message
    setInspirationalMessage(inspirationalMessages[Math.floor(Math.random() * inspirationalMessages.length)]);
  }, []);

  // Pending card
  if (showPendingCard) {
    return (
      <div className="mainCard w-full border flex flex-col justify-center items-center gap-2">
        <div className="relative w-[70%] h-full">
          <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {config?.title || "Lead Management"}
              </h3>
            </div>

            {/* Inspirational Messages for Workers */}
            <div className="mb-6 space-y-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg text-center shadow-lg">
                <p className="text-white text-xl font-semibold mb-2">
                  {inspirationalMessage}
                </p>
                <p className="text-blue-100 text-sm">
                  Ready to make your next call count?
                </p>
              </div>
              
              {/* Lottie Animation */}
              <div className="flex justify-center items-center h-64">
                {animationData ? (
                  <Lottie
                    animationData={animationData}
                    loop={true}
                    autoplay={true}
                    style={{ height: 250, width: 250 }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-gray-500 text-sm">Loading animation...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <Button 
                onClick={fetchFirstLead} 
                disabled={loading}
                className="w-full max-w-xs"
                size="lg"
              >
                {loading ? "Loading..." : "Get Leads"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="mainCard w-full border flex flex-col justify-center items-center gap-2">
        <div className="mt-4 flex w-[70%] justify-end">
          <Button
            onClick={handleTakeBreak}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={updating}
          >
            <Coffee className="h-3 w-3" />
            Take a Break
          </Button>
        </div>
        <div className="relative w-[70%] h-full">
          <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white p-4">
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading lead...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Showing the lead card
  return (
    <div className="mainCard w-full border flex flex-col justify-center items-center gap-2">
      <div className="mt-4 flex w-[70%] justify-end">
        <Button
          onClick={handleTakeBreak}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={updating}
        >
          <Coffee className="h-3 w-3" />
          Take a Break
        </Button>
      </div>
      <div className="relative w-[70%] h-full">
        <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white p-4">
          {fetchingNext && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading next lead...</p>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {/* Lead Stage - Top */}
            <div className="text-center">
              <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {currentLead?.lead_stage || "New Lead"}
              </div>
            </div>

            {/* Lead Source - Below Lead Stage */}
            <div className="text-center">
              <span className="text-sm text-muted-foreground">Source: </span>
              <span className="text-sm font-medium">{currentLead?.lead_source || currentLead?.source || "N/A"}</span>
            </div>

            {/* Main Lead Information */}
            <div className="space-y-2">
              {/* Date and Time */}
              <div className="text-sm bg-muted/50 p-2 rounded-md">
                <span className="font-medium text-sm">
                  {currentLead?.created_at ? new Date(currentLead.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  }) : "N/A"}
                </span>
              </div>

              {/* Customer Profile Section */}
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="flex items-center gap-3">
                  {currentLead?.display_pic_url ? (
                    <img
                      src={currentLead.display_pic_url}
                      alt={`${currentLead.name || "Lead"} profile`}
                      className="h-12 w-12 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <User
                    className={`h-12 w-12 text-primary ${currentLead?.display_pic_url ? "hidden" : ""}`}
                  />
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        {/* Customer Full Name - Clickable to User Profile */}
                        <a
                          href={currentLead?.user_profile_link || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-lg hover:text-blue-600 hover:underline cursor-pointer"
                        >
                          {currentLead?.customer_full_name || currentLead?.name || "N/A"}
                        </a>
                        <p className="text-xs text-muted-foreground pt-1">
                          ID: {currentLead?.user_id || "N/A"}
                        </p>
                      </div>
                      
                      {/* Affiliated Party - Next to Name */}
                      <div className="text-right">
                        <span className="text-sm font-medium text-orange-600">
                          {currentLead?.affiliated_party || "N/A"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Premium Poster Count - Below Party */}
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Premium Count: </span>
                      <span className="text-xs font-medium">{currentLead?.premium_poster_count || 0}</span>
                    </div>
                    
                    {/* Package to Pitch - Below Premium Count */}
                    <div className="mt-1">
                      <span className="text-xs text-muted-foreground">Package: </span>
                      <span className="text-xs font-medium">{currentLead?.package_to_pitch || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                {/* Phone Number with WhatsApp */}
                <div 
                  className="flex items-center text-sm bg-muted/50 p-2 rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => {
                    if (currentLead?.whatsapp_link) {
                      window.open(currentLead.whatsapp_link, '_blank');
                    } else {
                      // Support both phone and phone_no fields
                      const phoneNumber = currentLead?.phone_no || currentLead?.phone;
                      if (phoneNumber) {
                        const cleanNumber = phoneNumber.replace(/\D/g, '');
                        const whatsappUrl = `https://wa.me/${cleanNumber}`;
                        window.open(whatsappUrl, '_blank');
                      }
                    }
                  }}
                >
                  <Phone className="h-3 w-3 mr-2 text-primary" />
                  <span className="font-medium text-sm">{formatPhoneNumber(currentLead?.phone_no || currentLead?.phone) || "N/A"}</span>
                </div>

                {/* RM Dashboard Link */}
                {currentLead?.rm_dashboard && (
                  <div 
                    className="flex items-center text-sm bg-muted/50 p-2 rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => window.open(currentLead.rm_dashboard, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-2 text-primary" />
                    <span className="font-medium text-sm">RM Dashboard</span>
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div className="space-y-2">
                {/* Last Active Date and Time */}
                <div className="text-sm bg-muted/50 p-2 rounded-md">
                  <span className="text-muted-foreground">Last Active: </span>
                  <span className="font-medium">
                    {currentLead?.last_active_date_time || currentLead?.last_active_date ? new Date(currentLead.last_active_date_time || currentLead.last_active_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    }) : "N/A"}
                  </span>
                </div>

                {/* Latest Remarks */}
                <div className="text-sm bg-muted/50 p-2 rounded-md">
                  <span className="text-muted-foreground">Latest Remarks: </span>
                  <span className="font-medium">{currentLead?.latest_remarks || "No remarks"}</span>
                </div>
              </div>

              {/* Notes/Remarks Input */}
              <div className="space-y-2">
                <Label>Add Notes/Remarks</Label>
                <Textarea
                  value={lead.notes}
                  onChange={(e) => setLead(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes or remarks about this lead..."
                  className="min-h-[80px]"
                />
                {lead.notes && (
                  <Button
                    onClick={async () => {
                      try {
                        setUpdating(true);
                        // TODO: Implement API call to save notes
                        await new Promise(resolve => setTimeout(resolve, 500));
                        toast({
                          title: "Success",
                          description: "Notes saved successfully!",
                          variant: "default",
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to save notes",
                          variant: "destructive",
                        });
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    size="sm"
                    className="w-full"
                    disabled={updating}
                  >
                    {updating ? "Saving..." : "Save Notes"}
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="buttons flex flex-row items-center justify-center gap-[200px] w-full">
            <div className="flex justify-center items-center gap-3 mt-4 pt-3">
              <Button
                onClick={() => handleActionButton("Not Connected")}
                size="sm"
                variant="outline"
                className="w-32 bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={updating}
              >
                Not Connected
              </Button>
              
              {/* Call Later with DateTime Picker */}
              <Dialog open={popoverOpen} onOpenChange={setPopoverOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-32 bg-white text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={updating}
                  >
                    Call Later
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-4 max-w-fit">
                  <div className="space-y-6">
                    <div className="flex gap-6">
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">Select Date</Label>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </div>
                      <div className="space-y-3">
                      <Label className="text-base font-semibold">Select Time</Label>
                      <div className="flex items-center justify-center p-4">
                        <div className="relative w-64 h-64">
                          {/* Analog Clock */}
                          <svg className="w-64 h-64" viewBox="0 0 200 200">
                            {/* Clock circle - white background */}
                            <circle cx="100" cy="100" r="95" fill="white" stroke="rgb(102, 51, 153)" strokeWidth="3"/>
                            
                            {/* Hour marker dots */}
                            {Array.from({ length: 12 }).map((_, i) => {
                              const angle = (i * 30 - 90) * (Math.PI / 180);
                              const x = 100 + 85 * Math.cos(angle);
                              const y = 100 + 85 * Math.sin(angle);
                              return (
                                <circle key={i} cx={x} cy={y} r="3" fill="rgb(102, 51, 153)"/>
                              );
                            })}
                            
                            {/* Show only the active hand */}
                            {clockMode === 'minute' && (
                              /* Minute hand */
                              <line
                                x1="100"
                                y1="100"
                                x2={100 + 70 * Math.cos((selectedMinute * 6 - 90) * (Math.PI / 180))}
                                y2={100 + 70 * Math.sin((selectedMinute * 6 - 90) * (Math.PI / 180))}
                                stroke="rgb(102, 51, 153)"
                                strokeWidth="4"
                                strokeLinecap="round"
                              />
                            )}
                            {clockMode === 'hour' && (
                              /* Hour hand */
                              <line
                                x1="100"
                                y1="100"
                                x2={100 + 50 * Math.cos(((selectedHour % 12) * 30 + selectedMinute * 0.5 - 90) * (Math.PI / 180))}
                                y2={100 + 50 * Math.sin(((selectedHour % 12) * 30 + selectedMinute * 0.5 - 90) * (Math.PI / 180))}
                                stroke="rgb(102, 51, 153)"
                                strokeWidth="6"
                                strokeLinecap="round"
                              />
                            )}
                            
                            {/* Center dot */}
                            <circle cx="100" cy="100" r="6" fill="rgb(102, 51, 153)"/>
                          </svg>
                          
                          {/* Invisible overlay for dragging */}
                          <div 
                            className="absolute inset-0 rounded-full cursor-pointer"
                            style={{ background: 'transparent' }}
                            onMouseDown={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const centerX = rect.left + rect.width / 2;
                              const centerY = rect.top + rect.height / 2;
                              const x = e.clientX - centerX;
                              const y = e.clientY - centerY;
                              const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
                              
                              if (clockMode === 'hour') {
                                let hour = Math.round(angle / 30) % 12;
                                if (hour <= 0) hour = 12;
                                hour += isAM ? 0 : 12;
                                if (hour === 12 && isAM) hour = 0;
                                setSelectedHour(hour);
                                // Auto-advance to minute selection after hour set
                                setClockMode('minute');
                              } else {
                                let minute = Math.round(angle / 6) % 60;
                                if (minute < 0) minute += 60;
                                setSelectedMinute(minute);
                              }
                            }}
                            onMouseMove={(e) => {
                              if (e.buttons === 1) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const centerX = rect.left + rect.width / 2;
                                const centerY = rect.top + rect.height / 2;
                                const x = e.clientX - centerX;
                                const y = e.clientY - centerY;
                                const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
                                
                                if (clockMode === 'hour') {
                                  let hour = Math.round(angle / 30) % 12;
                                  if (hour <= 0) hour = 12;
                                  hour += isAM ? 0 : 12;
                                  if (hour === 12 && isAM) hour = 0;
                                  setSelectedHour(hour);
                                } else {
                                  let minute = Math.round(angle / 6) % 60;
                                  if (minute < 0) minute += 60;
                                  setSelectedMinute(minute);
                                }
                              }
                            }}
                            onMouseUp={() => {
                              if (clockMode === 'hour') setClockMode('minute');
                            }}
                            onTouchStart={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const centerX = rect.left + rect.width / 2;
                              const centerY = rect.top + rect.height / 2;
                              const touch = e.touches[0];
                              const x = touch.clientX - centerX;
                              const y = touch.clientY - centerY;
                              const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
                              
                              if (clockMode === 'hour') {
                                let hour = Math.round(angle / 30) % 12;
                                if (hour <= 0) hour = 12;
                                hour += isAM ? 0 : 12;
                                if (hour === 12 && isAM) hour = 0;
                                setSelectedHour(hour);
                                // Auto-advance to minute selection after hour set
                                setClockMode('minute');
                              } else {
                                let minute = Math.round(angle / 6) % 60;
                                if (minute < 0) minute += 60;
                                setSelectedMinute(minute);
                              }
                            }}
                            onTouchMove={(e) => {
                              e.preventDefault();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const centerX = rect.left + rect.width / 2;
                              const centerY = rect.top + rect.height / 2;
                              const touch = e.touches[0];
                              const x = touch.clientX - centerX;
                              const y = touch.clientY - centerY;
                              const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
                              
                              if (clockMode === 'hour') {
                                let hour = Math.round(angle / 30) % 12;
                                if (hour <= 0) hour = 12;
                                hour += isAM ? 0 : 12;
                                if (hour === 12 && isAM) hour = 0;
                                setSelectedHour(hour);
                              } else {
                                let minute = Math.round(angle / 6) % 60;
                                if (minute < 0) minute += 60;
                                setSelectedMinute(minute);
                              }
                            }}
                            onTouchEnd={() => {
                              if (clockMode === 'hour') setClockMode('minute');
                            }}
                          />
                        </div>
                      </div>
                      {/* Mode toggle and AM/PM selector */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setClockMode('hour')}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                            clockMode === 'hour'
                              ? 'bg-[rgb(102,51,153)] text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Hour
                        </button>
                        <button
                          onClick={() => setClockMode('minute')}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                            clockMode === 'minute'
                              ? 'bg-[rgb(102,51,153)] text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Minute
                        </button>
                      </div>
                      
                      {/* Time display with AM/PM inline */}
                      <div className="flex items-center justify-center gap-2 p-2 bg-gray-50 rounded-md">
                        <span className="text-sm text-gray-600">Selected Time:</span>
                        <span className="font-medium text-sm">
                          {selectedHour % 12 === 0 ? 12 : selectedHour % 12}:{selectedMinute.toString().padStart(2, '0')}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setIsAM(true);
                              if (selectedHour >= 12) {
                                setSelectedHour(selectedHour - 12);
                              }
                            }}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              selectedHour < 12
                                ? 'bg-[rgb(102,51,153)] text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            AM
                          </button>
                          <button
                            onClick={() => {
                              setIsAM(false);
                              if (selectedHour < 12) {
                                setSelectedHour(selectedHour + 12);
                              }
                            }}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              selectedHour >= 12
                                ? 'bg-[rgb(102,51,153)] text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-md text-sm text-center">
                        <span className="text-gray-600">Selected Time = </span>
                        <span className="font-medium">
                          {selectedHour}:{selectedMinute.toString().padStart(2, '0')}
                        </span>
                      </div>
                      </div>
                    </div>
                    {(selectedDate) && (
                      <div className="p-2 bg-blue-50 rounded-md text-sm">
                        <span className="font-medium">Scheduled for: </span>
                        {format(selectedDate, "PPP")} at {selectedHour > 12 ? selectedHour - 12 : selectedHour}:{selectedMinute.toString().padStart(2, '0')} {selectedHour >= 12 ? 'PM' : 'AM'}
                      </div>
                    )}
                    <Button
                      onClick={handleScheduleCall}
                      className="w-full"
                      disabled={!selectedDate}
                    >
                      Schedule Call
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={() => handleActionButton("Lost")}
                size="sm"
                variant="outline"
                className="w-32 bg-white text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={updating || fetchingNext}
              >
                Lost
              </Button>
              
              <Button
                onClick={() => handleActionButton("Won")}
                size="sm"
                variant="outline"
                className="w-32 bg-white text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={updating || fetchingNext}
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                    Updating...
                  </>
                ) : fetchingNext ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                    Loading Next Lead...
                  </>
                ) : (
                  "Won"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Profile Modal */}
      {showProfileModal && (currentLead?.linkedin_profile || currentLead?.website) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                {currentLead?.display_pic_url ? (
                  <img
                    src={currentLead.display_pic_url}
                    alt={`${currentLead.name || "Lead"} profile`}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <User
                  className={`h-4 w-4 text-primary ${
                    currentLead?.display_pic_url ? "hidden" : ""
                  }`}
                />
                <div>
                  <h3 className="font-semibold">{currentLead?.name || "Lead Profile"}</h3>
                  <p className="text-sm text-muted-foreground">Profile Information</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCloseProfile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentLead?.linkedin_profile && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">LinkedIn Profile</h4>
                    <a
                      href={currentLead.linkedin_profile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {currentLead.linkedin_profile}
                    </a>
                  </div>
                )}
                
                {currentLead?.website && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Website</h4>
                    <a
                      href={currentLead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {currentLead.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadCardCarousel;