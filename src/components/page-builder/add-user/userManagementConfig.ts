/**
 * User Management (Add User) schema.
 * Base: `src/config/user-management.ts`
 * Runtime: page widget config (saved with the page — shared for everyone).
 *
 * Built-ins: name, email, department, role (+ created_at, actions on table).
 * Everything else is a custom field on the page config.
 */

import userManagementConfig from "@/config/user-management";

/** Built-in form field keys (core user identity only). */
export type UserManagementFormField = "name" | "email" | "department" | "role";

/** Built-in table column keys. */
export type UserManagementColumn =
  | "name"
  | "email"
  | "department"
  | "role"
  | "created_at"
  | "actions";

/** Tenant-defined field (self-serve, not in the built-in catalog). */
export interface UserManagementCustomField {
  /** Stable key, e.g. "employee_code". */
  key: string;
  label: string;
  type: "string" | "number" | "boolean";
  showInForm: boolean;
  showInTable: boolean;
}

export interface UserManagementSchema {
  formFields: UserManagementFormField[];
  columns: UserManagementColumn[];
  /** Extra fields this tenant added themselves. */
  customFields: UserManagementCustomField[];
}

export interface UserManagementConfigFile {
  defaults: UserManagementSchema;
  /** Keyed by membership tenant_slug or tenant_id. */
  tenants: Record<string, UserManagementSchema>;
}

const CORE_FORM_FIELDS = new Set<UserManagementFormField>([
  "name",
  "email",
  "department",
  "role",
]);

const CORE_COLUMNS = new Set<UserManagementColumn>([
  "name",
  "email",
  "department",
  "role",
  "created_at",
  "actions",
]);

/** Former CRM built-ins — migrated into custom fields when found in old overrides. */
const LEGACY_CRM_FORM_TO_CUSTOM: Record<
  string,
  { label: string; type: UserManagementCustomField["type"] }
> = {
  queue_type: { label: "Queue Type", type: "string" },
  manager_email: { label: "Manager Email", type: "string" },
  lead_group: { label: "Lead Group", type: "string" },
  daily_target: { label: "Daily Target", type: "number" },
  daily_limit: { label: "Daily Limit", type: "number" },
  resolve_rate_goal: { label: "Resolve Goal %", type: "number" },
  support_daily_limits: { label: "Support Daily Limits", type: "string" },
};

const LEGACY_CRM_COLUMN_TO_CUSTOM: Record<
  string,
  { label: string; type: UserManagementCustomField["type"] }
> = {
  group: { label: "Group", type: "string" },
  target: { label: "Target", type: "number" },
  daily_limit: { label: "Daily Limit", type: "number" },
  manager_email: { label: "Manager Email", type: "string" },
};

/** Core built-ins — name, email, department, role (+ created_at/actions on table). */
export const FALLBACK_USER_MANAGEMENT_SCHEMA: UserManagementSchema = {
  formFields: ["name", "email", "department", "role"],
  columns: ["name", "email", "department", "role", "created_at", "actions"],
  customFields: [],
};

function isSchema(value: unknown): value is { formFields: unknown; columns: unknown; customFields?: unknown } {
  if (!value || typeof value !== "object") return false;
  const v = value as { formFields: unknown; columns: unknown };
  return Array.isArray(v.formFields) && Array.isArray(v.columns);
}

function normalizeCustomFields(value: unknown): UserManagementCustomField[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((f) => f && typeof f === "object" && typeof (f as UserManagementCustomField).key === "string")
    .map((f) => {
      const field = f as UserManagementCustomField;
      const type: UserManagementCustomField["type"] =
        field.type === "number" || field.type === "boolean" ? field.type : "string";
      return {
        key: String(field.key).trim(),
        label: String(field.label || field.key).trim() || field.key,
        type,
        showInForm: field.showInForm !== false,
        showInTable: field.showInTable === true,
      };
    })
    .filter((f) => f.key.length > 0);
}

function upsertCustomField(
  list: UserManagementCustomField[],
  field: UserManagementCustomField
): UserManagementCustomField[] {
  if (list.some((f) => f.key === field.key)) {
    return list.map((f) =>
      f.key === field.key
        ? {
            ...f,
            showInForm: f.showInForm || field.showInForm,
            showInTable: f.showInTable || field.showInTable,
          }
        : f
    );
  }
  return [...list, field];
}

