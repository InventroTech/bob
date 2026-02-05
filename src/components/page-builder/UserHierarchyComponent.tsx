import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CustomButton } from '@/components/ui/CustomButton';
import {
  membershipService,
  type HierarchyUser,
  type HierarchyAssignment,
} from '@/lib/api';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  ReactFlowProvider,
  Panel,
  Handle,
  Position,
  type Connection,
  type EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface UserHierarchyComponentConfig {
  title?: string;
  showDiagram?: boolean;
}

interface UserHierarchyComponentProps {
  config?: UserHierarchyComponentConfig;
  pageId?: string;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 64;
const LEVEL_GAP = 100;
const SIBLING_GAP = 40;

const HIERARCHY_NODE_TYPE = 'hierarchyNode';

/** Custom node: name + role, with target handle (top) and source handle (bottom) for connect/disconnect */
function HierarchyNode({ data }: NodeProps<{ name: string; email: string; roleName: string }>) {
  return (
    <div className="px-3 py-2 rounded-lg border-2 border-gray-300 bg-white shadow-sm min-w-[180px] min-h-[52px] flex flex-col justify-center">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-500" />
      <div className="text-sm font-medium text-gray-900 truncate max-w-[168px]" title={data.email}>
        {data.name}
      </div>
      <div className="text-xs text-gray-600 truncate max-w-[168px]">
        {data.roleName || '—'}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-gray-500" />
    </div>
  );
}

function buildTreeLayout(users: HierarchyUser[]): { nodes: Node[]; edges: Edge[] } {
  const children = new Map<number, HierarchyUser[]>();
  for (const u of users) {
    const pid = u.user_parent_id;
    if (pid == null) continue;
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid)!.push(u);
  }
  const roots = users.filter((u) => u.user_parent_id == null);

  const edges: Edge[] = [];
  for (const u of users) {
    if (u.user_parent_id != null) {
      edges.push({
        id: `e-${u.user_parent_id}-${u.membershipId}`,
        source: String(u.user_parent_id),
        target: String(u.membershipId),
        deletable: true,
      });
    }
  }

  const nodes: Node[] = [];
  const nodePositions = new Map<string, { x: number; y: number }>();

  function getSubtreeWidth(mid: number): number {
    const kids = children.get(mid) || [];
    if (kids.length === 0) return 1;
    return kids.reduce((sum, c) => sum + getSubtreeWidth(c.membershipId), 0);
  }

  function layout(node: HierarchyUser, xOffset: number, level: number): number {
    const id = String(node.membershipId);
    const kids = children.get(node.membershipId) || [];
    const subtreeWidth = kids.length === 0 ? 1 : kids.reduce((s, c) => s + getSubtreeWidth(c.membershipId), 0);
    const totalWidth = subtreeWidth * (NODE_WIDTH + SIBLING_GAP);
    const x = xOffset + (totalWidth - (NODE_WIDTH + SIBLING_GAP)) / 2;
    const posY = level * (NODE_HEIGHT + LEVEL_GAP);
    nodePositions.set(id, { x, y: posY });
    let nextX = xOffset;
    for (const c of kids) {
      nextX = layout(c, nextX, level + 1);
    }
    return xOffset + totalWidth;
  }

  let rootX = 0;
  for (const r of roots) {
    layout(r, rootX, 0);
    rootX += getSubtreeWidth(r.membershipId) * (NODE_WIDTH + SIBLING_GAP);
  }

  for (const u of users) {
    const id = String(u.membershipId);
    const pos = nodePositions.get(id) ?? { x: 0, y: 0 };
    nodes.push({
      id,
      type: HIERARCHY_NODE_TYPE,
      position: pos,
      data: {
        name: u.name,
        email: u.email,
        roleName: u.role?.name ?? '—',
      },
    });
  }

  return { nodes, edges };
}

/** Get all membership ids that have `targetId` as ancestor (to detect cycles when connecting) */
function getDescendantIds(targetId: number, parentMap: Record<number, number | null>): Set<number> {
  const descendants = new Set<number>();
  for (const [childIdStr, parentId] of Object.entries(parentMap)) {
    const childId = Number(childIdStr);
    let current: number | null = parentId;
    while (current != null) {
      if (current === targetId) {
        descendants.add(childId);
        break;
      }
      current = parentMap[current] ?? null;
    }
  }
  return descendants;
}

