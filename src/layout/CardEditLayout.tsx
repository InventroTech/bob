'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import DonutPie from '@/components/ui/donoutPie';
import DashboardLayout from '@/components/layout/DashboardLayout';

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

export const CardComponent: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [number, setNumber] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);

  const FIXED_CARD_SET_ID = '1cbaa75b-3917-4669-b9a4-5f5a17fd3eae';

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

  const handleDeleteCard = async (cardId: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', cardId);
    if (error) {
      toast.error('Failed to delete card');
      console.error('Delete error:', error);
    } else {
      toast.success('Card deleted!');
      fetchCards();
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || number === '') {
      toast.error('Please fill in all fields');
      return;
    }

    const { error } = await supabase.from('cards').insert([
      {
        card_set_id: FIXED_CARD_SET_ID,
        title,
        description,
        number: Number(number),
      },
    ]);

    if (error) {
      toast.error('Failed to add card');
      console.error(error);
    } else {
      toast.success('Card added!');
      setTitle('');
      setDescription('');
      setNumber('');
      fetchCards();
    }
  };

  if (loading) return <p>Loading cards...</p>;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Form */}
        <form
          onSubmit={handleAddCard}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card Title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Card Description"
            />
          </div>
          <div>
            <Label htmlFor="number">Number</Label>
            <Input
              id="number"
              type="number"
              value={number}
              onChange={(e) =>
                setNumber(e.target.value === '' ? '' : parseInt(e.target.value))
              }
              placeholder="Card Number"
            />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" className="w-full md:w-auto">
              Add Card
            </Button>
          </div>
        </form>

        {/* Card Display */}
        <div className="cardlist grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 w-full">
          {cards.map((card) => {
            const donutData: DonutData[] = [
              { id: 0, value: card.number, label: 'Remaining' },
              { id: 1, value: 100 - card.number, label: 'Completed' },
            ];

            return (
              <div
                key={card.id}
                className="relative bg-white border-2 border-gray-200 shadow-sm rounded-lg p-4 pb-0 pr-0 flex flex-col"
              >
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteCard(card.id)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 z-10"
                  title="Delete Card"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H3.5a.5.5 0 000 1h13a.5.5 0 000-1H15V3a1 1 0 00-1-1H6zm3 5a.5.5 0 00-.5.5v7a.5.5 0 001 0v-7A.5.5 0 009 7zm3 0a.5.5 0 00-.5.5v7a.5.5 0 001 0v-7a.5.5 0 00-.5-.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Card Content */}
                <div className="flex flex-row gap-4">
                  <h1 className="font-bold text-lg">{card.title}</h1>
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
    </DashboardLayout>
  );
};
