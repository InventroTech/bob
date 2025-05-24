import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role_id: string;
  role: {
    name: string;
  } | null;
}

interface Role {
  id: string;
  name: string;
}

const UsersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Fetch tenant (company) ID
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

  // Fetch roles for the tenant
  useEffect(() => {
    const fetchRoles = async () => {
      if (!companyId) return;

      try {
        const { data, error } = await supabase
          .from('roles')
          .select('id, name')
          .eq('tenant_id', companyId);

        if (error) {
          console.error('Error fetching roles:', error);
          toast.error('Failed to fetch roles');
          return;
        }

        setRoles(data || []);
      } catch (error) {
        console.error('Error:', error);
        toast.error('An unexpected error occurred while fetching roles');
      }
    };

    fetchRoles();
  }, [companyId]);

  // Fetch users for the tenant
  useEffect(() => {
    const fetchUsers = async () => {
      if (!companyId) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            name,
            email,
            created_at,
            role_id,
            role:roles!role_id(name)
          `)
          .eq('tenant_id', companyId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching users:', error);
          toast.error('Failed to fetch users');
          return;
        }

        setUsers(data || []);
      } catch (error) {
        console.error('Error:', error);
        toast.error('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [companyId]);

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role_id: newRoleId })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        toast.error('Failed to update user role');
        return;
      }

      // Update the local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              role_id: newRoleId,
              role: roles.find(r => r.id === newRoleId) || null
            }
          : user
      ));

      toast.success('User role updated successfully');
      setEditingUserId(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred while updating role');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div>Loading users...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Users</h1>
          <Button onClick={() => navigate('/add-user')}>
            Add New User
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUserId === user.id ? (
                      <Select
                        defaultValue={user.role_id}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div 
                        className="text-sm text-gray-500 cursor-pointer hover:text-gray-700"
                        onClick={() => setEditingUserId(user.id)}
                      >
                        {user.role?.name || 'No Role'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(user.created_at)}</div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage; 