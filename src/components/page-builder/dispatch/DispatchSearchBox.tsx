'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';
import {
  fetchDispatchSearchSuggestions,
  type DispatchSearchSuggestion,
} from './fetchDispatchSearchSuggestions';

const SUGGEST_DEBOUNCE_MS = 280;
const MIN_QUERY_LENGTH = 2;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  entityType: string;
  apiEndpoint: string;
  searchFields: string;
  placeholder?: string;
};

export const DispatchSearchBox: React.FC<Props> = ({
  value,
  onChange,
  onCommit,
  entityType,
  apiEndpoint,
  searchFields,
  placeholder = 'Search',
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DispatchSearchSuggestion[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const loadSuggestions = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const items = await fetchDispatchSearchSuggestions(apiClient, {
          apiEndpoint,
          entityType,
          query: trimmed,
          searchFields,
          limit: 12,
        });
        if (requestId !== requestIdRef.current) return;
        setSuggestions(items);
      } catch (err) {
        console.warn('[DispatchSearchBox] suggestions failed', err);
        if (requestId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [apiEndpoint, entityType, searchFields]
  );

  useEffect(() => {
    if (!open) return;
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const t = window.setTimeout(() => {
      void loadSuggestions(trimmed);
    }, SUGGEST_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value, open, loadSuggestions]);

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, []);

  const pickSuggestion = (item: DispatchSearchSuggestion) => {
    onChange(item.value);
    onCommit?.(item.value);
    setOpen(false);
    setSuggestions([]);
  };

  const showPanel = open && value.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={rootRef} className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onCommit?.(value.trim());
            setOpen(false);
          }
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        className="rounded-full border-gray-300 pl-9 pr-9"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={showPanel}
      />
      {loading ? (
        <Loader2
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#7c3aed]"
          aria-hidden
        />
      ) : null}

      {showPanel ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
          role="listbox"
        >
          {loading && suggestions.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-gray-500">Finding matches…</p>
          ) : null}
          {!loading && suggestions.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-gray-500">No suggestions</p>
          ) : null}
          <ul className="max-h-56 overflow-y-auto overscroll-contain py-1 [-webkit-overflow-scrolling:touch]">
            {suggestions.map((item) => (
              <li key={item.id} role="option">
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left active:bg-[#f5f3ff]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(item)}
                >
                  <span className="truncate text-sm font-semibold text-gray-900">{item.value}</span>
                  <span className="text-[11px] font-medium text-[#7c3aed]">{item.fieldLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
