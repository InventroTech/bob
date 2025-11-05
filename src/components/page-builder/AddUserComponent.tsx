import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Trash2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from '@/hooks/useTenant';
import { getCachedRoles, getCachedUsers, fetchAndCacheRoles, fetchAndCacheUsers, refreshSessionCache } from '@/lib/sessionCache';

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

const AddUserComponent: React.FC = () => {
  const { user, session } = useAuth();
  const { tenantId } = useTenant();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleFields, setShowRoleFields] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      // Check session cache first (fetched on login)
      const cachedRoles = getCachedRoles();
      if (cachedRoles && cachedRoles.length > 0) {
        console.log('[AddUserComponent] Using cached roles');
        setRoles(cachedRoles);
        return;
      }

      // If not cached, fetch and cache
      if (!session?.access_token) {
        console.error('No authentication token available');
        toast.error('Authentication required to fetch roles');
        return;
      }

      try {
        const rolesData = await fetchAndCacheRoles(session.access_token, 'bibhab-thepyro-ai');
        setRoles(rolesData || []);
      } catch (error: any) {
        console.error('Error fetching roles:', error);
        toast.error(`Failed to fetch roles: ${error.message}`);
        
        // Fallback to Supabase if renderer API fails (only if tenantId is available)
        if (tenantId) {
          try {
            const { data, error: supabaseError } = await supabase
              .from('roles')
              .select('id, name')
              .eq('tenant_id', tenantId);
              
            if (supabaseError) throw supabaseError;
            setRoles(data || []);
          } catch (fallbackError: any) {
            console.error('Fallback error:', fallbackError);
            toast.error('Failed to fetch roles from fallback');
          }
        } else {
          console.log('No tenantId available for Supabase fallback');
          setRoles([]);
        }
      }
    };

    fetchRoles();
  }, [session?.access_token, tenantId]);

  const fetchUsers = async () => {
    setIsLoading(true);

    // Check session cache first (fetched on login)
    const cachedUsers = getCachedUsers();
    if (cachedUsers && cachedUsers.length > 0) {
      console.log('[AddUserComponent] Using cached users');
      
      // Transform the data to match expected format
      const transformedUsers: User[] = cachedUsers.map((user: any, index: number) => ({
        uid: user.uid || user.id || `temp-${index}-${Math.random().toString(36).substring(2, 15)}`,
        name: user.name || user.full_name || 'Unnamed User',
        email: user.email || 'No Email',
        role_id: user.role_id || user.role?.id || '',
        created_at: user.created_at || user.date_joined || new Date().toISOString(),
        role: user.role || (user.role_name ? { id: user.role_id, name: user.role_name } : undefined)
      }));

      setUsers(transformedUsers);
      setIsLoading(false);
      return;
    }

    // If not cached, fetch and cache
    if (!session?.access_token) {
      console.error('No authentication token available');
      toast.error('Authentication required to fetch users');
      setIsLoading(false);
      return;
    }

    try {
      const usersData = await fetchAndCacheUsers(session.access_token, 'bibhab-thepyro-ai');
      
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
      
      // Fallback to Supabase if renderer API fails (only if tenantId is available)
      if (tenantId) {
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
            .eq('tenant_id', tenantId)
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
        console.log('No tenantId available for Supabase fallback');
        setUsers([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [session?.access_token]); // Removed tenantId dependency - only fetch when session changes

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
      
      // Fallback to Supabase if renderer API fails (only if tenantId is available)
      if (tenantId) {
        try {
          const { data, error: supabaseError } = await supabase
            .from('roles')
            .insert([{ name: newRoleName, tenant_id: tenantId }])
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
            .eq('tenant_id', tenantId);
          setRoles(updated.data || []);
        } catch (fallbackError: any) {
          console.error('Fallback error:', fallbackError);
          toast.error(`Failed to add role: ${fallbackError.message}`);
        }
      }
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !selectedRoleId) {
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add User Form */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <h3 className="font-medium">Add New User</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Users List */}
        <div className="space-y-4">
          <h3 className="font-medium">Users</h3>
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
      </CardContent>
    </Card>
  );
};

export default AddUserComponent;