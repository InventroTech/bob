'use client';

import { useEffect, useState } from "react";
import { LeadCardComponent } from "../page-builder/LeadCardComponent";
import { apiService } from "@/lib/apiService";

export const LeadCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState("None");
  const [notes, setNotes] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await apiService.getLeads();
        const data = response.success ? response.data : [];
        if (!response.success) {
          console.error('Error fetching leads:', response.error);
          return;
        }
        setLeads(data);
        console.log("Leads", data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading leads...</div>;
  }

  if (leads.length === 0) {
    return <div className="flex items-center justify-center h-full">No leads found</div>;
  }

  const currentLead = leads[currentIndex];

  const nextSlide = async () => {
    setCurrentIndex((prev) => (prev + 1) % leads.length);
    setStatus("None");
    setNotes("");
  };

  const handleSubmit = async () => {
    try {
      if (!currentLead?.id) {
        console.error('No lead ID available');
        return;
      }

      const response = await apiService.updateLeadsTableRecord(currentLead.id, {
        notes: notes,
        status: status
      });

      if (!response.success) {
        console.error('Error updating lead:', response.error);
        alert('Failed to save changes. Please try again.');
        return;
      }

      // Update the local leads array to reflect the changes
      setLeads(leads.map(lead => 
        lead.id === currentLead.id 
          ? { ...lead, notes: notes, status: status }
          : lead
      ));

      console.log('Lead updated successfully');
      nextSlide();
    } catch (err) {
      console.error('Error:', err);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + leads.length) % leads.length);
  };

  return (
    <div className="relative w-full h-full">
      <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white">
        <LeadCardComponent
          attributes={currentLead}
          status={status}
          setStatus={setStatus}
          notes={notes}
          setNotes={setNotes}
        />
        <div className="buttons m-auto mr-0 flex gap-4 p-4">
          <button onClick={prevSlide} className="bg-gray-200 text-black px-4 py-2 rounded-md">Previous</button>
          <button onClick={handleSubmit} className="bg-[#7F56D9] text-white px-4 py-2 rounded-md">Save & Continue</button>
        </div>
      </div>
    </div>
  );
};
