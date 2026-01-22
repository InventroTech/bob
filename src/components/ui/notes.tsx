'use client';
import React from 'react';

interface NotesProps {
  notes: string;
  setNotes: (val: string) => void;
}

const Notes = ({ notes, setNotes }: NotesProps) => {
  return (
    <div className="flex flex-col gap-2">
      <h5>Notes</h5>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write a note..."
        className="w-full p-2 rounded-md border border-gray-300 h-24"
      />
    </div>
  );
};

export default Notes;
