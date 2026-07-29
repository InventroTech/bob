'use client'
import React from 'react'

type InfoCardAttribute = {
  id?: string | number;
  title?: string;
  description?: string;
};

const InfoCards = ({ attributes }: { attributes?: InfoCardAttribute[] }) => {
  const items = attributes ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-4 w-full  rounded-sm '>
      {items.map((attribute) => (
        <div key={attribute.id} className='rounded-sm p-4 bg-[#EAECF5] shadow-md flex flex-row gap-2'>
          <h3 className='text-sm '>{attribute.title} :</h3>
          <p className='text-sm font-semibold'>{attribute.description}</p>
        </div>
      ))}
    </div>
  )
}

export default InfoCards
