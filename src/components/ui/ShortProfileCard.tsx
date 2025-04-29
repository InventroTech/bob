'use client'
import React from 'react'

const ShortProfileCard = ({attributes}) => {
  return (
    <div className='flex flex-row gap-2'>
      <img src={attributes.image} alt={attributes.name} className='w-10 h-10 rounded-full' />
      <div className='flex flex-col'>
        <h1 className='text-lg font-bold'>{attributes.name}</h1>
        <p className='text-sm text-gray-500'>{attributes.address}</p>
      </div>
    </div>
  )
}

export default ShortProfileCard
