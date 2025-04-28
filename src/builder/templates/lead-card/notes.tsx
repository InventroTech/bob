'use client'
import React from 'react'

const Notes = ({attributes}) => {
  return (
    <div>
      <div className='flex flex-col gap-2'>
        <h1 className='text-md '>{attributes.title}</h1>
        <input type="text" placeholder='Write a note...' className='w-full p-2 rounded-md border border-gray-300 h-20 items-start' />
      </div>
    </div>
  )
}

export default Notes
