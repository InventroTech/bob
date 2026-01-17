'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DonutPie from '../ui/donoutPie';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';

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

// Demo data matching the exact structure
const DEMO_DATA: CardData[] = [
  {
    id: 1,
    title: "Converted Leads",
    number: 0,
    description: "Total converted leads this month",
    pieData: [
      { id: 0, value: 0, label: 'Remaining' },
      { id: 1, value: 100, label: 'Completed' }
    ]
  },
  {
    id: 2,
    title: "Pending Leads",
    number: 2,
    description: "Leads in pipeline",
    pieData: [
      { id: 0, value: 2, label: 'Remaining' },
      { id: 1, value: 98, label: 'Completed' }
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
    const abortController = new AbortController();

    const fetchCardData = async () => {
      try {
        setLoading(true);
        const endpoint = config?.apiEndpoint || '/api/card-stats';
        const apiUrl = `${import.meta.env.VITE_API_URI}${endpoint}`;
        
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle both array and object with cards property
        const cardData = Array.isArray(data) ? data : (data.cards || []);
        
        // Validate and transform the data
        const validatedCards = cardData.map((card: any) => ({
          id: card.id || 0,
          title: card.title || 'Untitled',
          number: typeof card.number === 'number' ? card.number : 0,
          description: card.description || '',
          pieData: Array.isArray(card.pieData) ? card.pieData.map((pie: any) => ({
            id: pie.id || 0,
            value: typeof pie.value === 'number' ? pie.value : 0,
            label: pie.label || 'Unknown'
          })) : []
        }));

        setCards(validatedCards);
      } catch (error) {
        console.error('Error fetching card data:', error);
        toast.error('Failed to load card data. Using demo data.');
        setCards(DEMO_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchCardData();

    return () => {
      abortController.abort();
    };
  }, [config?.apiEndpoint, session?.access_token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading card data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {config?.title && (
        <div className="text-heading-2">{config.title}</div>
      )}

      <div className='cardlist grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 w-full'>
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-white border-2 border-gray-200 shadow-sm rounded-lg p-6 flex flex-col"
          >
            <div className="flex flex-row justify-between items-start mb-4">
              <h3 className="text-gray-800">{card.title}</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <div className="text-display-md-bold text-primary">{card.number}</div>
                <p className="text-body-sm text-gray-500">
                  {card.description}
                </p>
              </div>
              <div className="w-24 h-24">
                <DonutPie attributes={card.pieData} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
