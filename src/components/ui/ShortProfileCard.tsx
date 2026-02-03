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
    <div className='flex flex-row gap-3 items-center'>
      <Avatar className="h-10 w-10">
        <AvatarImage src={image || ''} alt={name || 'User'} />
        <AvatarFallback className="bg-gray-200 text-gray-600">{initials || 'U'}</AvatarFallback>
      </Avatar>
      <div className='flex flex-col font-body'>
        <span className='text-sm font-bold text-gray-900'>{name || 'Unnamed'}</span>
        <p className='text-xs text-gray-500'>{address || 'No address'}</p>
      </div>
    </div>
  )
}

export default ShortProfileCard
