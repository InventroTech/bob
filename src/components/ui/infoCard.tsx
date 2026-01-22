'use client'
import React from 'react'

const InfoCards = ({attributes = []}) => {
  if (!attributes || !Array.isArray(attributes)) {
    return null;
  }

  return (
    <div className='flex flex-col gap-4 w-full  rounded-sm '>
      {attributes.map((attribute) => (
        <div key={attribute.id} className='rounded-sm p-4 bg-[#EAECF5] shadow-md flex flex-row gap-2'>
          <h3 className='text-sm '>{attribute.title} :</h3>
          <p className='text-sm font-semibold'>{attribute.description}</p>
        </div>
      ))}
    </div>
  )
}

export default InfoCards
