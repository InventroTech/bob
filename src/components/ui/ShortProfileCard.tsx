'use client'
import React, { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import { safeProfileImageUrl } from '@/lib/utils/safeProfileImageUrl'
import { cn } from '@/lib/utils'

/** Default product/item thumbnail used when no product_image is available. */
export const DEFAULT_ITEM_THUMB_SRC = '/default-item-thumb.png'

interface ShortProfileCardProps {
  image?: string;
  name?: string;
  /** Full text for hover tooltip when `name` is truncated. */
  nameTitle?: string;
  address?: string;
  /** Shift thumbnail left and tighten spacing (item name column). */
  compact?: boolean;
  /** Show full name wrapping across ~2–3 lines instead of single-line truncate. */
  wrapName?: boolean;
  /**
   * When true (item columns), fall back to the default product picture
   * instead of the person silhouette.
   */
  useDefaultItemImage?: boolean;
  className?: string;
}

const ShortProfileCard = ({
  image,
  name = '',
  nameTitle,
  address = '',
  compact = false,
  wrapName = false,
  useDefaultItemImage = false,
  className,
}: ShortProfileCardProps) => {
  const preferredSrc = safeProfileImageUrl(image) ?? '';
  const fallbackSrc = useDefaultItemImage || wrapName ? DEFAULT_ITEM_THUMB_SRC : '';
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [preferredSrc]);

  const showPreferred = preferredSrc.length > 0 && !imageFailed;
  const imageSrc = showPreferred ? preferredSrc : fallbackSrc;
  const showImage = imageSrc.length > 0;

  return (
    <div
      className={cn(
        'flex min-w-0 flex-row',
        wrapName
          ? 'w-full max-w-full min-w-0 items-center'
          : 'max-w-[14rem] items-center sm:max-w-[18rem]',
        wrapName ? 'gap-3' : compact ? 'gap-2' : 'gap-3',
        className
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-gray-200 text-gray-600',
          'flex items-center justify-center',
          wrapName || useDefaultItemImage ? 'rounded-md' : 'rounded-full',
          wrapName ? 'h-11 w-11' : compact ? 'h-9 w-9' : 'h-10 w-10'
        )}
      >
        {showImage ? (
          <img
            src={imageSrc}
            alt={nameTitle || name || (useDefaultItemImage || wrapName ? 'Item' : 'User')}
            className="h-full w-full object-cover"
            onError={() => {
              // Only mark preferred image as failed so we can drop to default item thumb.
              if (showPreferred) setImageFailed(true);
            }}
          />
        ) : (
          <User className={wrapName || compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden font-body text-left">
        <span
          className={cn(
            'text-gray-900',
            wrapName
              ? 'font-[Inter,sans-serif] text-[14px] font-medium leading-[20px] tracking-normal whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-3'
              : 'block truncate text-sm font-bold'
          )}
          title={nameTitle || name || undefined}
        >
          {name || 'Unnamed'}
        </span>
        {address ? (
          <p className="block truncate text-xs text-gray-500" title={address}>
            {address}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default ShortProfileCard
