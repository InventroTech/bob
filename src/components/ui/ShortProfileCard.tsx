'use client'
import React, { useEffect, useState } from 'react'
import { User } from 'lucide-react'

interface ShortProfileCardProps {
  image?: string;
  name?: string;
  address?: string;
}

const ShortProfileCard = ({ image, name = '', address = '' }: ShortProfileCardProps) => {
  const imageSrc = typeof image === 'string' ? image.trim() : '';
  const hasImage = imageSrc.length > 0;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageSrc]);

  return (
    <div className='flex flex-row gap-3 items-center'>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-gray-600">
        {hasImage && !imageFailed ? (
          <img
            src={imageSrc}
            alt={name || 'User'}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <User className="h-5 w-5" aria-hidden />
        )}
      </div>
      <div className='flex flex-col font-body'>
        <span className='text-sm font-bold text-gray-900'>{name || 'Unnamed'}</span>
        <p className='text-xs text-gray-500'>{address || 'No address'}</p>
      </div>
    </div>
  )
}

export default ShortProfileCard
