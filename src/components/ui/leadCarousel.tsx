'use client';

import { useEffect, useState } from "react";
import { LeadCardComponent } from "../page-builder/LeadCardComponent";
import axios from "axios"; // assuming axios for API call
import { supabase } from "@/lib/supabase";

export const LeadCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState("None");
  const [notes, setNotes] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data, error } = await supabase.from('leads_table').select('*');
        if (error) {
          console.error('Error fetching leads:', error.message);
          return;
        }
        setLeads(data);
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
    const payload = {
      id: currentLead.id,
      notes,
      status,
    };
    try {
      const res = await fetch('/lead/edit', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (res.ok) {
        console.log('Lead updated');
        nextSlide();
      } else {
        console.error('Update failed');
      }
    } catch (err) {
      console.error('Network error', err);
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