function UserHierarchyInner({ config = {} }: { config?: UserHierarchyComponentConfig }) {
  const { session } = useAuth();
  const [users, setUsers] = useState<HierarchyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [managerOverrides, setManagerOverrides] = useState<Record<number, number | null>>({});

  const title = config.title ?? 'User Hierarchy';
  const showDiagram = config.showDiagram !== false;

  const fetchUsers = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const data = await membershipService.getUsersForHierarchy();
      setUsers(data);
      setManagerOverrides({});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      toast.error(`Failed to load hierarchy: ${message}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    setLoading(true);
    fetchUsers();
  }, [fetchUsers]);

  const getCurrentParent = (u: HierarchyUser): number | null => {
    if (u.membershipId in managerOverrides) return managerOverrides[u.membershipId];
    return u.user_parent_id;
  };

  const nodeTypes = useMemo(() => ({ [HIERARCHY_NODE_TYPE]: HierarchyNode }), []);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const withOverrides = users.map((u) => ({
      ...u,
      user_parent_id: getCurrentParent(u),
    }));
    const layout = buildTreeLayout(withOverrides);
    return { ...layout, edges: layout.edges.map((e) => ({ ...e, deletable: true })) };
  }, [users, managerOverrides]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  /** When user deletes an edge in the diagram, clear that report's manager */
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'remove' && 'id' in change && change.id) {
          const match = String(change.id).match(/^e-(\d+)-(\d+)$/);
          if (match) {
            const targetId = Number(match[2]);
            setManagerOverrides((prev) => ({ ...prev, [targetId]: null }));
          }
        }
      });
      onEdgesChangeBase(changes);
    },
    [onEdgesChangeBase]
  );

  /** When user connects manager (source) -> report (target), set report's parent to manager (with cycle check) */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const sourceId = Number(connection.source);
      const targetId = Number(connection.target);
      if (sourceId === targetId) return;
      const currentParents: Record<number, number | null> = {};
      users.forEach((u) => {
        currentParents[u.membershipId] = getCurrentParent(u);
      });
      const descendantsOfTarget = getDescendantIds(targetId, currentParents);
      if (descendantsOfTarget.has(sourceId)) {
        toast.error('Cannot connect: would create a cycle (manager cannot report to report).');
        return;
      }
      setManagerOverrides((prev) => ({ ...prev, [targetId]: sourceId }));
    },
    [users, managerOverrides]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const assignments: HierarchyAssignment[] = users.map((u) => ({
        membership_id: u.membershipId,
        parent_membership_id: getCurrentParent(u),
      }));
      await membershipService.updateUserHierarchy(assignments);
      toast.success('Hierarchy saved.');
      await fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      toast.error(`Failed to save hierarchy: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    return users.some((u) => getCurrentParent(u) !== u.user_parent_id);
  }, [users, managerOverrides]);

  if (loading) {
    return (
      <div className="p-6">
        <div>Loading user hierarchy...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <CustomButton
          className="bg-black text-white hover:bg-gray-800 hover:text-white"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? 'Saving...' : 'Save'}
        </CustomButton>
      </div>
      <p className="text-sm text-muted-foreground">
        Set who reports to whom. Changes affect team metrics
      </p>

      {showDiagram && (
        <Card>
          <CardHeader>
            {/* <CardTitle className="text-base">Visualization</CardTitle> */}
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full rounded-lg border border-gray-300 bg-gray-100">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                minZoom={0.2}
                maxZoom={1.5}
                connectionMode="loose"
                nodesConnectable
                elementsSelectable
              >
                <Background />
                <Controls />
                <MiniMap />
                <Panel position="top-center" className="text-xs text-muted-foreground text-center max-w-md">
                  Drag from bottom of manager to top of report to assign. Select an edge and press Delete to remove.
                </Panel>
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const UserHierarchyComponent: React.FC<UserHierarchyComponentProps> = ({
  config = {},
  pageId: _pageId,
}) => {
  return (
    <ReactFlowProvider>
      <UserHierarchyInner config={config} />
    </ReactFlowProvider>
  );
};

export default UserHierarchyComponent;
