import React, { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLUMN_TYPES = [
  { label: 'Text', value: 'text' },
  { label: 'Integer', value: 'integer' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Timestamp', value: 'timestamptz' },
  { label: 'Date', value: 'date' },
  { label: 'UUID', value: 'uuid' },
  { label: 'JSON', value: 'jsonb' },
];

function SortableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };
  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </tr>
  );
}

export interface EditableTableColumn {
  id: string;
  name: string;
  type: string;
}

export interface EditableTableProps {
  columns: EditableTableColumn[];
  onColumnEdit: (col: EditableTableColumn) => void;
  onColumnDelete: (colId: string) => void;
  onColumnReorder: (newOrder: EditableTableColumn[]) => void;
}

export const EditableTable: React.FC<EditableTableProps> = ({ columns, onColumnEdit, onColumnDelete, onColumnReorder }) => {
  const [editCol, setEditCol] = useState<EditableTableColumn | null>(null);
  const [deleteColId, setDeleteColId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('text');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = columns.findIndex(c => c.id === active.id);
      const newIndex = columns.findIndex(c => c.id === over.id);
      const newOrder = arrayMove(columns, oldIndex, newIndex);
      onColumnReorder(newOrder);
    }
  };

  const startEdit = (col: EditableTableColumn) => {
    setEditCol(col);
    setEditName(col.name);
    setEditType(col.type);
  };

  const saveEdit = () => {
    if (editCol) {
      onColumnEdit({ ...editCol, name: editName, type: editType });
      setEditCol(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <table className="min-w-[400px] w-full border rounded bg-background mb-2">
            <thead>
              <tr className="bg-muted text-left">
                <th className="py-2 px-4">Name</th>
                <th className="py-2 px-4">Type</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => (
                <SortableColumn key={col.id} id={col.id}>
                  {editCol && editCol.id === col.id ? (
                    <>
                      <td className="py-2 px-4">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} />
                      </td>
                      <td className="py-2 px-4">
                        <Select value={editType} onValueChange={setEditType}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-4 flex gap-2">
                        <Button size="sm" onClick={saveEdit}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditCol(null)}>Cancel</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-4 font-medium flex items-center gap-2">
                        <span className="cursor-pointer hover:underline" onClick={() => startEdit(col)}>{col.name}</span>
                      </td>
                      <td className="py-2 px-4">
                        <Badge variant="secondary">{col.type}</Badge>
                      </td>
                      <td className="py-2 px-4 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(col)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteColId(col.id)}>Delete</Button>
                      </td>
                    </>
                  )}
                </SortableColumn>
              ))}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>
      <Dialog open={!!deleteColId} onOpenChange={open => !open && setDeleteColId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete column?</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this column? This cannot be undone.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteColId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteColId) { onColumnDelete(deleteColId); setDeleteColId(null); } }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 