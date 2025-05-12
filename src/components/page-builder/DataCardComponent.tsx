'use client';

import React, { useEffect, useState } from 'react';
import DonutPie from '../ui/donoutPie';

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

export const DataCardComponent: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo JSON data
    const demoCards: Card[] = [
      {
        id: '1',
        title: 'Voters Reached',
        description: 'Total number of people contacted',
        number: 64,
      },
      {
        id: '2',
        title: 'Meetings Scheduled',
        description: 'Confirmed meetings with leads',
        number: 32,
      },
      {
        id: '3',
        title: 'Pending Follow-ups',
        description: 'Leads to follow up with',
        number: 45,
      },
    ];

    setCards(demoCards);
    setLoading(false);
  }, []);

  if (loading) return <p>Loading cards...</p>;

  return (
    <div className="cardlist grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 w-full">
      {cards.map((card) => {
        const donutData: DonutData[] = [
          { id: 0, value: card.number, label: 'Remaining' },
          { id: 1, value: 100 - card.number, label: 'Completed' },
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
