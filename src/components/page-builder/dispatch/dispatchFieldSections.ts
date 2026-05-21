/** Field layout for dispatch detail — keys match ``dispatch_sync`` ``data`` keys. */

export type DispatchFieldType = 'str' | 'date' | 'bool' | 'currency' | 'time';

export type DispatchFieldDef = {
  key: string;
  label: string;
  type?: DispatchFieldType;
  statusGreen?: boolean;
  statusChip?: boolean;
  /** Chip shows label + formatted value (e.g. Checked/Gathered 8-JAN-26). */
  statusChipWithValue?: boolean;
  /** Bool chip: label + green accent (e.g. SIS CTF Mail + Sent). */
  mailSentChip?: boolean;
  barcodeChip?: boolean;
  timeChip?: boolean;
};

export type DispatchFieldRow = {
  fields: DispatchFieldDef[];
};

export type DispatchSectionDef = {
  id: string;
  title: string;
  assignee?: string;
  icon: 'cart' | 'map' | 'calendar' | 'truck' | 'shield' | 'mail' | 'file' | 'checks';
  headerBg: string;
  headerText: string;
  bodyBg: string;
  rows: DispatchFieldRow[];
};

export const DISPATCH_DETAIL_SECTIONS: DispatchSectionDef[] = [
  {
    id: 'product_order',
    title: 'Product & Order',
    icon: 'cart',
    headerBg: 'bg-[#93c5fd]',
    headerText: 'text-[#1e3a8a]',
    bodyBg: 'bg-[#eff6ff]',
    rows: [
      { fields: [{ key: 'products', label: 'Product' }] },
      {
        fields: [
          { key: 'terms', label: 'Terms' },
          { key: 'quantity', label: 'Qty' },
          { key: 'amount', label: 'Amount', type: 'currency' },
        ],
      },
      {
        fields: [
          { key: 'po_number', label: 'PO #' },
          { key: 'po_date', label: 'PO Date', type: 'date' },
        ],
      },
      { fields: [{ key: 'engineer', label: 'Engineer' }] },
      { fields: [{ key: 'sales_order_number', label: 'Sales Order #' }] },
    ],
  },
  {
    id: 'consignee',
    title: 'Consignee Details',
    icon: 'map',
    headerBg: 'bg-[#f9a8d4]',
    headerText: 'text-[#9d174d]',
    bodyBg: 'bg-[#fdf2f8]',
    rows: [
      {
        fields: [
          { key: 'consignee_city', label: 'City' },
          { key: 'serial_numbers', label: 'Serial #' },
        ],
      },
    ],
  },
  {
    id: 'dispatch_tracking',
    title: 'Dispatch Tracking',
    assignee: 'Umesh / Akash',
    icon: 'calendar',
    headerBg: 'bg-[#fde047]',
    headerText: 'text-[#854d0e]',
    bodyBg: 'bg-[#fefce8]',
    rows: [
      { fields: [{ key: 'date_scanned_copy_dc_to_office', label: 'Scanned DC Sent', type: 'date' }] },
      {
        fields: [
          { key: 'date_of_material_dispatch', label: 'Material Dispatch', type: 'date' },
          { key: 'date_dispatch_godown_dc_to_office', label: 'Godown to Office', type: 'date' },
        ],
      },
      {
        fields: [
          { key: 'dc_received_in_office', label: 'DC Recd', type: 'bool', statusChip: true },
          { key: 'dc_in_office', label: 'DC in Office', type: 'bool', statusChip: true },
        ],
      },
      { fields: [{ key: 'lr_received_in_office', label: 'L/R Recd In Office', statusChip: true }] },
      { fields: [{ key: 'remarks', label: 'Remarks' }] },
    ],
  },
  {
    id: 'transport',
    title: 'Transport & Logistics',
    assignee: 'Arvind G',
    icon: 'truck',
    headerBg: 'bg-[#fdba74]',
    headerText: 'text-[#c2410c]',
    bodyBg: 'bg-[#fff7ed]',
    rows: [
      {
        fields: [
          { key: 'e_way_bill_number', label: 'E-Way Bill #' },
          { key: 'e_way_updated_in_server', label: 'E-Way Server Update', statusGreen: true },
        ],
      },
      {
        fields: [
          { key: 'transporter_name', label: 'Transporter' },
          { key: 'vehicle_number', label: 'Vehicle #' },
        ],
      },
      {
        fields: [
          { key: 'freight_mode', label: 'Freight Mode' },
          { key: 'freight_amount', label: 'Freight Amount', type: 'currency' },
        ],
      },
      {
        fields: [
          { key: 'lr_number', label: 'L/R #' },
          { key: 'lr_date', label: 'L/R Date', type: 'date' },
        ],
      },
      {
        fields: [
          { key: 'date_lr_dispatch_to_office', label: 'Dispatch L/R to Office', type: 'date' },
          { key: 'date_delivery_at_consignee', label: 'Delivery at Consignee', type: 'date' },
        ],
      },
      {
        fields: [
          { key: 'date_email_vehicle_dispatch_details', label: 'Email (Vehicle Details)', type: 'date' },
        ],
      },
    ],
  },
  {
    id: 'warranty',
    title: 'Warranty & Documentation',
    assignee: 'Akash',
    icon: 'shield',
    headerBg: 'bg-[#d8b4fe]',
    headerText: 'text-[#7e22ce]',
    bodyBg: 'bg-[#faf5ff]',
    rows: [
      {
        fields: [
          { key: 'e_warranty_updated_date', label: 'E-Warranty Details', type: 'date' },
          { key: '_warranty_updated_flag', label: 'E-Warranty Update', statusGreen: true },
        ],
      },
      {
        fields: [
          { key: 'e_warranty_number', label: 'E-Warranty #' },
          { key: 'date_email_inv_details', label: 'Invoice', type: 'date' },
        ],
      },
    ],
  },
  {
    id: 'customer_comm',
    title: 'Customer Communication',
    assignee: 'Tulsi',
    icon: 'mail',
    headerBg: 'bg-[#86efac]',
    headerText: 'text-[#166534]',
    bodyBg: 'bg-[#f0fdf4]',
    rows: [
      {
        fields: [
          { key: 'date_email_inv_details', label: 'Email (Invoice)', type: 'date' },
          { key: 'date_email_tc_details', label: 'Email (TC Details)', type: 'date' },
          { key: 'date_courier_to_customer', label: 'Courier Sent', type: 'date' },
        ],
      },
    ],
  },
  {
    id: 'sis_ctf',
    title: 'SIS CTF Details',
    assignee: 'Umesh',
    icon: 'file',
    headerBg: 'bg-[#93c5fd]',
    headerText: 'text-[#1d4ed8]',
    bodyBg: 'bg-[#eff6ff]',
    rows: [
      { fields: [{ key: 'sis_ctf_pump_model', label: 'SIS CTF Pump Model' }] },
      { fields: [{ key: 'sis_ctf_model_serial_number', label: 'Model Serial #' }] },
      { fields: [{ key: 'sis_ctf_date', label: 'SIS CTF CRM # Dtd', type: 'str' }] },
      {
        fields: [
          { key: 'sis_ctf_crm_number', label: 'SIS CTF CRM#' },
          { key: 'sis_ctf_done', label: 'CTF CRM No. Dtd', statusGreen: true },
        ],
      },
      {
        fields: [
          { key: 'sis_ctf_mail', label: 'SIS CTF Mail', type: 'bool', mailSentChip: true },
          { key: 'sis_ctf_done', label: 'SIS CTF Done', statusChip: true },
        ],
      },
      { fields: [{ key: 'note', label: 'Note' }] },
    ],
  },
  {
    id: 'final_checks',
    title: 'Final Checks',
    assignee: 'Darshan S',
    icon: 'checks',
    headerBg: 'bg-[#fcd34d]',
    headerText: 'text-[#92400e]',
    bodyBg: 'bg-[#fffbeb]',
    rows: [
      {
        fields: [
          {
            key: 'checked_gather',
            label: 'Checked/Gathered',
            type: 'date',
            statusChip: true,
            statusChipWithValue: true,
          },
        ],
      },
      { fields: [{ key: 'barcode', label: 'Barcode', type: 'date', barcodeChip: true }] },
      {
        fields: [
          { key: 'godown_in_time', label: 'In Time', type: 'time', timeChip: true },
          { key: 'godown_out_time', label: 'Out Time', type: 'time', timeChip: true },
        ],
      },
    ],
  },
];

export const DEFAULT_DISPATCH_SEARCH_FIELDS =
  'account_name,dc_number,po_number,sales_order_number,products,engineer,consignee_city';

export type DispatchFilterLink = {
  id: string;
  label: string;
  queryParams?: Record<string, string>;
};

export const DEFAULT_DISPATCH_FILTER_LINKS: DispatchFilterLink[] = [
  { id: 'all', label: 'All' },
  { id: 'dc_pending', label: 'DC Pending', queryParams: { dc_received_in_office: 'false' } },
  { id: 'lr_pending', label: 'LR Pending', queryParams: { lr_received_in_office: '' } },
  { id: 'sis_pending', label: 'SIS CTF Pending', queryParams: { sis_ctf_done: '' } },
];
