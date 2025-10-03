import React, { useEffect, useState } from 'react';
import { apiService } from '@/lib/apiService';
import { EditableDataTable } from '@/components/ui/EditableDataTable';

interface TableComponentProps {
  tableId?: string;
}

export const TableComponent: React.FC<TableComponentProps> = ({ tableId }) => {
  const [columns, setColumns] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tableId) return;
    setLoading(true);
    Promise.all([
      apiService.getCustomColumns(tableId),
      apiService.getCustomRows(tableId)
    ]).then(([colRes, rowRes]) => {
      console.log("columns Krover",colRes.data);
      setColumns(colRes.success ? colRes.data || [] : []);
      setRows(rowRes.success ? rowRes.data || [] : []);
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
    <EditableDataTable
      columns={columns}
      rows={rows.map(row => ({ id: row.id, data: row.data }))}
      onRowEdit={() => {}}
      onRowDelete={() => {}}
      onRowAdd={() => {}}
    />
  );
}; 