import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { getTenantSlug } from "@/lib/api/config";
import {
  FALLBACK_USER_MANAGEMENT_SCHEMA,
  hasColumn,
  hasFormField,
  resolveUserManagementSchema,
  type UserManagementColumn,
  type UserManagementCustomField,
  type UserManagementFormField,
  type UserManagementSchema,
} from "./userManagementConfig";

export interface UserManagementPageConfig {
  umFormFields?: string[];
  umColumns?: string[];
  umCustomFields?: UserManagementCustomField[];
}

/**
 * User Management schema for this page widget.
 * Page config (saved with the page) wins; else static tenant/defaults.
 */
export function useUserManagementConfig(pageConfig?: UserManagementPageConfig | null): {
  schema: UserManagementSchema;
  showField: (field: UserManagementFormField) => boolean;
  showColumn: (column: UserManagementColumn) => boolean;
  tenantSlug: string | null;
  tenantId: string | null;
  tenantKey: string | null;
} {
  const { tenantSlug: pathSlug } = useParams<{ tenantSlug?: string }>();
  const { tenantId, tenantSlug: membershipSlug } = useTenant();

  const tenantSlug =
    pathSlug?.trim() ||
    membershipSlug?.trim() ||
    getTenantSlug() ||
    null;
  const id = tenantId?.trim() || null;
  const tenantKey = tenantSlug || id;

  const schema = useMemo(
    () =>
      resolveUserManagementSchema({
        tenantId: id,
        tenantSlug,
        pageOverride: pageConfig
          ? {
              formFields: pageConfig.umFormFields,
              columns: pageConfig.umColumns,
              customFields: pageConfig.umCustomFields,
            }
          : null,
      }),
    [
      id,
      tenantSlug,
      pageConfig?.umFormFields,
      pageConfig?.umColumns,
      pageConfig?.umCustomFields,
    ]
  );

  const safeSchema: UserManagementSchema =
    schema.formFields.length && schema.columns.length
      ? schema
      : FALLBACK_USER_MANAGEMENT_SCHEMA;

  return {
    schema: safeSchema,
    showField: (field) => hasFormField(safeSchema, field),
    showColumn: (column) => hasColumn(safeSchema, column),
    tenantSlug,
    tenantId: id,
    tenantKey,
  };
}
