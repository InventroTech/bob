import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Trash2 } from 'lucide-react';

interface Role {
  id: string;
  name: string;
}

interface User {
  uid: string;
  name: string;
  email: string;
  role_id: string;
  created_at: string;
  role?: Role;
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
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleFields, setShowRoleFields] = useState(false);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!user) return;

      let { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        const emailResponse = await supabase
          .from('tenants')
          .select('id')
          .eq('name', user.email)
          .single();

        data = { id: emailResponse.data?.id };
        error = emailResponse.error;

        if (error || !data) {
          console.error("Error fetching tenant:", error);
          toast.error('Failed to fetch tenant. Please contact support.');
          return;
        }
      }

      setCompanyId(data.id);
    };

    fetchTenant();
  }, [user]);

  useEffect(() => {
    const fetchRoles = async () => {
      // Always try to fetch roles from renderer API first, regardless of companyId
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.error('No authentication token available');
          toast.error('Authentication required to fetch roles');
          return;
        }

        // Use renderer URL for roles
        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        const apiUrl = `${baseUrl}/membership/roles`;
        
        console.log('Fetching roles from:', apiUrl);

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
        console.log('Roles response:', responseData);
        
        // Handle different response formats
        let rolesData = [];
        if (responseData.results && Array.isArray(responseData.results)) {
          rolesData = responseData.results;
        } else if (Array.isArray(responseData)) {
          rolesData = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          rolesData = responseData.data;
        }

        setRoles(rolesData || []);
      } catch (error: any) {
        console.error('Error fetching roles:', error);
        toast.error(`Failed to fetch roles: ${error.message}`);
        
        // Fallback to Supabase if renderer API fails (only if companyId is available)
        if (companyId) {
          try {
            const { data, error: supabaseError } = await supabase
              .from('roles')
              .select('id, name')
              .eq('tenant_id', companyId);
              
            if (supabaseError) throw supabaseError;
            setRoles(data || []);
          } catch (fallbackError: any) {
            console.error('Fallback error:', fallbackError);
            toast.error('Failed to fetch roles from fallback');
          }
        } else {
          console.log('No companyId available for Supabase fallback');
          setRoles([]);
        }
      }
    };

    fetchRoles();
  }, [companyId]); // Keep dependency but don't block API call

  const fetchUsers = async () => {
    // Always try to fetch users from renderer API first, regardless of companyId
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
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
        uid: user.uid || user.id || `temp-${index}-${Math.random().toString(36).substring(2, 15)}`,
        name: user.name || user.full_name || 'Unnamed User',
        email: user.email || 'No Email',
        role_id: user.role_id || user.role?.id || '',
        created_at: user.created_at || user.date_joined || new Date().toISOString(),
        role: user.role || (user.role_name ? { id: user.role_id, name: user.role_name } : undefined)
      }));

      setUsers(transformedUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to fetch users: ${error.message}`);
      
      // Fallback to Supabase if renderer API fails (only if companyId is available)
      if (companyId) {
        try {
          const { data, error: supabaseError } = await supabase
            .from('users')
            .select(`
              uid,
              name,
              email,
              role_id,
              created_at,
              roles (
                id,
                name
              )
            `)
            .eq('tenant_id', companyId)
            .order('created_at', { ascending: false });

          if (supabaseError) throw supabaseError;

          // Transform the data without filtering out users
          const transformedUsers: User[] = ((data as unknown) as DatabaseUser[])
            .map((user, index) => ({
              uid: user.uid || `temp-${index}-${Math.random().toString(36).substring(2, 15)}`,
              name: user.name || 'Unnamed User',
              email: user.email || 'No Email',
              role_id: user.role_id || '',
              created_at: user.created_at || new Date().toISOString(),
              role: user.roles || undefined
            }));

          setUsers(transformedUsers);
        } catch (fallbackError: any) {
          console.error('Fallback error:', fallbackError);
          toast.error('Failed to fetch users from fallback');
          setUsers([]);
        }
      } else {
        console.log('No companyId available for Supabase fallback');
        setUsers([]);
      }
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use renderer URL for adding role
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/membership/roles`;
      
      console.log('Adding role via:', apiUrl);
      console.log('Payload:', { key: newRoleKey, name: newRoleName });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        },
        body: JSON.stringify({
          key: newRoleKey,
          name: newRoleName
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Role creation response:', responseData);

      toast.success('Role added successfully');
      setNewRoleName('');
      setNewRoleKey('');
      setShowRoleFields(false);
      
      // Set the newly created role as selected
      if (responseData.id) {
        setSelectedRoleId(responseData.id);
      } else if (responseData.data?.id) {
        setSelectedRoleId(responseData.data.id);
      }

      // Refresh the roles list by re-running the fetch logic
      const fetchRolesAgain = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          if (token) {
            const baseUrl = import.meta.env.VITE_RENDER_API_URL;
            const apiUrl = `${baseUrl}/membership/roles`;
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Tenant-Slug': 'bibhab-thepyro-ai'
              }
            });

            if (response.ok) {
              const responseData = await response.json();
              let rolesData = [];
              if (responseData.results && Array.isArray(responseData.results)) {
                rolesData = responseData.results;
              } else if (Array.isArray(responseData)) {
                rolesData = responseData;
              } else if (responseData.data && Array.isArray(responseData.data)) {
                rolesData = responseData.data;
              }
              setRoles(rolesData || []);
            }
          }
        } catch (error) {
          console.error('Error refreshing roles:', error);
        }
      };
      
      await fetchRolesAgain();

    } catch (error: any) {
      console.error('Error adding role:', error);
      toast.error(`Error adding role: ${error.message}`);
      
      // Fallback to Supabase if renderer API fails (only if companyId is available)
      if (companyId) {
        try {
          const { data, error: supabaseError } = await supabase
            .from('roles')
            .insert([{ name: newRoleName, tenant_id: companyId }])
            .select()
            .single();

          if (supabaseError) throw supabaseError;
          
          toast.success('Role added (via fallback)');
          setNewRoleName('');
          setNewRoleKey('');
          setShowRoleFields(false);
          setSelectedRoleId(data.id);
          
          // Refresh roles list
          const updated = await supabase
            .from('roles')
            .select('id, name')
            .eq('tenant_id', companyId);
          setRoles(updated.data || []);
        } catch (fallbackError: any) {
          console.error('Fallback error:', fallbackError);
          toast.error(`Failed to add role: ${fallbackError.message}`);
        }
      }
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !selectedRoleId || !companyId) {
      toast.error('All fields are required');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use renderer URL for user creation
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/users/legacy/create/`;
      
      console.log('Creating user via:', apiUrl);
      console.log('Payload:', { name: formData.name, email: formData.email, role_id: selectedRoleId });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role_id: selectedRoleId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('User creation response:', responseData);

      toast.success('User added successfully! They will be able to log in once they set up their account.');

      setFormData({ name: '', email: '' });
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
      const { data: { session } } = await supabase.auth.getSession();
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
      toast.success('User deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Add User</h1>

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
              <h4 className="font-medium">Create New Role</h4>
              
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
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No users found
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter(user => user.name && user.email) // Only show users with name and email
                    .map((user, index) => (
                      <TableRow key={`${user.uid}-${index}`}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role?.name || 'No Role'}</TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteUser(user.email, user.uid)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
