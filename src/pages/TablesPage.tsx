import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/lib/apiService';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TablesPage = () => {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tables, setTables] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch tenant_id for current user
  useEffect(() => {
    const fetchTenant = async () => {
      if (!user) return;
      const response = await apiService.getTenantUser(user.id);
      if (!response.success) {
        setError('Could not fetch tenant.');
        setTenantId(null);
      } else {
        setTenantId(response.data?.tenant_id || null);
      }
    };
    fetchTenant();
  }, [user]);

  // Fetch tables for tenant
  useEffect(() => {
    const fetchTables = async () => {
      if (!tenantId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.getCustomTables(tenantId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to load tables');
        }
        setTables(response.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load tables.');
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, [tenantId]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      if (!newTableName.trim()) {
        setCreateError('Table name is required.');
        setCreating(false);
        return;
      }
      const response = await apiService.createCustomTable(newTableName.trim(), tenantId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create table');
      }
      setShowCreate(false);
      setNewTableName('');
      // Refresh tables
      const refreshResponse = await apiService.getCustomTables(tenantId);
      if (refreshResponse.success) {
        setTables(refreshResponse.data || []);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create table.');
    } finally {
      setCreating(false);
    }
  };

  const handleRowClick = (tableId: string) => {
    navigate(`/tables/${tableId}`);
  };

  return (
    <DashboardLayout>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Your Tables</h1>
          <Button onClick={() => setShowCreate(true)}>+ New Table</Button>
        </div>
        {loading && <div>Loading tables...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && tables.length === 0 && (
          <div className="mb-4">
            <div>No tables found.</div>
            <Button className="mt-2" onClick={() => setShowCreate(true)}>Create your first table</Button>
          </div>
        )}
        {!loading && !error && tables.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-[300px] w-full border rounded bg-background">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="py-2 px-4">Table Name</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/50 transition"
                    onClick={() => handleRowClick(t.id)}
                  >
                    <td className="py-2 px-4 font-medium">{t.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {showCreate && (
          <div className="mt-8 p-4 border rounded bg-muted">
            <h2 className="text-lg font-semibold mb-2">Create New Table</h2>
            <form onSubmit={handleCreateTable} className="space-y-2">
              <div>
                <label className="block mb-1">Table Name</label>
                <input
                  className="border px-2 py-1 rounded w-full"
                  value={newTableName}
                  onChange={e => setNewTableName(e.target.value)}
                  required
                  disabled={creating}
                />
              </div>
              {createError && <div className="text-red-600 text-sm">{createError}</div>}
              <div className="flex gap-2 mt-2">
                <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Table'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TablesPage; 