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
import { Calendar, User, Send, Loader2, Plus, Trash2, Scale, RefreshCw, ExternalLink, MapPin } from 'lucide-react';
import { formatCurrencyDisplay, formatCurrencyInputLive } from '@/lib/utils/currencyFormat';
import { Badge } from '@/components/ui/badge';

import { REQUEST_CATEGORY_OPTIONS, PRIORITY_OPTIONS } from './constants';
import { looksLikeProductUrl, normalizeIndianPincode, toVendorStorageName, formatRequestDateDisplay } from './utils';
import type { InventoryRequestFormModel } from './useInventoryRequestForm';

export function InventoryRequestFormView(props: InventoryRequestFormModel) {
  const {
    user,
    isProcurement,
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
    vendors,
    vendorsLoading,
    addVendorForItemId,
    newVendorName,
    setNewVendorName,
    newVendorLink,
    setNewVendorLink,
    savingNewVendor,
    specPromptItemId,
    specFacets,
    specSelections,
    specExtraText,
    setSpecExtraText,
    specSampleTitles,
    selectedSampleMatch,
    pendingSpecCompare,
    priceDraftByItemId,
    setPriceDraftByItemId,
    ecommerceSources,
    priceCompareProfile,
    setPriceCompareProfile,
    liveCompareLoadingByItemId,
    linkFetchLoadingByItemId,
    priceCompareStatusByItemId,
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
    activePriceCompareVendors,
    filteredProjectSuggestions,
    addItem,
    removeItem,
    updateItem,
    removeQuote,
    applyQuoteToItem,
    fetchDetailsFromItemLink,
    applyLivePriceResults,
    fetchLivePrices,
    cancelSpecPrompt,
    selectSpecFacetOption,
    selectSampleMatch,
    confirmSpecPrompt,
    startAddVendor,
    cancelAddVendor,
    saveNewVendor,
    handleSubmit,
    handleClear,
    isFormEmpty,
  } = props;

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
          >
            {savingNewVendor ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const sectionLabel = (title: string) => (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
  );

  const renderProjectField = (opts: {
    id: string;
    labelClassName: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={opts.id} className={opts.labelClassName}>
        Project <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Textarea
          id={opts.id}
          placeholder={
            projectSuggestions.length > 0
              ? 'Select a previous project or type a new one'
              : 'Project name or description'
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
            setProjectSuggestionsOpen(true);
          }}
          rows={2}
          className="resize-y min-h-[64px]"
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
    </div>
  );

  if (isProcurement) {
    return (
      <Card className="overflow-hidden border border-border shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="border-b border-border/60 bg-muted/25 px-6 py-5">
            <h2 className="text-lg font-semibold tracking-tight">New Request</h2>
          </div>

          <CardContent className="space-y-8 px-6 py-6">
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-border/60 bg-muted/30 p-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Requester name</Label>
                <Input value={requesterDisplay} readOnly disabled className="h-10 bg-background/80 font-medium" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                <Input
                  value={formatRequestDateDisplay(requestDate)}
                  readOnly
                  disabled
                  className="h-10 bg-background/80 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Department</Label>
              <Input
                value={department}
                readOnly
                disabled
                placeholder="—"
                className="h-10 bg-background/80 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="request-category" className="text-sm font-medium">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={requestCategory || undefined}
                onValueChange={(v) =>
                  setRequestCategory(v === 'International' ? 'International' : 'Domestic')
                }
              >
                <SelectTrigger id="request-category" className="h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderProjectField({
              id: 'project-purpose',
              labelClassName: 'text-sm font-medium',
            })}

            <div className="space-y-5">
              {items.map((item, itemIndex) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3">
                    <Badge variant="outline" className="font-medium">
                      Item {itemIndex + 1}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-6 p-5">
                    <div>
                      {sectionLabel('Item details')}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Item name</Label>
                          <div className="relative">
                            <Input
                              placeholder="Describe the item"
                              value={item.item_name_freeform}
                              className="h-10"
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
                            />
                            {focusedItemNameId === item.id &&
                              (itemNameSuggestionsOpen || itemNameSuggestionsLoading) && (
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
                                            const vendor = toVendorStorageName(
                                              String((d.default_vendor ?? d.vendor ?? '') as any).trim()
                                            );
                                            if (vendor) updateItem(item.id, 'vendor', vendor);
                                            const costRaw =
                                              d.default_cost_per_unit ?? d.estimated_cost ?? d.cost_per_unit;
                                            const costNum =
                                              costRaw === '' || costRaw == null ? '' : Number(costRaw);
                                            if (costNum !== '' && Number.isFinite(costNum))
                                              updateItem(item.id, 'estimated_cost', costNum);
                                            const suggestedCurrency = String(
                                              (d.price_currency ?? d.currency ?? 'INR') as any
                                            )
                                              .trim()
                                              .toUpperCase();
                                            if (suggestedCurrency === 'USD' || suggestedCurrency === 'INR') {
                                              updateItem(
                                                item.id,
                                                'price_currency',
                                                suggestedCurrency as 'INR' | 'USD'
                                              );
                                            }
                                            const productLink = String(
                                              (d.product_link ?? d.link ?? '') as any
                                            ).trim();
                                            if (productLink) updateItem(item.id, 'product_link', productLink);
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
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Specifications</Label>
                          <Input
                            placeholder="e.g. 30 cm, USB A to Mini B, gold-plated"
                            value={item.specifications}
                            onChange={(e) => updateItem(item.id, 'specifications', e.target.value)}
                            className="h-10"
                          />
                          <p className="text-xs text-muted-foreground">
                            Filled automatically from the item link when available.
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Item link</Label>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              type="url"
                              placeholder="https://… (Amazon, Robu, vendor page, etc.)"
                              value={item.product_link}
                              onChange={(e) => updateItem(item.id, 'product_link', e.target.value)}
                              onBlur={(e) => {
                                const url = e.target.value.trim();
                                if (looksLikeProductUrl(url)) {
                                  void fetchDetailsFromItemLink(item.id, url);
                                }
                              }}
                              className="h-10 flex-1"
                              disabled={!!linkFetchLoadingByItemId[item.id]}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 shrink-0 gap-1.5"
                              disabled={
                                !!linkFetchLoadingByItemId[item.id] ||
                                !looksLikeProductUrl(item.product_link)
                              }
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() =>
                                void fetchDetailsFromItemLink(item.id, item.product_link, { force: true })
                              }
                            >
                              {linkFetchLoadingByItemId[item.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Fetch details
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Paste a product URL to auto-fill item name, specifications, vendor, and cost.
                          </p>
                        </div>
                        <div className="space-y-1.5 sm:w-32">
                          <Label className="text-sm font-medium">Quantity *</Label>
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
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      {sectionLabel('Cost & vendor')}
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Estimated cost *</Label>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={
                                priceDraftByItemId[item.id] ?? formatCurrencyDisplay(item.estimated_cost)
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
                                if (
                                  item.estimated_cost !== '' &&
                                  typeof item.estimated_cost === 'number'
                                ) {
                                  updateItem(
                                    item.id,
                                    'estimated_cost',
                                    Math.round(item.estimated_cost * 100) / 100
                                  );
                                }
                              }}
                              className="h-10 min-w-[8rem] font-mono tabular-nums"
                            />
                            <Select
                              value={item.price_currency || 'INR'}
                              onValueChange={(v) =>
                                updateItem(item.id, 'price_currency', v === 'USD' ? 'USD' : 'INR')
                              }
                            >
                              <SelectTrigger className="h-10 w-24">
                                <SelectValue placeholder="INR" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INR">INR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Vendor *</Label>
                          <div className="flex items-start gap-2">
                            <div className="relative min-w-0 flex-1">
                              <Input
                                value={item.vendor}
                                placeholder="Search or add vendor"
                                className="h-10 w-full"
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
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-10 shrink-0"
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
                      </div>
                    </div>

                    <div>
                      {sectionLabel('Priority')}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Priority *</Label>
                          <Select
                            value={item.urgency_level || undefined}
                            onValueChange={(v) => updateItem(item.id, 'urgency_level', v)}
                          >
                            <SelectTrigger className="h-10">
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
                        </div>
                      </div>
                    </div>

                    <div>
                      {sectionLabel('Comments')}
                      <Textarea
                        placeholder="Notes for procurement (optional)"
                        value={item.comments}
                        onChange={(e) => updateItem(item.id, 'comments', e.target.value)}
                        rows={3}
                        className="min-h-[72px] resize-y text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addItem} className="gap-2">
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          </CardContent>

          <CardFooter className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div>
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
                className="min-w-[100px]"
              >
                Clear
              </Button>
              <Button type="submit" disabled={submitting || !user} className="min-w-[160px] gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Create request
                    {items.filter((i) => (i.item_name_freeform ?? '').trim() && i.quantity_required !== '').length > 1
                      ? 's'
                      : ''}
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
        {addVendorDialog}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-border/60 shadow-md">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                  <User className="h-3.5 w-3.5" />
                  Requester name <span className="text-destructive">*</span>
                </Label>
                <Input value={requesterDisplay} readOnly disabled className="h-10 bg-muted/50 font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                  <Calendar className="h-3.5 w-3.5" />
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formatRequestDateDisplay(requestDate)}
                  readOnly
                  disabled
                  className="h-10 bg-muted/50 font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department" className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                Department
              </Label>
              <Input
                id="department"
                value={department}
                readOnly
                disabled
                placeholder="—"
                className="h-10 bg-muted/50 font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="request-category-default"
                className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"
              >
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={requestCategory || undefined}
                onValueChange={(v) =>
                  setRequestCategory(v === 'International' ? 'International' : 'Domestic')
                }
              >
                <SelectTrigger id="request-category-default" className="h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderProjectField({
              id: 'project-purpose-default',
              labelClassName:
                'text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider',
            })}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="delivery-pincode"
                  className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Delivery PIN code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="delivery-pincode"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="e.g. 560001"
                  value={deliveryPincode}
                  onChange={(e) => setDeliveryPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-10 font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                  Required for live delivery dates (Amazon and similar).
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="delivery-address"
                  className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"
                >
                  Delivery address
                </Label>
                <Input
                  id="delivery-address"
                  placeholder="Building, street, city"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="h-10 font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                  Where this order should be delivered.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Items</Label>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3"
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
                    <Label className="text-xs font-medium">Item name</Label>
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
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Specifications</Label>
                    <Input
                      placeholder="e.g. 30 cm, USB A to Mini B, gold-plated, with cable"
                      value={item.specifications}
                      onChange={(e) => updateItem(item.id, 'specifications', e.target.value)}
                      className="h-9"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Filled automatically from the item link when available.
                    </p>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Item link</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        type="url"
                        placeholder="https://… (Amazon, Robu, vendor page, etc.)"
                        value={item.product_link}
                        onChange={(e) => updateItem(item.id, 'product_link', e.target.value)}
                        onBlur={(e) => {
                          const url = e.target.value.trim();
                          if (looksLikeProductUrl(url)) {
                            void fetchDetailsFromItemLink(item.id, url);
                          }
                        }}
                        className="h-9 flex-1"
                        disabled={!!linkFetchLoadingByItemId[item.id]}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 gap-1.5"
                        disabled={
                          !!linkFetchLoadingByItemId[item.id] ||
                          !looksLikeProductUrl(item.product_link)
                        }
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          void fetchDetailsFromItemLink(item.id, item.product_link, { force: true })
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
                    <p className="text-[11px] text-muted-foreground">
                      Paste a product URL to auto-fill item name, specifications, vendor, and cost.
                    </p>
                  </div>

                  {/* E-commerce price comparison (multi-vendor live search) */}
                  <div className="sm:col-span-2 rounded-md border border-dashed border-border/80 bg-background/60 p-3 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Scale className="h-3.5 w-3.5" />
                          Price comparison
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Searching {activePriceCompareVendors.length} vendors
                          {priceCompareProfile === 'extended' ? ' (full catalog)' : ' (core set)'}.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Select
                          value={priceCompareProfile}
                          onValueChange={(v) =>
                            setPriceCompareProfile(v === 'extended' ? 'extended' : 'core')
                          }
                        >
                          <SelectTrigger className="h-7 w-[10.5rem] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="core">Core ({ecommerceSources.filter((s) => s.id !== 'other' && s.profile === 'core').length})</SelectItem>
                            <SelectItem value="extended">
                              Extended ({ecommerceSources.filter((s) => s.id && s.id !== 'other').length})
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          disabled={
                            !!liveCompareLoadingByItemId[item.id] ||
                            !normalizeIndianPincode(deliveryPincode)
                          }
                          onClick={() => fetchLivePrices(item.id)}
                          title={
                            normalizeIndianPincode(deliveryPincode)
                              ? undefined
                              : 'Enter a valid delivery PIN code first'
                          }
                        >
                          {liveCompareLoadingByItemId[item.id] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Fetch live prices
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {activePriceCompareVendors.map((v) => (
                        <Badge
                          key={v.id}
                          variant="secondary"
                          className="rounded-md px-2 py-0.5 text-[10px] font-normal"
                        >
                          {v.label}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-end">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`delivery-pincode-${item.id}`}
                          className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" />
                          Delivery PIN <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`delivery-pincode-${item.id}`}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="560001"
                          value={deliveryPincode}
                          onChange={(e) =>
                            setDeliveryPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <Label
                          htmlFor={`delivery-address-${item.id}`}
                          className="text-[10px] text-muted-foreground uppercase tracking-wide"
                        >
                          Delivery address
                        </Label>
                        <Input
                          id={`delivery-address-${item.id}`}
                          placeholder="Building, street, city"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {item.price_quotes.length > 0 ? (() => {
                      const priced = item.price_quotes.filter(
                        (q) => q.price !== '' && Number.isFinite(Number(q.price)) && Number(q.price) > 0
                      );
                      const lowestId =
                        priced.length > 0
                          ? priced.reduce((best, q) =>
                              q.currency === best.currency && Number(q.price) < Number(best.price) ? q : best
                            ).id
                          : null;

                      return (
                        <div className="space-y-2">
                          {item.price_quotes.map((quote) => {
                            const isLowest = lowestId === quote.id;
                            const sourceLabel =
                              quote.source_label ||
                              ecommerceSources.find((s) => s.id === quote.source)?.label ||
                              quote.source;
                            const priceText =
                              quote.price !== '' && Number.isFinite(Number(quote.price))
                                ? `${formatCurrencyDisplay(quote.price)} ${quote.currency || 'INR'}`
                                : '—';
                            const deliveryText = (quote.delivery_date || '').trim() || '—';
                            return (
                              <div
                                key={quote.id}
                                className={`rounded-md border p-2 space-y-2 ${
                                  isLowest ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border/50'
                                }`}
                              >
                                {quote.title ? (
                                  <p className="text-[11px] text-muted-foreground truncate" title={quote.title}>
                                    {quote.live ? 'Live · ' : ''}
                                    {quote.title}
                                  </p>
                                ) : null}
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_7.5rem_7.5rem_auto] sm:items-center">
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                      Source
                                    </p>
                                    <p className="text-xs font-medium truncate" title={sourceLabel}>
                                      {sourceLabel}
                                    </p>
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                      Product
                                    </p>
                                    <div className="flex items-center gap-1 min-w-0">
                                      <p
                                        className="text-xs text-muted-foreground truncate min-w-0 flex-1"
                                        title={quote.link || undefined}
                                      >
                                        {quote.link.trim() || '—'}
                                      </p>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 shrink-0 gap-1 text-xs px-2"
                                        disabled={!quote.link.trim()}
                                        onClick={() => {
                                          const url = quote.link.trim();
                                          if (!url) return;
                                          const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                                          window.open(href, '_blank', 'noopener,noreferrer');
                                        }}
                                        title="Open product page"
                                        aria-label="Open product page"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Open
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                      Delivery
                                    </p>
                                    <p className="text-xs font-medium truncate" title={deliveryText}>
                                      {deliveryText}
                                    </p>
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                      Price
                                      {isLowest && (
                                        <span className="rounded bg-emerald-600/15 px-1 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 normal-case tracking-normal">
                                          Lowest
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs font-mono tabular-nums font-medium">{priceText}</p>
                                  </div>
                                  <div className="flex items-center gap-1 sm:justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={isLowest ? 'default' : 'secondary'}
                                      className="h-8 text-xs"
                                      onClick={() => applyQuoteToItem(item.id, quote)}
                                    >
                                      Use
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeQuote(item.id, quote.id)}
                                      aria-label="Remove quote"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })() : priceCompareStatusByItemId[item.id] === 'unavailable' ? (
                      <p className="text-sm text-muted-foreground py-1">
                        No product available
                      </p>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Enter delivery PIN above, item name (and specs if needed), then click Fetch live prices.
                        </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-end gap-4 sm:col-span-2 w-full">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Quantity *</Label>
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
                        className="h-9 w-24"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Estimated cost *</Label>
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
                          className="h-9 min-w-[7.5rem] font-mono tabular-nums"
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
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-[180px]">
                      <Label className="text-xs font-medium">Vendor *</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-full">
                            <Input
                              value={item.vendor}
                              placeholder="Search or add vendor"
                              className="h-9 w-full"
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
                          className="h-9 shrink-0"
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
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Priority *</Label>
                    <Select
                      value={item.urgency_level || undefined}
                      onValueChange={(v) => updateItem(item.id, 'urgency_level', v)}
                    >
                      <SelectTrigger className="h-9">
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
            <div className="pt-1">
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          </section>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-6 py-4">
          <div>
            {!user && (
              <span className="text-muted-foreground text-sm">You must be signed in to submit.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={submitting || !user} className="min-w-[140px] gap-2 shadow-sm">
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
              className="min-w-[100px]"
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

      <Dialog
        open={specPromptItemId !== null}
        onOpenChange={(open) => {
          if (!open) cancelSpecPrompt();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose product specifications</DialogTitle>
            <DialogDescription>
              Your item name matches multiple variants. Pick the specs you need so we fetch the right prices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
            {specSampleTitles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Matching products</Label>
                <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                  {specSampleTitles.map((t, idx) => {
                    const selected = selectedSampleMatch === t.trim();
                    return (
                      <button
                        key={`${idx}-${t.slice(0, 40)}`}
                        type="button"
                        onClick={() => selectSampleMatch(t)}
                        className={
                          selected
                            ? 'block w-full rounded-lg border border-black bg-black px-4 py-3.5 text-left text-sm leading-relaxed text-white shadow-sm'
                            : 'block w-full rounded-lg border border-input bg-background px-4 py-3.5 text-left text-sm leading-relaxed text-foreground hover:bg-accent hover:text-accent-foreground'
                        }
                      >
                        <span className="block whitespace-normal break-words">{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {specFacets.map((facet) => (
              <div key={facet.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{facet.label}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {facet.options.map((opt) => {
                    const selected = specSelections[facet.key] === opt;
                    return (
                      <Button
                        key={opt}
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        className="h-7 rounded-full text-xs"
                        onClick={() => selectSpecFacetOption(facet.key, opt, selected)}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {specFacets.length > 0 || specSampleTitles.length > 0
                  ? 'Specifications'
                  : 'Specifications *'}
              </Label>
              <Input
                placeholder="Filled when you select a product or length/size…"
                value={specExtraText}
                onChange={(e) => setSpecExtraText(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const itemId = specPromptItemId;
                const pending =
                  pendingSpecCompare && pendingSpecCompare.itemId === itemId
                    ? pendingSpecCompare
                    : null;
                cancelSpecPrompt();
                if (!itemId) return;
                if (pending?.data) {
                  applyLivePriceResults(itemId, pending.data, pending.name, '');
                  return;
                }
                await fetchLivePrices(itemId, { skipSpecPrompt: true });
              }}
            >
              Skip &amp; show all
            </Button>
            <Button type="button" onClick={confirmSpecPrompt}>
              Apply &amp; fetch prices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {addVendorDialog}
    </Card>
  );

}
