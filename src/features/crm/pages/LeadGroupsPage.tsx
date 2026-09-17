import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Search, ChevronDown, Pencil, Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { leadTypeAssignmentApi, groupsApi } from '@/lib/api/services/userSettings';
import { Group, GroupCreatePayload, LeadTypeAssignment } from "@/types/userSettings";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";

interface LeadGroupsPageProps {
  className?: string;
  showHeader?: boolean;
  config?: {
    leadTypesEndpoint?: string;
    leadSourcesEndpoint?: string;
    rmsEndpoint?: string;
    assignmentsEndpoint?: string;
    title?: string;
  };
}

interface SearchableMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onSelectAllMatching: (values: string[]) => void;
  onClearAllMatching: (values: string[]) => void;
  triggerClassName?: string;
}

const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  label,
  options,
  selected,
  onToggle,
  onSelectAllMatching,
  onClearAllMatching,
  triggerClassName,
}) => {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((v) => v.toLowerCase().includes(normalizedQuery))
    : options;

  const selectedInFiltered = filteredOptions.filter((v) => selected.includes(v));
  const allFilteredSelected = filteredOptions.length > 0 && selectedInFiltered.length === filteredOptions.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={triggerClassName || "w-full justify-between font-normal"}>
          <span className="truncate">{selected.length > 0 ? `${selected.length} selected` : `Select ${label}`}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-2">
        <div className="space-y-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}`}
            className="h-9"
          />
          <div className="flex items-center justify-between text-xs">
            <Button
              type="button"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={filteredOptions.length === 0 || allFilteredSelected}
              onClick={() => onSelectAllMatching(filteredOptions)}
            >
              Select all matching ({filteredOptions.length})
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
              disabled={selectedInFiltered.length === 0}
              onClick={() => onClearAllMatching(filteredOptions)}
            >
              Clear matching ({selectedInFiltered.length})
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No options</p>
            ) : (
              filteredOptions.map((value) => (
                <div key={`${label}-${value}`} className="flex items-center gap-2">
                  <Checkbox
                    id={`${label}-${value}`}
                    checked={selected.includes(value)}
                    onCheckedChange={() => onToggle(value)}
                  />
                  <Label htmlFor={`${label}-${value}`} className="font-normal cursor-pointer">
                    {value}
                  </Label>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface GroupEditState {
  id: number;
  party: string[];
  states: string[];
  lead_sources: string[];
  lead_statuses: string[];
  prioritize_lead_creator: boolean;
}

const isTicketQueue = (queueType: unknown) =>
  typeof queueType === "string" && queueType.trim().toLowerCase() === "ticket";

const isPrioritizeLeadCreator = (groupData: Record<string, unknown> | undefined) =>
  groupData?.prioritize_lead_creator === true;

const PrioritizeLeadCreatorCheckbox: React.FC<{
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}> = ({ id, checked, onCheckedChange, disabled, compact }) => (
  <div className={compact ? "flex justify-center" : "flex items-start gap-2 pt-1"}>
    <Checkbox
      id={id}
      checked={checked}
      disabled={disabled}
      title="Lead Creator Prioritization"
      onCheckedChange={(value) => onCheckedChange(value === true)}
    />
    {!compact && (
      <Label htmlFor={id} className="font-normal cursor-pointer leading-tight">
        Lead Creator Prioritization
        <span className="block text-xs text-muted-foreground font-normal">
          Pull this RM's own referrals before newer Day-0 leads
        </span>
      </Label>
    )}
  </div>
);

interface GroupAssignmentUser {
  name: string;
  email: string;
  roleName: string;
  leadGroupName: string;
}

const LeadGroupsPage: React.FC<LeadGroupsPageProps> = ({ className = "", showHeader = true, config }) => {
  const { session } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<LeadTypeAssignment[]>([]);
  const [membershipUsers, setMembershipUsers] = useState<GroupAssignmentUser[]>([]);
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<string[]>([]);
  const [leadStates, setLeadStates] = useState<string[]>([]);
  const [parties, setParties] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [queueTypes, setQueueTypes] = useState<string[]>([]);
  const [editingGroup, setEditingGroup] = useState<GroupEditState | null>(null);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [selectedGroupForDrawer, setSelectedGroupForDrawer] = useState<Group | null>(null);
  const [form, setForm] = useState({
    name: "",
    queue_type: "",
    states: [] as string[],
    party: [] as string[],
    lead_sources: [] as string[],
    lead_statuses: [] as string[],
    prioritize_lead_creator: false,
  });

  const loadData = async () => {
    try {
      const [groupsData, usersData, filterOptions, queueTypesData] = await Promise.all([
        groupsApi.getAll(),
        leadTypeAssignmentApi.getAll(),
        leadTypeAssignmentApi.getLeadFilterOptions(),
        leadTypeAssignmentApi.getAvailableQueueTypes(),
      ]);
      setGroups(groupsData);
      setUsers(usersData);
      setLeadSources(filterOptions.lead_sources);
      setLeadStatuses(filterOptions.lead_statuses);
      setLeadStates(filterOptions.lead_states);
      setParties(filterOptions.lead_types);
      setQueueTypes(queueTypesData);
    } catch (error: any) {
      toast.error(`Failed to load lead groups data: ${error.message}`);
    }
  };

  const loadMembershipUsers = async () => {
    try {
      if (!session?.access_token) {
        setMembershipUsers([]);
        return;
      }

      const response = await apiClient.get("/membership/users");
      const payload = response?.data;
      const rows = Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

      const transformed: GroupAssignmentUser[] = rows.map((u: any) => ({
        name: u.name || u.full_name || "Unnamed User",
        email: u.email || "No Email",
        roleName: u.role?.name || u.role_name || "No Role",
        leadGroupName: u.lead_group_name || "",
      }));
      setMembershipUsers(transformed);
    } catch {
      setMembershipUsers([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMembershipUsers();
  }, [session?.access_token]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(term));
  }, [groups, searchTerm]);

  const resetForm = () => {
    setForm({
      name: "",
      queue_type: "",
      states: [],
      party: [],
      lead_sources: [],
      lead_statuses: [],
      prioritize_lead_creator: false,
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    const normalizedName = form.name.trim().toLowerCase();
    const alreadyExists = groups.some((group) => group.name.trim().toLowerCase() === normalizedName);
    if (alreadyExists) {
      toast.error("A group with this name already exists.");
      return;
    }

    const payload: GroupCreatePayload = {
      name: form.name.trim(),
      group_data: {
        queue_type: form.queue_type || null,
        states: form.states,
        party: form.party,
        lead_sources: form.lead_sources,
        lead_statuses: form.lead_statuses,
        prioritize_lead_creator:
          form.queue_type !== "ticket" && form.prioritize_lead_creator,
      },
    };

    try {
      setSaving(true);
      await groupsApi.create(payload);
      toast.success("Group created successfully");
      resetForm();
      setShowCreateForm(false);
      await loadData();
    } catch (error: any) {
      toast.error(`Failed to create group: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await groupsApi.remove(id);
      toast.success("Group removed");
      await loadData();
    } catch (error: any) {
      toast.error(`Failed to remove group: ${error.message}`);
    }
  };

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toList = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
    if (typeof value === "string") return value ? [value] : [];
    return [];
  };

  const handleEditGroup = (group: Group) => {
    const partyValues = toList(group.group_data?.party).filter((v) => parties.includes(v));
    const stateValues = toList(group.group_data?.states).filter((v) => leadStates.includes(v));
    const sourceValues = toList(group.group_data?.lead_sources).filter((v) => leadSources.includes(v));
    const statusValues = toList(group.group_data?.lead_statuses).filter((v) => leadStatuses.includes(v));

    setEditingGroup({
      id: group.id,
      party: partyValues,
      states: stateValues,
      lead_sources: sourceValues,
      lead_statuses: statusValues,
      prioritize_lead_creator: isPrioritizeLeadCreator(group.group_data),
    });
  };

  const handleCancelGroupEdit = () => {
    setEditingGroup(null);
  };

  const handleSaveGroupEdit = async () => {
    if (!editingGroup) return;
    const existingGroup = groups.find((g) => g.id === editingGroup.id);
    if (!existingGroup) {
      toast.error("Group not found.");
      return;
    }

    const payload: GroupCreatePayload = {
      name: existingGroup.name,
      group_data: {
        ...(existingGroup.group_data || {}),
        queue_type: existingGroup.group_data?.queue_type || null,
        party: editingGroup.party,
        states: editingGroup.states,
        lead_sources: editingGroup.lead_sources,
        lead_statuses: editingGroup.lead_statuses,
        prioritize_lead_creator:
          !isTicketQueue(existingGroup.group_data?.queue_type) &&
          editingGroup.prioritize_lead_creator,
      },
    };

    try {
      setIsUpdatingGroup(true);
      await groupsApi.update(editingGroup.id, payload);
      toast.success("Group updated successfully");
      setEditingGroup(null);
      await loadData();
    } catch (error: any) {
      toast.error(`Failed to update group: ${error.message}`);
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const toggleParty = (partyValue: string) => {
    setForm((prev) => {
      const exists = prev.party.includes(partyValue);
      return {
        ...prev,
        party: exists ? prev.party.filter((item) => item !== partyValue) : [...prev.party, partyValue],
      };
    });
  };

  const toggleLeadSource = (sourceValue: string) => {
    setForm((prev) => {
      const exists = prev.lead_sources.includes(sourceValue);
      return {
        ...prev,
        lead_sources: exists
          ? prev.lead_sources.filter((item) => item !== sourceValue)
          : [...prev.lead_sources, sourceValue],
      };
    });
  };

  const toggleState = (stateValue: string) => {
    setForm((prev) => {
      const exists = prev.states.includes(stateValue);
      return {
        ...prev,
        states: exists ? prev.states.filter((item) => item !== stateValue) : [...prev.states, stateValue],
      };
    });
  };

  const formatFreshLeadsCount = (group: Group) => {
    if (typeof group.fresh_leads_count === "number") {
      return group.fresh_leads_count.toLocaleString();
    }
    return "—";
  };

  const getConditionsLabel = (group: Group) => {
    const states = group.group_data?.states || [];
    if (!Array.isArray(states) || states.length === 0) {
      return { chips: [] as string[] };
    }
    return { chips: states as string[] };
  };

  const renderCompactChipList = (
    items: string[],
    keyPrefix: string,
    options?: { maxVisible?: number; dense?: boolean; centered?: boolean }
  ) => {
    if (!items.length) {
      return <span className="text-sm text-muted-foreground">-</span>;
    }

    const maxVisible = options?.maxVisible ?? 3;
    const dense = options?.dense ?? false;
    const centered = options?.centered ?? false;
    const visibleItems = items.slice(0, maxVisible);
    const hiddenCount = items.length - visibleItems.length;
    const chipClass = dense
      ? "inline-flex max-w-[88px] truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium"
      : "inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium whitespace-nowrap";

    return (
      <div
        className={`flex items-center ${dense ? "flex-nowrap gap-1" : "flex-wrap gap-2"} ${
          centered ? "justify-center" : ""
        }`}
      >
        {visibleItems.map((item) => (
          <span key={`${keyPrefix}-${item}`} title={item} className={chipClass}>
            {item}
          </span>
        ))}
        {hiddenCount > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={dense ? "h-6 px-1.5 text-[11px]" : "h-7 px-2 text-xs"}>
                {dense ? `+${hiddenCount}` : `+${hiddenCount} more`}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[340px] p-3">
              <div className="max-h-60 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <span
                      key={`${keyPrefix}-all-${item}`}
                      title={item}
                      className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium whitespace-nowrap"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  };

  const renderEditMultiSelect = (
    label: string,
    options: string[],
    selected: string[],
    onToggle: (value: string) => void
  ) => {
    const validSelectedCount = selected.filter((v) => options.includes(v)).length;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 w-full min-w-[140px] justify-between font-normal">
            <span className="truncate">
              {validSelectedCount > 0 ? `${validSelectedCount} selected` : `Select ${label}`}
            </span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[280px] p-2">
          <div className="max-h-56 overflow-y-auto space-y-2">
            {options.length === 0 ? (
              <p className="text-xs text-muted-foreground">No options</p>
            ) : (
              options.map((value) => (
                <div key={`${label}-${value}`} className="flex items-center gap-2">
                  <Checkbox
                    id={`${label}-${value}`}
                    checked={selected.includes(value)}
                    onCheckedChange={() => onToggle(value)}
                  />
                  <Label htmlFor={`${label}-${value}`} className="font-normal cursor-pointer">
                    {value}
                  </Label>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const getLeadSourceOptions = (selected: string[]) => {
    const merged = new Set<string>([...leadSources, ...selected]);
    return Array.from(merged).filter(Boolean);
  };

  const usersForSelectedGroup = useMemo(() => {
    if (!selectedGroupForDrawer) return [];
    const groupName = selectedGroupForDrawer.name.trim().toLowerCase();
    return membershipUsers.filter((u) => (u.leadGroupName || "").trim().toLowerCase() === groupName);
  }, [selectedGroupForDrawer, membershipUsers]);

  return (
    <>
      {/* Mobile Title - Only visible on small screens */}
      <div className="md:hidden w-full pb-3 px-4 pt-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {config?.title || "Lead Groups"}
        </h2>
      </div>

      <div className={`space-y-6 ${className}`}>
        <div className="flex items-start justify-between gap-4 px-4 md:px-0">
          {showHeader ? (
            <div className="hidden md:block">
              <h5 className="text-4xl font-semibold">Lead Groups</h5>
              <p className="text-muted-foreground">
                Configure which tickets and leads each agent should receive. Select a user and set filters.
              </p>
            </div>
          ) : (
            <div />
          )}
          <div className="flex w-full max-w-md items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search group"
                className="pl-9"
              />
            </div>
            <Button className="bg-black text-white hover:bg-black shrink-0" onClick={() => setShowCreateForm((p) => !p)}>
              {showCreateForm ? "Close" : "Create Group"}
            </Button>
          </div>
        </div>

        <div className="px-4 md:px-0">
          {showCreateForm && (
            <Card className="border border-gray-200 shadow-sm mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl md:text-3xl font-medium">Lead Group Creation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Enter group name" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Select Queue Type</Label>
                    <select
                      className="h-10 w-full border rounded-md px-3"
                      value={form.queue_type}
                      onChange={(e) => {
                        const nextQueueType = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          queue_type: nextQueueType,
                          lead_sources: nextQueueType === "ticket" ? [] : prev.lead_sources,
                          lead_statuses: nextQueueType === "ticket" ? [] : prev.lead_statuses,
                          prioritize_lead_creator:
                            nextQueueType === "ticket" ? false : prev.prioritize_lead_creator,
                        }));
                      }}
                    >
                      <option value="">Select</option>
                      {(queueTypes.length ? queueTypes : ["lead", "ticket"]).map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between font-normal">
                          <span className="truncate">
                            {form.states.length > 0 ? `${form.states.length} selected` : "Select"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[280px] p-2">
                        <div className="max-h-56 overflow-y-auto space-y-2">
                          {leadStates.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No state options</p>
                          ) : (
                            leadStates.map((stateValue) => (
                              <div key={stateValue} className="flex items-center gap-2">
                                <Checkbox
                                  id={`state-${stateValue}`}
                                  checked={form.states.includes(stateValue)}
                                  onCheckedChange={() => toggleState(stateValue)}
                                />
                                <Label htmlFor={`state-${stateValue}`} className="font-normal cursor-pointer">
                                  {stateValue}
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Party</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between font-normal">
                          <span className="truncate">
                            {form.party.length > 0 ? `${form.party.length} selected` : "Select"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[280px] p-2">
                        <div className="max-h-56 overflow-y-auto space-y-2">
                          {parties.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No party options</p>
                          ) : (
                            parties.map((partyValue) => (
                              <div key={partyValue} className="flex items-center gap-2">
                                <Checkbox
                                  id={`party-${partyValue}`}
                                  checked={form.party.includes(partyValue)}
                                  onCheckedChange={() => toggleParty(partyValue)}
                                />
                                <Label htmlFor={`party-${partyValue}`} className="font-normal cursor-pointer">
                                  {partyValue}
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {form.queue_type !== "ticket" && (
                    <>
                      <div className="space-y-2">
                        <Label>Lead Source</Label>
                        <SearchableMultiSelect
                          label="Lead Sources"
                          options={leadSources}
                          selected={form.lead_sources}
                          onToggle={toggleLeadSource}
                          onSelectAllMatching={(values) =>
                            setForm((prev) => ({
                              ...prev,
                              lead_sources: Array.from(new Set([...prev.lead_sources, ...values])),
                            }))
                          }
                          onClearAllMatching={(values) =>
                            setForm((prev) => ({
                              ...prev,
                              lead_sources: prev.lead_sources.filter((v) => !values.includes(v)),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Lead Status</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal">
                              <span className="truncate">
                                {form.lead_statuses.length > 0 ? `${form.lead_statuses.length} selected` : "Select"}
                              </span>
                              <ChevronDown className="h-4 w-4 opacity-60" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-[280px] p-2">
                            <div className="max-h-56 overflow-y-auto space-y-2">
                              {leadStatuses.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No lead status options</p>
                              ) : (
                                leadStatuses.map((status) => (
                                  <div key={status} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`status-${status}`}
                                      checked={form.lead_statuses.includes(status)}
                                      onCheckedChange={() =>
                                        setForm((prev) => ({
                                          ...prev,
                                          lead_statuses: prev.lead_statuses.includes(status)
                                            ? prev.lead_statuses.filter((item) => item !== status)
                                            : [...prev.lead_statuses, status],
                                        }))
                                      }
                                    />
                                    <Label htmlFor={`status-${status}`} className="font-normal cursor-pointer">
                                      {status}
                                    </Label>
                                  </div>
                                ))
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  )}
                  {form.queue_type !== "ticket" && (
                    <div className="col-span-full">
                      <PrioritizeLeadCreatorCheckbox
                        id="create-prioritize-lead-creator"
                        checked={form.prioritize_lead_creator}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({ ...prev, prioritize_lead_creator: checked }))
                        }
                      />
                    </div>
                  )}
                  <div className="col-span-full flex justify-end gap-2 mt-2">
                    <Button className="bg-black text-white hover:bg-black" onClick={handleCreate} disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => resetForm()}
                      disabled={saving}
                    >
                      Remove All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl md:text-3xl font-medium">Lead Source Group List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No groups created yet.</p>
              ) : (
                <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-black hover:bg-black">
                        <TableHead className="text-white font-medium whitespace-nowrap text-center">Group</TableHead>
                        <TableHead className="text-white font-medium whitespace-nowrap text-center">Queue</TableHead>
                        <TableHead className="text-white font-medium min-w-[96px] text-center">Party</TableHead>
                        <TableHead className="text-white font-medium min-w-[150px] text-center">State</TableHead>
                        <TableHead className="text-white font-medium min-w-[96px] text-center">Lead Sources</TableHead>
                        <TableHead className="text-white font-medium whitespace-nowrap text-center">Fresh Leads</TableHead>
                        <TableHead className="text-white font-medium min-w-[140px] text-center">Lead Status</TableHead>
                        <TableHead
                          title="Lead Creator Prioritization"
                          className="text-white font-medium w-[96px] max-w-[96px] whitespace-normal leading-tight text-center"
                        >
                          Lead Creator Prioritization
                        </TableHead>
                        <TableHead className="text-white font-medium w-[88px] text-center"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => {
                        const isEditing = editingGroup?.id === group.id;
                        const conditions = getConditionsLabel(group);
                        const partyValues = Array.isArray(group.group_data?.party)
                          ? group.group_data.party
                          : group.group_data?.party
                            ? [String(group.group_data.party)]
                            : [];
                        const leadSources = Array.isArray(group.group_data?.lead_sources)
                          ? group.group_data.lead_sources
                          : [];
                        const leadStatuses = Array.isArray(group.group_data?.lead_statuses)
                          ? group.group_data.lead_statuses
                          : [];
                        return (
                          <TableRow key={group.id} className="[&>td]:text-center [&>td]:align-middle">
                            <TableCell className="font-medium">
                              <button
                                type="button"
                                className="text-blue-700 hover:text-blue-900 hover:underline"
                                onClick={() => setSelectedGroupForDrawer(group)}
                              >
                                {group.name}
                              </button>
                            </TableCell>
                            <TableCell>
                              {group.group_data?.queue_type || "-"}
                            </TableCell>
                            <TableCell>
                              {isEditing && editingGroup ? (
                                renderEditMultiSelect(
                                  "party",
                                  parties,
                                  editingGroup.party,
                                  (value) =>
                                    setEditingGroup((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            party: prev.party.includes(value)
                                              ? prev.party.filter((item) => item !== value)
                                              : [...prev.party, value],
                                          }
                                        : prev
                                    )
                                )
                              ) : (
                                renderCompactChipList(partyValues, `${group.id}-party`, {
                                  maxVisible: 1,
                                  dense: true,
                                  centered: true,
                                })
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing && editingGroup ? (
                                renderEditMultiSelect(
                                  "state",
                                  leadStates,
                                  editingGroup.states,
                                  (value) =>
                                    setEditingGroup((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            states: prev.states.includes(value)
                                              ? prev.states.filter((item) => item !== value)
                                              : [...prev.states, value],
                                          }
                                        : prev
                                    )
                                )
                              ) : (
                                renderCompactChipList(conditions.chips, `${group.id}-state`, {
                                  centered: true,
                                })
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing && editingGroup ? (
                                <SearchableMultiSelect
                                  label="Lead Sources"
                                  options={getLeadSourceOptions(editingGroup.lead_sources)}
                                  selected={editingGroup.lead_sources}
                                  triggerClassName="h-8 w-full min-w-[96px] justify-between font-normal"
                                  onToggle={(value) =>
                                    setEditingGroup((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            lead_sources: prev.lead_sources.includes(value)
                                              ? prev.lead_sources.filter((item) => item !== value)
                                              : [...prev.lead_sources, value],
                                          }
                                        : prev
                                    )
                                  }
                                  onSelectAllMatching={(values) =>
                                    setEditingGroup((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            lead_sources: Array.from(new Set([...prev.lead_sources, ...values])),
                                          }
                                        : prev
                                    )
                                  }
                                  onClearAllMatching={(values) =>
                                    setEditingGroup((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            lead_sources: prev.lead_sources.filter((v) => !values.includes(v)),
                                          }
                                        : prev
                                    )
                                  }
                                />
                              ) : (
                                renderCompactChipList(leadSources, `${group.id}-source`, {
                                  maxVisible: 1,
                                  dense: true,
                                  centered: true,
                                })
                              )}
                            </TableCell>
                            <TableCell className="tabular-nums font-medium">
                              {formatFreshLeadsCount(group)}
                            </TableCell>
                            <TableCell>
                              {isEditing && editingGroup ? (
                                renderEditMultiSelect(
                                  "status",
                                  leadStatuses,
                                  editingGroup.lead_statuses,
                                  (value) =>
                                    setEditingGroup((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            lead_statuses: prev.lead_statuses.includes(value)
                                              ? prev.lead_statuses.filter((item) => item !== value)
                                              : [...prev.lead_statuses, value],
                                          }
                                        : prev
                                    )
                                )
                              ) : (
                                renderCompactChipList(leadStatuses, `${group.id}-status`, {
                                  centered: true,
                                })
                              )}
                            </TableCell>
                            <TableCell>
                              {isTicketQueue(group.group_data?.queue_type) ? (
                                <span className="text-sm text-muted-foreground">-</span>
                              ) : isEditing && editingGroup ? (
                                <PrioritizeLeadCreatorCheckbox
                                  id={`edit-prioritize-lead-creator-${group.id}`}
                                  checked={editingGroup.prioritize_lead_creator}
                                  compact
                                  onCheckedChange={(checked) =>
                                    setEditingGroup((prev) =>
                                      prev ? { ...prev, prioritize_lead_creator: checked } : prev
                                    )
                                  }
                                />
                              ) : isPrioritizeLeadCreator(group.group_data) ? (
                                <span className="text-sm font-medium">Yes</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">No</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="inline-flex items-center justify-center gap-2">
                                {isEditing ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                                      onClick={handleSaveGroupEdit}
                                      disabled={isUpdatingGroup}
                                      title="Save changes"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                                      onClick={handleCancelGroupEdit}
                                      disabled={isUpdatingGroup}
                                      title="Cancel editing"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                                    onClick={() => handleEditGroup(group)}
                                    title="Edit group"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 border-red-200 bg-white text-red-500 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => handleDelete(group.id)}
                                  disabled={isEditing}
                                  title="Delete group"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Mobile Cards */}
        <div className="md:hidden space-y-4 mt-4">
          {filteredGroups.map((group) => {
            const isEditing = editingGroup?.id === group.id;

            const conditions = getConditionsLabel(group);

            const partyValues = Array.isArray(group.group_data?.party)
              ? group.group_data.party
              : group.group_data?.party
              ? [String(group.group_data.party)]
              : [];

            const leadSources = Array.isArray(group.group_data?.lead_sources)
              ? group.group_data.lead_sources
              : [];

            const leadStatuses = Array.isArray(group.group_data?.lead_statuses)
              ? group.group_data.lead_statuses
              : [];

            return (
              <Card key={group.id} className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    {/* Group */}
                    <div>
                      <p className="text-sm text-gray-500">Group</p>
                      <button
                        type="button"
                        className="font-semibold text-left text-blue-700 hover:text-blue-900 hover:underline"
                        onClick={() => setSelectedGroupForDrawer(group)}
                      >
                        {group.name}
                      </button>
                    </div>

                    {/* Queue */}
                    <div>
                      <p className="text-sm text-gray-500">Queue</p>
                      <p className="font-medium">
                        {group.group_data?.queue_type || "-"}
                      </p>
                    </div>

                    {/* Party */}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-1">Party</p>
                      {renderCompactChipList(
                        partyValues,
                        `${group.id}-party-mobile`
                      )}
                    </div>

                    {/* State */}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-1">State</p>
                      {renderCompactChipList(
                        conditions.chips,
                        `${group.id}-state-mobile`
                      )}
                    </div>

                    {/* Lead Sources */}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-1">Lead Sources</p>
                      {renderCompactChipList(
                        leadSources,
                        `${group.id}-source-mobile`
                      )}
                    </div>

                    {/* Fresh Leads */}
                    <div>
                      <p className="text-sm text-gray-500">Fresh Leads</p>
                      <p className="font-semibold">
                        {formatFreshLeadsCount(group)}
                      </p>
                    </div>

                    {/* Lead Status */}
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Lead Status</p>
                      {renderCompactChipList(
                        leadStatuses,
                        `${group.id}-status-mobile`
                      )}
                    </div>

                    {/* Lead Creator Prioritization */}
                    {!isTicketQueue(group.group_data?.queue_type) && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500 mb-1">Lead Creator Prioritization</p>
                        {isEditing && editingGroup ? (
                          <PrioritizeLeadCreatorCheckbox
                            id={`mobile-prioritize-lead-creator-${group.id}`}
                            checked={editingGroup.prioritize_lead_creator}
                            onCheckedChange={(checked) =>
                              setEditingGroup((prev) =>
                                prev ? { ...prev, prioritize_lead_creator: checked } : prev
                              )
                            }
                          />
                        ) : (
                          <p className="font-medium">
                            {isPrioritizeLeadCreator(group.group_data) ? "Yes" : "No"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Edit / Delete */}
                  <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                          onClick={handleSaveGroupEdit}
                          disabled={isUpdatingGroup}
                        >
                          <Check className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCancelGroupEdit}
                          disabled={isUpdatingGroup}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditGroup(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => handleDelete(group.id)}
                      disabled={isEditing}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Sheet open={!!selectedGroupForDrawer} onOpenChange={(open) => !open && setSelectedGroupForDrawer(null)}>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Group Details</SheetTitle>
              <SheetDescription>
                Full configuration and users assigned to this group.
              </SheetDescription>
            </SheetHeader>

            {selectedGroupForDrawer && (
              <div className="mt-6 space-y-6">
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">Configuration</p>
                  <p className="text-sm"><span className="font-medium">Group Name:</span> {selectedGroupForDrawer.name}</p>
                  <p className="text-sm"><span className="font-medium">Queue Type:</span> {selectedGroupForDrawer.group_data?.queue_type || "-"}</p>
                  <p className="text-sm"><span className="font-medium">Party:</span> {toList(selectedGroupForDrawer.group_data?.party).join(", ") || "-"}</p>
                  <p className="text-sm"><span className="font-medium">States:</span> {toList(selectedGroupForDrawer.group_data?.states).join(", ") || "-"}</p>
                  <p className="text-sm"><span className="font-medium">Lead Sources:</span> {toList(selectedGroupForDrawer.group_data?.lead_sources).join(", ") || "-"}</p>
                  <p className="text-sm">
                    <span className="font-medium">Fresh Leads Available:</span>{" "}
                    {formatFreshLeadsCount(selectedGroupForDrawer)}
                  </p>
                  <p className="text-sm"><span className="font-medium">Lead Statuses:</span> {toList(selectedGroupForDrawer.group_data?.lead_statuses).join(", ") || "-"}</p>
                  {!isTicketQueue(selectedGroupForDrawer.group_data?.queue_type) && (
                    <p className="text-sm">
                      <span className="font-medium">Lead Creator Prioritization:</span>{" "}
                      {isPrioritizeLeadCreator(selectedGroupForDrawer.group_data) ? "Yes" : "No"}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Assigned Users ({usersForSelectedGroup.length})</p>
                  {usersForSelectedGroup.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No users assigned to this group.</p>
                  ) : (
                    <div className="space-y-2">
                      {usersForSelectedGroup.map((u) => (
                        <div key={`${u.email}-${u.name}`} className="rounded-md border p-3">
                          <p className="text-sm"><span className="font-medium">Name:</span> {u.name}</p>
                          <p className="text-sm"><span className="font-medium">Email:</span> {u.email}</p>
                          <p className="text-sm"><span className="font-medium">Role:</span> {u.roleName}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default LeadGroupsPage;