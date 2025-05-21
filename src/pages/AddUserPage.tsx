import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Role {
  id: string;
  name: string;
}

const AddUserPage = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '' });

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

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      if (!companyId) return;

      let { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('tenant_id', companyId);

      if (error) {
        if (error.message?.includes('tenant_id') || error.message?.includes('column')) {
          const response = await supabase.from('roles').select('id, name');
          data = response.data;
          error = response.error;
        }

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

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Add new role
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
      // refresh role list
      const updated = await supabase
        .from('roles')
        .select('id, name')
        .eq('tenant_id', companyId);
      setRoles(updated.data || []);
    }
  };

  // Add new user (this now targets the "users" table)
  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !selectedRoleId || !companyId) {
      toast.error('All fields are required');
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('create_user_with_auth', {
          p_name: formData.name,
          p_email: formData.email,
          p_tenant_id: companyId,
          p_role_id: selectedRoleId
        });

      if (error) {
        console.error("Error creating user:", error);
        toast.error(`Error creating user: ${error.message}`);
        return;
      }

      if (!data.success) {
        toast.error(`Error creating user: ${data.error}`);
        return;
      }

      // Show success message with temporary password
      toast.success(
        <div>
          <p>User added successfully!</p>
          <p>Temporary password: {data.user.temp_password}</p>
          <p>Please share this password with the user.</p>
        </div>
      );

      setFormData({ name: '', email: '' });
      setSelectedRoleId('');
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error(`Unexpected error: ${error.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-xl mx-auto space-y-6">
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
    </DashboardLayout>
  );
};

export default AddUserPage;
