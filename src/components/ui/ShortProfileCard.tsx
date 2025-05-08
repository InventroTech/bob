'use client'
import React from 'react'

const ShortProfileCard = ({image,name,address}:{image:any,name:any,address:any}) => {
  return (
    <div className='flex flex-row gap-2'>
      <img src={image} alt={name} className='w-10 h-10 rounded-full' />
      <div className='flex flex-col'>
        <h1 className='text-lg font-bold'>{name}</h1>
        <p className='text-sm text-gray-500'>{address}</p>
      </div>
    </div>
  )
}

export default ShortProfileCard
