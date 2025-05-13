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

interface Card {
  id: string;
  title: string;
  description: string;
  number: number;
}

const FIXED_CARD_SET_ID = '1cbaa75b-3917-4669-b9a4-5f5a17fd3eae';

export const DataCardComponent: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('card_set_id', FIXED_CARD_SET_ID)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load cards');
      console.error(error);
    } else {
      setCards(data || []);
    }

    setLoading(false);
  };

  if (loading) return <p>Loading cards...</p>;

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
                  <div className="text-2xl font-bold">{card.number}</div>
                  <p className="text-sm text-gray-500 justify-end">
                    {card.description}
                  </p>
                </div>
                <div className="pie flex gap-6 m-auto mr-0">
                  <DonutPie attributes={donutData} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
