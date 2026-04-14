import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Trash2, UserPlus, Pencil, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTenant } from '@/hooks/useTenant';
import { membershipService } from '@/lib/api';
import { leadTypeAssignmentApi, groupsApi } from '@/lib/userSettingsApi';

interface Role {
  id: string;
  name: string;
}

interface User {
  tenant_membership_id?: number;
  uid: string;
  name: string;
  email: string;
  role_id: string;
  created_at: string;
  role?: Role;
  department?: string;
  lead_group_name?: string;
  leadGroup?: string;
  dailyTarget?: string | number;
  dailyLimit?: string | number;
}

interface UserCoreSettingsSummary {
  group_id?: number;
  daily_target?: number;
  daily_limit?: number;
}

interface LeadGroupOption {
  id: number;
  name: string;
  queue_type?: string;
  group_data?: Record<string, any>;
}

interface RowEditState {
  originalEmail: string;
  originalRoleId: string;
  name: string;
  email: string;
  department: string;
  roleId: string;
  leadGroup: string;
  dailyTarget: string;
  dailyLimit: string;
}

const AddUserComponent: React.FC = () => {
  const { user, session } = useAuth();
  const { tenantId } = useTenant();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    leadGroup: '',
    dailyTarget: '',
    dailyLimit: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleFields, setShowRoleFields] = useState(false);
  const [coreSettingsMap, setCoreSettingsMap] = useState<Record<string, UserCoreSettingsSummary>>({});
  const [availableLeadGroups, setAvailableLeadGroups] = useState<LeadGroupOption[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedQueueType, setSelectedQueueType] = useState<'lead' | 'ticket'>('lead');
  const [queueTypes, setQueueTypes] = useState<string[]>([]);
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<RowEditState | null>(null);
  const [isUpdatingRow, setIsUpdatingRow] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesData = await membershipService.getRoles();
        setRoles(rolesData);
      } catch (error: any) {
        console.error('Error fetching roles:', error);
        toast.error(`Failed to fetch roles: ${error.message}`);
        setRoles([]);
      }
    };

    fetchRoles();
  }, [tenantId]); // Keep dependency but don't block API call

  const fetchUsers = async () => {
    // Always try to fetch users from renderer API first, regardless of tenantId
    setIsLoading(true);

    try{
      const token = session?.access_token;

      if (!token) {
        console.error('No authentication token available');
        toast.error('Authentication required to fetch users');
        return;
      }

      // Use renderer URL for users
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/membership/users`;
      
      console.log('Fetching users from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Users response:', responseData);
      
      // Handle different response formats
      let usersData = [];
      if (responseData.results && Array.isArray(responseData.results)) {
        usersData = responseData.results;
      } else if (Array.isArray(responseData)) {
        usersData = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        usersData = responseData.data;
      }

      // Transform the data to match expected format
      const transformedUsers: User[] = usersData.map((user: any, index: number) => ({
        tenant_membership_id: typeof user.id === 'number' ? user.id : Number(user.id) || undefined,
        uid: user.uid || user.id || `temp-${index}-${Math.random().toString(36).substring(2, 15)}`,
        name: user.name || user.full_name || 'Unnamed User',
        email: user.email || 'No Email',
        role_id: user.role_id || user.role?.id || '',
        created_at: user.created_at || user.date_joined || new Date().toISOString(),
        role: user.role || (user.role_name ? { id: user.role_id, name: user.role_name } : undefined),
        department: user.department ?? user.department_name ?? undefined,
        lead_group_name: user.lead_group_name ?? undefined,
      }));

      setUsers(transformedUsers);
      // Show message if no users found
      if (transformedUsers.length === 0) {
        toast.info('No users found. The list is empty.');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to fetch users: ${error.message}`);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCoreSettings = async () => {
    try {
      const mapped: Record<string, UserCoreSettingsSummary> = {};
      const usersWithMembershipId = users.filter((u) => !!u.tenant_membership_id);
      const rows = await Promise.all(
        usersWithMembershipId.map(async (u) => ({
          emailKey: (u.email || '').toLowerCase(),
          kv: await leadTypeAssignmentApi.getUserCoreKVSettings(String(u.tenant_membership_id)),
        }))
      );
      rows.forEach(({ emailKey, kv }) => {
        const groupRow = kv.find((r) => r.key === 'GROUP');
        const targetRow = kv.find((r) => r.key === 'DAILY_TARGET');
        const limitRow = kv.find((r) => r.key === 'DAILY_LIMIT');
        mapped[emailKey] = {
          group_id: typeof groupRow?.value === 'number' ? groupRow.value : undefined,
          daily_target: typeof targetRow?.value === 'number' ? targetRow.value : undefined,
          daily_limit: typeof limitRow?.value === 'number' ? limitRow.value : undefined,
        };
      });
      setCoreSettingsMap(mapped);
    } catch {
      setCoreSettingsMap({});
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [tenantId]);

  useEffect(() => {
    if (users.length > 0) {
      fetchCoreSettings();
    } else {
      setCoreSettingsMap({});
    }
  }, [users]);

  useEffect(() => {
    const fetchLeadGroupsAndQueueTypes = async () => {
      try {
        const [groups, queueTypesData] = await Promise.all([
          groupsApi.getAll(),
          leadTypeAssignmentApi.getAvailableQueueTypes(),
        ]);
        setAvailableLeadGroups(
          groups.map((group) => ({
            id: group.id,
            name: group.name,
            queue_type: typeof group.group_data?.queue_type === 'string' ? group.group_data.queue_type : undefined,
            group_data: group.group_data ?? {},
          }))
        );
        setQueueTypes(queueTypesData);
      } catch {
        setAvailableLeadGroups([]);
        setQueueTypes([]);
      }
    };
    fetchLeadGroupsAndQueueTypes();
  }, [tenantId]);

  const usersWithSettings = useMemo(
    () =>
      users.map((usr) => {
        const config = coreSettingsMap[(usr.email || '').toLowerCase()];
        const groupFromKv = availableLeadGroups.find((g) => g.id === config?.group_id)?.name;
        return {
          ...usr,
          leadGroup: groupFromKv || usr.lead_group_name || '—',
          dailyTarget: config?.daily_target ?? '—',
          dailyLimit: config?.daily_limit ?? '—',
        };
      }),
    [users, coreSettingsMap, availableLeadGroups]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddRole = async () => {
    if (!newRoleName || !newRoleKey) return toast.error('Role name and key are required');

    try {
      const createdRole = await membershipService.createRole(newRoleKey, newRoleName);

      // Clear form fields first
      setNewRoleName('');
      setNewRoleKey('');
      setShowRoleFields(false);
      
      // Set the newly created role as selected if we have an ID
      if (createdRole.id) {
        setSelectedRoleId(createdRole.id);
      }

      // Show success toast
      toast.success('Role added successfully');

      // Refresh the roles list (don't block on this)
      try {
        const rolesData = await membershipService.getRoles();
        setRoles(rolesData);
      } catch (refreshError) {
        console.error('Error refreshing roles list:', refreshError);
        // Don't show error toast for refresh failure, role was already created
      }
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast.error(`Error adding role: ${error.message || 'Failed to create role'}`);
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !selectedRoleId) {
      toast.error('All fields are required');
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    const existingUser = users.find((u) => (u.email || '').toLowerCase() === normalizedEmail);
    if (existingUser) {
      toast.error('A user with this email already exists. Use Edit for updates or choose a different email.');
      return;
    }

    try{
      setIsCreatingUser(true);
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use renderer URL for user creation/update
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/users/create/`;
      
      console.log('Creating user via:', apiUrl);
      console.log('Payload:', { name: formData.name, email: formData.email, role_id: selectedRoleId });

      const payload: Record<string, string | number> = {
        name: formData.name,
        email: formData.email,
        role_id: selectedRoleId,
      };
      if (formData.department?.trim()) payload.department = formData.department.trim();
      if (formData.leadGroup?.trim()) payload.lead_group_name = formData.leadGroup.trim();
      if (formData.dailyTarget !== '') payload.daily_target = Number(formData.dailyTarget);
      if (formData.dailyLimit !== '') payload.daily_limit = Number(formData.dailyLimit);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        const backendMessage =
          errorData?.message ||
          errorData?.detail ||
          (typeof errorData === 'object'
            ? Object.entries(errorData)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                .join(' | ')
            : '');
        throw new Error(backendMessage || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('User creation response:', responseData);

      toast.success('User added successfully! They will be able to log in once they set up their account.');

      const selectedLeadGroup = formData.leadGroup;
      const selectedDailyTarget = formData.dailyTarget;
      const selectedDailyLimit = formData.dailyLimit;

      setFormData({
        name: '',
        email: '',
        department: '',
        leadGroup: '',
        dailyTarget: '',
        dailyLimit: '',
      });
      setSelectedQueueType('lead');
      setSelectedRoleId('');

      // Refresh the users list
      await fetchUsers();
      await fetchCoreSettings();

      // Group and user-level limits are now saved by backend create/update endpoint.
      if (selectedLeadGroup || selectedDailyTarget || selectedDailyLimit) {
        await fetchCoreSettings();
      }

    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(`Error adding user: ${error.message}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (email: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try{
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Find the user to get their role_id
      const userToDelete = users.find(user => user.email === email);
      if (!userToDelete) {
        toast.error('User not found');
        return;
      }

      // Use renderer URL for user deletion
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/delete-user/`;
      
      console.log('Deleting user via:', apiUrl);
      console.log('Payload:', { email, role_id: userToDelete.role_id });

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        },
        body: JSON.stringify({
          email,
          role_id: userToDelete.role_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('User deletion response:', responseData);

      // Refresh the users list after successful deletion
      await fetchUsers();
      await fetchCoreSettings();
      toast.success('User deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const getRowKey = (usr: User) => `${usr.uid}-${usr.email}-${usr.role_id}`;

  const handleEditUser = (usr: User) => {
    setEditingRowKey(getRowKey(usr));
    setEditingRow({
      originalEmail: usr.email || '',
      originalRoleId: usr.role_id || '',
      name: usr.name || '',
      email: usr.email || '',
      department: usr.department || '',
      roleId: usr.role_id || '',
      leadGroup: usr.leadGroup && usr.leadGroup !== '—' ? usr.leadGroup : '',
      dailyTarget: usr.dailyTarget && usr.dailyTarget !== '—' ? String(usr.dailyTarget) : '',
      dailyLimit: usr.dailyLimit && usr.dailyLimit !== '—' ? String(usr.dailyLimit) : '',
    });
  };

  const handleCancelRowEdit = () => {
    setEditingRowKey(null);
    setEditingRow(null);
  };

  const handleSaveRowEdit = async () => {
    if (!editingRow) return;
    if (!editingRow.name.trim() || !editingRow.email.trim() || !editingRow.roleId) {
      toast.error('Name, Email and Role are required');
      return;
    }

    const normalizedEmail = editingRow.email.trim().toLowerCase();
    const conflictUser = users.find(
      (u) =>
        (u.email || '').toLowerCase() === normalizedEmail &&
        (u.email || '').toLowerCase() !== editingRow.originalEmail.toLowerCase()
    );
    if (conflictUser) {
      toast.error('A user with this email already exists.');
      return;
    }

    try {
      setIsUpdatingRow(true);
      const token = session?.access_token;
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/users/update/`;
      const payload: Record<string, string | number> = {
        name: editingRow.name.trim(),
        email: editingRow.email.trim(),
        role_id: editingRow.roleId,
        original_email: editingRow.originalEmail,
        original_role_id: editingRow.originalRoleId,
      };
      if (editingRow.department.trim()) payload.department = editingRow.department.trim();
      if (editingRow.leadGroup.trim()) payload.lead_group_name = editingRow.leadGroup.trim();
      if (editingRow.dailyTarget !== '') payload.daily_target = Number(editingRow.dailyTarget);
      if (editingRow.dailyLimit !== '') payload.daily_limit = Number(editingRow.dailyLimit);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': 'bibhab-thepyro-ai',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const backendMessage =
          errorData?.message ||
          errorData?.detail ||
          (typeof errorData === 'object'
            ? Object.entries(errorData)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                .join(' | ')
            : '');
        throw new Error(backendMessage || `HTTP error! status: ${response.status}`);
      }

      toast.success('User updated successfully!');
      handleCancelRowEdit();
      await fetchUsers();
      await fetchCoreSettings();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`Error updating user: ${error.message}`);
    } finally {
      setIsUpdatingRow(false);
    }
  };

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
                    setFormData((prev) => ({ ...prev, dailyTarget: '', dailyLimit: '' }));
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
                    setFormData((prev) => ({ ...prev, dailyTarget: '', dailyLimit: '' }));
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
            {selectedQueueType !== 'ticket' && (
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
          <h5 className="text-2xl font-semibold">Users</h5>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-black hover:!bg-black text-white hover:text-white">
                    <TableHead className="text-white font-medium">Name</TableHead>
                    <TableHead className="text-white font-medium">Email</TableHead>
                    <TableHead className="text-white font-medium">Role</TableHead>
                    <TableHead className="text-white font-medium">Group</TableHead>
                    <TableHead className="text-white font-medium">Daily Target</TableHead>
                    <TableHead className="text-white font-medium">Daily Limit</TableHead>
                    <TableHead className="text-white font-medium">Created at</TableHead>
                    <TableHead className="text-white font-medium text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithSettings
                    .filter(user => user.name && user.email) // Only show users with name and email
                    .map((user, index) => (
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
                            <Input
                              className="h-9"
                              type="number"
                              min="0"
                              step="1"
                              value={editingRow.dailyTarget}
                              onChange={(e) => setEditingRow((prev) => prev ? ({ ...prev, dailyTarget: e.target.value }) : prev)}
                            />
                          ) : user.dailyTarget}
                        </TableCell>
                        <TableCell>
                          {editingRowKey === getRowKey(user) && editingRow ? (
                            <Input
                              className="h-9"
                              type="number"
                              min="0"
                              step="1"
                              value={editingRow.dailyLimit}
                              onChange={(e) => setEditingRow((prev) => prev ? ({ ...prev, dailyLimit: e.target.value }) : prev)}
                            />
                          ) : user.dailyLimit}
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), 'MMM d, yyyy h:mm a')}
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
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AddUserComponent;