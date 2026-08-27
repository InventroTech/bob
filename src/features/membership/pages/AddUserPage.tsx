import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { forceLogoutIfDeletedSelf } from '@/lib/auth/deletedUserSession';
import { getTenantIdFromJWT } from '@/lib/auth/jwt';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Trash2, Eye } from 'lucide-react';
import { membershipService, type User } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';
import { getEffectiveToken, dispatchSpoofChanged } from '@/lib/auth/spoof';
import {
  useMembershipRoles,
  useMembershipUsers,
} from '../hooks/useMembership';
import { ZohoMailConnectCard } from '@/features/integrations/components/ZohoMailConnectCard';

const AddUserPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', department: '' });
  const [showRoleFields, setShowRoleFields] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Zoho Mail OAuth return: backend redirects here with ?zoho_mail=ok|error
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

  const {
    data: roles = [],
    error: rolesError,
  } = useMembershipRoles(Boolean(session?.access_token));

  const {
    data: users = [],
    isLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useMembershipUsers(Boolean(session?.access_token));

  // Extract tenant ID from JWT token
  useEffect(() => {
    const extractTenantId = async () => {
      if (!session?.access_token) return;

      const tenantId = getTenantIdFromJWT(session.access_token);

      if (!tenantId) {
        console.error("Error extracting tenant ID from JWT");
        toast.error('Failed to extract tenant ID. Please contact support.');
        return;
      }

      setCompanyId(tenantId);
    };

    extractTenantId();
  }, [session]);

  useEffect(() => {
    if (!rolesError) return;
    const message =
      rolesError instanceof Error ? rolesError.message : 'Failed to fetch roles';
    toast.error(`Failed to fetch roles: ${message}`);
  }, [rolesError]);

  useEffect(() => {
    if (!usersError) return;
    const message =
      usersError instanceof Error ? usersError.message : 'Failed to fetch users';
    toast.error(`Failed to fetch users: ${message}`);
  }, [usersError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddRole = async () => {
    if (!newRoleName || !newRoleKey) return toast.error('Role name and key are required');

    try {
      const createdRole = await membershipService.createRole(newRoleKey, newRoleName);

      setNewRoleName('');
      setNewRoleKey('');
      setShowRoleFields(false);

      if (createdRole.id) {
        setSelectedRoleId(createdRole.id);
      }

      toast.success('Role added successfully');
      await queryClient.invalidateQueries({ queryKey: queryKeys.membership.roles });
    } catch (error: unknown) {
      console.error('Error adding role:', error);
      const message = error instanceof Error ? error.message : 'Failed to create role';
      toast.error(`Error adding role: ${message}`);
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !selectedRoleId || !companyId) {
      toast.error('All fields are required');
      return;
    }
    try {
      const token = await getEffectiveToken(session?.access_token ?? null);

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/users/create/`;

      const payload: Record<string, string> = {
        name: formData.name,
        email: formData.email,
        role_id: selectedRoleId
      };
      if (formData.department?.trim()) payload.department = formData.department.trim();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      toast.success('User added successfully! They will be able to log in once they set up their account.');

      setFormData({ name: '', email: '', department: '' });
      setSelectedRoleId('');

      await queryClient.invalidateQueries({ queryKey: queryKeys.membership.users });
      await refetchUsers();
    } catch (error: unknown) {
      console.error("Error adding user:", error);
      const message = error instanceof Error ? error.message : 'Failed to add user';
      toast.error(`Error adding user: ${message}`);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = await getEffectiveToken(session?.access_token ?? null);

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const userToDelete = users.find((user) => user.email === email);
      if (!userToDelete) {
        toast.error('User not found');
        return;
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/delete-user/`;

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

      const selfLoggedOut = await forceLogoutIfDeletedSelf(email, session?.user?.email);
      if (selfLoggedOut) {
        toast.success('Your account was deleted. You have been signed out.');
        navigate('/auth', { replace: true });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.membership.users });
      await refetchUsers();
      toast.success('User deleted successfully. They have been signed out everywhere.');
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      toast.error(message);
    }
  };

  const handleSpoofUser = async (user: User) => {
    try {
      if (!user.id) {
        toast.error('Cannot spoof this user: missing membership id');
        return;
      }

      try {
        const current = await getEffectiveToken(session?.access_token ?? null);
        if (current && !window.localStorage.getItem('pyro_spoof_original_jwt')) {
          window.localStorage.setItem('pyro_spoof_original_jwt', current);
        }
      } catch (err) {
        console.warn('Unable to capture original JWT before spoofing', err);
      }

      const result = await membershipService.spoofUserToken(user.id);

      if (!result?.token) {
        toast.error('Failed to generate spoof token for user');
        return;
      }

      window.localStorage.setItem('pyro_spoof_jwt', result.token);
      const label = user.name && user.email ? `${user.name} (${user.email})` : user.email || 'Unknown user';
      window.localStorage.setItem('pyro_spoof_user_label', label);
      dispatchSpoofChanged();

      toast.success(`Now spoofing as ${label}`);
    } catch (error: unknown) {
      console.error('Error starting spoof session:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const message = err?.response?.data?.error || err.message || 'Failed to start spoof session';
      toast.error(message);
    }
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return users.filter((user) => {
      if (!user.name || !user.email) return false;
      if (!search) return true;
      return (
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        (user.department || '').toLowerCase().includes(search) ||
        (user.role?.name || '').toLowerCase().includes(search)
      );
    });
  }, [searchTerm, users]);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <ZohoMailConnectCard />

        <div className="space-y-6">
          <h5>Add User</h5>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter full name"
              value={formData.name}
              onChange={handleChange}
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department (optional)</Label>
            <Input
              id="department"
              name="department"
              placeholder="e.g. Engineering, Sales"
              value={formData.department}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Select Role</Label>
            <select
              id="role"
              className="w-full border rounded px-3 py-2"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
            >
              <option value="">-- Select Role --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              className="flex-1"
              onClick={handleAddUser}
              disabled={!selectedRoleId}
            >
              Add User
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowRoleFields(!showRoleFields)}
              disabled={!!selectedRoleId}
            >
              Add New Role
            </Button>
          </div>

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
                <Button type="button" onClick={handleAddRole} className="flex-1">
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
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <h5 className="mb-0">Users</h5>

            <Input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-80"
            />
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No users found
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto border-2 border-gray-200 rounded-lg bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-black hover:!bg-black text-white hover:text-white border-b border-gray-200">
                      <TableHead className="text-white font-medium">Name</TableHead>
                      <TableHead className="text-white font-medium">Email</TableHead>
                      <TableHead className="text-white font-medium">Department</TableHead>
                      <TableHead className="text-white font-medium">Role</TableHead>
                      <TableHead className="text-white font-medium">Created At</TableHead>
                      <TableHead className="text-white font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user, index) => (
                      <TableRow key={`${user.id}-${index}`}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.department || '—'}</TableCell>
                        <TableCell>{user.role?.name || 'No Role'}</TableCell>
                        <TableCell>
                          {format(
                            new Date(new Date(user.created_at).getTime() + 5.5 * 60 * 60 * 1000),
                            'MMM d, yyyy h:mm a'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleSpoofUser(user)}
                              title="Spoof this user"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteUser(user.email)}
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

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-4">
                {filteredUsers.map((user, index) => (
                  <div
                    key={`${user.id}-${index}`}
                    className="rounded-xl border bg-white p-4 shadow-sm"
                  >
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Name</p>
                        <p className="font-semibold">{user.name}</p>
                      </div>

                      <div>
                        <p className="text-gray-500">Role</p>
                        <p>{user.role?.name || "No Role"}</p>
                      </div>

                      <div className="col-span-2">
                        <p className="text-gray-500">Email</p>
                        <p className="break-all">{user.email}</p>
                      </div>

                      <div>
                        <p className="text-gray-500">Department</p>
                        <p>{user.department || "—"}</p>
                      </div>

                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="text-xs">
                          {format(
                            new Date(
                              new Date(user.created_at).getTime() +
                                5.5 * 60 * 60 * 1000
                            ),
                            "MMM d, yyyy"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSpoofUser(user)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.email)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddUserPage;