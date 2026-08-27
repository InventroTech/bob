/** Presentational JSX for AddUserComponent — columns/fields from tenant config. */

import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Trash2, UserPlus, Pencil, Check, X, Search, Download } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from 'sonner';
import type { AddUserModel } from './useAddUser';
import type { User } from './types';
import { formatResolveRateGoal, isCseRole } from './utils';
import { useUserManagementConfig } from './useUserManagementConfig';
import {
  getColumnLabel,
  isBoundCustomField,
  type UserManagementColumn,
  type UserManagementCustomField,
} from './userManagementConfig';
import { ZohoMailConnectCard } from '@/features/integrations/components/ZohoMailConnectCard';

function SupportDailyDualDisplay({
  selfTrial,
  other,
}: {
  selfTrial?: string | number;
  other?: string | number;
}) {
  const st = selfTrial === undefined || selfTrial === '—' ? null : selfTrial;
  const ot = other === undefined || other === '—' ? null : other;
  if (st === null && ot === null) return <>{'\u2014'}</>;
  return (
    <div className="text-sm leading-snug space-y-0.5">
      <div>
        <span className="text-gray-500">ST:</span> {st ?? '—'}
      </div>
      <div>
        <span className="text-gray-500">Other:</span> {ot ?? '—'}
      </div>
    </div>
  );
}

function SupportDailyDualInputs({
  selfTrial,
  other,
  onSelfTrialChange,
  onOtherChange,
  inputClassName = 'h-8',
  max,
}: {
  selfTrial: string;
  other: string;
  onSelfTrialChange: (value: string) => void;
  onOtherChange: (value: string) => void;
  inputClassName?: string;
  max?: number;
}) {
  return (
    <div className="space-y-1 min-w-[7rem]">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 w-9 shrink-0">ST</span>
        <Input
          className={inputClassName}
          type="number"
          min="0"
          max={max}
          step="1"
          value={selfTrial}
          onChange={(e) => onSelfTrialChange(e.target.value)}
          placeholder="—"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 w-9 shrink-0">Other</span>
        <Input
          className={inputClassName}
          type="number"
          min="0"
          max={max}
          step="1"
          value={other}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="—"
        />
      </div>
    </div>
  );
}

function boundCustomFieldDisplay(user: User, fieldKey: string): string {
  switch (fieldKey) {
    case 'manager_email':
      return user.managerEmail && user.managerEmail !== '—' ? user.managerEmail : '—';
    case 'lead_group':
      return user.leadGroup && user.leadGroup !== '—' ? String(user.leadGroup) : '—';
    case 'daily_target':
    case 'target':
      return user.dailyTarget != null && user.dailyTarget !== '—'
        ? String(user.dailyTarget)
        : '—';
    case 'daily_limit':
      return user.dailyLimit != null && user.dailyLimit !== '—'
        ? String(user.dailyLimit)
        : '—';
    case 'state':
      return user.state && user.state !== '—' ? user.state : '—';
    case 'district':
      return user.district && user.district !== '—' ? user.district : '—';
    case 'party':
      return user.party && user.party !== '—' ? user.party : '—';
    case 'resolve_rate_goal':
      return user.supportResolveRateGoal != null && user.supportResolveRateGoal !== '—'
        ? String(user.supportResolveRateGoal)
        : '—';
    case 'support_daily_limits': {
      const st = user.supportDailyLimitSelfTrial;
      const other = user.supportDailyLimitOther;
      if ((st == null || st === '—') && (other == null || other === '—')) return '—';
      return `ST: ${st ?? '—'} / Other: ${other ?? '—'}`;
    }
    default:
      return '—';
  }
}

