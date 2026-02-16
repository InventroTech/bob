'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ChevronsUpDown, Calendar, User, Package, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InventoryRequestFormConfig {
  /** Status to use for newly created requests (e.g. DRAFT, PENDING_PM) */
  defaultStatus?: string;
}

interface InventoryRequestFormProps {
  config?: InventoryRequestFormConfig;
}

// Options for dropdowns (can be moved to config or API later)
const DEPARTMENTS = ['Engineering', 'Design', 'Manufacturing', 'Operations', 'Product', 'Sales & Marketing', 'HR', 'Finance', 'Other'];
const SUB_DEPARTMENTS: Record<string, string[]> = {
  Engineering: ['Hardware', 'Software/Firmware', 'Embedded Systems', 'Flight Control', 'Propulsion', 'Electronics', 'Testing/QA', 'Other'],
  Design: ['Industrial Design', 'Aerodynamics', 'CAD/Mechanical Design', 'Other'],
  Manufacturing: ['Assembly', 'Quality Control', 'Production Planning', 'Other'],
  Operations: ['Supply Chain', 'Logistics', 'Facilities', 'Support', 'Other'],
  Product: ['Product Management', 'Product Development', 'Other'],
  'Sales & Marketing': ['Sales', 'Marketing', 'Business Development', 'Other'],
  HR: ['Recruitment', 'L&D', 'Operations', 'Other'],
  Finance: ['FP&A', 'Accounting', 'Other'],
  Other: ['Other'],
};
const URGENCY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

/**
 * Inventory request creation form for PageBuilder.
 * Stores data in records table with entity_type=inventory_request.
 * Requester is auto-filled from auth; request_date is auto current.
 */
