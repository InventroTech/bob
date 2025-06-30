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
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isLoading, setIsLoading] = useState(true);

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
      if (!companyId) return;

      let { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('tenant_id', companyId);

      if (error) {
        const response = await supabase.from('roles').select('id, name');
        data = response.data;
        error = response.error;

        if (error) {
          console.error('Error fetching roles:', error);
          toast.error('Failed to fetch roles');
          return;
        }
      }

      setRoles(data || []);
    };

    fetchRoles();
  }, [companyId]);

  const fetchUsers = async () => {
    if (!companyId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      // Filter out null uids and transform the data
      const transformedUsers: User[] = ((data as unknown) as DatabaseUser[])
        .filter(user => user.uid !== null && user.uid !== undefined)
        .map((user, index) => ({
          uid: user.uid || `temp-${index}-${Math.random().toString(36).substring(2, 15)}`,
          name: user.name || 'Unnamed User',
          email: user.email || 'No Email',
          role_id: user.role_id || '',
          created_at: user.created_at || new Date().toISOString(),
          role: user.roles || undefined
        }));

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
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
    if (!newRoleName) return toast.error('Role name is required');
    if (!companyId) return toast.error('Company ID not found');

    const { data, error } = await supabase
      .from('roles')
      .insert([{ name: newRoleName, tenant_id: companyId }])
      .select()
      .single();

    if (error) {
      console.error('Error adding role:', error);
      toast.error(`Error adding role: ${error.message}`);
    } else {
      toast.success('Role added');
      setNewRoleName('');
      setSelectedRoleId(data.id);
      const updated = await supabase
        .from('roles')
        .select('id, name')
        .eq('tenant_id', companyId);
      setRoles(updated.data || []);
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !selectedRoleId || !companyId) {
      toast.error('All fields are required');
      return;
    }
    try {
      // create a new user
      const { data, error } = await supabase.from('users').insert([{ 
        name: formData.name, 
        email: formData.email, 
        role_id: selectedRoleId, 
        tenant_id: companyId 
      }]).select().single();
      toast.success('User added successfully! They will be able to log in once they set up their account.');

    setFormData({ name: '', email: '' });
    setSelectedRoleId('');

    try {
      const { data: updatedData, error: fetchError } = await supabase
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

      if (fetchError) throw fetchError;

      const transformedUsers: User[] = ((updatedData as unknown) as DatabaseUser[]).map(user => ({
        uid: user.uid || Math.random().toString(36).substring(2, 15),
        name: user.name || 'Unnamed User',
        email: user.email || 'No Email',
        role_id: user.role_id || '',
        created_at: user.created_at || new Date().toISOString(),
        role: user.roles || undefined
      }))
      console.log("transformedUsers", transformedUsers);
      setUsers(transformedUsers);
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error(`Unexpected error: ${error.message}`);
    }
  } catch (error: any) {
    console.error("Unexpected error:", error);
    toast.error(`Unexpected error: ${error.message}`);
  }
  }

  const handleDeleteUser = async (email: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${import.meta.env.API_URI}/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          email
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete user');
      }

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

          <div className="space-y-2">
            <Label htmlFor="newRole">Add New Role</Label>
            <div className="flex items-center gap-2">
              <Input
                id="newRole"
                placeholder="e.g. Admin"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
              <Button type="button" onClick={handleAddRole}>
                Add Role
              </Button>
            </div>
          </div>

          <Button className="w-full" onClick={handleAddUser}>
            Add User
          </Button>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Users </h2>
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
                    .filter(user => user.uid && user.email) // Only show users with both uid and email
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
