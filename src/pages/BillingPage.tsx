import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { billingService, type BillingMember, type BillingReport } from '@/lib/api';
import { toast } from 'sonner';

const LETTERHEAD_PDF_PATH = '/pyro-letterhead.pdf';
const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function getCurrentMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

function getBillingYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, index) => currentYear - index);
}

function formatMoney(value: string | number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '0.00';

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function formatPdfMoney(value: string | number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 'INR 0.00';
  return `INR ${numericValue.toFixed(2)}`;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'MMM d, yyyy');
}

function downloadPdfBytes(bytes: ArrayBuffer | Uint8Array, filename: string) {
  const blobPart: ArrayBuffer = bytes instanceof ArrayBuffer ? bytes : new ArrayBuffer(bytes.byteLength);
  if (bytes instanceof Uint8Array) {
    new Uint8Array(blobPart).set(bytes);
  }

  const blob = new Blob([blobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function addLetterheadToPdf(contentBytes: ArrayBuffer) {
  try {
    const letterheadResponse = await fetch(LETTERHEAD_PDF_PATH);
    if (!letterheadResponse.ok) {
      return { bytes: contentBytes, usedLetterhead: false };
    }

    const letterheadBytes = await letterheadResponse.arrayBuffer();
    const contentPdf = await PDFDocument.load(contentBytes);
    const outputPdf = await PDFDocument.create();
    const [letterheadPage] = await outputPdf.embedPdf(letterheadBytes, [0]);
    const embeddedContentPages = await outputPdf.embedPdf(
      contentBytes,
      contentPdf.getPageIndices()
    );

    contentPdf.getPages().forEach((sourcePage, index) => {
      const { width, height } = sourcePage.getSize();
      const page = outputPdf.addPage([width, height]);
      page.drawPage(letterheadPage, { x: 0, y: 0, width, height });
      page.drawPage(embeddedContentPages[index], { x: 0, y: 0, width, height });
    });

    return { bytes: await outputPdf.save(), usedLetterhead: true };
  } catch (error) {
    console.warn('Billing letterhead could not be applied:', error);
    return { bytes: contentBytes, usedLetterhead: false };
  }
}

const BillingPage = () => {
  const [month, setMonth] = useState(getCurrentMonthValue);
  const [roleRates, setRoleRates] = useState<Record<string, string>>({});
  const roleRatesRef = useRef<Record<string, string>>({});
  const [report, setReport] = useState<BillingReport | null>(null);
  const [removedMembershipIds, setRemovedMembershipIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [selectedYear, selectedMonth] = month.split('-');
  const billingYearOptions = useMemo(() => getBillingYearOptions(), []);
  const currentBillingPeriod = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
    };
  }, []);
  const availableMonthOptions = useMemo(() => {
    if (Number(selectedYear) < currentBillingPeriod.year) {
      return MONTH_OPTIONS;
    }

    return MONTH_OPTIONS.filter(
      (monthOption) => Number(monthOption.value) <= Number(currentBillingPeriod.month)
    );
  }, [currentBillingPeriod.month, currentBillingPeriod.year, selectedYear]);

  useEffect(() => {
    roleRatesRef.current = roleRates;
  }, [roleRates]);

  const loadBilling = useCallback(async () => {
    if (!month) {
      toast.error('Select a billing month');
      return;
    }

    const selectedIsFuture =
      Number(selectedYear) > currentBillingPeriod.year ||
      (
        Number(selectedYear) === currentBillingPeriod.year &&
        Number(selectedMonth) > Number(currentBillingPeriod.month)
      );
    if (selectedIsFuture) {
      setMonth(`${currentBillingPeriod.year}-${currentBillingPeriod.month}`);
      return;
    }

    setIsLoading(true);
    try {
      const data = await billingService.getMembershipBilling({
        month,
        roleRates: roleRatesRef.current,
      });
      setReport(data);
      setRoleRates((currentRates) => {
        let changed = false;
        const nextRates = { ...currentRates };
        (data.billing_roles || []).forEach((role) => {
          if (nextRates[role.id] == null) {
            nextRates[role.id] = role.rate || '0.00';
            changed = true;
          }
        });
        return changed ? nextRates : currentRates;
      });
      setRemovedMembershipIds([]);
    } catch (error: any) {
      const message = error?.message || 'Failed to load billing report';
      toast.error(message);
      setReport(null);
      setRemovedMembershipIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentBillingPeriod.month, currentBillingPeriod.year, month, selectedMonth, selectedYear]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    if (
      Number(selectedYear) === currentBillingPeriod.year &&
      Number(selectedMonth) > Number(currentBillingPeriod.month)
    ) {
      setMonth(`${selectedYear}-${currentBillingPeriod.month}`);
    }
  }, [currentBillingPeriod.month, currentBillingPeriod.year, selectedMonth, selectedYear]);

  const billingMembers = useMemo(() => {
    if (!report) return [];
    const removedIds = new Set(removedMembershipIds);
    return report.results.filter((member) => !removedIds.has(member.membership_id));
  }, [report, removedMembershipIds]);

  const billingSummary = useMemo(() => {
    return billingMembers.reduce(
      (summary, member) => {
        summary.member_count += 1;
        summary.total_billable_days += member.billable_days;
        summary.total_amount += Number(member.billing_amount) || 0;
        return summary;
      },
      { member_count: 0, total_billable_days: 0, total_amount: 0 }
    );
  }, [billingMembers]);

  const handleRemoveFromBilling = useCallback((member: BillingMember) => {
    setRemovedMembershipIds((current) => {
      if (current.includes(member.membership_id)) return current;
      return [...current, member.membership_id];
    });
    toast.info(`${member.name || member.email} removed from this billing calculation`);
  }, []);

  const handleResetRemovedMembers = useCallback(() => {
    setRemovedMembershipIds([]);
    toast.success('Removed accounts restored to this billing calculation');
  }, []);

  const handleBillingMonthChange = useCallback((nextMonth: string) => {
    setMonth(`${selectedYear}-${nextMonth}`);
  }, [selectedYear]);

  const handleBillingYearChange = useCallback((nextYear: string) => {
    const nextMonth =
      Number(nextYear) === currentBillingPeriod.year &&
      Number(selectedMonth) > Number(currentBillingPeriod.month)
        ? currentBillingPeriod.month
        : selectedMonth || '01';

    setMonth(`${nextYear}-${nextMonth}`);
  }, [currentBillingPeriod.month, currentBillingPeriod.year, selectedMonth]);

  const handleRoleRateChange = useCallback((roleId: string, value: string) => {
    setRoleRates((currentRates) => ({
      ...currentRates,
      [roleId]: value,
    }));
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!report) {
      toast.error('Load a billing report before downloading');
      return;
    }

    setIsDownloadingPdf(true);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;
    const topMarginY = 62;
    const bottomMarginY = 58;
    const rowHeight = 6.5;
    let y = topMarginY;

    const addPageIfNeeded = () => {
      if (y <= pageHeight - bottomMarginY) return;
      doc.addPage();
      y = topMarginY;
      drawTableHeader();
    };

    const tableColumns = {
      name: marginX,
      email: 37,
      role: 88,
      joined: 116,
      days: 151,
      rate: 176,
      amount: pageWidth - marginX,
    };

    const fitText = (value: string, maxWidth: number) => {
      if (doc.getTextWidth(value) <= maxWidth) return value;

      let fitted = value;
      while (fitted.length > 0 && doc.getTextWidth(`${fitted}...`) > maxWidth) {
        fitted = fitted.slice(0, -1);
      }
      return fitted ? `${fitted}...` : '';
    };

    const drawTableHeader = () => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Name', tableColumns.name, y);
      doc.text('Email', tableColumns.email, y);
      doc.text('Role', tableColumns.role, y);
      doc.text('Joined', tableColumns.joined, y);
      doc.text('Days', tableColumns.days, y, { align: 'right' });
      doc.text('Rate', tableColumns.rate, y, { align: 'right' });
      doc.text('Amount', tableColumns.amount, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 4;
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 5;
    };

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Billing Report', marginX, y);
    doc.setFont('helvetica', 'normal');
    y += 9;
    doc.setFontSize(10);
    doc.text(`Billing Month: ${report.month}`, marginX, y);
    doc.text(`Period: ${formatDate(report.period_start)} - ${formatDate(report.period_end)}`, marginX + 70, y);
    y += 7;
    doc.text(`Cycle Days: ${report.cycle_days}`, marginX, y);
    y += 9;
    doc.text(`Members: ${billingSummary.member_count}`, marginX, y);
    doc.text(`Total billable days: ${billingSummary.total_billable_days}`, marginX + 45, y);
    doc.text(`Total billing: ${formatPdfMoney(billingSummary.total_amount)}`, marginX + 105, y);
    y += 7;
    if (removedMembershipIds.length > 0) {
      doc.text(`Manually removed from this billing: ${removedMembershipIds.length}`, marginX, y);
      y += 7;
    }
    y += 3;

    drawTableHeader();

    billingMembers.forEach((member) => {
      addPageIfNeeded();
      doc.setFontSize(8);
      const roleLabel = member.billing_role_key || member.role?.name || 'Unbilled';
      const roleDisplay = member.is_deleted ? `${roleLabel} (Deleted)` : roleLabel;
      const row = [
        member.name || 'Unnamed User',
        member.email,
        roleDisplay,
        formatDate(member.joined_date),
        `${member.billable_days}/${member.cycle_days}`,
        formatPdfMoney(member.monthly_amount),
        formatPdfMoney(member.billing_amount),
      ];

      doc.text(fitText(row[0], tableColumns.email - tableColumns.name - 2), tableColumns.name, y);
      doc.text(fitText(row[1], tableColumns.role - tableColumns.email - 2), tableColumns.email, y);
      doc.text(fitText(row[2], tableColumns.joined - tableColumns.role - 2), tableColumns.role, y);
      doc.text(row[3], tableColumns.joined, y);
      doc.text(row[4], tableColumns.days, y, { align: 'right' });
      doc.text(row[5], tableColumns.rate, y, { align: 'right' });
      doc.text(row[6], tableColumns.amount, y, { align: 'right' });
      y += rowHeight;
    });

    try {
      const contentBytes = doc.output('arraybuffer');
      const { bytes, usedLetterhead } = await addLetterheadToPdf(contentBytes);
      downloadPdfBytes(bytes, `billing-${report.month}.pdf`);

      if (!usedLetterhead) {
        toast.warning('Letterhead PDF not found, downloaded without letterhead');
      }
    } catch (error) {
      console.error('Failed to generate billing PDF with letterhead:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [billingMembers, billingSummary, removedMembershipIds.length, report]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h5>Billing</h5>
          <p className="text-sm text-muted-foreground">
            Date-wise prorated billing for every tenant member. Add or adjust rates for each tenant role before refreshing.
          </p>
          <p className="text-xs text-muted-foreground">
            Internal testing accounts from Pyro are excluded, including {report?.excluded_email_domain ?? '@thepyro.ai'} and configured test emails.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Billing Inputs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billing-month">Billing Month</Label>
                <select
                  id="billing-month"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={selectedMonth}
                  onChange={(event) => handleBillingMonthChange(event.target.value)}
                >
                  {availableMonthOptions.map((monthOption) => (
                    <option key={monthOption.value} value={monthOption.value}>
                      {monthOption.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-year">Billing Year</Label>
                <select
                  id="billing-year"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={selectedYear}
                  onChange={(event) => handleBillingYearChange(event.target.value)}
                >
                  {billingYearOptions.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {report?.billing_roles?.length ? (
              <div className="mt-5 border-t pt-4">
                <Label>Role Rates</Label>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {report.billing_roles.map((role) => (
                    <div className="space-y-2" key={role.id}>
                      <Label htmlFor={`role-rate-${role.id}`}>
                        {role.name || role.key}
                        {role.key ? (
                          <span className="ml-1 text-xs text-muted-foreground">({role.key})</span>
                        ) : null}
                      </Label>
                      <Input
                        id={`role-rate-${role.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={roleRates[role.id] ?? role.rate ?? '0.00'}
                        onChange={(event) => handleRoleRateChange(role.id, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Role rates: {(report?.billing_roles || [])
                    .map((role) => `${role.key || role.name} ${formatMoney(roleRates[role.id] ?? role.rate ?? 0)}`)
                    .join(' / ') || 'load report to edit'}
                </span>
                <span>
                  Billing days: {report?.cycle_days ?? 'auto'} calendar days
                </span>
                {report?.excluded_email_domain ? (
                  <span>
                    Excluded internal/test accounts: {report.summary.excluded_internal_member_count ?? 0}
                  </span>
                ) : null}
                {removedMembershipIds.length > 0 ? (
                  <span>Removed from this billing: {removedMembershipIds.length}</span>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button onClick={loadBilling} disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Refresh Billing'}
                </Button>
                {removedMembershipIds.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetRemovedMembers}
                    disabled={isLoading}
                  >
                    Restore Removed
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={!report || isLoading || isDownloadingPdf}
                >
                  {isDownloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {billingSummary.member_count}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Billable Days</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {billingSummary.total_billable_days}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Billing</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatMoney(billingSummary.total_amount)}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {report ? `Billing for ${report.month}` : 'Billing Details'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Billable Days</TableHead>
                    <TableHead className="text-right">Role Rate</TableHead>
                    <TableHead className="text-right">Billing Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Loading billing...
                      </TableCell>
                    </TableRow>
                  ) : !report || billingMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No members found for billing.
                      </TableCell>
                    </TableRow>
                  ) : (
                    billingMembers.map((member) => (
                      <TableRow key={member.membership_id}>
                        <TableCell className="font-medium">
                          {member.name || 'Unnamed User'}
                          {member.is_deleted ? (
                            <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                              Deleted
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          {member.role?.name || 'No role'}
                          {member.billing_role_key ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({member.billing_role_key})
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{formatDate(member.joined_date)}</TableCell>
                        <TableCell className="text-right">
                          {member.billable_days}/{member.cycle_days}
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(member.monthly_amount)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(member.billing_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFromBilling(member)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BillingPage;