export function AddUserView(props: AddUserModel) {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    config,
    roles,
    users,
    selectedRoleId,
    setSelectedRoleId,
    newRoleName,
    setNewRoleName,
    newRoleKey,
    setNewRoleKey,
    formData,
    setFormData,
    isLoading,
    showRoleFields,
    setShowRoleFields,
    isCreatingUser,
    editingRowKey,
    editingRow,
    setEditingRow,
    isUpdatingRow,
    usersPdfLoading,
    userSearchTerm,
    setUserSearchTerm,
    filteredUsersWithSettings,
    handleDownloadUsersPdf,
    handleChange,
    handleAddRole,
    handleAddUser,
    handleDeleteUser,
    getRowKey,
    handleEditUser,
    handleCancelRowEdit,
    handleSaveRowEdit,
    managerSearch,
    setManagerSearch,
    showManagerDropdown,
    setShowManagerDropdown,
    editManagerSearch,
    setEditManagerSearch,
    showEditManagerDropdown,
    setShowEditManagerDropdown,
    managerDropdownRef,
    editManagerDropdownRef,
    selectedQueueType,
    setSelectedQueueType,
    queueTypes,
    availableLeadGroups,
    geoStates,
    geoDistricts,
    geoParties,
    formDistrictOptions,
    editDistrictOptions,
    formPartyOptions,
    editPartyOptions,
    catalogLabel,
  } = props;

  const { schema, showField } = useUserManagementConfig(config);
  const showCustomForm = (key: string) =>
    schema.customFields.some((f) => f.key === key && f.showInForm);

  // Zoho OAuth return may land back on this Settings page with ?zoho_mail=ok|error
  useEffect(() => {
    const result = searchParams.get('zoho_mail');
    if (!result) return;

    const email = searchParams.get('email') || '';
    const detail = searchParams.get('detail') || '';

    if (result === 'ok') {
      toast.success(
        email ? `Zoho Mail connected (${email})` : 'Zoho Mail connected successfully'
      );
    } else {
      toast.error(detail || 'Zoho Mail connect failed');
    }

    const next = new URLSearchParams(searchParams);
    next.delete('zoho_mail');
    next.delete('email');
    next.delete('detail');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const customFormFields = schema.customFields.filter(
    (f) => f.showInForm && !isBoundCustomField(f.key)
  );
  const customTableFields = schema.customFields.filter((f) => f.showInTable);
  const showManagerForm = showCustomForm('manager_email');
  const showQueueTypeForm = showCustomForm('queue_type');
  const showLeadGroupForm = showCustomForm('lead_group');
  const showDailyTargetForm = showCustomForm('daily_target');
  const showDailyLimitForm = showCustomForm('daily_limit');
  const showStateForm = showCustomForm('state');
  const showDistrictForm = showCustomForm('district');
  const showPartyForm = showCustomForm('party');
  const showResolveGoalForm = showCustomForm('resolve_rate_goal');
  const showSupportLimitsForm = showCustomForm('support_daily_limits');

  // If queue type is on the form, lead vs ticket fields follow it.
  // Otherwise show whichever bound fields are enabled.
  const showLeadTargets =
    (showDailyTargetForm || showDailyLimitForm) &&
    (!showQueueTypeForm || selectedQueueType !== 'ticket');
  const showTicketTargets =
    (showResolveGoalForm || showSupportLimitsForm) &&
    (!showQueueTypeForm || selectedQueueType === 'ticket');
  const showBoundFormRow =
    showManagerForm ||
    showLeadGroupForm ||
    showQueueTypeForm ||
    showLeadTargets ||
    showTicketTargets ||
    showStateForm ||
    showDistrictForm ||
    showPartyForm;
  const renderManagerEditCell = (user: User) => (
    <div className="relative" ref={editManagerDropdownRef}>
      <div className="flex gap-1">
        <div className="relative flex-1">
          <Input
            className="h-9 pr-8 text-sm"
            placeholder="Search manager..."
            value={showEditManagerDropdown ? editManagerSearch : editingRow?.managerEmail ?? ''}
            onChange={(e) => {
              setEditManagerSearch(e.target.value);
              setShowEditManagerDropdown(true);
            }}
            onFocus={() => {
              setEditManagerSearch('');
              setShowEditManagerDropdown(true);
            }}
            autoComplete="off"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>
        {editingRow?.managerEmail && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 border-gray-200 text-gray-500 hover:text-gray-700"
            onClick={() => {
              setEditingRow((prev) => (prev ? { ...prev, managerEmail: '' } : prev));
              setEditManagerSearch('');
              setShowEditManagerDropdown(false);
            }}
            title="Clear manager"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {showEditManagerDropdown && (
        <div className="absolute z-50 mt-1 w-64 max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {users
            .filter((u) => {
              if (u.email === user.email) return false;
              if (!editManagerSearch.trim()) return true;
              const q = editManagerSearch.toLowerCase();
              return (
                (u.name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
              );
            })
            .map((u) => (
              <button
                key={u.uid}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setEditingRow((prev) =>
                    prev ? { ...prev, managerEmail: u.email } : prev
                  );
                  setEditManagerSearch('');
                  setShowEditManagerDropdown(false);
                }}
              >
                <span className="font-medium truncate">{u.name}</span>
                <span className="text-gray-400 truncate">{u.email}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );

  const renderCustomTableCell = (
    field: UserManagementCustomField,
    user: User,
    isEditing: boolean
  ) => {
    const rowIsCse =
      isEditing && editingRow
        ? isCseRole(roles.find((r) => r.id === editingRow.roleId))
        : isCseRole(user.role);

    if (field.key === 'manager_email') {
      return (
        <TableCell key={`${user.uid}-cf-manager_email`}>
          {isEditing && editingRow ? renderManagerEditCell(user) : boundCustomFieldDisplay(user, field.key)}
        </TableCell>
      );
    }

    if (field.key === 'lead_group') {
      return (
        <TableCell key={`${user.uid}-cf-lead_group`}>
          {isEditing && editingRow ? (
            <select
              className="h-9 w-full border rounded-md px-2 text-sm bg-white"
              value={editingRow.leadGroup}
              onChange={(e) =>
                setEditingRow((prev) => (prev ? { ...prev, leadGroup: e.target.value } : prev))
              }
            >
              <option value="">Select Group</option>
              {availableLeadGroups.map((group) => (
                <option key={group.name} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
          ) : (
            boundCustomFieldDisplay(user, field.key)
          )}
        </TableCell>
      );
    }

    if (field.key === 'daily_target' || field.key === 'target') {
      return (
        <TableCell key={`${user.uid}-cf-daily_target`}>
          {isEditing && editingRow ? (
            rowIsCse ? (
              <Input
                className="h-9"
                type="number"
                min="0"
                max="100"
                step="1"
                value={editingRow.supportResolveRateGoal}
                onChange={(e) =>
                  setEditingRow((prev) =>
                    prev ? { ...prev, supportResolveRateGoal: e.target.value } : prev
                  )
                }
                placeholder="Resolve %"
              />
            ) : (
              <Input
                className="h-9"
                type="number"
                min="0"
                step="1"
                value={editingRow.dailyTarget}
                onChange={(e) =>
                  setEditingRow((prev) =>
                    prev ? { ...prev, dailyTarget: e.target.value } : prev
                  )
                }
                placeholder="Daily target"
              />
            )
          ) : rowIsCse ? (
            formatResolveRateGoal(user.supportResolveRateGoal)
          ) : (
            boundCustomFieldDisplay(user, 'daily_target')
          )}
        </TableCell>
      );
    }

    if (field.key === 'daily_limit') {
      return (
        <TableCell key={`${user.uid}-cf-daily_limit`}>
          {isEditing && editingRow ? (
            rowIsCse ? (
              <SupportDailyDualInputs
                selfTrial={editingRow.supportDailyLimitSelfTrial}
                other={editingRow.supportDailyLimitOther}
                onSelfTrialChange={(value) =>
                  setEditingRow((prev) =>
                    prev ? { ...prev, supportDailyLimitSelfTrial: value } : prev
                  )
                }
                onOtherChange={(value) =>
                  setEditingRow((prev) =>
                    prev ? { ...prev, supportDailyLimitOther: value } : prev
                  )
                }
              />
            ) : (
              <Input
                className="h-9"
                type="number"
                min="0"
                step="1"
                value={editingRow.dailyLimit}
                onChange={(e) =>
                  setEditingRow((prev) =>
                    prev ? { ...prev, dailyLimit: e.target.value } : prev
                  )
                }
                placeholder="Daily limit"
              />
            )
          ) : rowIsCse ? (
            <SupportDailyDualDisplay
              selfTrial={user.supportDailyLimitSelfTrial}
              other={user.supportDailyLimitOther}
            />
          ) : (
            boundCustomFieldDisplay(user, 'daily_limit')
          )}
        </TableCell>
      );
    }

    if (field.key === 'state') {
      return (
        <TableCell key={`${user.uid}-cf-state`}>
          {isEditing && editingRow ? (
            <select
              className="h-9 w-full border rounded-md px-2 text-sm bg-white"
              value={editingRow.state}
              onChange={(e) => {
                const nextState = e.target.value;
                setEditingRow((prev) => {
                  if (!prev) return prev;
                  const districtOk =
                    !prev.district ||
                    geoDistricts.some(
                      (d) =>
                        String(d.value) === String(prev.district) &&
                        (!nextState || String(d.state_id) === String(nextState))
                    );
                  const partyOk =
                    !prev.party ||
                    geoParties.some((p) => {
                      if (String(p.value) !== String(prev.party)) return false;
                      if (!nextState || p.state_id == null) return true;
                      return String(p.state_id) === String(nextState);
                    });
                  return {
                    ...prev,
                    state: nextState,
                    district: districtOk ? prev.district : '',
                    party: partyOk ? prev.party : '',
                  };
                });
              }}
            >
              <option value="">Select state</option>
              {geoStates.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            catalogLabel('state', user.state)
          )}
        </TableCell>
      );
    }

    if (field.key === 'district') {
      return (
        <TableCell key={`${user.uid}-cf-district`}>
          {isEditing && editingRow ? (
            <select
              className="h-9 w-full border rounded-md px-2 text-sm bg-white"
              value={editingRow.district}
              onChange={(e) =>
                setEditingRow((prev) =>
                  prev ? { ...prev, district: e.target.value } : prev
                )
              }
            >
              <option value="">Select district</option>
              {editDistrictOptions.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            catalogLabel('district', user.district)
          )}
        </TableCell>
      );
    }

    if (field.key === 'party') {
      return (
        <TableCell key={`${user.uid}-cf-party`}>
          {isEditing && editingRow ? (
            <select
              className="h-9 w-full border rounded-md px-2 text-sm bg-white"
              value={editingRow.party}
              onChange={(e) =>
                setEditingRow((prev) =>
                  prev ? { ...prev, party: e.target.value } : prev
                )
              }
            >
              <option value="">Select party</option>
              {editPartyOptions.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            catalogLabel('party', user.party)
          )}
        </TableCell>
      );
    }

    if (field.key === 'resolve_rate_goal') {
      return (
        <TableCell key={`${user.uid}-cf-resolve_rate_goal`}>
          {isEditing && editingRow ? (
            rowIsCse ? (
              <Input
                className="h-9"
                type="number"
                min="0"
                max="100"
                step="1"
                value={editingRow.supportResolveRateGoal}
                onChange={(e) =>
                  setEditingRow((prev) =>
                    prev ? { ...prev, supportResolveRateGoal: e.target.value } : prev
                  )
                }
              />
            ) : (
              '—'
            )
          ) : rowIsCse ? (
            formatResolveRateGoal(user.supportResolveRateGoal)
          ) : (
            '—'
          )}
        </TableCell>
      );
    }

    if (field.key === 'support_daily_limits') {
      return (
        <TableCell key={`${user.uid}-cf-support_daily_limits`}>
          {isEditing && editingRow ? (
            rowIsCse ? (
              <SupportDailyDualInputs
                selfTrial={editingRow.supportDailyLimitSelfTrial}
                other={editingRow.supportDailyLimitOther}
                onSelfTrialChange={(value) =>
                  setEditingRow((prev) =>
                    prev ? { ...prev, supportDailyLimitSelfTrial: value } : prev
                  )
                }
                onOtherChange={(value) =>
                  setEditingRow((prev) =>
                    prev ? { ...prev, supportDailyLimitOther: value } : prev
                  )
                }
              />
            ) : (
              '—'
            )
          ) : rowIsCse ? (
            <SupportDailyDualDisplay
              selfTrial={user.supportDailyLimitSelfTrial}
              other={user.supportDailyLimitOther}
            />
          ) : (
            '—'
          )}
        </TableCell>
      );
    }

    if (isBoundCustomField(field.key)) {
      return (
        <TableCell key={`${user.uid}-cf-${field.key}`}>
          {boundCustomFieldDisplay(user, field.key)}
        </TableCell>
      );
    }

    const valueKey = field.key.toLowerCase();
    const displayValue =
      user.customFields?.[field.key] ?? user.customFields?.[valueKey] ?? '—';

    return (
      <TableCell key={`${user.uid}-cf-${field.key}`}>
        {isEditing && editingRow ? (
          field.type === 'boolean' ? (
            <select
              className="h-9 w-full border rounded-md px-2 text-sm bg-white"
              value={editingRow.customFields[field.key] ?? ''}
              onChange={(e) =>
                setEditingRow((prev) =>
                  prev
                    ? {
                        ...prev,
                        customFields: {
                          ...prev.customFields,
                          [field.key]: e.target.value,
                        },
                      }
                    : prev
                )
              }
            >
              <option value="">—</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <Input
              className="h-9"
              type={field.type === 'number' ? 'number' : 'text'}
              value={editingRow.customFields[field.key] ?? ''}
              onChange={(e) =>
                setEditingRow((prev) =>
                  prev
                    ? {
                        ...prev,
                        customFields: {
                          ...prev.customFields,
                          [field.key]: e.target.value,
                        },
                      }
                    : prev
                )
              }
            />
          )
        ) : displayValue === 'true' ? (
          'Yes'
        ) : displayValue === 'false' ? (
          'No'
        ) : (
          displayValue
        )}
      </TableCell>
    );
  };

  const renderColumnCell = (column: UserManagementColumn, user: User) => {
    const isEditing = editingRowKey === getRowKey(user) && !!editingRow;
    const cellKey = `${getRowKey(user)}-${column}`;

    switch (column) {
      case 'name':
        return (
          <TableCell key={cellKey} className="text-body-medium">
            {user.name}
          </TableCell>
        );
      case 'email':
        return <TableCell key={cellKey}>{user.email}</TableCell>;
      case 'department':
        return (
          <TableCell key={cellKey}>
            {isEditing && editingRow ? (
              <Input
                className="h-9"
                value={editingRow.department}
                onChange={(e) =>
                  setEditingRow((prev) =>
                    prev ? { ...prev, department: e.target.value } : prev
                  )
                }
                placeholder="Department"
              />
            ) : (
              user.department || '—'
            )}
          </TableCell>
        );
      case 'role':
        return (
          <TableCell key={cellKey}>
            {isEditing && editingRow ? (
              <select
                className="h-9 w-full border rounded-md px-2 text-sm bg-white"
                value={editingRow.roleId}
                onChange={(e) =>
                  setEditingRow((prev) =>
                    prev ? { ...prev, roleId: e.target.value } : prev
                  )
                }
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            ) : (
              user.role?.name || '—'
            )}
          </TableCell>
        );
      case 'created_at':
        return (
          <TableCell key={cellKey}>
            {format(
              new Date(new Date(user.created_at).getTime() + 5.5 * 60 * 60 * 1000),
              'MMM d, yyyy h:mm a'
            )}
          </TableCell>
        );
      case 'actions':
        return (
          <TableCell key={cellKey} className="text-right">
            <div className="inline-flex items-center justify-end gap-2">
              {editingRowKey === getRowKey(user) ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleSaveRowEdit}
                    disabled={isUpdatingRow}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCancelRowEdit}
                    disabled={isUpdatingRow}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditUser(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteUser(user.email, user.uid)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-6">
      <ZohoMailConnectCard />
      <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          <h3 className="text-lg font-semibold">User Management</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-5 rounded-lg border p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {showField('name') && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  className="h-11"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full name"
                />
              </div>
            )}
            {showField('email') && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  className="h-11"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                />
              </div>
            )}
            {showField('department') && (
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  className="h-11"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Department"
                />
              </div>
            )}
            {showField('role') && (
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="h-11 w-full border rounded-md px-3 text-sm bg-white"
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                >
                  <option value="">--select role--</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {(showBoundFormRow || customFormFields.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {showQueueTypeForm && (
                <div className="space-y-2">
                  <Label htmlFor="queueType">Queue Type</Label>
                  <select
                    id="queueType"
                    className="h-11 w-full border rounded-md px-3 text-sm bg-white"
                    value={selectedQueueType}
                    onChange={(e) => {
                      const nextType = e.target.value === 'ticket' ? 'ticket' : 'lead';
                      setSelectedQueueType(nextType);
                      if (nextType === 'ticket') {
                        setFormData((prev) => ({ ...prev, dailyTarget: '' }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          supportResolveRateGoal: '',
                          supportDailyLimitSelfTrial: '',
                          supportDailyLimitOther: '',
                        }));
                      }
                    }}
                  >
                    {(queueTypes.length ? queueTypes : ['lead', 'ticket']).map((qt) => (
                      <option key={qt} value={qt === 'ticket' ? 'ticket' : 'lead'}>
                        {qt === 'ticket' ? 'Support Tickets' : 'Leads'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showManagerForm && (
                <div className="space-y-2">
                  <Label htmlFor="managerEmail">Manager Email (optional)</Label>
                  <div className="relative" ref={managerDropdownRef}>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <Input
                          id="managerEmail"
                          placeholder="Search by name or email..."
                          value={showManagerDropdown ? managerSearch : formData.managerEmail}
                          onChange={(e) => {
                            setManagerSearch(e.target.value);
                            setShowManagerDropdown(true);
                          }}
                          onFocus={() => {
                            setManagerSearch('');
                            setShowManagerDropdown(true);
                          }}
                          className="h-11 pr-9"
                          autoComplete="off"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                      {formData.managerEmail && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0 border-gray-300 text-gray-500 hover:text-gray-700"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, managerEmail: '' }));
                            setManagerSearch('');
                            setShowManagerDropdown(false);
                          }}
                          title="Clear manager"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {showManagerDropdown && (
                      <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {users
                          .filter((u) => {
                            if (!managerSearch.trim()) return true;
                            const q = managerSearch.toLowerCase();
                            return (
                              (u.name || '').toLowerCase().includes(q) ||
                              (u.email || '').toLowerCase().includes(q)
                            );
                          })
                          .map((u) => (
                            <button
                              key={u.uid}
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, managerEmail: u.email }));
                                setManagerSearch('');
                                setShowManagerDropdown(false);
                              }}
                            >
                              <span className="font-medium truncate">{u.name}</span>
                              <span className="text-gray-500 truncate text-xs">{u.email}</span>
                            </button>
                          ))}
                        {users.filter((u) => {
                          if (!managerSearch.trim()) return true;
                          const q = managerSearch.toLowerCase();
                          return (
                            (u.name || '').toLowerCase().includes(q) ||
                            (u.email || '').toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-400">No users found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showLeadGroupForm && (
                <div className="space-y-2">
                  <Label htmlFor="leadGroup">Lead Group</Label>
                  <select
                    id="leadGroup"
                    className="h-11 w-full border rounded-md px-3 text-sm bg-white"
                    value={formData.leadGroup}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const selectedGroup = availableLeadGroups.find(
                        (group) => group.name === selectedName
                      );
                      setFormData((prev) => ({ ...prev, leadGroup: selectedName }));
                      if (selectedGroup?.queue_type === 'ticket') {
                        setSelectedQueueType('ticket');
                        setFormData((prev) => ({ ...prev, dailyTarget: '' }));
                      } else if (selectedGroup?.queue_type === 'lead') {
                        setSelectedQueueType('lead');
                        setFormData((prev) => ({
                          ...prev,
                          supportResolveRateGoal: '',
                          supportDailyLimitSelfTrial: '',
                          supportDailyLimitOther: '',
                        }));
                      }
                    }}
                  >
                    <option value="">Select Group</option>
                    {availableLeadGroups.map((group) => (
                      <option key={group.name} value={group.name}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showTicketTargets ? (
                <>
                  {showResolveGoalForm && (
                    <div className="space-y-2">
                      <Label htmlFor="resolveRateGoal">Resolve Goal %</Label>
                      <Input
                        id="resolveRateGoal"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        className="h-11"
                        value={formData.supportResolveRateGoal}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            supportResolveRateGoal: e.target.value,
                          }))
                        }
                        placeholder="80"
                      />
                    </div>
                  )}
                  {showSupportLimitsForm && (
                    <div className="space-y-2">
                      <Label>Support Daily Limits</Label>
                      <div className="rounded-md border border-gray-200 p-3">
                        <SupportDailyDualInputs
                          selfTrial={formData.supportDailyLimitSelfTrial}
                          other={formData.supportDailyLimitOther}
                          onSelfTrialChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              supportDailyLimitSelfTrial: value,
                            }))
                          }
                          onOtherChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              supportDailyLimitOther: value,
                            }))
                          }
                          inputClassName="h-10"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : null}

              {showLeadTargets ? (
                <>
                  {showDailyTargetForm && (
                    <div className="space-y-2">
                      <Label htmlFor="dailyTarget">Daily Target</Label>
                      <Input
                        id="dailyTarget"
                        type="number"
                        min="0"
                        step="1"
                        className="h-11"
                        value={formData.dailyTarget}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, dailyTarget: e.target.value }))
                        }
                        placeholder="Enter daily target"
                      />
                    </div>
                  )}
                  {showDailyLimitForm && (
                    <div className="space-y-2">
                      <Label htmlFor="dailyLimit">Daily Limit</Label>
                      <Input
                        id="dailyLimit"
                        type="number"
                        min="0"
                        step="1"
                        className="h-11"
                        value={formData.dailyLimit}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, dailyLimit: e.target.value }))
                        }
                        placeholder="Enter daily limit"
                      />
                    </div>
                  )}
                </>
              ) : null}

              {showStateForm && (
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    name="state"
                    className="h-11 w-full border rounded-md px-3 text-sm bg-white"
                    value={formData.state}
                    onChange={(e) => {
                      const nextState = e.target.value;
                      setFormData((prev) => {
                        const districtOk =
                          !prev.district ||
                          geoDistricts.some(
                            (d) =>
                              String(d.value) === String(prev.district) &&
                              (!nextState || String(d.state_id) === String(nextState))
                          );
                        const partyOk =
                          !prev.party ||
                          geoParties.some((p) => {
                            if (String(p.value) !== String(prev.party)) return false;
                            if (!nextState || p.state_id == null) return true;
                            return String(p.state_id) === String(nextState);
                          });
                        return {
                          ...prev,
                          state: nextState,
                          district: districtOk ? prev.district : '',
                          party: partyOk ? prev.party : '',
                        };
                      });
                    }}
                  >
                    <option value="">Select state</option>
                    {geoStates.map((opt) => (
                      <option key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {showDistrictForm && (
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <select
                    id="district"
                    name="district"
                    className="h-11 w-full border rounded-md px-3 text-sm bg-white"
                    value={formData.district}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, district: e.target.value }))
                    }
                  >
                    <option value="">Select district</option>
                    {formDistrictOptions.map((opt) => (
                      <option key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {showPartyForm && (
                <div className="space-y-2">
                  <Label htmlFor="party">Party</Label>
                  <select
                    id="party"
                    name="party"
                    className="h-11 w-full border rounded-md px-3 text-sm bg-white"
                    value={formData.party}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, party: e.target.value }))
                    }
                  >
                    <option value="">Select party</option>
                    {formPartyOptions.map((opt) => (
                      <option key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {customFormFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`custom-${field.key}`}>{field.label}</Label>
                  {field.type === 'boolean' ? (
                    <select
                      id={`custom-${field.key}`}
                      className="h-11 w-full border rounded-md px-3 text-sm bg-white"
                      value={formData.customFields[field.key] ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          customFields: { ...prev.customFields, [field.key]: e.target.value },
                        }))
                      }
                    >
                      <option value="">—</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <Input
                      id={`custom-${field.key}`}
                      type={field.type === 'number' ? 'number' : 'text'}
                      className="h-11"
                      value={formData.customFields[field.key] ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          customFields: { ...prev.customFields, [field.key]: e.target.value },
                        }))
                      }
                      placeholder={field.label}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              className="flex-1 h-11 bg-black text-white hover:bg-black border-none rounded-md disabled:bg-gray-400 disabled:text-white disabled:opacity-100"
              onClick={handleAddUser}
              disabled={(showField('role') && !selectedRoleId) || isCreatingUser}
            >
              {isCreatingUser ? 'Adding...' : 'Add User'}
            </Button>
            {showField('role') && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 text-black border-gray-300 hover:bg-white hover:text-black rounded-md"
                onClick={() => setShowRoleFields(!showRoleFields)}
                disabled={!!selectedRoleId}
              >
                Add New Role
              </Button>
            )}
          </div>

          {showField('role') && showRoleFields && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <h5>Create New Role</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="newRoleKey">Role Key</Label>
                  <Input
                    id="newRoleKey"
                    placeholder="e.g. HM"
                    value={newRoleKey}
                    onChange={(e) => setNewRoleKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newRole">Role Name</Label>
                  <Input
                    id="newRole"
                    placeholder="e.g. Head of Management"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" onClick={handleAddRole}>
                Create Role
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h5 className="text-2xl font-semibold">Users</h5>
            <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row sm:items-center">
              <div className="relative w-full sm:flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Search by name, email or role..."
                  className="h-11 pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleDownloadUsersPdf()}
                disabled={isLoading || usersPdfLoading || filteredUsersWithSettings.length === 0}
                className="h-11 shrink-0 border-black text-black hover:bg-black hover:text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                {usersPdfLoading ? 'Generating…' : 'Download PDF'}
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No users found</div>
          ) : filteredUsersWithSettings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No users match your search</div>
          ) : (

            <>
              {/* ========================= MOBILE UI ========================= */}
              <div className="md:hidden space-y-4">
                {filteredUsersWithSettings.map((user, index) => {
                  const rowIsCse =
                    editingRowKey === getRowKey(user) && editingRow
                      ? isCseRole(roles.find((r) => r.id === editingRow.roleId))
                      : isCseRole(user.role);

                  return (
                    <Card
                      key={`${user.uid}-${index}`}
                      className="rounded-xl border shadow-sm"
                    >
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Name</p>
                            <p className="font-semibold text-sm">{user.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="break-words text-sm">{user.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Role</p>
                            <p className="text-sm">{user.role?.name || "No Role"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Lead Group</p>
                            <p className="text-sm">{user.leadGroup || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Target</p>
                            <p className="text-sm">
                              {rowIsCse
                                ? formatResolveRateGoal(user.supportResolveRateGoal)
                                : user.dailyTarget || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Daily Limit</p>
                            {rowIsCse ? (
                              <SupportDailyDualDisplay
                                selfTrial={user.supportDailyLimitSelfTrial}
                                other={user.supportDailyLimitOther}
                              />
                            ) : (
                              <p className="text-sm">{user.dailyLimit || "-"}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Manager Email</p>
                            <p className="break-words text-sm">{user.managerEmail || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Created At</p>
                            <p className="text-sm">
                              {format(
                                new Date(
                                  new Date(user.created_at).getTime() +
                                  5.5 * 60 * 60 * 1000
                                ),
                                "MMM d, yyyy h:mm a"
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-5 mt-2">
                          {editingRowKey === getRowKey(user) ? (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="border-green-200 bg-green-50 text-green-700"
                                onClick={handleSaveRowEdit}
                                disabled={isUpdatingRow}
                              >
                                <Check className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCancelRowEdit}
                                disabled={isUpdatingRow}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-500 border-red-200"
                            onClick={() => handleDeleteUser(user.email, user.uid)}
                            disabled={editingRowKey === getRowKey(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-black hover:bg-black">
                      {schema.columns
                        .filter((column) => column !== 'actions')
                        .map((column) => (
                          <TableHead key={column} className="text-white font-medium">
                            {getColumnLabel(column)}
                          </TableHead>
                        ))}
                      {customTableFields.map((field) => (
                        <TableHead key={`cf-${field.key}`} className="text-white font-medium">
                          {field.label}
                        </TableHead>
                      ))}
                      {schema.columns.includes('actions') && (
                        <TableHead className="text-white font-medium text-right" />
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsersWithSettings.map((user, index) => {
                      const isEditing = editingRowKey === getRowKey(user) && !!editingRow;
                      return (
                        <TableRow key={`${user.uid}-${index}`}>
                          {schema.columns
                            .filter((column) => column !== 'actions')
                            .map((column) => renderColumnCell(column, user))}
                          {customTableFields.map((field) =>
                            renderCustomTableCell(field, user, isEditing)
                          )}
                          {schema.columns.includes('actions') && renderColumnCell('actions', user)}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}