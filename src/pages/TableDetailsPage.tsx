import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/lib/apiService';
import { Button } from '@/components/ui/button';
import { EditableTable, EditableTableColumn } from '@/components/ui/EditableTable';
import { EditableDataTable } from '@/components/ui/EditableDataTable';

const COLUMN_TYPES = [
  { label: 'Text', value: 'text' },
  { label: 'Integer', value: 'integer' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Timestamp', value: 'timestamptz' },
  { label: 'Date', value: 'date' },
  { label: 'UUID', value: 'uuid' },
  { label: 'JSON', value: 'jsonb' },
];

const TableDetailsPage = () => {
  const { tableName: tableId } = useParams<{ tableName: string }>();
  const { user } = useAuth();
  const [columns, setColumns] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colAdd, setColAdd] = useState<{ name: string; type: string }>({ name: '', type: 'text' });
  const [colActionError, setColActionError] = useState<string | null>(null);
  const [colActionLoading, setColActionLoading] = useState(false);
  const [colEdit, setColEdit] = useState<any | null>(null);
  const [addRowData, setAddRowData] = useState<any>({});
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<any>({});
  const [rowActionLoading, setRowActionLoading] = useState(false);
  const [rowActionError, setRowActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'data' | 'schema'>('data');

  // Fetch columns and rows
  useEffect(() => {
    const fetchAll = async () => {
      if (!tableId) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch columns
        const colsResponse = await apiService.getCustomColumns(tableId);
        if (!colsResponse.success) {
          throw new Error(colsResponse.error || 'Failed to fetch columns');
        }
        setColumns(colsResponse.data || []);
        
        // Fetch rows
        const rowsResponse = await apiService.getCustomRows(tableId);
        if (!rowsResponse.success) {
          throw new Error(rowsResponse.error || 'Failed to fetch rows');
        }
        setRows(rowsResponse.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load table data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [tableId]);

  // --- Column Actions ---
  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    setColActionError(null);
    setColActionLoading(true);
    try {
      if (!colAdd.name.trim()) throw new Error('Column name required');
      const response = await apiService.createCustomColumn(tableId!, {
        name: colAdd.name.trim(),
        type: colAdd.type,
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to add column');
      }
      
      setColAdd({ name: '', type: 'text' });
      
      // Refetch columns
      const colsResponse = await apiService.getCustomColumns(tableId!);
      if (colsResponse.success) {
        setColumns(colsResponse.data || []);
      }
    } catch (err: any) {
      setColActionError(err.message || 'Failed to add column.');
    } finally {
      setColActionLoading(false);
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    setColActionError(null);
    setColActionLoading(true);
    try {
      const response = await apiService.deleteCustomColumn(colId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete column');
      }
      
      // Refetch columns
      const colsResponse = await apiService.getCustomColumns(tableId!);
      if (colsResponse.success) {
        setColumns(colsResponse.data || []);
      }
    } catch (err: any) {
      setColActionError(err.message || 'Failed to delete column.');
    } finally {
      setColActionLoading(false);
    }
  };

  const handleEditColumn = (col: any) => {
    setColEdit(col);
  };

  const handleSaveEditColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colEdit) return;
    setColActionError(null);
    setColActionLoading(true);
    try {
      const response = await apiService.updateCustomColumn(colEdit.id, {
        name: colEdit.name,
        type: colEdit.type,
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update column');
      }
      
      setColEdit(null);
      
      // Refetch columns
      const colsResponse = await apiService.getCustomColumns(tableId!);
      if (colsResponse.success) {
        setColumns(colsResponse.data || []);
      }
    } catch (err: any) {
      setColActionError(err.message || 'Failed to update column.');
    } finally {
      setColActionLoading(false);
    }
  };

  // --- Row Actions ---
  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    setRowActionError(null);
    setRowActionLoading(true);
    try {
      const response = await apiService.createCustomRow(tableId!, addRowData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to add row');
      }
      
      setAddRowData({});
      
      // Refetch rows
      const rowsResponse = await apiService.getCustomRows(tableId!);
      if (rowsResponse.success) {
        setRows(rowsResponse.data || []);
      }
    } catch (err: any) {
      setRowActionError(err.message || 'Failed to add row.');
    } finally {
      setRowActionLoading(false);
    }
  };

  const handleStartEditRow = (rowId: string, rowData: any) => {
    setEditRowId(rowId);
    setEditRowData(rowData);
  };

  const handleEditCell = (colName: string, value: any) => {
    setEditRowData({ ...editRowData, [colName]: value });
  };

  const handleSaveEditRow = async () => {
    if (!editRowId) return;
    setRowActionError(null);
    setRowActionLoading(true);
    try {
      const response = await apiService.updateCustomRow(editRowId, editRowData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update row');
      }
      
      setEditRowId(null);
      setEditRowData({});
      
      // Refetch rows
      const rowsResponse = await apiService.getCustomRows(tableId!);
      if (rowsResponse.success) {
        setRows(rowsResponse.data || []);
      }
    } catch (err: any) {
      setRowActionError(err.message || 'Failed to update row.');
    } finally {
      setRowActionLoading(false);
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    setRowActionError(null);
    setRowActionLoading(true);
    try {
      const response = await apiService.deleteCustomRow(rowId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete row');
      }
      
      // Refetch rows
      const rowsResponse = await apiService.getCustomRows(tableId!);
      if (rowsResponse.success) {
        setRows(rowsResponse.data || []);
      }
    } catch (err: any) {
      setRowActionError(err.message || 'Failed to delete row.');
    } finally {
      setRowActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">Table Details</h1>
        <div className="mb-6 flex gap-2 border-b pb-2">
          <button
            className={`px-4 py-2 rounded-t-md font-semibold ${activeTab === 'data' ? 'bg-background border border-b-0' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setActiveTab('data')}
          >
            Data
          </button>
          <button
            className={`px-4 py-2 rounded-t-md font-semibold ${activeTab === 'schema' ? 'bg-background border border-b-0' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setActiveTab('schema')}
          >
            Schema
          </button>
        </div>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {activeTab === 'schema' && !loading && !error && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Columns</h2>
            <EditableTable
              columns={columns}
              onColumnEdit={async (col) => {
                const response = await apiService.updateCustomColumn(col.id, {
                  name: col.name,
                  type: col.type,
                });
                if (response.success) {
                  const colsResponse = await apiService.getCustomColumns(tableId!);
                  if (colsResponse.success) {
                    setColumns(colsResponse.data || []);
                  }
                }
              }}
              onColumnDelete={async (colId) => {
                const response = await apiService.deleteCustomColumn(colId);
                if (response.success) {
                  const colsResponse = await apiService.getCustomColumns(tableId!);
                  if (colsResponse.success) {
                    setColumns(colsResponse.data || []);
                  }
                }
              }}
              onColumnReorder={async (newOrder) => {
                const columnIds = newOrder.map(col => col.id);
                const response = await apiService.reorderCustomColumns(columnIds);
                if (response.success) {
                  setColumns(newOrder);
                }
              }}
            />
            <form onSubmit={handleAddColumn} className="flex gap-2 items-end mt-2 bg-muted/30 p-4 rounded-lg shadow-sm">
              <div>
                <label className="block text-xs mb-1 font-semibold">Name</label>
                <input
                  className="border px-2 py-1 rounded"
                  value={colAdd.name}
                  onChange={e => setColAdd({ ...colAdd, name: e.target.value })}
                  disabled={colActionLoading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs mb-1 font-semibold">Type</label>
                <select
                  className="border px-2 py-1 rounded"
                  value={colAdd.type}
                  onChange={e => setColAdd({ ...colAdd, type: e.target.value })}
                  disabled={colActionLoading}
                >
                  {COLUMN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <Button type="submit" disabled={colActionLoading}>Add Column</Button>
            </form>
            {colActionError && <div className="text-red-600 text-sm mt-2">{colActionError}</div>}
          </div>
        )}
        {activeTab === 'data' && !loading && !error && columns.length > 0 && (
          <EditableDataTable
            columns={columns}
            rows={rows.map(row => ({ id: row.id, data: row.data }))}
            onRowEdit={async (rowId, data) => {
              const response = await apiService.updateCustomRow(rowId, data);
              if (response.success) {
                const rowsResponse = await apiService.getCustomRows(tableId!);
                if (rowsResponse.success) {
                  setRows(rowsResponse.data || []);
                }
              }
            }}
            onRowDelete={async (rowId) => {
              const response = await apiService.deleteCustomRow(rowId);
              if (response.success) {
                const rowsResponse = await apiService.getCustomRows(tableId!);
                if (rowsResponse.success) {
                  setRows(rowsResponse.data || []);
                }
              }
            }}
            onRowAdd={async (data) => {
              const response = await apiService.createCustomRow(tableId!, data);
              if (response.success) {
                const rowsResponse = await apiService.getCustomRows(tableId!);
                if (rowsResponse.success) {
                  setRows(rowsResponse.data || []);
                }
              }
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default TableDetailsPage; 