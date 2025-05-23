import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Database } from '@/types/supabase';

const InviteUsersPage: React.FC = () => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'app_user' | 'editor' | 'builder'>('app_user');
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<Database['public']['Tables']['tenant_users']['Row'][]>([]);

  const fetchTeam = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from('tenant_users')
      .select('tenant_id, user_id, role, created_at')
      .eq('tenant_id', tenantId);
    if (!error && data) setTeam(data);
  };

  const handleInvite = async () => {
    if (!email) {
      toast.error('Email is required');
      return;
    }
    setLoading(true);
    const { error } = await supabase.functions.invoke('invite_user', {
      body: { email, tenantId, role },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Invitation sent');
      setEmail('');
      fetchTeam();
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, [tenantId]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Team & Invites</h1>
        <div className="flex items-center gap-4">
          <Input
            placeholder="User Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value="app_user">App User</option>
            <option value="editor">Editor</option>
            <option value="builder">Builder</option>
          </select>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? 'Sending...' : 'Invite'}
          </Button>
        </div>
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Team Members</h2>
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">User ID</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Invited At</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {team.map((u) => (
                <tr key={u.user_id} className="border-t">
                  <td className="p-2 font-mono text-sm">{u.user_id}</td>
                  <td className="p-2 capitalize">{u.role}</td>
                  <td className="p-2 text-sm text-gray-600">{new Date(u.created_at).toLocaleString()}</td>
                  <td className="p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await supabase.from('tenant_users').delete().eq('user_id', u.user_id).eq('tenant_id', tenantId);
                        fetchTeam();
                      }}
                    >Remove</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InviteUsersPage; 