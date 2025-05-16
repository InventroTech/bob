'use client'
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ShortProfileCardProps {
  image?: string;
  name?: string;
  address?: string;
}

const ShortProfileCard = ({ image, name = '', address = '' }: ShortProfileCardProps) => {
  const initials = name
    ? name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : '';

  return (
    <div className='flex flex-row gap-2 items-center'>
      <Avatar className="h-10 w-10">
        <AvatarImage src={image || ''} alt={name || 'User'} />
        <AvatarFallback>{initials || 'U'}</AvatarFallback>
      </Avatar>
      <div className='flex flex-col'>
        <h1 className='text-sm font-semibold'>{name || 'Unnamed'}</h1>
        <p className='text-xs text-gray-500'>{address || 'No address'}</p>
      </div>
    </div>
  )
}

export default ShortProfileCard
