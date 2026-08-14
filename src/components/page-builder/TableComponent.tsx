import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { EditableDataTable } from '@/components/ui/EditableDataTable';

// ADDED: Include config in the props interface so it can receive the title from the builder
interface TableComponentProps {
  tableId?: string;
  config?: {
    title?: string;
    [key: string]: any;
  };
}

export const TableComponent: React.FC<TableComponentProps> = ({ tableId, config }) => {
  const [columns, setColumns] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tableId) return;
    setLoading(true);
    Promise.all([
      supabase.from('custom_columns').select('*').eq('table_id', tableId).order('ordinal_position', { ascending: true }),
      supabase.from('custom_rows').select('*').eq('table_id', tableId).order('created_at', { ascending: true })
    ]).then(([colRes, rowRes]) => {
      console.log("columns Krover", colRes.data);
      setColumns(colRes.data || []);
      setRows(rowRes.data || []);
      setLoading(false);
    });
  }, [tableId]);

  if (!tableId) {
    return <div className="border border-dashed border-yellow-400 p-4 text-yellow-600 text-sm">Select a collection to show its table.</div>;
  }
  
  if (loading) {
    return <div className="p-4 text-muted-foreground text-sm">Loading table...</div>;
  }
  
  return (
    <div className="w-full flex flex-col gap-4">
      {/* ADDED: Dynamic Title from Configuration Panel */}
      {config?.title && (
        <div className="px-1">
          <h2 className="text-xl font-bold text-gray-900">
            {config.title}
          </h2>
        </div>
      )}
      
      <EditableDataTable
        columns={columns}
        rows={rows.map(row => ({ id: row.id, data: row.data }))}
        onRowEdit={() => {}}
        onRowDelete={() => {}}
        onRowAdd={() => {}}
      />
    </div>
  );
};