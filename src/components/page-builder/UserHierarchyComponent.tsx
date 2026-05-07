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
  ConnectionLineType,
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
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
const NO_MANAGER_VALUE = '__no_manager__';

type HierarchyNodeData = {
  membershipId: number;
  name: string;
  email: string;
  roleName: string;
  isConnecting?: boolean;
  isDropTarget?: boolean;
  managerValue: string;
  managerOptions: Array<{ value: string; label: string; searchText: string }>;
  onManagerSelect: (membershipId: number, managerMembershipId: number | null) => void;
};

/** Custom node: name + role, with target handle (top) and source handle (bottom) for connect/disconnect */
function HierarchyNode({
  data,
}: NodeProps<HierarchyNodeData>) {
  const [managerPickerOpen, setManagerPickerOpen] = useState(false);
  const selectedManagerLabel =
    data.managerOptions.find((opt) => opt.value === data.managerValue)?.label ?? 'Set manager';

  return (
    <div
      className={`group relative px-3 py-2 rounded-lg border-2 bg-white shadow-sm min-w-[180px] min-h-[52px] flex flex-col justify-center transition-colors ${
        data.isDropTarget
          ? 'border-blue-500 ring-2 ring-blue-200'
          : data.isConnecting
            ? 'border-gray-400'
            : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-[132px] !h-3 !rounded-full !border !border-gray-300 !bg-transparent !opacity-0 !-top-[6px] group-hover:!opacity-100 !transition-opacity"
      />
      <div className="text-sm font-medium text-gray-900 truncate max-w-[168px]" title={data.email}>
        {data.name}
      </div>
      <div className="text-[11px] text-gray-500 truncate max-w-[168px]" title={data.email}>
        {data.email}
      </div>
      <div className="text-xs text-gray-600 truncate max-w-[168px]">
        {data.roleName || '—'}
      </div>
      <div className="mt-2">
        <Popover open={managerPickerOpen} onOpenChange={setManagerPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={managerPickerOpen}
              className="h-7 w-full justify-between px-2 text-[11px] font-normal"
            >
              <span className="truncate">{selectedManagerLabel}</span>
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search manager..." className="h-9 text-xs" />
              <CommandList>
                <CommandEmpty>No manager found.</CommandEmpty>
                {data.managerOptions.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.searchText}
                    onSelect={() => {
                      data.onManagerSelect(
                        data.membershipId,
                        opt.value === NO_MANAGER_VALUE ? null : Number(opt.value)
                      );
                      setManagerPickerOpen(false);
                    }}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3 w-3',
                        data.managerValue === opt.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-[132px] !h-3 !rounded-full !border !border-gray-300 !bg-transparent !opacity-0 !-bottom-[6px] group-hover:!opacity-100 !transition-opacity"
      />
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [managerOverrides, setManagerOverrides] = useState<Record<number, number | null>>({});
  const [flowReady, setFlowReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingSourceId, setConnectingSourceId] = useState<number | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const reactFlow = useReactFlow();

  const title = config.title ?? 'User Hierarchy';
  const showDiagram = config.showDiagram !== false;

  const fetchUsers = useCallback(async () => {
    if (!session?.access_token) {
      setUsers([]);
      setLoadError('Session not ready. Please refresh this page.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const data = await membershipService.getUsersForHierarchy();
      setUsers(data);
      setManagerOverrides({});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      toast.error(`Failed to load hierarchy: ${message}`);
      setLoadError(message);
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

  const getCurrentParentsMap = useCallback((): Record<number, number | null> => {
    const currentParents: Record<number, number | null> = {};
    users.forEach((u) => {
      currentParents[u.membershipId] = getCurrentParent(u);
    });
    return currentParents;
  }, [users, managerOverrides]);

  const canAssignManager = useCallback(
    (reportId: number, managerId: number | null): boolean => {
      if (managerId == null) return true;
      if (managerId === reportId) return false;
      const currentParents = getCurrentParentsMap();
      const descendantsOfReport = getDescendantIds(reportId, currentParents);
      return !descendantsOfReport.has(managerId);
    },
    [getCurrentParentsMap]
  );

  const setReportManager = useCallback(
    (reportId: number, managerId: number | null) => {
      if (!canAssignManager(reportId, managerId)) {
        toast.error('Cannot assign manager: this would create a cycle.');
        return;
      }
      setManagerOverrides((prev) => ({ ...prev, [reportId]: managerId }));
    },
    [canAssignManager]
  );

  const nodeTypes = useMemo(() => ({ [HIERARCHY_NODE_TYPE]: HierarchyNode }), []);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const withOverrides = users.map((u) => ({
      ...u,
      user_parent_id: getCurrentParent(u),
    }));
    const layout = buildTreeLayout(withOverrides);
    return {
      nodes: layout.nodes.map((node) => {
        const nodeData = node.data as { name: string; email: string; roleName: string };
        const membershipId = Number(node.id);
        const managerValue = String(
          withOverrides.find((u) => u.membershipId === membershipId)?.user_parent_id ?? NO_MANAGER_VALUE
        );
        const managerOptions = [
          { value: NO_MANAGER_VALUE, label: 'No manager', searchText: 'no manager none unassigned' },
          ...withOverrides
            .filter((candidate) => canAssignManager(membershipId, candidate.membershipId))
            .map((candidate) => ({
              value: String(candidate.membershipId),
              label: candidate.name,
              searchText: `${candidate.name} ${candidate.email}`.toLowerCase(),
            })),
        ];

        const canDropFromCurrentSource =
          connectingSourceId != null
            ? canAssignManager(membershipId, connectingSourceId) && connectingSourceId !== membershipId
            : false;
        const isDropTarget =
          isConnecting && hoveredNodeId === membershipId && canDropFromCurrentSource;

        return {
          ...node,
          data: {
            ...nodeData,
            membershipId,
            managerValue,
            managerOptions,
            isConnecting,
            isDropTarget,
            onManagerSelect: setReportManager,
          } satisfies HierarchyNodeData,
        };
      }),
      edges: layout.edges.map((e) => ({
        ...e,
        deletable: true,
        type: 'default',
        style: { strokeWidth: 2.5 },
      })),
    };
  }, [
    users,
    managerOverrides,
    isConnecting,
    hoveredNodeId,
    connectingSourceId,
    canAssignManager,
    setReportManager,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleFlowInit = useCallback(() => {
    setFlowReady(true);
  }, []);

  useEffect(() => {
    if (!flowReady || nodes.length === 0) return;
    requestAnimationFrame(() => {
      reactFlow.fitView({ padding: 0.2, duration: 250 });
    });
  }, [flowReady, nodes, reactFlow]);

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
      setReportManager(targetId, sourceId);
    },
    [setReportManager]
  );

  const onConnectStart = useCallback((_: unknown, params: { nodeId?: string }) => {
    setIsConnecting(true);
    setConnectingSourceId(params?.nodeId ? Number(params.nodeId) : null);
  }, []);

  const onConnectEnd = useCallback(() => {
    setIsConnecting(false);
    setConnectingSourceId(null);
    setHoveredNodeId(null);
  }, []);

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!isConnecting) return;
      setHoveredNodeId(Number(node.id));
    },
    [isConnecting]
  );

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return false;
      const sourceId = Number(connection.source);
      const targetId = Number(connection.target);
      return canAssignManager(targetId, sourceId);
    },
    [canAssignManager]
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

  const graphHasData = nodes.length > 0;

  if (loading) {
    return (
      <div className="p-6">
        <div>Loading user hierarchy...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-0 flex flex-col">
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
      {loadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Failed to load hierarchy data: {loadError}
        </div>
      )}

      {showDiagram && (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardHeader>
            {/* <CardTitle className="text-base">Org Chart</CardTitle> */}
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-6 pt-0">
            <div className="h-[72vh] max-h-[880px] min-h-[360px] w-full min-w-0 rounded-lg border border-gray-300 bg-muted/30 overflow-hidden">
              <ReactFlow
                className="h-full w-full"
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onInit={handleFlowInit}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                isValidConnection={isValidConnection}
                fitView
                minZoom={0.08}
                maxZoom={1.5}
                connectionLineType={ConnectionLineType.Bezier}
                connectionLineStyle={{ strokeWidth: 2.5 }}
                defaultEdgeOptions={{ type: 'default', style: { strokeWidth: 2.5 } }}
                nodesConnectable
                elementsSelectable
                zoomOnScroll={false}
                panOnScroll
                panOnScrollSpeed={0.75}
                zoomOnPinch
                panOnDrag
              >
                <Background />
                <Controls />
                <MiniMap className="!bg-background/90 !border-border" maskColor="rgba(0,0,0,0.1)" />
                <Panel position="top-center" className="text-xs text-muted-foreground text-center max-w-md px-2">
                  Drag from a card&apos;s bottom edge to another card&apos;s top edge. Scroll on chart to pan;
                  ⌘ or Ctrl + scroll to zoom. You can also use each card&apos;s “Set manager” dropdown.
                </Panel>
                {isConnecting && (
                  <Panel
                    position="top-left"
                    className="rounded bg-background/95 px-2 py-1 text-xs text-muted-foreground"
                  >
                    Drop on another card&apos;s top edge to set manager.
                  </Panel>
                )}
                {!graphHasData && (
                  <Panel position="top-left" className="rounded bg-background/95 px-2 py-1 text-xs text-muted-foreground">
                    No users available to visualize.
                  </Panel>
                )}
                {graphHasData && !flowReady && (
                  <Panel position="top-left" className="rounded bg-background/95 px-2 py-1 text-xs text-muted-foreground">
                    Initializing visualization...
                  </Panel>
                )}
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
