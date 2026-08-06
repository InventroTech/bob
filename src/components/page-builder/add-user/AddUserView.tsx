/** Presentational JSX for AddUserComponent. */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Trash2, UserPlus, Pencil, Check, X, Search, Download } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AddUserModel } from './useAddUser';
import type { User, Role } from './types';
import { formatResolveRateGoal, isCseRole } from './utils';

function SupportDailyDualDisplay({
  selfTrial,
  other,
}: {
  selfTrial?: string | number;
  other?: string | number;
}) {
  const st = selfTrial === undefined || selfTrial === '—' ? null : selfTrial;
  const ot = other === undefined || other === '—' ? null : other;
  if (st === null && ot === null) return <>—</>;
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

export function AddUserView(props: AddUserModel) {
  const {
    config,
    user,
    session,
    navigate,
    tenantSlug,
    tenantId,
    roles,
    setRoles,
    users,
    setUsers,
    myMembershipId,
    setMyMembershipId,
    selectedRoleId,
    setSelectedRoleId,
    newRoleName,
    setNewRoleName,
    newRoleKey,
    setNewRoleKey,
    formData,
    setFormData,
    isLoading,
    setIsLoading,
    showRoleFields,
    setShowRoleFields,
    coreSettingsMap,
    setCoreSettingsMap,
    availableLeadGroups,
    setAvailableLeadGroups,
    isCreatingUser,
    setIsCreatingUser,
    selectedQueueType,
    setSelectedQueueType,
    queueTypes,
    setQueueTypes,
    editingRowKey,
    setEditingRowKey,
    editingRow,
    setEditingRow,
    isUpdatingRow,
    setIsUpdatingRow,
    usersPdfLoading,
    setUsersPdfLoading,
    managerSearch,
    setManagerSearch,
    showManagerDropdown,
    setShowManagerDropdown,
    editManagerSearch,
    setEditManagerSearch,
    showEditManagerDropdown,
    setShowEditManagerDropdown,
    userSearchTerm,
    setUserSearchTerm,
    managerDropdownRef,
    editManagerDropdownRef,
    closeManagerDropdowns,
    fetchUsers,
    fetchCoreSettings,
    usersWithSettings,
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
  } = props;

  return (
    <Card className="w-full border border-gray-200 shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <h5 className="flex items-center gap-2 text-2xl font-semibold leading-none">
          <UserPlus className="h-5 w-5 text-gray-700" />
          User Management
        </h5>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Add User Form */}
        <div className="space-y-5 border border-gray-200 rounded-xl p-5 md:p-6">
          <h5 className="text-2xl font-semibold leading-none">Add New User</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleChange}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label htmlFor="department">Department (optional)</Label>
              <Input
                id="department"
                name="department"
                placeholder="e.g, engineering, sales"
                value={formData.department}
                onChange={handleChange}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Select Role</Label>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                        return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
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
                      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400">No users found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadGroup">Lead Group</Label>
              <select
                id="leadGroup"
                className="h-11 w-full border rounded-md px-3 text-sm bg-white"
                value={formData.leadGroup}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  const selectedGroup = availableLeadGroups.find((group) => group.name === selectedName);
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
                {availableLeadGroups
                  .map((group) => (
                    <option key={group.name} value={group.name}>
                      {group.name}
                    </option>
                  ))}
              </select>
            </div>
            {selectedQueueType === 'ticket' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="resolveRateGoal">Resolve Goal %</Label>
                  <Input
                    id="resolveRateGoal"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.supportResolveRateGoal}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, supportResolveRateGoal: e.target.value }))
                    }
                    placeholder="80"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Limit</Label>
                  <div className="rounded-md border border-gray-200 p-3">
                    <SupportDailyDualInputs
                      selfTrial={formData.supportDailyLimitSelfTrial}
                      other={formData.supportDailyLimitOther}
                      onSelfTrialChange={(value) =>
                        setFormData((prev) => ({ ...prev, supportDailyLimitSelfTrial: value }))
                      }
                      onOtherChange={(value) =>
                        setFormData((prev) => ({ ...prev, supportDailyLimitOther: value }))
                      }
                      inputClassName="h-10"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dailyTarget">Daily Target</Label>
                  <Input
                    id="dailyTarget"
                    type="number"
                    min="0"
                    step="1"
                    className="h-11"
                    value={formData.dailyTarget}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dailyTarget: e.target.value }))}
                    placeholder="Enter daily target"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyLimit">Daily Limit</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    min="0"
                    step="1"
                    className="h-11"
                    value={formData.dailyLimit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dailyLimit: e.target.value }))}
                    placeholder="Enter daily limit"
                  />
                </div>
              </>
            )}
          </div>
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              className="flex-1 h-11 bg-black text-white hover:bg-black border-none rounded-md disabled:bg-gray-400 disabled:text-white disabled:opacity-100" 
              onClick={handleAddUser}
              disabled={!selectedRoleId || isCreatingUser}
            >
              {isCreatingUser ? 'Adding...' : 'Add User'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 h-11 text-black border-gray-300 hover:bg-white hover:text-black rounded-md"
              onClick={() => setShowRoleFields(!showRoleFields)}
              disabled={!!selectedRoleId}
            >
              Add New Role
            </Button>
          </div>

          {/* Collapsible Role Creation Fields */}
          {showRoleFields && (
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
              
              <div className="flex gap-2">
                <Button type="button" onClick={handleAddRole} className="flex-1 bg-black text-white border-none hover:bg-black">
                  Create Role
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowRoleFields(false);
                    setNewRoleName('');
                    setNewRoleKey('');
                  }}
                  className="flex-1 text-black border-gray-300 hover:bg-white hover:text-black"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Users List */}
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
            <div className="text-center text-muted-foreground py-8">
              No users found
            </div>
          ) : filteredUsersWithSettings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No users match your search
            </div>
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

              {/* ========================= DESKTOP UI ========================= */}
              <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-black hover:!bg-black text-white hover:text-white">
                      <TableHead className="text-white font-medium">Name</TableHead>
                      <TableHead className="text-white font-medium">Email</TableHead>
                      <TableHead className="text-white font-medium">Role</TableHead>
                      <TableHead className="text-white font-medium">Group</TableHead>
                      <TableHead className="text-white font-medium">Target</TableHead>
                      <TableHead className="text-white font-medium">Daily Limit</TableHead>
                      <TableHead className="text-white font-medium">Manager Email</TableHead>
                      <TableHead className="text-white font-medium">Created at</TableHead>
                      <TableHead className="text-white font-medium text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsersWithSettings.map((user, index) => {
                      const rowIsCse =
                        editingRowKey === getRowKey(user) && editingRow
                          ? isCseRole(roles.find((r) => r.id === editingRow.roleId))
                          : isCseRole(user.role);
                      return (
                        <TableRow key={`${user.uid}-${index}`}>
                          <TableCell className="text-body-medium">
                            {user.name}
                          </TableCell>
                          <TableCell>
                            {user.email}
                          </TableCell>
                          <TableCell>
                            {user.role?.name || 'No Role'}
                          </TableCell>
                          <TableCell>
                            {editingRowKey === getRowKey(user) && editingRow ? (
                              <select
                                className="h-9 w-full border rounded-md px-2 text-sm bg-white"
                                value={editingRow.leadGroup}
                                onChange={(e) => setEditingRow((prev) => prev ? ({ ...prev, leadGroup: e.target.value }) : prev)}
                              >
                                <option value="">Select Group</option>
                                {availableLeadGroups
                                  .map((group) => (
                                    <option key={group.name} value={group.name}>
                                      {group.name}
                                    </option>
                                  ))}
                              </select>
                            ) : user.leadGroup}
                          </TableCell>
                          <TableCell>
                            {editingRowKey === getRowKey(user) && editingRow ? (
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
                                      prev ? ({ ...prev, supportResolveRateGoal: e.target.value }) : prev
                                    )
                                  }
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
                                      prev ? ({ ...prev, dailyTarget: e.target.value }) : prev
                                    )
                                  }
                                />
                              )
                            ) : rowIsCse ? (
                              <>{formatResolveRateGoal(user.supportResolveRateGoal)}</>
                            ) : (
                              user.dailyTarget
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRowKey === getRowKey(user) && editingRow ? (
                              rowIsCse ? (
                                <SupportDailyDualInputs
                                  selfTrial={editingRow.supportDailyLimitSelfTrial}
                                  other={editingRow.supportDailyLimitOther}
                                  onSelfTrialChange={(value) =>
                                    setEditingRow((prev) =>
                                      prev ? ({ ...prev, supportDailyLimitSelfTrial: value }) : prev
                                    )
                                  }
                                  onOtherChange={(value) =>
                                    setEditingRow((prev) =>
                                      prev ? ({ ...prev, supportDailyLimitOther: value }) : prev
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
                                      prev ? ({ ...prev, dailyLimit: e.target.value }) : prev
                                    )
                                  }
                                />
                              )
                            ) : rowIsCse ? (
                              <SupportDailyDualDisplay
                                selfTrial={user.supportDailyLimitSelfTrial}
                                other={user.supportDailyLimitOther}
                              />
                            ) : (
                              user.dailyLimit
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRowKey === getRowKey(user) && editingRow ? (
                              <div className="relative" ref={editManagerDropdownRef}>
                                <div className="flex gap-1">
                                  <div className="relative flex-1">
                                    <Input
                                      className="h-9 pr-8 text-sm"
                                      placeholder="Search manager..."
                                      value={showEditManagerDropdown ? editManagerSearch : editingRow.managerEmail}
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
                                  {editingRow.managerEmail && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 shrink-0 border-gray-200 text-gray-500 hover:text-gray-700"
                                      onClick={() => {
                                        setEditingRow((prev) => prev ? ({ ...prev, managerEmail: '' }) : prev);
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
                                        return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                                      })
                                      .map((u) => (
                                        <button
                                          key={u.uid}
                                          type="button"
                                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-100"
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => {
                                            setEditingRow((prev) => prev ? ({ ...prev, managerEmail: u.email }) : prev);
                                            setEditManagerSearch('');
                                            setShowEditManagerDropdown(false);
                                          }}
                                        >
                                          <span className="font-medium truncate">{u.name}</span>
                                          <span className="text-gray-400 truncate">{u.email}</span>
                                        </button>
                                      ))}
                                    {users.filter((u) => {
                                      if (u.email === user.email) return false;
                                      if (!editManagerSearch.trim()) return true;
                                      const q = editManagerSearch.toLowerCase();
                                      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                                    }).length === 0 && (
                                      <div className="px-3 py-1.5 text-xs text-gray-400">No users found</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : user.managerEmail}
                          </TableCell>
                          <TableCell>
                          {format(
                            new Date(new Date(user.created_at).getTime() + 5.5 * 60 * 60 * 1000),
                            'MMM d, yyyy h:mm a'
                          )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                            {editingRowKey === getRowKey(user) ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                                  onClick={handleSaveRowEdit}
                                  disabled={isUpdatingRow}
                                  title="Save changes"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                                  onClick={handleCancelRowEdit}
                                  disabled={isUpdatingRow}
                                  title="Cancel editing"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                                onClick={() => handleEditUser(user)}
                                title="Edit row"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-red-200 bg-white text-red-500 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDeleteUser(user.email, user.uid)}
                              title="Delete user"
                              disabled={editingRowKey === getRowKey(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            </div>
                          </TableCell>
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
  );
}