import React, { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import {
  slugifyCustomFieldKey,
  type UserManagementColumn,
  type UserManagementCustomField,
  type UserManagementFormField,
  type UserManagementSchema,
} from "@/components/page-builder/add-user/userManagementConfig";
import { useUserManagementConfig } from "@/components/page-builder/add-user/useUserManagementConfig";

const FORM_FIELD_OPTIONS: { key: UserManagementFormField; label: string }[] = [
  { key: "name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "department", label: "Department" },
  { key: "role", label: "Role" },
];

const COLUMN_OPTIONS: { key: UserManagementColumn; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "department", label: "Department" },
  { key: "role", label: "Role" },
  { key: "created_at", label: "Created at" },
  { key: "actions", label: "Actions" },
];

export interface AddUserConfigLocal {
  userScope?: "all" | "under_me";
  umFormFields?: string[];
  umColumns?: string[];
  umCustomFields?: UserManagementCustomField[];
}

interface AddUserConfigProps {
  localConfig: AddUserConfigLocal;
  handleInputChange: (field: string, value: unknown) => void;
  handleConfigPatch?: (patch: Partial<AddUserConfigLocal>) => void;
}

function toggleInList<T extends string>(list: T[], key: T, enabled: boolean): T[] {
  if (enabled) {
    return list.includes(key) ? list : [...list, key];
  }
  return list.filter((item) => item !== key);
}

/**
 * Page-builder config for User Management.
 * Schema is stored on the page widget and saved with the page (shared for all users).
 */
export function AddUserConfig({
  localConfig,
  handleInputChange,
  handleConfigPatch,
}: AddUserConfigProps) {
  const { schema, tenantSlug, tenantId } = useUserManagementConfig(localConfig);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"string" | "number" | "boolean">("string");
  const [newShowForm, setNewShowForm] = useState(true);
  const [newShowTable, setNewShowTable] = useState(true);

  const formFields = useMemo(() => [...schema.formFields], [schema.formFields]);
  const columns = useMemo(() => [...schema.columns], [schema.columns]);
  const customFields = useMemo(
    () => [...(schema.customFields ?? [])],
    [schema.customFields]
  );

  const saveSchema = (next: UserManagementSchema) => {
    const patch = {
      umFormFields: [...next.formFields],
      umColumns: [...next.columns],
      umCustomFields: (next.customFields ?? []).map((f) => ({ ...f })),
    };
    if (handleConfigPatch) {
      handleConfigPatch(patch);
    } else {
      handleInputChange("umFormFields", patch.umFormFields);
      handleInputChange("umColumns", patch.umColumns);
      handleInputChange("umCustomFields", patch.umCustomFields);
    }
  };

  const handleAddCustomField = () => {
    const label = newLabel.trim();
    if (!label) return;
    let key = slugifyCustomFieldKey(label);
    const existing = new Set(customFields.map((f) => f.key));
    if (existing.has(key)) {
      key = `${key}_${Date.now().toString(36).slice(-4)}`;
    }
    const field: UserManagementCustomField = {
      key,
      label,
      type: newType,
      showInForm: newShowForm,
      showInTable: newShowTable,
    };
    saveSchema({
      formFields,
      columns,
      customFields: [...customFields, field],
    });
    setNewLabel("");
    setNewType("string");
    setNewShowForm(true);
    setNewShowTable(true);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 space-y-1">
        <p className="text-xs font-medium text-foreground">Saved with this page</p>
        <p className="text-xs text-muted-foreground">
          Field settings apply to everyone who opens this User Management page
          {tenantSlug || tenantId ? (
            <>
              {" "}
              (
              <span className="font-mono text-foreground">
                {tenantSlug || tenantId}
              </span>
              )
            </>
          ) : null}
          . Save the page after changes.
        </p>
      </div>

      <div className="space-y-2">
        <Label>User Scope</Label>
        <select
          className="h-9 w-full border rounded-md px-3 text-sm bg-background"
          value={localConfig.userScope || "all"}
          onChange={(e) => handleInputChange("userScope", e.target.value)}
        >
          <option value="all">Show all users</option>
          <option value="under_me">Show only users under me</option>
        </select>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Built-in form fields</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Name, email, department, role
          </p>
        </div>
        <div className="space-y-2 rounded-md border border-border p-3">
          {FORM_FIELD_OPTIONS.map((opt) => {
            const checked = formFields.includes(opt.key);
            return (
              <div key={opt.key} className="flex items-center justify-between gap-3">
                <Label htmlFor={`um-form-${opt.key}`} className="text-sm font-normal cursor-pointer">
                  {opt.label}
                </Label>
                <Switch
                  id={`um-form-${opt.key}`}
                  checked={checked}
                  onCheckedChange={(next) =>
                    saveSchema({
                      formFields: toggleInList(formFields, opt.key, next),
                      columns,
                      customFields,
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Built-in table columns</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Name, email, department, role, created at, actions
          </p>
        </div>
        <div className="space-y-2 rounded-md border border-border p-3">
          {COLUMN_OPTIONS.map((opt) => {
            const checked = columns.includes(opt.key);
            return (
              <div key={opt.key} className="flex items-center justify-between gap-3">
                <Label htmlFor={`um-col-${opt.key}`} className="text-sm font-normal cursor-pointer">
                  {opt.label}
                </Label>
                <Switch
                  id={`um-col-${opt.key}`}
                  checked={checked}
                  onCheckedChange={(next) =>
                    saveSchema({
                      formFields,
                      columns: toggleInList(columns, opt.key, next),
                      customFields,
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Custom fields</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Add lead group, daily target, manager email, or any other field this page needs.
          </p>
        </div>

        {customFields.length > 0 && (
          <div className="space-y-2 rounded-md border border-border p-3">
            {customFields.map((field) => (
              <div
                key={field.key}
                className="flex flex-col gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{field.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{field.key}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() =>
                      saveSchema({
                        formFields,
                        columns,
                        customFields: customFields.filter((f) => f.key !== field.key),
                      })
                    }
                    title="Remove custom field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`cf-form-${field.key}`}
                      checked={field.showInForm}
                      onCheckedChange={(next) =>
                        saveSchema({
                          formFields,
                          columns,
                          customFields: customFields.map((f) =>
                            f.key === field.key ? { ...f, showInForm: next } : f
                          ),
                        })
                      }
                    />
                    <Label htmlFor={`cf-form-${field.key}`} className="text-xs font-normal">
                      Form
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`cf-table-${field.key}`}
                      checked={field.showInTable}
                      onCheckedChange={(next) =>
                        saveSchema({
                          formFields,
                          columns,
                          customFields: customFields.map((f) =>
                            f.key === field.key ? { ...f, showInTable: next } : f
                          ),
                        })
                      }
                    />
                    <Label htmlFor={`cf-table-${field.key}`} className="text-xs font-normal">
                      Table
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground self-center">{field.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 rounded-md border border-dashed border-border p-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Add custom field
          </Label>
          <div className="space-y-2">
            <Input
              placeholder="Label (e.g. Lead Group, Daily Target)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <select
              className="h-9 w-full border rounded-md px-3 text-sm bg-background"
              value={newType}
              onChange={(e) =>
                setNewType(e.target.value as "string" | "number" | "boolean")
              }
            >
              <option value="string">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Yes / No</option>
            </select>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="new-cf-form"
                  checked={newShowForm}
                  onCheckedChange={setNewShowForm}
                />
                <Label htmlFor="new-cf-form" className="text-xs font-normal">
                  Show in form
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="new-cf-table"
                  checked={newShowTable}
                  onCheckedChange={setNewShowTable}
                />
                <Label htmlFor="new-cf-table" className="text-xs font-normal">
                  Show in table
                </Label>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!newLabel.trim()}
              onClick={handleAddCustomField}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add field
            </Button>
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          const patch = {
            umFormFields: undefined,
            umColumns: undefined,
            umCustomFields: undefined,
          };
          if (handleConfigPatch) {
            handleConfigPatch(patch);
          } else {
            handleInputChange("umFormFields", undefined);
            handleInputChange("umColumns", undefined);
            handleInputChange("umCustomFields", undefined);
          }
        }}
      >
        Reset to config defaults
      </Button>
    </div>
  );
}
