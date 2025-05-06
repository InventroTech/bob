'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface CardData {
  id: string;
  title: string;
  description: string;
  number: number;
}

interface CardSet {
  id: string;
  name: string;
  cards: CardData[];
}

export const CardComponent: React.FC = () => {
  const [cardSets, setCardSets] = useState<CardSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [setName, setSetName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [number, setNumber] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCardSets();
  }, []);

  const fetchCardSets = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('card_sets')
      .select(`
        id,
        name,
        cards (
          id,
          title,
          description,
          number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load card sets');
      console.error(error);
    } else {
      setCardSets(data || []);
      console.log("card sets", data);
    }

    setLoading(false);
  };

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setName.trim()) {
      toast.error('Please enter a set name');
      return;
    }

    const { data, error } = await supabase
      .from('card_sets')
      .insert([{ name: setName }])
      .select()
      .single();

    if (error) {
      toast.error('Failed to create card set');
      console.error(error);
    } else {
      toast.success('Card set created!');
      setCardSets(prev => [...prev, { ...data, cards: [] }]);
      setSelectedSetId(data.id);
      setSetName('');
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSetId) {
      toast.error('Please select or create a card set first');
      return;
    }

    const { error } = await supabase
      .from('cards')
      .insert([{
        card_set_id: selectedSetId,
        title,
        description,
        number: Number(number)
      }]);

    if (error) {
      toast.error('Failed to add card');
      console.error(error);
    } else {
      toast.success('Card added!');
      fetchCardSets();
      setTitle('');
      setDescription('');
      setNumber('');
    }
  };

  return (
    <DashboardLayout>
    <div className="p-4 space-y-6">
      {/* Card Set Creation Form */}
      <form onSubmit={handleCreateSet} className="mb-8">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="setName">Card Set Name</Label>
            <Input
              id="setName"
              value={setName}
              onChange={e => setSetName(e.target.value)}
              placeholder="Enter card set name"
            />
          </div>
          <Button type="submit">Create Set</Button>
        </div>
      </form>

      {/* Card Set Selection */}
      <div className="mb-8">
        <Label>Select Card Set</Label>
        <select
          value={selectedSetId}
          onChange={e => setSelectedSetId(e.target.value)}
          className="w-full p-2 border rounded-md mt-1"
        >
          <option value="">Select a card set</option>
          {cardSets.map(set => (
            <option key={set.id} value={set.id}>{set.name}</option>
          ))}
        </select>
      </div>

      {/* Card Creation Form */}
      <form onSubmit={handleAddCard} className="grid grid-cols-1 gap-4 md:grid-cols-3 max-w-3xl">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Card Title"
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Card Description"
          />
        </div>
        <div>
          <Label htmlFor="number">Number</Label>
          <Input
            id="number"
            type="number"
            value={number}
            onChange={e => setNumber(e.target.value === '' ? '' : parseInt(e.target.value))}
            placeholder="Card Number"
          />
        </div>
        <div className="md:col-span-3">
          <Button type="submit" className="w-full md:w-auto">Add Card</Button>
        </div>
      </form>

      {/* Cards Display */}
      {selectedSetId && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cardSets.find(set => set.id === selectedSetId)?.cards.map(card => (
            <div key={card.id} className="p-4 border rounded-md space-y-2 shadow-sm">
              <h3 className="font-semibold text-lg">{card.title}</h3>
              <p className="text-muted-foreground">{card.description}</p>
              <p className="text-sm text-blue-600 font-medium">Number: {card.number}</p>
            </div>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
};