export const InventoryRequestFormComponent: React.FC<InventoryRequestFormProps> = ({ config }) => {
  const { user } = useAuth();

  const [department, setDepartment] = useState('');
  const [subDepartment, setSubDepartment] = useState('');
  const [projectPurpose, setProjectPurpose] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [partNumberSku, setPartNumberSku] = useState('');
  const [partNumberOptions, setPartNumberOptions] = useState<{ value: string; label: string }[]>([]);
  const [partNumberSearchOpen, setPartNumberSearchOpen] = useState(false);
  const [partNumberSearchQuery, setPartNumberSearchQuery] = useState('');
  const partNumberTriggerRef = useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [urgency, setUrgency] = useState('');
  const [justificationNotes, setJustificationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const status = config?.defaultStatus || 'DRAFT';

  // Load part numbers from inventory_item records for dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<{ results?: { id: number; data?: { part_number_or_sku?: string; name?: string } }[] }>(
          '/crm-records/records/?entity_type=inventory_item&page_size=100'
        );
        const list = res.data?.results ?? (res.data as any)?.data ?? [];
        const options = list
          .map((r: any) => {
            const sku = r.data?.part_number_or_sku || r.data?.model;
            const name = r.data?.name;
            if (!sku && !name) return null;
            return { value: sku || name || '', label: name ? `${name}${sku ? ` (${sku})` : ''}` : sku };
          })
          .filter(Boolean) as { value: string; label: string }[];
        setPartNumberOptions(options);
      } catch {
        setPartNumberOptions([]);
      }
    })();
  }, []);

  const subDepartmentOptions = department ? (SUB_DEPARTMENTS[department] ?? ['Other']) : [];

  // Filter part number options based on search query
  const filteredPartNumberOptions = partNumberOptions.filter((option) =>
    option.label.toLowerCase().includes(partNumberSearchQuery.toLowerCase()) ||
    option.value.toLowerCase().includes(partNumberSearchQuery.toLowerCase())
  );

  // Get the selected part number label for display
  const selectedPartNumberLabel = partNumberSku
    ? partNumberOptions.find((o) => o.value === partNumberSku)?.label || partNumberSku
    : 'Select or leave blank';

  // Update popover width when trigger is mounted or opened
  useEffect(() => {
    if (partNumberSearchOpen && partNumberTriggerRef.current) {
      setPopoverWidth(partNumberTriggerRef.current.offsetWidth);
    }
  }, [partNumberSearchOpen]);

  const requesterDisplay = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a request.');
      return;
    }

    if (!itemDescription || !quantity) {
      toast.error('Item description and quantity are required.');
      return;
    }

    const requesterId = user.id;
    const requestDate = new Date().toISOString().split('T')[0];

    try {
      setSubmitting(true);

      await apiClient.post('/crm-records/records/', {
        entity_type: 'inventory_request',
        data: {
          status,
          request_date: requestDate,
          requester_id: requesterId,
          requester_name: requesterDisplay,
          department: department || undefined,
          sub_department: subDepartment || undefined,
          project_purpose: projectPurpose || undefined,
          item_name_freeform: itemDescription,
          part_number_or_sku: partNumberSku || undefined,
          quantity_required: quantity,
          urgency_level: urgency || undefined,
          comments: justificationNotes || undefined,
        },
      });

      toast.success('Inventory request created.');
      setDepartment('');
      setSubDepartment('');
      setProjectPurpose('');
      setItemDescription('');
      setPartNumberSku('');
      setQuantity('');
      setUrgency('');
      setJustificationNotes('');
    } catch (err: any) {
      console.error('Failed to create inventory request', err);
      toast.error(err?.message || 'Failed to create inventory request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setDepartment('');
    setSubDepartment('');
    setProjectPurpose('');
    setItemDescription('');
    setPartNumberSku('');
    setPartNumberSearchQuery('');
    setQuantity('');
    setUrgency('');
    setJustificationNotes('');
    toast.success('Form cleared.');
  };

  const isFormEmpty =
    !department &&
    !subDepartment &&
    !projectPurpose &&
    !itemDescription &&
    !partNumberSku &&
    quantity === '' &&
    !urgency &&
    !justificationNotes;

  return (
    <Card className="overflow-hidden border border-border/60 shadow-md">
      

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          {/* Request info */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                  <Calendar className="h-3.5 w-3.5" />
                  Date
                </Label>
                <Input
                  value={new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  readOnly
                  disabled
                  className="h-10 bg-muted/50 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                  <User className="h-3.5 w-3.5" />
                  Requester
                </Label>
                <Input
                  value={requesterDisplay}
                  readOnly
                  disabled
                  className="h-10 bg-muted/50 font-medium"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-medium">
                  Department
                </Label>
                <Select value={department} onValueChange={(v) => { setDepartment(v); setSubDepartment(''); }}>
                  <SelectTrigger id="department" className="h-10">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub-department" className="text-sm font-medium">
                  Sub-department
                </Label>
                <Select value={subDepartment} onValueChange={setSubDepartment} disabled={!department}>
                  <SelectTrigger id="sub-department" className="h-10">
                    <SelectValue placeholder={department ? 'Select sub-department' : 'Select department first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {subDepartmentOptions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-purpose" className="text-sm font-medium">
                Project / Purpose
              </Label>
              <Input
                id="project-purpose"
                placeholder="e.g. Titan 30 Sensor, Fury Wing Part"
                value={projectPurpose}
                onChange={(e) => setProjectPurpose(e.target.value)}
                className="h-10"
              />
            </div>
          </section>

          {/* Item details */}
          <section className="space-y-4 border-t pt-6">
            <h3 className="text-sm font-medium text-foreground/90">Item details</h3>
            <div className="space-y-2">
              <Label htmlFor="item-description" className="text-sm font-medium">
                Item description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="item-description"
                placeholder="Describe the item(s) you need"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                required
                className="h-10"
              />
              <p className="text-muted-foreground text-xs">Brief description of the requested item(s).</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="part-sku" className="text-sm font-medium">
                  Part number / SKU
                </Label>
                <Popover open={partNumberSearchOpen} onOpenChange={setPartNumberSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      ref={partNumberTriggerRef}
                      id="part-sku"
                      variant="outline"
                      role="combobox"
                      aria-expanded={partNumberSearchOpen}
                      className={cn(
                        'h-10 w-full justify-between font-normal',
                        !partNumberSku && 'text-muted-foreground'
                      )}
                    >
                      <span className="truncate">
                        {partNumberSku ? selectedPartNumberLabel : 'Select or leave blank'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0"
                    align="start"
                    style={popoverWidth ? { width: `${popoverWidth}px` } : undefined}
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search items..."
                        value={partNumberSearchQuery}
                        onValueChange={setPartNumberSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No items found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="_none_"
                            onSelect={() => {
                              setPartNumberSku('');
                              setPartNumberSearchOpen(false);
                              setPartNumberSearchQuery('');
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                partNumberSku === '' ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            — None / New item
                          </CommandItem>
                          {filteredPartNumberOptions.map((option) => (
                            <CommandItem
                              key={option.value}
                              value={option.value}
                              onSelect={() => {
                                setPartNumberSku(option.value);
                                setPartNumberSearchOpen(false);
                                setPartNumberSearchQuery('');
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  partNumberSku === option.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {option.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-muted-foreground text-xs">Optional — search existing inventory items.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium">
                  Quantity required <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuantity(v === '' ? '' : Number(v));
                  }}
                  required
                  placeholder="0"
                  className="h-10"
                />
              </div>
            </div>
          </section>

          {/* Priority & notes */}
          <section className="space-y-4 border-t pt-6">
            <h3 className="text-sm font-medium text-foreground/90">Priority & notes</h3>
            <div className="space-y-2">
              <Label htmlFor="urgency" className="text-sm font-medium">
                Priority / Urgency
              </Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger id="urgency" className="h-10">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="justification" className="text-sm font-medium">
                Justification / Notes
              </Label>
              <Textarea
                id="justification"
                placeholder="Business justification or additional notes"
                value={justificationNotes}
                onChange={(e) => setJustificationNotes(e.target.value)}
                rows={3}
                className="resize-y min-h-[80px]"
              />
            </div>
          </section>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center gap-3 border-t bg-muted/20 px-6 py-4">
          <Button
            type="submit"
            disabled={submitting || !user}
            className="min-w-[140px] gap-2 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Create Request
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
          {!user && (
            <span className="text-muted-foreground text-sm">You must be signed in to submit.</span>
          )}
        </CardFooter>
      </form>
    </Card>
  );
};
