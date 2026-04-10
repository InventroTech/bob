import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getTenantIdFromJWT } from '@/lib/jwt';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Trash2, Eye } from 'lucide-react';
import { membershipService } from '@/lib/api';
import { getEffectiveToken, dispatchSpoofChanged } from '@/lib/spoof';

interface Role {
  id: string;
  name: string;
}

interface User {
  uid: string;
  membershipId?: string;
  supabaseUserId?: string;
  name: string;
  email: string;
  role_id: string;
  created_at: string;
  role?: Role;
  department?: string;
}

interface DatabaseUser {
  uid: string;
  name: string;
  email: string;
  role_id: string;
  created_at: string;
  roles: {
    id: string;
    name: string;
  } | null;
}

const AddUserPage = () => {
  const { user, session } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', department: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleFields, setShowRoleFields] = useState(false);

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
  }, [companyId]); // Keep dependency but don't block API call

  const fetchUsers = async () => {
    // Always try to fetch users from renderer API first, regardless of companyId
    setIsLoading(true);

    try {
      const token = await getEffectiveToken(session?.access_token ?? null);

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
        uid: user.uid || user.id || `temp-${index}-${Math.random().toString(36).substring(2, 15)}`,
        membershipId: user.id ? String(user.id) : undefined,
        supabaseUserId: user.user_id ? String(user.user_id) : undefined,
        name: user.name || user.full_name || 'Unnamed User',
        email: user.email || 'No Email',
        role_id: user.role_id || user.role?.id || '',
        created_at: user.created_at || user.date_joined || new Date().toISOString(),
        role: user.role || (user.role_name ? { id: user.role_id, name: user.role_name } : undefined),
        department: user.department ?? user.department_name ?? undefined
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

  useEffect(() => {
    fetchUsers();
  }, [companyId]);

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

      // Use renderer URL for user creation
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/users/create/`;
      
      console.log('Creating user via:', apiUrl);
      console.log('Payload:', { name: formData.name, email: formData.email, role_id: selectedRoleId });

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
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('User creation response:', responseData);

      toast.success('User added successfully! They will be able to log in once they set up their account.');

      setFormData({ name: '', email: '', department: '' });
      setSelectedRoleId('');

      // Refresh the users list
      await fetchUsers();

    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(`Error adding user: ${error.message}`);
    }
  };

  const handleDeleteUser = async (email: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = await getEffectiveToken(session?.access_token ?? null);

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
      toast.success('User deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleSpoofUser = async (user: User) => {
    try {
      if (!user.membershipId) {
        toast.error('Cannot spoof this user: missing membership id');
        return;
      }

      // Get current "real" token once and store as original if not already stored
      try {
        const current = await getEffectiveToken(session?.access_token ?? null);
        if (current && !window.localStorage.getItem('pyro_spoof_original_jwt')) {
          window.localStorage.setItem('pyro_spoof_original_jwt', current);
        }
      } catch (err) {
        console.warn('Unable to capture original JWT before spoofing', err);
      }

      const result = await membershipService.spoofUserToken(user.membershipId);

      if (!result?.token) {
        toast.error('Failed to generate spoof token for user');
        return;
      }

      window.localStorage.setItem('pyro_spoof_jwt', result.token);
      const label = user.name && user.email ? `${user.name} (${user.email})` : user.email || 'Unknown user';
      window.localStorage.setItem('pyro_spoof_user_label', label);
      dispatchSpoofChanged();

      toast.success(`Now spoofing as ${label}`);
    } catch (error: any) {
      console.error('Error starting spoof session:', error);
      const message = error?.response?.data?.error || error.message || 'Failed to start spoof session';
      toast.error(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
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

          {/* Action Buttons */}
          <div className="flex gap-2">
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
          <h5>Users</h5>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
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
                  {users
                    .filter(user => user.name && user.email) // Only show users with name and email
                    .map((user, index) => (
                      <TableRow key={`${user.uid}-${index}`}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.department || '—'}</TableCell>
                        <TableCell>{user.role?.name || 'No Role'}</TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), 'MMM d, yyyy h:mm a')}
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
                              onClick={() => handleDeleteUser(user.email, user.uid)}
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
      </div>
    </DashboardLayout>
  );
};

export default AddUserPage;
