/**
 * Default User Management columns/fields per tenant.
 * Page widget config (saved with the page) overrides this at runtime.
 * Built-ins: name, email, department, role (+ created_at/actions on table).
 * Former CRM extras live under customFields so tenants can edit them in the panel.
 */

const CRM_CUSTOM_FIELDS_FULL = [
  {
    key: "queue_type",
    label: "Queue Type",
    type: "string" as const,
    showInForm: true,
    showInTable: false,
  },
  {
    key: "manager_email",
    label: "Manager Email",
    type: "string" as const,
    showInForm: true,
    showInTable: true,
  },
  {
    key: "lead_group",
    label: "Lead Group",
    type: "string" as const,
    showInForm: true,
    showInTable: true,
  },
  {
    key: "daily_target",
    label: "Daily Target",
    type: "number" as const,
    showInForm: true,
    showInTable: true,
  },
  {
    key: "daily_limit",
    label: "Daily Limit",
    type: "number" as const,
    showInForm: true,
    showInTable: true,
  },
  {
    key: "resolve_rate_goal",
    label: "Resolve Goal %",
    type: "number" as const,
    showInForm: true,
    showInTable: false,
  },
  {
    key: "support_daily_limits",
    label: "Support Daily Limits",
    type: "string" as const,
    showInForm: true,
    showInTable: false,
  },
];

const userManagementConfig = {
  defaults: {
    formFields: ["name", "email", "department", "role"],
    columns: ["name", "email", "department", "role", "created_at", "actions"],
    customFields: CRM_CUSTOM_FIELDS_FULL,
  },
  tenants: {
    "bibhab-thepyro-ai": {
      formFields: ["name", "email", "department", "role"],
      columns: ["name", "email", "department", "role", "created_at", "actions"],
      customFields: CRM_CUSTOM_FIELDS_FULL,
    },
    "acme-crm": {
      formFields: ["name", "email", "department", "role"],
      columns: ["name", "email", "department", "role", "created_at", "actions"],
      customFields: [
        {
          key: "lead_group",
          label: "Lead Group",
          type: "string" as const,
          showInForm: true,
          showInTable: true,
        },
        {
          key: "daily_target",
          label: "Daily Target",
          type: "number" as const,
          showInForm: true,
          showInTable: true,
        },
        {
          key: "daily_limit",
          label: "Daily Limit",
          type: "number" as const,
          showInForm: true,
          showInTable: true,
        },
      ],
    },
    "beta-crm": {
      formFields: ["name", "email", "department", "role"],
      columns: ["name", "email", "department", "role", "created_at", "actions"],
      customFields: [
        {
          key: "manager_email",
          label: "Manager Email",
          type: "string" as const,
          showInForm: true,
          showInTable: true,
        },
      ],
    },
  },
};

export default userManagementConfig;
