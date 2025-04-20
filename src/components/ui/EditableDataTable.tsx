import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, Save, Plus, Search, X } from 'lucide-react';

export interface EditableDataTableColumn {
  id: string;
  name: string;
  type: string;
}

export interface EditableDataTableRow {
  id: string;
  data: Record<string, any>;
}

export interface EditableDataTableProps {
  columns: EditableDataTableColumn[];
  rows: EditableDataTableRow[];
  onRowEdit: (rowId: string, data: Record<string, any>) => void;
  onRowDelete: (rowId: string) => void;
  onRowAdd: (data: Record<string, any>) => void;
}

export const EditableDataTable: React.FC<EditableDataTableProps> = ({ columns, rows, onRowEdit, onRowDelete, onRowAdd }) => {
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<Record<string, any>>({});
  const [addRowData, setAddRowData] = useState<Record<string, any>>({});
  const [showAddRow, setShowAddRow] = useState(false);
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const startEdit = (row: EditableDataTableRow) => {
    setEditRowId(row.id);
    setEditRowData(row.data);
  };

  const saveEdit = () => {
    if (editRowId) {
      onRowEdit(editRowId, editRowData);
      setEditRowId(null);
      setEditRowData({});
      toast.success('Row updated');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    onRowAdd(addRowData);
    setAddRowData({});
    setShowAddRow(false);
    toast.success('Row added');
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  let filteredRows = rows;
  if (filter.trim()) {
    filteredRows = rows.filter(row =>
      columns.some(col => String(row.data[col.name] ?? '').toLowerCase().includes(filter.toLowerCase()))
    );
  }
  if (sortCol) {
    filteredRows = [...filteredRows].sort((a, b) => {
      const av = a.data[sortCol];
      const bv = b.data[sortCol];
      if (av === bv) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      if (sortAsc) return String(av).localeCompare(String(bv));
      return String(bv).localeCompare(String(av));
    });
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-end gap-2 mb-2">
        <div className="relative">
          <Input
            placeholder="Filter rows..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm max-w-[180px] bg-muted border-none focus:ring-2 focus:ring-primary rounded-md shadow-sm"
          />
          <Search size={16} className="absolute left-2 top-2.5 text-muted-foreground pointer-events-none" />
          {filter && (
            <button
              type="button"
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setFilter('')}
              tabIndex={-1}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 py-0 rounded-md text-xs font-medium"
          onClick={() => setShowAddRow(true)}
        >
          <Plus size={16} className="mr-1" /> Add Row
        </Button>
      </div>
      <form onSubmit={handleAdd}>
        <table className="min-w-[400px] w-full rounded-xl shadow-sm bg-background">
          <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-muted">
            <tr>
              {columns.map(col => (
                <th
                  key={col.id}
                  className="py-2 px-3 font-medium text-xs text-muted-foreground cursor-pointer select-none whitespace-nowrap tracking-wide"
                  onClick={() => handleSort(col.name)}
                >
                  {col.name}
                  {sortCol === col.name && (sortAsc ? ' ▲' : ' ▼')}
                </th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {/* Add Row (only if showAddRow) */}
            {showAddRow && (
              <tr className="bg-muted/40 hover:bg-muted/50 transition animate-fade-in">
                {columns.map(col => (
                  <td key={col.id} className="py-1.5 px-3">
                    <Input
                      value={addRowData[col.name] || ''}
                      onChange={e => setAddRowData({ ...addRowData, [col.name]: e.target.value })}
                      className="bg-background border-none focus:ring-2 focus:ring-primary rounded-md text-sm px-2 py-1"
                      autoFocus={col === columns[0]}
                    />
                  </td>
                ))}
                <td className="flex gap-1 items-center justify-center py-1.5 px-2">
                  <Button size="icon" type="submit" className="bg-primary text-white rounded-full shadow-sm hover:bg-primary/90 focus:ring-2 focus:ring-primary" aria-label="Add row">
                    <Save size={16} />
                  </Button>
                  <Button size="icon" type="button" variant="ghost" onClick={() => { setShowAddRow(false); setAddRowData({}); }} aria-label="Cancel add row">
                    <X size={16} />
                  </Button>
                </td>
              </tr>
            )}
            {/* Data Rows */}
            {filteredRows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="py-6 text-center text-muted-foreground">No data in this table.</td></tr>
            ) : (
              filteredRows.map((row, i) => (
                <tr key={row.id} className={`transition ${i % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-muted/60`}>
                  {columns.map(col => (
                    <td key={col.id} className="py-1.5 px-3 align-middle">
                      {editRowId === row.id ? (
                        <Input
                          value={editRowData[col.name] || ''}
                          onChange={e => setEditRowData({ ...editRowData, [col.name]: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); }}
                          className="bg-background border-none focus:ring-2 focus:ring-primary rounded-md text-sm px-2 py-1"
                          autoFocus
                        />
                      ) : (
                        <span onClick={() => startEdit(row)} className="cursor-pointer hover:underline text-[15px]">
                          {String(row.data[col.name] ?? '')}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="text-center">
                    {editRowId === row.id ? (
                      <Button size="icon" type="button" onClick={saveEdit} className="bg-primary text-white rounded-full shadow-sm hover:bg-primary/90 focus:ring-2 focus:ring-primary" aria-label="Save row">
                        <Save size={16} />
                      </Button>
                    ) : (
                      <Button size="icon" type="button" variant="ghost" onClick={() => setDeleteRowId(row.id)} aria-label="Delete row">
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </form>
      <Dialog open={!!deleteRowId} onOpenChange={open => !open && setDeleteRowId(null)}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Delete row?</DialogTitle>
          </DialogHeader>
          <div className="text-muted-foreground">Are you sure you want to delete this row? This cannot be undone.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRowId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteRowId) { onRowDelete(deleteRowId); setDeleteRowId(null); toast.success('Row deleted'); } }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 