import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  courierDisplayName,
  fetchAftershipCouriers,
  filterAftershipCouriers,
  getCachedAftershipCouriers,
  type AftershipCourier,
} from '@/lib/inventory/shipmentTracking';

type CourierComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
};

export function CourierCombobox({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  placeholder = 'Type to search couriers…',
}: CourierComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<AftershipCourier[]>(() => getCachedAftershipCouriers());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAftershipCouriers()
      .then((rows) => {
        if (!cancelled) setCatalog(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => filterAftershipCouriers(catalog, query), [catalog, query]);
  const label = courierDisplayName(value, catalog);
  const queryTrimmed = query.trim();
  const queryLower = queryTrimmed.toLowerCase();
  const hasExactMatch = matches.some(
    (courier) => courier.slug === queryLower || courier.name.toLowerCase() === queryLower
  );
  const showCustom = Boolean(queryTrimmed) && !hasExactMatch;

  if (readOnly || disabled) {
    return (
      <Input
        className="h-9 text-sm rounded-md"
        value={label}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : 0}
        disabled={disabled}
        placeholder={placeholder}
      />
    );
  }

  return (
    <Popover
      open={open}
      modal
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between rounded-md px-3 font-normal"
        >
          <span className={cn('truncate', label ? 'text-foreground' : 'text-muted-foreground')}>
            {label || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[200] w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0"
        align="start"
        portalled
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Type a courier name…"
            className="h-9 text-sm"
          />
          <CommandList>
            <CommandEmpty>{loading ? 'Loading couriers…' : 'No courier found.'}</CommandEmpty>
            {showCustom ? (
              <CommandItem
                value={`custom-${queryTrimmed}`}
                onSelect={() => {
                  onChange(queryTrimmed);
                  setOpen(false);
                  setQuery('');
                }}
              >
                Use “{queryTrimmed}”
              </CommandItem>
            ) : null}
            {matches.map((courier) => {
              const selected = value.trim().toLowerCase() === courier.slug || value === courier.name;
              return (
                <CommandItem
                  key={courier.slug}
                  value={`${courier.name} ${courier.slug}`}
                  onSelect={() => {
                    onChange(courier.slug);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1 truncate">{courier.name}</span>
                  <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{courier.slug}</span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
