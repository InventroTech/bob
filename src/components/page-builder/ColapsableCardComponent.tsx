'use client';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { ReactNode, useState } from 'react'; 
import { LeadTableComponent } from './LeadTableComponent';

interface CollapseCardProps {
  children?: ReactNode;
}

const attributes = {
  title: "Leads Marked for Call Today"
};

export const CollapseCard: React.FC<CollapseCardProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="full-box border-2 border-gray-200 top-12 left-12 rounded-lg p-4 flex flex-col bg-white text-black">
      <div className="smaller flex items-center justify-between">
        <h1 className="text-xl font-bold">{attributes.title}</h1>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 hover:cursor-pointer focus:outline-none transition duration-200 ease-in-out"
        >
          {isOpen ? <ChevronUp /> : <ChevronDown />}
        </button>
      </div>
      {isOpen && (
        <div className="content pt-4">
          <LeadTableComponent />
        </div>
      )}
    </div>
  );
};
