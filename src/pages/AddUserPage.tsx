// src/pages/AddUserPage.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Your Supabase client
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
  const { user: adminUser } = useAuth(); // The currently logged-in admin
  const [companyId, setCompanyId] = useState<string | null>(null); // This is your tenant_id
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  // Add password to formData state
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  // Fetch tenant (company) ID - (Assuming this logic is correct for your setup)
  useEffect(() => {
    const fetchTenant = async () => {
      if (!adminUser) return;
      // This logic to get companyId might need to be adapted based on your actual tenant setup
      // For example, if tenantId is stored in adminUser's profile or app_metadata
      const { data, error } = await supabase
        .from('tenant_users') // Assuming admin is in tenant_users table
        .select('tenant_id')
        .eq('user_id', adminUser.id) // Use adminUser.id
        .single();
      if (error || !data) {
        console.error("Error fetching admin's tenant or admin not in tenant_users:", error);
        toast.error('Could not determine your tenant ID.');
        return;
      }
      setCompanyId(data.tenant_id);
    };
    fetchTenant();
  }, [adminUser]);

  // Fetch roles based on companyId (tenant_id)
  useEffect(() => {
    const fetchRoles = async () => {
      if (!companyId) return;
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('tenant_id', companyId);
      if (error) {
        toast.error('Failed to fetch roles');
      } else {
        setRoles(data || []);
      }
    };
    fetchRoles();
  }, [companyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddUser = async () => {
    setLoading(true);
    if (!formData.name || !formData.email || !formData.password || !selectedRoleId || !companyId) {
      toast.error('Name, Email, Password, Role, and Company ID are required');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        setLoading(false);
        return;
    }

    try {
      console.log("Sending to Edge Function:", {
        email: formData.email,
        password: formData.password, // Will be sent to Edge Function
        name: formData.name,
        tenant_id: companyId,
        role_id: selectedRoleId,
      });

      // Call your Supabase Edge Function
      const { data: functionResponse, error: functionError } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          tenant_id: companyId,
          role_id: selectedRoleId,
        },
      });

      if (functionError) {
        throw new Error(`Edge Function error: ${functionError.message}`);
      }

      // The Edge Function itself might return an error in its body if something went wrong server-side
      if (functionResponse && functionResponse.error) {
        throw new Error(`Server-side error: ${functionResponse.error}`);
      }

      toast.success('User added successfully!');
      setFormData({ name: '', email: '', password: '' }); // Clear form
      setSelectedRoleId('');
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(`Error adding user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Add New User</h1>

        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" placeholder="Enter full name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="user@example.com" value={formData.email} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Initial Password</Label>
          <Input id="password" name="password" type="password" placeholder="Min. 6 characters" value={formData.password} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Select Role</Label>
          <select
            id="role"
            className="w-full border rounded px-3 py-2 bg-background text-foreground" // Added bg and text for theme
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            required
          >
            <option value="">-- Select Role --</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        {/* Removed "Add New Role" section for simplicity, assuming roles are pre-defined */}

        <Button className="w-full" onClick={handleAddUser} disabled={loading || !companyId}>
          {loading ? 'Adding User...' : (companyId ? 'Add User' : 'Loading tenant info...')}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default AddUserPage;