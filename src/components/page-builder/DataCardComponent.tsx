'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DonutPie from '../ui/donoutPie';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { API_URI } from '@/const';

interface DonutData {
  id: number;
  value: number;
  label: string;
}

interface CardData {
  id: number;
  title: string;
  number: number;
  description: string;
  pieData: DonutData[];
}

// Demo data for fallback
const DEMO_DATA: CardData[] = [
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

interface DataCardComponentProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
  };
}

export const DataCardComponent: React.FC<DataCardComponentProps> = ({ config }) => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const authToken = session?.access_token;

        // Use configured endpoint or fallback to default
        const endpoint = config?.apiEndpoint || '/api/card-stats';
        const apiUrl = `${API_URI}${endpoint}`;
        console.log("apiUrl_data_card", apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch card data');
        }

        const data = await response.json();
        
        // Expect the API to return an array of card data
        if (Array.isArray(data)) {
          setCards(data);
        } else if (data.cards && Array.isArray(data.cards)) {
          // Fallback for API that returns { cards: [] }
          setCards(data.cards);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (error) {
        console.error('Error fetching card data:', error);
        toast.error('Failed to fetch card data, using demo data');
        setCards(DEMO_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [session, config?.apiEndpoint]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading card data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-xl font-bold">{config?.title || "My Cards"}</div>

      <div className="cardlist grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 w-full">
        {cards.map((card) => (
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
        ))}
      </div>
    </div>
  );
};
