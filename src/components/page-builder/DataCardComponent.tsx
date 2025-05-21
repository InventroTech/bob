'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DonutPie from '../ui/donoutPie';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface DonutData {
  id: number;
  value: number;
  label: string;
}

// Demo data for fallback
const DEMO_DATA = [
  {
    id: 1,
    title: "Converted Leads",
    number: 75,
    description: "Total converted leads this month",
    pieData: [
      { id: 0, value: 75, label: 'Remaining' },
      { id: 1, value: 25, label: 'Completed' }
    ]
  },
  {
    id: 2,
    title: "Pending Leads",
    number: 45,
    description: "Leads in pipeline",
    pieData: [
      { id: 0, value: 45, label: 'Remaining' },
      { id: 1, value: 55, label: 'Completed' }
    ]
  }
];

const FIXED_CARD_SET_ID = '1cbaa75b-3917-4669-b9a4-5f5a17fd3eae';

export const DataCardComponent: React.FC = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertedLeadCardData, setConvertedLeadCardData] = useState<any[]>([]);
  const [pendingLeadCardData, setPendingLeadCardData] = useState<any[]>([]);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const { session } = useAuth();
      const authToken = session?.access_token;
      
      let convertedData = [];
      let pendingData = [];

      try {
        const response1 = await fetch('https://hihrftwrriygnbrsvlrr.supabase.co/functions/v1/converted-leads', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            authToken: authToken
          })
        });

        if (!response1.ok) {
          throw new Error('Failed to fetch converted leads');
        }

        const data = await response1.json();
        convertedData = Array.isArray(data) ? data : [data];
        setConvertedLeadCardData(convertedData);
      } catch (error) {
        console.error('Error fetching converted leads:', error);
        toast.error('Failed to fetch converted leads data');
        convertedData = [DEMO_DATA[0]]; // Use first demo card
      }

      try {
        const response2 = await fetch('https://hihrftwrriygnbrsvlrr.supabase.co/functions/v1/pending-leads', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            authToken: authToken
          })
        });

        if (!response2.ok) {
          throw new Error('Failed to fetch pending leads');
        }

        const data2 = await response2.json();
        pendingData = Array.isArray(data2) ? data2 : [data2];
        setPendingLeadCardData(pendingData);
      } catch (error) {
        console.error('Error fetching pending leads:', error);
        toast.error('Failed to fetch pending leads data');
        pendingData = [DEMO_DATA[1]]; // Use second demo card
      }

      const combinedData = [...convertedData, ...pendingData];
      setCards(combinedData);
    } catch (error) {
      console.error('Error in fetchCards:', error);
      toast.error('Failed to fetch card data, using demo data');
      setCards(DEMO_DATA);
    } finally {
      setLoading(false);
    }
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
