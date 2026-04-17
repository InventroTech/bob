'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export type StatusActionWarningModalConfig = {
  title?: string;
  description?: string;
  confirmationText?: string;
  /** Reserved for future modal forms; current implementation uses payment confirmation flow. */
  formType?: 'payment_confirmation';
  paymentMethods?: string[];
};

export type StatusActionWithWarningConfig = {
  label: string;
  statusValue: string;
  statusText?: string;
  conditional?: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'; value: string | number };
  openWarningModal?: boolean;
  warningModalConfig?: StatusActionWarningModalConfig;
};

interface StatusActionWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionButton: StatusActionWithWarningConfig | null;
  actorName: string;
  submitting?: boolean;
  onSubmit: (payload: { payment_method: string; paid_by: string }) => Promise<void> | void;
}

const DEFAULT_METHODS = ['NEFT', 'UPI', 'WIRE_TRANSFER', 'COMPANY_CARD', 'OTHER'];

export const StatusActionWarningModal: React.FC<StatusActionWarningModalProps> = ({
  open,
  onOpenChange,
  actionButton,
  actorName,
  submitting = false,
  onSubmit,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setPaymentMethod('');
    }
  }, [open]);

  const title = actionButton?.warningModalConfig?.title || `Confirm ${actionButton?.label ?? 'action'}`;
  const description =
    actionButton?.warningModalConfig?.description ||
    'Please confirm this status update and capture payment details.';
  const confirmationText =
    actionButton?.warningModalConfig?.confirmationText || 'I confirm this payment status update.';

  const paymentMethods = useMemo(() => {
    const configured = actionButton?.warningModalConfig?.paymentMethods;
    if (!configured || configured.length === 0) return DEFAULT_METHODS;
    const cleaned = configured
      .map((m) => String(m || '').trim())
      .filter(Boolean)
      .map((m) => m.replace(/\s+/g, '_').toUpperCase());
    return cleaned.length > 0 ? cleaned : DEFAULT_METHODS;
  }, [actionButton?.warningModalConfig?.paymentMethods]);

  const canSubmit = confirmed && paymentMethod.trim() !== '' && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({ payment_method: paymentMethod, paid_by: actorName });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border/60 bg-muted/20 p-3">
            <p className="text-sm">
              <span className="font-medium">Paid by:</span> {actorName}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment method</Label>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method}
                  type="button"
                  size="sm"
                  variant={paymentMethod === method ? 'default' : 'outline'}
                  className="rounded-full h-8"
                  onClick={() => setPaymentMethod(method)}
                  disabled={submitting}
                >
                  {method.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={submitting}
            />
            <span>{confirmationText}</span>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

