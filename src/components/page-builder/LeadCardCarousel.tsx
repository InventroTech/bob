import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Calendar,
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
  company?: string;
  position?: string;
  source?: string;
  lead_source?: string;
  status?: string;
  priority?: string;
  notes?: string;
  budget?: number;
  location?: string;
  tags?: string[];
  display_pic_url?: string;
  linkedin_profile?: string;
  website?: string;
  next_follow_up?: string;
  // New fields as per requirements
  lead_stage?: string;
  customer_full_name?: string;
  user_id?: string;
  affiliated_party?: string;
  rm_dashboard?: string;
  user_profile_link?: string;
  whatsapp_link?: string;
  package_to_pitch?: string;
  premium_poster_count?: number;
  last_active_date_time?: string;
  last_active_date?: string;
  latest_remarks?: string;
  updated_at?: string;
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
  const [showPendingCard, setShowPendingCard] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [lead, setLead] = useState<LeadState>({
    leadStatus: "New",
    priority: "Medium",
    notes: "",
    selectedTags: [],
    nextFollowUp: "",
    leadStartTime: new Date(),
  });

  const isInitialized = useRef(false);

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
      const statusEndpoint = config?.statusDataApiEndpoint || "/crm-records/leads/stats/";
      
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
      
      const endpoint = config?.apiEndpoint || "/crm-records/leads/next/";
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

      if (!leadData || (typeof leadData === "object" && !Object.keys(leadData).length)) {
        setShowPendingCard(true);
        setCurrentLead(null);
        resetLeadState();
        isInitialized.current = false;
        await fetchLeadStats();
        toast({
          title: "Info",
          description: "No leads available.",
          variant: "default",
        });
        return;
      }

      setCurrentLead(leadData);
      setShowPendingCard(false);
      setLead(prev => ({
        ...prev,
        leadStatus: leadData.status || leadData.lead_stage || "New",
        priority: leadData.priority || "Medium",
        notes: leadData.notes || leadData.latest_remarks || "",
        selectedTags: parseTags(leadData.tags || []),
        nextFollowUp: leadData.next_follow_up || "",
        leadStartTime: new Date(),
      }));

      isInitialized.current = true;
      await fetchLeadStats();
      toast({
        title: "Success",
        description: "Lead loaded successfully!",
        variant: "default",
      });
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
    if (!currentLead) return;

    try {
      setUpdating(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: `Lead marked as: ${action}`,
        variant: "default",
      });
      
      // Move to next lead
      await fetchFirstLead();
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleTakeBreak = () => {
    toast({
      title: "Info",
      description: "Break time! Your progress has been saved.",
      variant: "default",
    });
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
  };

  const handleOpenProfile = () => {
    if (currentLead?.linkedin_profile || currentLead?.website) {
      setShowProfileModal(true);
    }
  };

  // Initialize component - fetch stats only, don't fetch lead yet
  useEffect(() => {
    fetchLeadStats();
    setShowPendingCard(true);
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
              <p className="text-sm text-gray-500">No leads available at the moment</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Fresh Leads</p>
                    <p className="text-2xl font-bold text-blue-700">{leadStats.fresh_leads}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">WIP Leads</p>
                    <p className="text-2xl font-bold text-yellow-700">{leadStats.wip_leads}</p>
                  </div>
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Won Leads</p>
                    <p className="text-2xl font-bold text-green-700">{leadStats.leads_won}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 font-medium">Lost Leads</p>
                    <p className="text-2xl font-bold text-red-700">{leadStats.lost_leads}</p>
                  </div>
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
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
                    } else if (currentLead?.phone_no || currentLead?.phone) {
                      const phoneNumber = currentLead.phone_no || currentLead.phone;
                      const cleanNumber = phoneNumber.replace(/\D/g, '');
                      const whatsappUrl = `https://wa.me/${cleanNumber}`;
                      window.open(whatsappUrl, '_blank');
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
                    {currentLead?.last_active_date_time ? new Date(currentLead.last_active_date_time).toLocaleDateString("en-US", {
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
              
              <Button
                onClick={() => handleActionButton("Call Later")}
                size="sm"
                variant="outline"
                className="w-32 bg-white text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={updating}
              >
                Call Later
              </Button>
              
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