'use client';

import React, { useEffect, useState } from 'react';
import DonutPie from '../ui/donoutPie';
import { supabase } from '@/lib/supabase';

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

interface DataCardComponentProps {
  cardSetId: string;
}

export const DataCardComponent: React.FC<DataCardComponentProps> = ({ cardSetId }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('card_set_id', cardSetId);

      if (error) {
        console.error('Error fetching cards:', error.message);
      } else {
        setCards(data || []);
      }
      setLoading(false);
    };

    fetchCards();
  }, [cardSetId]);

  if (loading) return <p>Loading cards...</p>;

  return (
    <div className="cardlist grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 w-full">
      {cards.map((card, index) => {
        const donutData: DonutData[] = [
          { id: 0, value: card.number, label: card.title },
          { id: 1, value: 100 - card.number, label: 'Other' }, // simple dummy contrast
        ];

        return (
          <div key={card.id} className='bg-white border-2 border-gray-200 shadow-sm rounded-lg p-4 pb-0 pr-0 flex flex-col '>
            <div className='flex flex-row gap-4 '>
              <h1 className=' font-bold'>{card.title}</h1>
              <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg" className='m-auto mr-4 font-bold'>
                <path d="M5.5 12H19.5M19.5 12L12.5 5M19.5 12L12.5 19" stroke="#1E1E1E" />
              </svg>
            </div>
            <div className='flex '>
              <div className='flex flex-col gap-6 flex-1 justify-end m-auto'>
                <div className='text-2xl font-bold '>{card.number}</div>
                <p className='text-sm text-gray-500 justify-end'>{card.description}</p>
              </div>
              <div className="pie flex gap-6 m-auto mr-0">
                <DonutPie attributes={donutData} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
