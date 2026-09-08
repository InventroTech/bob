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
import {
  Calendar,
  User,
  Send,
  Loader2,
  Plus,
  Trash2,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { formatCurrencyDisplay, formatCurrencyInputLive } from '@/lib/utils/currencyFormat';

import { REQUEST_CATEGORY_OPTIONS, PRIORITY_OPTIONS } from './constants';
import { toVendorStorageName, formatRequestDateDisplay } from './utils';
import { looksLikeProductUrl } from '@/lib/inventory/productLinkExtract';
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
    linkFetchLoadingByItemId,
    fetchDetailsFromProductLink,
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

  /** Prototype: small muted uppercase labels */
  const fieldLabelClass =
    'text-[11px] font-medium uppercase tracking-wide text-muted-foreground';

  const itemFieldLabelClass = 'text-xs font-medium text-foreground';

  const helpTextClass = 'text-[11px] leading-snug text-muted-foreground';

  const inputBorderClass = useNavyTheme
    ? 'border-[#D0D7E5] focus-visible:border-[#1A3673]/55 focus-visible:ring-[#1A3673]/20'
    : '';

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

  const renderProjectField = (opts: { id: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={opts.id} className={fieldLabelClass}>
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
            className={cn('h-10', inputBorderClass)}
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
    ? '!bg-[#1A3673] !text-white hover:!bg-[#152c5e] focus-visible:!ring-[#1A3673]'
    : '';
  const navyOutline = useNavyTheme
    ? '!border-[#1A3673] !text-[#1A3673] hover:!bg-[#1A3673]/[0.04] hover:!text-[#1A3673]'
    : '';

  const readonlyInputClass = cn(
    'h-10 bg-white font-medium text-[#0B1F4D]',
    inputBorderClass
  );

  return (
    <>
    {showSubmitSuccess ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1F4D]/45 backdrop-blur-[2px]">
        <div className="animate-request-success-pop flex w-[min(92vw,22rem)] flex-col items-center gap-3 rounded-2xl bg-white px-8 py-9 text-center shadow-2xl shadow-[#1A3673]/25 ring-1 ring-[#1A3673]/15">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1A3673] text-white shadow-lg shadow-[#1A3673]/30">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden>
              <path
                d="M5 13l4 4L19 7"
                className="animate-request-success-check"
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
        'max-w-full min-w-0 overflow-x-hidden rounded-lg border bg-white shadow-none',
        useNavyTheme ? 'border-[#D8DEE9]' : 'border-border/60'
      )}
    >
      <form onSubmit={handleSubmit}>
        <CardContent
          className={cn(
            'space-y-5 px-4 pb-3 pt-4 sm:px-6 sm:pt-5',
            useNavyTheme && 'pt-3 sm:pt-4'
          )}
        >
          {/* Header fields — 3-col like prototype */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>
                  Requester name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={requesterDisplay}
                    readOnly
                    disabled
                    className={cn(readonlyInputClass, 'pl-9')}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department" className={fieldLabelClass}>
                  Department
                </Label>
                <Input
                  id="department"
                  value={department}
                  readOnly
                  disabled
                  placeholder="—"
                  className={readonlyInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>
                  Date <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={formatRequestDateDisplay(requestDate)}
                    readOnly
                    disabled
                    className={cn(readonlyInputClass, 'pl-9')}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {renderProjectField({ id: 'project-purpose-default' })}
              <div className="space-y-1.5">
                <Label htmlFor="request-category-default" className={fieldLabelClass}>
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
                    <SelectTrigger
                      id="request-category-default"
                      className={cn('h-10', useNavyTheme && 'border-[#D0D7E5]')}
                    >
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
              <div className="space-y-1.5">
                <Label htmlFor="delivery-pincode" className={fieldLabelClass}>
                  Delivery PIN code <span className="text-destructive">*</span>
                </Label>
                {wrapShake(
                  'deliveryPincode',
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                      className={cn('h-10 pl-9 font-medium', inputBorderClass)}
                    />
                  </div>
                )}
                <p className={helpTextClass}>
                  6-digit PIN for where this order should arrive.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delivery-address" className={fieldLabelClass}>
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
                  className={cn('h-10 font-medium', inputBorderClass)}
                />
              )}
              <p className={helpTextClass}>
                Where this order should be delivered.
              </p>
            </div>
          </section>

          {/* Items — prototype: heading + bordered item cards (no outer tinted wrapper) */}
          <section className="space-y-3">
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                useNavyTheme ? 'text-[#1A3673]' : 'text-muted-foreground'
              )}
            >
              Items
            </p>

            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'relative space-y-3 rounded-lg border bg-white p-4 pt-10',
                  useNavyTheme ? 'border-[#D8DEE9]' : 'border-border/60'
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length <= 1}
                  className="absolute right-2 top-2 h-8 w-8 p-0 text-destructive hover:bg-destructive/5 hover:text-destructive"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div className="space-y-3">
                  {/* 1st Position: Item Link (Optional) */}
                  <div className="space-y-1.5">
                    <Label className={itemFieldLabelClass}>
                      Item link
                    </Label>
                    {wrapShake(
                      itemKey(item.id, 'product_link'),
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          type="url"
                          placeholder="https://… (Amazon, Robu, vendor page, etc.)"
                          value={item.product_link}
                          onChange={(e) => updateItem(item.id, 'product_link', e.target.value)}
                          className={cn('h-9 flex-1', inputBorderClass)}
                          disabled={!!linkFetchLoadingByItemId[item.id]}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn('h-9 shrink-0 gap-1.5', navyOutline)}
                          disabled={
                            !!linkFetchLoadingByItemId[item.id] ||
                            !looksLikeProductUrl(item.product_link)
                          }
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            void fetchDetailsFromProductLink(item.id, item.product_link, { force: true })
                          }
                        >
                          {linkFetchLoadingByItemId[item.id] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Fetch details
                        </Button>
                      </div>
                    )}
                    <p className={helpTextClass}>
                      Paste the product URL from the vendor site.
                    </p>
                  </div>

                  {/* 2nd Position: Item Name (Mandatory) */}
                  <div className="space-y-1.5">
                    <Label className={itemFieldLabelClass}>
                      Item name <span className="text-destructive">*</span>
                    </Label>
                    {wrapShake(
                      itemKey(item.id, 'item_name_freeform'),
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-md border border-border bg-muted object-cover"
                            />
                          ) : null}
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
                            className={cn('h-9 flex-1', inputBorderClass)}
                          />
                        </div>

                        {focusedItemNameId === item.id && (itemNameSuggestionsOpen || itemNameSuggestionsLoading) && (
                          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-md">
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
                                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
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
                                      const productImage = String((d.product_image ?? d.image ?? '') as any).trim();
                                      if (productImage) updateItem(item.id, 'product_image', productImage);

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
                                    <span className="shrink-0 text-xs text-muted-foreground">#{s.id}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Specifications (Restored as Mandatory with *) */}
                  <div className="space-y-1.5">
                    <Label className={itemFieldLabelClass}>
                      Specifications <span className="text-destructive">*</span>
                    </Label>
                    {wrapShake(
                      itemKey(item.id, 'specifications'),
                      <Input
                        placeholder="e.g. 30 cm, USB A to Mini B, gold-plated, with cable"
                        value={item.specifications}
                        onChange={(e) => updateItem(item.id, 'specifications', e.target.value)}
                        className={cn('h-9', inputBorderClass)}
                      />
                    )}
                    <p className={helpTextClass}>
                      Size, connector, model, or other distinguishing details.
                    </p>
                  </div>

                  {/* Qty | Cost | Vendor + Add | Priority — one row on desktop */}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="w-full space-y-1.5 lg:w-24 shrink-0">
                      <Label className={itemFieldLabelClass}>Quantity *</Label>
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
                          className={cn('h-9 w-full', inputBorderClass)}
                        />
                      )}
                    </div>

                    <div className="w-full space-y-1.5 lg:w-40 shrink-0">
                      <Label className={itemFieldLabelClass}>Estimated cost *</Label>
                      {wrapShake(
                        itemKey(item.id, 'estimated_cost'),
                        <div
                          className={cn(
                            'flex h-9 overflow-hidden rounded-md border bg-white',
                            useNavyTheme ? 'border-[#D0D7E5]' : 'border-input'
                          )}
                        >
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
                            className="h-9 min-w-0 flex-1 rounded-none border-0 font-mono tabular-nums shadow-none focus-visible:ring-0"
                          />
                          <Select
                            value={item.price_currency || 'INR'}
                            onValueChange={(v) => updateItem(item.id, 'price_currency', (v === 'USD' ? 'USD' : 'INR'))}
                          >
                            <SelectTrigger className="h-9 w-[3.75rem] shrink-0 rounded-none border-0 border-l border-[#D0D7E5] bg-[#F3F5F9] text-xs font-medium text-muted-foreground shadow-none focus:ring-0">
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

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Label className={itemFieldLabelClass}>Vendor *</Label>
                      <div className="flex items-center gap-2">
                        {wrapShake(
                          itemKey(item.id, 'vendor'),
                          <div className="relative min-w-0 flex-1">
                            <Input
                              value={item.vendor}
                              placeholder="Search or add vendor"
                              className={cn('h-9 w-full', inputBorderClass)}
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
                              <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-md">
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
                                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                                          onMouseDown={(ev) => ev.preventDefault()}
                                          onClick={() => {
                                            updateItem(item.id, 'vendor', v.name);
                                            setVendorSuggestionsOpen(false);
                                            setFocusedVendorId(null);
                                          }}
                                        >
                                          <span className="truncate">{v.name}</span>
                                          <span className="shrink-0 text-xs text-muted-foreground">#{v.id}</span>
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn('h-9 shrink-0 whitespace-nowrap', navyOutline)}
                          onClick={() => {
                            startAddVendor(item.id);
                            setVendorSuggestionsOpen(false);
                            setFocusedVendorId(null);
                          }}
                        >
                          + Add vendor
                        </Button>
                      </div>
                    </div>

                    <div className="w-full space-y-1.5 lg:w-44 shrink-0">
                      <Label className={itemFieldLabelClass}>Priority *</Label>
                      {wrapShake(
                        itemKey(item.id, 'urgency_level'),
                        <Select
                          value={item.urgency_level || undefined}
                          onValueChange={(v) => updateItem(item.id, 'urgency_level', v)}
                        >
                          <SelectTrigger className={cn('h-9', useNavyTheme && 'border-[#D0D7E5]')}>
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
                  </div>

                  <div className="space-y-1.5">
                    <Label className={itemFieldLabelClass}>Comments (optional)</Label>
                    <Textarea
                      placeholder="Additional comments for this item"
                      value={item.comments}
                      onChange={(e) => updateItem(item.id, 'comments', e.target.value)}
                      rows={2}
                      className={cn('min-h-[72px] h-auto resize-y text-sm', inputBorderClass)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className={cn('h-9 gap-1.5 rounded-md px-3', navyOutline)}
              >
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          </section>
        </CardContent>

        <CardFooter
          className={cn(
            'flex flex-wrap items-center justify-end gap-3 border-t bg-white px-4 py-4 sm:px-6',
            useNavyTheme ? 'border-[#E4E8F0]' : 'border-border'
          )}
        >
          <div className="mr-auto">
            {!user && (
              <span className="text-sm text-muted-foreground">You must be signed in to submit.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={submitting || isFormEmpty}
              className={cn('h-10 min-w-[100px] rounded-md', navyOutline)}
            >
              Clear form
            </Button>
            <Button
              type="submit"
              disabled={submitting || !user}
              className={cn('h-10 min-w-[140px] gap-2 rounded-md', navyBtn)}
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
          </div>
        </CardFooter>
      </form>

      {addVendorDialog}
    </Card>
    </>
  );
}