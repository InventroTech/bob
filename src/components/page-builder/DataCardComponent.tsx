'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DonutPie from '../ui/donoutPie';
import { toast } from 'sonner';

interface DonutData {
  id: number;
  value: number;
  label: string;
}



const FIXED_CARD_SET_ID = '1cbaa75b-3917-4669-b9a4-5f5a17fd3eae';

export const DataCardComponent: React.FC = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertedLeadCardData, setConvertedLeadCardData] = useState<any[]>([]);
  const [pendingLeadCardData, setPendingLeadCardData] = useState<any[]>([]);
  useEffect(() => {
    fetchCards();
  }, []);
  const userEmail = localStorage.getItem('user_email') || '';
  const fetchCards = async () => {
    const response1 = await fetch('https://hihrftwrriygnbrsvlrr.supabase.co/functions/v1/converted-leads?email=' + userEmail, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        email: userEmail,
      },
    });

    const data = await response1.json();
    setConvertedLeadCardData(Array.isArray(data) ? data : [data]);
    console.log("Converted Lead Card Data", data);

    const response2 = await fetch('https://hihrftwrriygnbrsvlrr.supabase.co/functions/v1/pending-leads?email=' + userEmail, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        email: userEmail,
      },
    });

    const data2 = await response2.json();
    setPendingLeadCardData(Array.isArray(data2) ? data2 : [data2]);
    console.log("Pending Lead Card Data", data2);
    
    // Ensure both data and data2 are arrays before combining
    const combinedData = [
      ...(Array.isArray(data) ? data : [data]),
      ...(Array.isArray(data2) ? data2 : [data2])
    ];
    setCards(combinedData);
    console.log("Cards", combinedData);
  };

  

  return (
    <div className="space-y-6">
      <div className="text-xl font-bold">My Cards</div>

      <div className="cardlist grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 w-full">
        {cards.map((card) => {
          const donutData: DonutData[] = [
            { id: 0, value: card.number, label: 'Remaining' },
            { id: 1, value: 100 - card.number, label: 'Completed' },
          ];

          return (
            <div
              key={card.id}
              className="bg-white border-2 border-gray-200 shadow-sm rounded-lg p-4 pb-0 pr-0 flex flex-col"
            >
              <div className="flex flex-row gap-4">
                <h1 className="font-bold">{card.title}</h1>
              </div>
              <div className="flex">
                <div className="flex flex-col gap-6 flex-1 justify-end m-auto">
                  <div className="text-[30px] font-bold">{card.number}</div>
                  <p className="text-sm text-gray-500 justify-end">
                    {card.description}
                  </p>
                </div>
                <div className="pie flex gap-6 m-auto mr-0">
                  <DonutPie attributes={card.pieData} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
