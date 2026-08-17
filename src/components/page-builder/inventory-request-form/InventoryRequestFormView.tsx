/** Presentational JSX for the inventory request form. */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, User, Send, Loader2, Plus, Trash2, MapPin } from 'lucide-react';
import { formatCurrencyDisplay, formatCurrencyInputLive } from '@/lib/utils/currencyFormat';

import { REQUEST_CATEGORY_OPTIONS, PRIORITY_OPTIONS } from './constants';
import { toVendorStorageName, formatRequestDateDisplay } from './utils';
import type { InventoryRequestFormModel } from './useInventoryRequestForm';
import { cn } from '@/lib/utils';

export function InventoryRequestFormView(props: InventoryRequestFormModel) {
  const {
    user,
    useNavyTheme,
    requestDate,
    department,
    projectPurpose,
    setProjectPurpose,
    requestCategory,
    setRequestCategory,
    deliveryPincode,
    setDeliveryPincode,
    deliveryAddress,
    setDeliveryAddress,
    items,
    submitting,
    showSubmitSuccess,
    vendors,
    vendorsLoading,
    addVendorForItemId,
    newVendorName,
    setNewVendorName,
    newVendorLink,
    setNewVendorLink,
    savingNewVendor,
    priceDraftByItemId,
    setPriceDraftByItemId,
    fieldShakeNonce,
    clearFieldShake,
    focusedItemNameId,
    setFocusedItemNameId,
    setItemNameQuery,
    itemNameSuggestions,
    itemNameSuggestionsOpen,
    setItemNameSuggestionsOpen,
    itemNameSuggestionsLoading,
    projectSuggestions,
    projectSuggestionsOpen,
    setProjectSuggestionsOpen,
    projectSuggestionsLoading,
    focusedVendorId,
    setFocusedVendorId,
    vendorQuery,
    setVendorQuery,
    vendorSuggestionsOpen,
    setVendorSuggestionsOpen,
    requesterDisplay,
    filteredProjectSuggestions,
    addItem,
    removeItem,
    updateItem,
    startAddVendor,
    cancelAddVendor,
    saveNewVendor,
    handleSubmit,
    handleClear,
    isFormEmpty,
  } = props;

  const shakeN = (fieldKey: string) => fieldShakeNonce[fieldKey] ?? 0;
  const isShaking = (fieldKey: string) => shakeN(fieldKey) > 0;
  const wrapShake = (fieldKey: string, node: React.ReactNode, className = '') => (
    <div
      key={`${fieldKey}-${shakeN(fieldKey)}`}
      data-shake-key={fieldKey}
      className={`${className}${isShaking(fieldKey) ? ' animate-inventory-link-shake' : ''}`.trim()}
    >
      {node}
    </div>
  );
  const itemKey = (itemId: string, field: string) => `item:${itemId}:${field}`;

  const addVendorDialog = (
    <Dialog open={addVendorForItemId !== null} onOpenChange={(open) => { if (!open) cancelAddVendor(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add vendor</DialogTitle>
          <DialogDescription>Create a vendor and auto-fill it for this item.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Vendor name *"
            value={newVendorName}
            onChange={(e) => setNewVendorName(e.target.value)}
            className="h-10"
          />
          <Input
            placeholder="Vendor site link (optional)"
            type="url"
            value={newVendorLink}
            onChange={(e) => setNewVendorLink(e.target.value)}
            className="h-10"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={cancelAddVendor}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={saveNewVendor}
            disabled={savingNewVendor || !newVendorName.trim()}
            className={
              useNavyTheme
                ? '!bg-[#1A3673] !text-white hover:!bg-[#152c5e] focus-visible:!ring-[#1A3673]'
                : undefined
            }
          >
            {savingNewVendor ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const sectionLabel = (title: string) => (
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
  );

  const renderProjectField = (opts: {
    id: string;
    labelClassName: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={opts.id} className={opts.labelClassName}>
        Project <span className="text-destructive">*</span>
      </Label>
      {wrapShake(
        'projectPurpose',
        <div className="relative">
          <Input
            id={opts.id}
            placeholder={
              projectSuggestions.length > 0
                ? 'Select a previous project or type a new one'
                : 'Project name'
            }
            value={projectPurpose}
            onFocus={() => {
              if (projectSuggestions.length > 0 || projectSuggestionsLoading) {
                setProjectSuggestionsOpen(true);
              }
            }}
            onBlur={() => {
              window.setTimeout(() => setProjectSuggestionsOpen(false), 150);
            }}
            onChange={(e) => {
              setProjectPurpose(e.target.value);
              clearFieldShake('projectPurpose');
              setProjectSuggestionsOpen(true);
            }}
            className="h-10"
            autoComplete="off"
          />
          {projectSuggestionsOpen &&
            (projectSuggestionsLoading || filteredProjectSuggestions.length > 0) && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-background shadow-md">
                {projectSuggestionsLoading && projectSuggestions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading projects…</div>
                ) : (
                  filteredProjectSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setProjectPurpose(suggestion);
                        clearFieldShake('projectPurpose');
                        setProjectSuggestionsOpen(false);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );

  const navyBtn = useNavyTheme
    ? '!bg-[#1A3673] !text-white hover:!bg-[#152c5e] focus-visible:!ring-[#1A3673] shadow-sm shadow-[#1A3673]/20'
    : '';
  const navyOutline = useNavyTheme
    ? '!border-[#1A3673]/40 !text-[#1A3673] hover:!bg-[#1A3673]/[0.06] hover:!text-[#1A3673] hover:!border-[#1A3673]/60'
    : '';

  return (
    <>
    {showSubmitSuccess ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1F4D]/45 backdrop-blur-[2px]">
        <div className="animate-unmannd-success-pop flex w-[min(92vw,22rem)] flex-col items-center gap-3 rounded-2xl bg-white px-8 py-9 text-center shadow-2xl shadow-[#1A3673]/25 ring-1 ring-[#1A3673]/15">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1A3673] text-white shadow-lg shadow-[#1A3673]/30">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden>
              <path
                d="M5 13l4 4L19 7"
                className="animate-unmannd-success-check"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold tracking-tight text-[#0B1F4D]">Request created</p>
          <p className="text-sm text-muted-foreground">Taking you to your requests…</p>
        </div>
      </div>
    ) : null}
    <Card
      className={cn(
        'max-w-full min-w-0 overflow-x-hidden shadow-md',
        useNavyTheme
          ? [
              'rounded-xl border border-[#1A3673]/35 bg-gradient-to-b from-[#F7F9FC] to-white',
              'shadow-[0_10px_40px_-12px_rgba(26,54,115,0.18)]',
              // Soft focus rings on controls — layout unchanged
              '[&_input:not(:disabled)]:bg-white [&_input]:border-[#1A3673]/18',
              '[&_input:focus-visible]:border-[#1A3673]/55 [&_input:focus-visible]:ring-[#1A3673]/25',
              '[&_textarea]:bg-white [&_textarea]:border-[#1A3673]/18',
              '[&_textarea:focus-visible]:border-[#1A3673]/55 [&_textarea:focus-visible]:ring-[#1A3673]/25',
              '[&_button[role=combobox]]:border-[#1A3673]/18 [&_button[role=combobox]]:bg-white',
              '[&_button[role=combobox]]:focus:ring-[#1A3673]/25',
            ].join(' ')
          : 'border border-border/60'
      )}
    >
      <form onSubmit={handleSubmit}>
        <CardContent
          className={cn(
            'space-y-3 px-4 pt-3 pb-2',
            useNavyTheme && 'space-y-4 px-5 pt-2.5 pb-3 sm:px-6'
          )}
        >
          <section className={cn('space-y-2', useNavyTheme && 'space-y-3')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider',
                    useNavyTheme ? 'text-gray-900' : 'text-muted-foreground'
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  Requester name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={requesterDisplay}
                  readOnly
                  disabled
                  className={cn(
                    'h-10 font-medium',
                    useNavyTheme ? 'bg-white/80 text-[#0B1F4D]' : 'bg-muted/50'
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider',
                    useNavyTheme ? 'text-gray-900' : 'text-muted-foreground'
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formatRequestDateDisplay(requestDate)}
                  readOnly
                  disabled
                  className={cn(
                    'h-10 font-medium',
                    useNavyTheme ? 'bg-white/80 text-[#0B1F4D]' : 'bg-muted/50'
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="department"
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider',
                  useNavyTheme ? 'text-gray-900' : 'text-muted-foreground'
                )}
              >
                Department
              </Label>
              <Input
                id="department"
                value={department}
                readOnly
                disabled
                placeholder="—"
                className={cn(
                  'h-10 font-medium',
                  useNavyTheme ? 'bg-white/80 text-[#0B1F4D]' : 'bg-muted/50'
                )}
              />
            </div>
              <div className="space-y-2">
              <Label
                htmlFor="request-category-default"
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider',
                  useNavyTheme ? 'text-gray-900' : 'text-muted-foreground'
                )}
              >
                Shipment Type <span className="text-destructive">*</span>
              </Label>
              {wrapShake(
                'requestCategory',
                <Select
                  value={requestCategory || undefined}
                  onValueChange={(v) => {
                    setRequestCategory(v === 'International' ? 'International' : 'Domestic');
                    clearFieldShake('requestCategory');
                  }}
                >
                  <SelectTrigger id="request-category-default" className="h-10">
                    <SelectValue placeholder="Select shipment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {renderProjectField({
              id: 'project-purpose-default',
              labelClassName: useNavyTheme
                ? 'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-900'
                : 'text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider',
            })}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="delivery-pincode"
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider',
                    useNavyTheme ? 'text-gray-900' : 'text-muted-foreground'
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Delivery PIN code <span className="text-destructive">*</span>
                </Label>
                {wrapShake(
                  'deliveryPincode',
                  <Input
                    id="delivery-pincode"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 560001"
                    value={deliveryPincode}
                    onChange={(e) => {
                      setDeliveryPincode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      clearFieldShake('deliveryPincode');
                    }}
                    className="h-10 font-medium"
                  />
                )}
                <p className="text-[11px] text-muted-foreground">
                  6-digit PIN for where this order should arrive.
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="delivery-address"
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider',
                    useNavyTheme ? 'text-gray-900' : 'text-muted-foreground'
                  )}
                >
                  Delivery address <span className="text-destructive">*</span>
                </Label>
                {wrapShake(
                  'deliveryAddress',
                  <Input
                    id="delivery-address"
                    placeholder="Building, street, city"
                    value={deliveryAddress}
                    onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                      clearFieldShake('deliveryAddress');
                    }}
                    className="h-10 font-medium"
                  />
                )}
                <p className="text-[11px] text-muted-foreground">
                  Where this order should be delivered.
                </p>
              </div>
            </div>
          </section>

          <section
            className={cn(
              'space-y-2 border-t pt-3',
              useNavyTheme && 'space-y-3 border-[#1A3673]/15 pt-5'
            )}
          >
            <div className="flex items-center justify-between">
              <Label
                className={cn(
                  'text-sm font-medium',
                  useNavyTheme && 'text-base font-semibold tracking-tight text-[#0B1F4D]'
                )}
              >
                Items
              </Label>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className={
                  useNavyTheme
                    ? 'space-y-3 rounded-xl border border-[#1A3673]/20 bg-white p-4 shadow-sm shadow-[#1A3673]/[0.04] ring-1 ring-[#1A3673]/[0.04]'
                    : 'rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3'
                }
              >
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">
                      Item link <span className="text-destructive">*</span>
                    </Label>
                    {wrapShake(
                      itemKey(item.id, 'product_link'),
                      <Input
                        type="url"
                        placeholder="https://… (Amazon, Robu, vendor page, etc.)"
                        value={item.product_link}
                        onChange={(e) => updateItem(item.id, 'product_link', e.target.value)}
                        className="h-9"
                      />
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Paste the product URL from the vendor site.
                    </p>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">
                      Item name <span className="text-destructive">*</span>
                    </Label>
                    {wrapShake(
                      itemKey(item.id, 'item_name_freeform'),
                    <div className="relative">
                      <Input
                        placeholder="Describe the item"
                        value={item.item_name_freeform}
                        onFocus={() => {
                          setFocusedItemNameId(item.id);
                          setItemNameQuery(item.item_name_freeform || '');
                          if ((item.item_name_freeform || '').trim().length >= 2) {
                            setItemNameSuggestionsOpen(itemNameSuggestions.length > 0);
                          }
                        }}
                        onBlur={() => {
                          window.setTimeout(() => {
                            setFocusedItemNameId((prev) => (prev === item.id ? null : prev));
                            setItemNameSuggestionsOpen(false);
                          }, 150);
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateItem(item.id, 'item_name_freeform', v);
                          setFocusedItemNameId(item.id);
                          setItemNameQuery(v);
                          if (v.trim().length >= 2) setItemNameSuggestionsOpen(true);
                        }}
                        className="h-9"
                      />

                      {focusedItemNameId === item.id && (itemNameSuggestionsOpen || itemNameSuggestionsLoading) && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md overflow-hidden">
                          {itemNameSuggestionsLoading ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                          ) : itemNameSuggestions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                          ) : (
                            <div className="max-h-56 overflow-auto">
                              {itemNameSuggestions.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                                  onMouseDown={(ev) => ev.preventDefault()}
                                  onClick={() => {
                                    updateItem(item.id, 'item_name_freeform', s.name);
                                    const d = s.data || {};

                                    const vendor = toVendorStorageName(String((d.default_vendor ?? d.vendor ?? '') as any).trim());
                                    if (vendor) updateItem(item.id, 'vendor', vendor);

                                    const costRaw = d.default_cost_per_unit ?? d.estimated_cost ?? d.cost_per_unit;
                                    const costNum = costRaw === '' || costRaw == null ? '' : Number(costRaw);
                                    if (costNum !== '' && Number.isFinite(costNum)) updateItem(item.id, 'estimated_cost', costNum);
                                    const suggestedCurrency = String((d.price_currency ?? d.currency ?? 'INR') as any).trim().toUpperCase();
                                    if (suggestedCurrency === 'USD' || suggestedCurrency === 'INR') {
                                      updateItem(item.id, 'price_currency', suggestedCurrency as 'INR' | 'USD');
                                    }

                                    const productLink = String((d.product_link ?? d.link ?? '') as any).trim();
                                    if (productLink) updateItem(item.id, 'product_link', productLink);

                                    const catalogSpecs = String(
                                      (d.specifications ?? d.specs ?? d.specification ?? d.short_description ?? '') as any
                                    ).trim();
                                    if (catalogSpecs) {
                                      updateItem(item.id, 'specifications', catalogSpecs.slice(0, 180));
                                    }

                                    setItemNameSuggestionsOpen(false);
                                    setFocusedItemNameId(null);
                                  }}
                                >
                                  <span className="truncate">{s.name}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">#{s.id}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">
                      Specifications <span className="text-destructive">*</span>
                    </Label>
                    {wrapShake(
                      itemKey(item.id, 'specifications'),
                    <Input
                      placeholder="e.g. 30 cm, USB A to Mini B, gold-plated, with cable"
                      value={item.specifications}
                      onChange={(e) => updateItem(item.id, 'specifications', e.target.value)}
                      className="h-9"
                    />
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Size, connector, model, or other distinguishing details.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-4 sm:col-span-2 w-full">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Quantity *</Label>
                      {wrapShake(
                        itemKey(item.id, 'quantity_required'),
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity_required === '' ? '' : item.quantity_required}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateItem(item.id, 'quantity_required', v === '' ? '' : Number(v));
                        }}
                        placeholder="0"
                        className='h-9 w-24'
                      />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Estimated cost *</Label>
                      {wrapShake(
                        itemKey(item.id, 'estimated_cost'),
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={
                            priceDraftByItemId[item.id] ??
                            formatCurrencyDisplay(item.estimated_cost)
                          }
                          onChange={(e) => {
                            const { display, value } = formatCurrencyInputLive(e.target.value);
                            setPriceDraftByItemId((prev) => ({ ...prev, [item.id]: display }));
                            updateItem(item.id, 'estimated_cost', value);
                          }}
                          onBlur={() => {
                            setPriceDraftByItemId((prev) => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                            if (item.estimated_cost !== '' && typeof item.estimated_cost === 'number') {
                              updateItem(item.id, 'estimated_cost', Math.round(item.estimated_cost * 100) / 100);
                            }
                          }}
                          className='h-9 min-w-[7.5rem] font-mono tabular-nums'
                        />
                        <Select
                          value={item.price_currency || 'INR'}
                          onValueChange={(v) => updateItem(item.id, 'price_currency', (v === 'USD' ? 'USD' : 'INR'))}
                        >
                          <SelectTrigger className="h-9 w-20">
                            <SelectValue placeholder="INR" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0 basis-[180px]">
                      <Label className="text-xs font-medium">Vendor *</Label>
                      {wrapShake(
                        itemKey(item.id, 'vendor'),
                      <div className="flex items-center gap-2">
                        <div className="relative w-full">
                            <Input
                              value={item.vendor}
                              placeholder="Search or add vendor"
                              className='h-9 w-full'
                              onFocus={() => {
                                setFocusedVendorId(item.id);
                                setVendorQuery(item.vendor || '');
                                setVendorSuggestionsOpen(true);
                              }}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  setFocusedVendorId((prev) => (prev === item.id ? null : prev));
                                  setVendorSuggestionsOpen(false);
                                }, 150);
                              }}
                              onChange={(e) => {
                                const v = e.target.value;
                                updateItem(item.id, 'vendor', toVendorStorageName(v));
                                setFocusedVendorId(item.id);
                                setVendorQuery(v);
                                setVendorSuggestionsOpen(true);
                              }}
                            />

                            {focusedVendorId === item.id && vendorSuggestionsOpen && (
                              <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md overflow-hidden">
                                {vendorsLoading ? (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>
                                ) : (
                                  <div className="max-h-56 overflow-auto">
                                    {(() => {
                                      const q = vendorQuery.trim().toLowerCase();
                                      const filtered = q
                                        ? vendors.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 12)
                                        : vendors.slice(0, 12);
                                      if (filtered.length === 0) {
                                        return (
                                          <div className="px-3 py-2 text-sm text-muted-foreground">
                                            No matches
                                          </div>
                                        );
                                      }
                                      return filtered.map((v) => (
                                        <button
                                          key={v.id}
                                          type="button"
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                                          onMouseDown={(ev) => ev.preventDefault()}
                                          onClick={() => {
                                            updateItem(item.id, 'vendor', v.name);
                                            setVendorSuggestionsOpen(false);
                                            setFocusedVendorId(null);
                                          }}
                                        >
                                          <span className="truncate">{v.name}</span>
                                          <span className="text-xs text-muted-foreground shrink-0">#{v.id}</span>
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={`h-9 shrink-0 ${navyOutline}`}
                          onClick={() => {
                            startAddVendor(item.id);
                            setVendorSuggestionsOpen(false);
                            setFocusedVendorId(null);
                          }}
                        >
                          + Add vendor
                        </Button>
                      </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Priority *</Label>
                    {wrapShake(
                      itemKey(item.id, 'urgency_level'),
                    <Select
                      value={item.urgency_level || undefined}
                      onValueChange={(v) => updateItem(item.id, 'urgency_level', v)}
                    >
                      <SelectTrigger className='h-9'>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Comments (optional)</Label>
                    <Textarea
                      placeholder="Additional comments for this item"
                      value={item.comments}
                      onChange={(e) => updateItem(item.id, 'comments', e.target.value)}
                      rows={2}
                      className="resize-y min-h-[60px] h-auto text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className={cn('pt-1', useNavyTheme && 'pt-2')}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className={cn('gap-1', navyOutline, useNavyTheme && 'rounded-lg px-3')}
              >
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          </section>
        </CardContent>

        <CardFooter
          className={
            useNavyTheme
              ? 'flex flex-wrap items-center justify-between gap-3 border-t border-[#1A3673]/15 bg-white/90 px-5 py-4 backdrop-blur sm:px-6'
              : 'flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-6 py-4'
          }
        >
          <div>
            {!user && (
              <span className="text-muted-foreground text-sm">You must be signed in to submit.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={submitting || !user}
              className={cn('min-w-[140px] gap-2 shadow-sm', navyBtn, useNavyTheme && 'rounded-lg h-10')}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Create Request{items.filter((i) => (i.item_name_freeform ?? '').trim() && i.quantity_required !== '').length > 1 ? 's' : ''}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={submitting || isFormEmpty}
              className={cn('min-w-[100px]', navyOutline, useNavyTheme && 'rounded-lg h-10')}
            >
              Clear form
            </Button>
          </div>
        </CardFooter>
      </form>

      <Dialog open={addVendorForItemId !== null} onOpenChange={(open) => { if (!open) cancelAddVendor(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add vendor</DialogTitle>
            <DialogDescription>Create a vendor and auto-fill it for this item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Vendor name *"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              className="h-9"
            />
            <Input
              placeholder="Vendor site link (optional)"
              type="url"
              value={newVendorLink}
              onChange={(e) => setNewVendorLink(e.target.value)}
              className="h-9"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelAddVendor}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveNewVendor}
              disabled={savingNewVendor || !newVendorName.trim()}
            >
              {savingNewVendor ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {addVendorDialog}
    </Card>
    </>
  );

}