export function normalizeSchema(value: unknown): UserManagementSchema {
  if (!isSchema(value) || (value.formFields as unknown[]).length === 0 || (value.columns as unknown[]).length === 0) {
    return {
      formFields: [...FALLBACK_USER_MANAGEMENT_SCHEMA.formFields],
      columns: [...FALLBACK_USER_MANAGEMENT_SCHEMA.columns],
      customFields: [],
    };
  }

  const rawForm = value.formFields as string[];
  const rawCols = value.columns as string[];
  let customFields = normalizeCustomFields(value.customFields);

  const formFields = rawForm.filter((f): f is UserManagementFormField =>
    CORE_FORM_FIELDS.has(f as UserManagementFormField)
  );

  for (const key of rawForm) {
    const meta = LEGACY_CRM_FORM_TO_CUSTOM[key];
    if (!meta) continue;
    customFields = upsertCustomField(customFields, {
      key,
      label: meta.label,
      type: meta.type,
      showInForm: true,
      showInTable: false,
    });
  }

  const columns = rawCols.filter((c): c is UserManagementColumn =>
    CORE_COLUMNS.has(c as UserManagementColumn)
  );

  for (const key of rawCols) {
    const meta = LEGACY_CRM_COLUMN_TO_CUSTOM[key];
    if (!meta) continue;
    customFields = upsertCustomField(customFields, {
      key: key === "group" ? "lead_group" : key === "target" ? "daily_target" : key,
      label: meta.label,
      type: meta.type,
      showInForm: false,
      showInTable: true,
    });
  }

  return {
    formFields: formFields.length ? formFields : [...FALLBACK_USER_MANAGEMENT_SCHEMA.formFields],
    columns: columns.length ? columns : [...FALLBACK_USER_MANAGEMENT_SCHEMA.columns],
    customFields,
  };
}

/** Sanitize a label into a stable custom field key. */
export function slugifyCustomFieldKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || `custom_${Date.now()}`;
}

/** Core-KV key used to persist a custom field value for a user. */
export function customFieldKvKey(fieldKey: string): string {
  return `CUSTOM_FIELD_${fieldKey.trim().toUpperCase()}`;
}

/**
 * Custom field keys that are NOT stored as CUSTOM_FIELD_* KV.
 * They bind to hierarchy / dedicated user-settings keys instead.
 */
export const BOUND_CUSTOM_FIELD_KEYS = new Set([
  "manager_email",
  "lead_group",
  "daily_target",
  "daily_limit",
  "resolve_rate_goal",
  "support_daily_limits",
  "queue_type",
]);

export function isBoundCustomField(key: string): boolean {
  return BOUND_CUSTOM_FIELD_KEYS.has(key);
}

const raw = userManagementConfig as unknown as Partial<UserManagementConfigFile> | null;

const config: UserManagementConfigFile = {
  defaults: normalizeSchema(raw?.defaults),
  tenants:
    raw?.tenants && typeof raw.tenants === "object"
      ? Object.fromEntries(
          Object.entries(raw.tenants).map(([key, schema]) => [key, normalizeSchema(schema)])
        )
      : {},
};

const COLUMN_LABELS: Record<UserManagementColumn, string> = {
  name: "Name",
  email: "Email",
  department: "Department",
  role: "Role",
  created_at: "Created at",
  actions: "",
};

export function getUserManagementConfig(): UserManagementConfigFile {
  return config;
}

export function getColumnLabel(column: UserManagementColumn): string {
  return COLUMN_LABELS[column] ?? column;
}

export type UserManagementPageOverride = {
  formFields?: string[];
  columns?: string[];
  customFields?: UserManagementCustomField[];
};

/**
 * Resolve User Management schema.
 * Order: page widget config (shared via page save) → static tenant entry → defaults.
 */
export function resolveUserManagementSchema(input: {
  tenantId?: string | null;
  tenantSlug?: string | null;
  pageOverride?: UserManagementPageOverride | null;
}): UserManagementSchema {
  try {
    const slug = input.tenantSlug?.trim() || null;
    const id = input.tenantId?.trim() || null;
    const { tenants, defaults } = getUserManagementConfig();
    const base =
      (slug && tenants[slug] && normalizeSchema(tenants[slug])) ||
      (id && tenants[id] && normalizeSchema(tenants[id])) ||
      normalizeSchema(defaults);

    const page = input.pageOverride;
    const hasPageSchema =
      !!page &&
      (Array.isArray(page.formFields) ||
        Array.isArray(page.columns) ||
        Array.isArray(page.customFields));

    if (!hasPageSchema || !page) return base;

    return normalizeSchema({
      formFields: page.formFields ?? base.formFields,
      columns: page.columns ?? base.columns,
      customFields: page.customFields ?? base.customFields,
    });
  } catch {
    return normalizeSchema(FALLBACK_USER_MANAGEMENT_SCHEMA);
  }
}

export function hasFormField(
  schema: UserManagementSchema,
  field: UserManagementFormField
): boolean {
  return schema.formFields.includes(field);
}

export function hasColumn(
  schema: UserManagementSchema,
  column: UserManagementColumn
): boolean {
  return schema.columns.includes(column);
}
