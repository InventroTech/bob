/** State, effects, and handlers for AddUserComponent. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { forceLogoutIfDeletedSelf } from '@/lib/auth/deletedUserSession';
import { toast } from 'sonner';
import { useTenant } from '@/hooks/useTenant';
import { membershipService } from '@/lib/api';
import { leadTypeAssignmentApi, groupsApi } from '@/lib/api/services/userSettings';
import { downloadUsersReportPdf } from '@/lib/usersReportPdf';
import type {
  Role,
  User,
  UserCoreSettingsSummary,
  LeadGroupOption,
  RowEditState,
  AddUserComponentProps,
} from './types';
import { isCseRole, patchSupportDailyKv } from './utils';

export function useAddUser({ config }: AddUserComponentProps) {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantId } = useTenant();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [myMembershipId, setMyMembershipId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    leadGroup: '',
    dailyTarget: '',
    dailyLimit: '',
    supportResolveRateGoal: '',
    supportDailyLimitSelfTrial: '',
    supportDailyLimitOther: '',
    managerEmail: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleFields, setShowRoleFields] = useState(false);
  const [coreSettingsMap, setCoreSettingsMap] = useState<Record<string, UserCoreSettingsSummary>>({});
  const [availableLeadGroups, setAvailableLeadGroups] = useState<LeadGroupOption[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedQueueType, setSelectedQueueType] = useState<'lead' | 'ticket'>('lead');
  const [queueTypes, setQueueTypes] = useState<string[]>([]);
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<RowEditState | null>(null);
  const [isUpdatingRow, setIsUpdatingRow] = useState(false);
  const [usersPdfLoading, setUsersPdfLoading] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [editManagerSearch, setEditManagerSearch] = useState('');
  const [showEditManagerDropdown, setShowEditManagerDropdown] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const managerDropdownRef = useRef<HTMLDivElement>(null);
  const editManagerDropdownRef = useRef<HTMLDivElement>(null);

  const closeManagerDropdowns = useCallback((e: MouseEvent) => {
    if (managerDropdownRef.current && !managerDropdownRef.current.contains(e.target as Node)) {
      setShowManagerDropdown(false);
    }
    if (editManagerDropdownRef.current && !editManagerDropdownRef.current.contains(e.target as Node)) {
      setShowEditManagerDropdown(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', closeManagerDropdowns);
    return () => document.removeEventListener('mousedown', closeManagerDropdowns);
  }, [closeManagerDropdowns]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesData = await membershipService.getRoles();
        setRoles(rolesData);
      } catch (error: any) {
        console.error('Error fetching roles:', error);
        toast.error(`Failed to fetch roles: ${error.message}`);
        setRoles([]);
      }
    };

    fetchRoles();
  }, [tenantId]); // Keep dependency but don't block API call

  const fetchUsers = async () => {
    // Always try to fetch users from renderer API first, regardless of tenantId
    setIsLoading(true);

    try{
      const token = session?.access_token;

      if (!token) {
        console.error('No authentication token available');
        toast.error('Authentication required to fetch users');
        return;
      }

      // Use renderer URL for users
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/membership/users`;
      
      console.log('Fetching users from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Users response:', responseData);
      
      // Handle different response formats
      let usersData = [];
      if (responseData.results && Array.isArray(responseData.results)) {
        usersData = responseData.results;
      } else if (Array.isArray(responseData)) {
        usersData = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        usersData = responseData.data;
      }

      // Transform the data to match expected format
      const transformedUsers: User[] = usersData.map((user: any, index: number) => ({
        tenant_membership_id: typeof user.id === 'number' ? user.id : Number(user.id) || undefined,
        uid: user.uid || user.id || `temp-${index}-${Math.random().toString(36).substring(2, 15)}`,
        name: user.name || user.full_name || 'Unnamed User',
        email: user.email || 'No Email',
        role_id: user.role_id || user.role?.id || '',
        created_at: user.created_at || user.date_joined || new Date().toISOString(),
        role: user.role || (user.role_name ? { id: user.role_id, name: user.role_name } : undefined),
        department: user.department ?? user.department_name ?? undefined,
        lead_group_name: user.lead_group_name ?? undefined,
        user_parent_id: user.user_parent_id ?? null,
      }));

      setUsers(transformedUsers);
      // Show message if no users found
      if (transformedUsers.length === 0) {
        toast.info('No users found. The list is empty.');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to fetch users: ${error.message}`);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCoreSettings = async () => {
    try {
      const mapped: Record<string, UserCoreSettingsSummary> = {};
      const usersWithMembershipId = users.filter((u) => !!u.tenant_membership_id);
      const rows = await Promise.all(
        usersWithMembershipId.map(async (u) => ({
          emailKey: (u.email || '').toLowerCase(),
          kv: await leadTypeAssignmentApi.getUserCoreKVSettings(String(u.tenant_membership_id)),
        }))
      );
      rows.forEach(({ emailKey, kv }) => {
        const groupRow = kv.find((r) => r.key === 'GROUP');
        const targetRow = kv.find((r) => r.key === 'DAILY_TARGET');
        const limitRow = kv.find((r) => r.key === 'DAILY_LIMIT');
        const resolveGoalRow = kv.find((r) => r.key === 'SUPPORT_RESOLVE_RATE_GOAL');
        const stLimitRow = kv.find((r) => r.key === 'SUPPORT_DAILY_LIMIT_SELF_TRIAL');
        const otherLimitRow = kv.find((r) => r.key === 'SUPPORT_DAILY_LIMIT_OTHER');
        mapped[emailKey] = {
          group_id: typeof groupRow?.value === 'number' ? groupRow.value : undefined,
          daily_target: typeof targetRow?.value === 'number' ? targetRow.value : undefined,
          daily_limit: typeof limitRow?.value === 'number' ? limitRow.value : undefined,
          support_resolve_rate_goal:
            typeof resolveGoalRow?.value === 'number' ? resolveGoalRow.value : undefined,
          support_daily_limit_self_trial:
            typeof stLimitRow?.value === 'number' ? stLimitRow.value : undefined,
          support_daily_limit_other:
            typeof otherLimitRow?.value === 'number' ? otherLimitRow.value : undefined,
        };
      });
      setCoreSettingsMap(mapped);
    } catch {
      setCoreSettingsMap({});
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [tenantId]);

  useEffect(() => {
    if (config?.userScope !== 'under_me') return;
    membershipService.getMyMembership().then((m) => {
      setMyMembershipId(m?.tenant_membership_id ?? null);
    });
  }, [config?.userScope]);

  useEffect(() => {
    if (users.length > 0) {
      fetchCoreSettings();
    } else {
      setCoreSettingsMap({});
    }
  }, [users]);

  useEffect(() => {
    const fetchLeadGroupsAndQueueTypes = async () => {
      try {
        const [groups, queueTypesData] = await Promise.all([
          groupsApi.getAll(),
          leadTypeAssignmentApi.getAvailableQueueTypes(),
        ]);
        setAvailableLeadGroups(
          groups.map((group) => ({
            id: group.id,
            name: group.name,
            queue_type: typeof group.group_data?.queue_type === 'string' ? group.group_data.queue_type : undefined,
            group_data: group.group_data ?? {},
          }))
        );
        setQueueTypes(queueTypesData);
      } catch {
        setAvailableLeadGroups([]);
        setQueueTypes([]);
      }
    };
    fetchLeadGroupsAndQueueTypes();
  }, [tenantId]);

  const usersWithSettings = useMemo(
    () =>
      users.map((usr) => {
        const config = coreSettingsMap[(usr.email || '').toLowerCase()];
        const groupFromKv = availableLeadGroups.find((g) => g.id === config?.group_id)?.name;
        const parentUser = usr.user_parent_id
          ? users.find((u) => u.tenant_membership_id === usr.user_parent_id)
          : null;
        const isCse = isCseRole(usr.role);
        return {
          ...usr,
          leadGroup: groupFromKv || usr.lead_group_name || '—',
          dailyTarget: isCse ? '—' : (config?.daily_target ?? '—'),
          dailyLimit: isCse ? '—' : (config?.daily_limit ?? '—'),
          supportResolveRateGoal: isCse
            ? (config?.support_resolve_rate_goal ?? '—')
            : '—',
          supportDailyLimitSelfTrial: isCse
            ? (config?.support_daily_limit_self_trial ?? '—')
            : '—',
          supportDailyLimitOther: isCse
            ? (config?.support_daily_limit_other ?? '—')
            : '—',
          managerEmail: parentUser?.email || '—',
        };
      }),
    [users, coreSettingsMap, availableLeadGroups]
  );

  const filteredUsersWithSettings = useMemo(() => {
    const term = userSearchTerm.toLowerCase().trim();
    let validUsers = usersWithSettings.filter((user) => user.name && user.email);

    if (config?.userScope === 'under_me' && myMembershipId != null) {
      validUsers = validUsers.filter((u) => u.user_parent_id === myMembershipId);
    }

    if (!term) return validUsers;

    return validUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.role?.name || '').toLowerCase().includes(term)
    );
  }, [usersWithSettings, userSearchTerm, config?.userScope, myMembershipId]);

  const handleDownloadUsersPdf = async () => {
    if (filteredUsersWithSettings.length === 0) {
      toast.error('No users to download');
      return;
    }

    setUsersPdfLoading(true);
    try {
      await downloadUsersReportPdf(filteredUsersWithSettings);
    } finally {
      setUsersPdfLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddRole = async () => {
    if (!newRoleName || !newRoleKey) return toast.error('Role name and key are required');

    try {
      const createdRole = await membershipService.createRole(newRoleKey, newRoleName);

      // Clear form fields first
      setNewRoleName('');
      setNewRoleKey('');
      setShowRoleFields(false);
      
      // Set the newly created role as selected if we have an ID
      if (createdRole.id) {
        setSelectedRoleId(createdRole.id);
      }

      // Show success toast
      toast.success('Role added successfully');

      // Refresh the roles list (don't block on this)
      try {
        const rolesData = await membershipService.getRoles();
        setRoles(rolesData);
      } catch (refreshError) {
        console.error('Error refreshing roles list:', refreshError);
        // Don't show error toast for refresh failure, role was already created
      }
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast.error(`Error adding role: ${error.message || 'Failed to create role'}`);
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !selectedRoleId) {
      toast.error('All fields are required');
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    const existingUser = users.find((u) => (u.email || '').toLowerCase() === normalizedEmail);
    if (existingUser) {
      toast.error('A user with this email already exists. Use Edit for updates or choose a different email.');
      return;
    }

    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    if (
      selectedQueueType === 'ticket' &&
      (formData.supportDailyLimitSelfTrial !== '' ||
        formData.supportDailyLimitOther !== '' ||
        formData.supportResolveRateGoal !== '') &&
      !isCseRole(selectedRole)
    ) {
      toast.error('Support daily targets/limits can only be set for users with the CSE role');
      return;
    }

    try{
      setIsCreatingUser(true);
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use renderer URL for user creation/update
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/users/create/`;
      
      console.log('Creating user via:', apiUrl);
      console.log('Payload:', { name: formData.name, email: formData.email, role_id: selectedRoleId });

      const payload: Record<string, string | number> = {
        name: formData.name,
        email: formData.email,
        role_id: selectedRoleId,
      };
      if (formData.department?.trim()) payload.department = formData.department.trim();
      if (formData.leadGroup?.trim()) payload.lead_group_name = formData.leadGroup.trim();
      if (selectedQueueType !== 'ticket' || !isCseRole(selectedRole)) {
        if (formData.dailyTarget !== '') payload.daily_target = Number(formData.dailyTarget);
        if (formData.dailyLimit !== '') payload.daily_limit = Number(formData.dailyLimit);
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        const backendMessage =
          errorData?.message ||
          errorData?.detail ||
          (typeof errorData === 'object'
            ? Object.entries(errorData)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                .join(' | ')
            : '');
        throw new Error(backendMessage || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('User creation response:', responseData);

      // Set manager hierarchy if manager email was provided
      const createdMembershipId = responseData.id ? Number(responseData.id) : undefined;
      if (formData.managerEmail?.trim() && createdMembershipId) {
        const managerUser = users.find(
          (u) => (u.email || '').toLowerCase() === formData.managerEmail.trim().toLowerCase()
        );
        if (managerUser?.tenant_membership_id) {
          try {
            const hierarchyUrl = `${baseUrl}/membership/users/hierarchy/`;
            await fetch(hierarchyUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                assignments: [{ membership_id: createdMembershipId, parent_membership_id: managerUser.tenant_membership_id }],
              }),
            });
          } catch {
            toast.error('User created but failed to set manager hierarchy');
          }
        }
      }

      toast.success('User added successfully! They will be able to log in once they set up their account.');

      const selectedLeadGroup = formData.leadGroup;
      const selectedDailyTarget = formData.dailyTarget;
      const selectedDailyLimit = formData.dailyLimit;
      const selectedSupportResolveGoal = formData.supportResolveRateGoal;
      const selectedSupportStLimit = formData.supportDailyLimitSelfTrial;
      const selectedSupportOtherLimit = formData.supportDailyLimitOther;

      setFormData({
        name: '',
        email: '',
        department: '',
        leadGroup: '',
        dailyTarget: '',
        dailyLimit: '',
        supportResolveRateGoal: '',
        supportDailyLimitSelfTrial: '',
        supportDailyLimitOther: '',
        managerEmail: '',
      });
      setSelectedQueueType('lead');
      setSelectedRoleId('');

      // Refresh the users list
      await fetchUsers();
      await fetchCoreSettings();

      if (
        selectedQueueType === 'ticket' &&
        createdMembershipId &&
        isCseRole(selectedRole) &&
        (selectedSupportStLimit !== '' ||
          selectedSupportOtherLimit !== '' ||
          selectedSupportResolveGoal !== '')
      ) {
        try {
          await patchSupportDailyKv(createdMembershipId, {
            resolveRateGoal: selectedSupportResolveGoal,
            limitSelfTrial: selectedSupportStLimit,
            limitOther: selectedSupportOtherLimit,
          });
          await fetchCoreSettings();
        } catch (patchError: any) {
          toast.error(
            patchError?.response?.data?.detail ||
              patchError?.message ||
              'User created but failed to save support resolve goals/limits'
          );
        }
      }

      // Group and user-level limits are now saved by backend create/update endpoint.
      if (selectedLeadGroup || selectedDailyTarget || selectedDailyLimit) {
        await fetchCoreSettings();
      }

    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(`Error adding user: ${error.message}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (email: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try{
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Find the user to get their role_id
      const userToDelete = users.find(user => user.email === email);
      if (!userToDelete) {
        toast.error('User not found');
        return;
      }

      // Use renderer URL for user deletion
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/delete-user/`;
      
      console.log('Deleting user via:', apiUrl);
      console.log('Payload:', { email, role_id: userToDelete.role_id });

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          role_id: userToDelete.role_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('User deletion response:', responseData);

      const selfLoggedOut = await forceLogoutIfDeletedSelf(email, session?.user?.email);
      if (selfLoggedOut) {
        toast.success('Your account was deleted. You have been signed out.');
        const slug =
          tenantSlug || window.location.pathname.match(/^\/app\/([^/]+)/)?.[1];
        navigate(slug ? `/app/${slug}/login` : '/auth', { replace: true });
        return;
      }

      // Refresh the users list after successful deletion
      await fetchUsers();
      await fetchCoreSettings();
      toast.success('User deleted successfully. They have been signed out everywhere.');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const getRowKey = (usr: User) => `${usr.uid}-${usr.email}-${usr.role_id}`;

  const handleEditUser = (usr: User) => {
    const config = coreSettingsMap[(usr.email || '').toLowerCase()];
    const cse = isCseRole(usr.role);
    setEditingRowKey(getRowKey(usr));
    setEditingRow({
      originalEmail: usr.email || '',
      originalRoleId: usr.role_id || '',
      name: usr.name || '',
      email: usr.email || '',
      department: usr.department || '',
      roleId: usr.role_id || '',
      leadGroup: usr.leadGroup && usr.leadGroup !== '—' ? usr.leadGroup : '',
      dailyTarget: cse
        ? ''
        : usr.dailyTarget && usr.dailyTarget !== '—'
          ? String(usr.dailyTarget)
          : '',
      dailyLimit:
        usr.dailyLimit && usr.dailyLimit !== '—' ? String(usr.dailyLimit) : '',
      supportResolveRateGoal:
        config?.support_resolve_rate_goal !== undefined
          ? String(config.support_resolve_rate_goal)
          : '',
      supportDailyLimitSelfTrial:
        config?.support_daily_limit_self_trial !== undefined
          ? String(config.support_daily_limit_self_trial)
          : '',
      supportDailyLimitOther:
        config?.support_daily_limit_other !== undefined
          ? String(config.support_daily_limit_other)
          : '',
      managerEmail: usr.managerEmail && usr.managerEmail !== '—' ? usr.managerEmail : '',
    });
  };

  const handleCancelRowEdit = () => {
    setEditingRowKey(null);
    setEditingRow(null);
    setEditManagerSearch('');
    setShowEditManagerDropdown(false);
  };

  const handleSaveRowEdit = async () => {
    if (!editingRow) return;
    if (!editingRow.name.trim() || !editingRow.email.trim() || !editingRow.roleId) {
      toast.error('Name, Email and Role are required');
      return;
    }

    const normalizedEmail = editingRow.email.trim().toLowerCase();
    const conflictUser = users.find(
      (u) =>
        (u.email || '').toLowerCase() === normalizedEmail &&
        (u.email || '').toLowerCase() !== editingRow.originalEmail.toLowerCase()
    );
    if (conflictUser) {
      toast.error('A user with this email already exists.');
      return;
    }

    try {
      setIsUpdatingRow(true);
      const token = session?.access_token;
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/users/update/`;
      const editedRole = roles.find((r) => r.id === editingRow.roleId);
      const payload: Record<string, string | number> = {
        name: editingRow.name.trim(),
        email: editingRow.email.trim(),
        role_id: editingRow.roleId,
        original_email: editingRow.originalEmail,
        original_role_id: editingRow.originalRoleId,
      };
      if (editingRow.department.trim()) payload.department = editingRow.department.trim();
      if (editingRow.leadGroup.trim()) payload.lead_group_name = editingRow.leadGroup.trim();
      if (!isCseRole(editedRole)) {
        if (editingRow.dailyTarget !== '') payload.daily_target = Number(editingRow.dailyTarget);
        if (editingRow.dailyLimit !== '') payload.daily_limit = Number(editingRow.dailyLimit);
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const backendMessage =
          errorData?.message ||
          errorData?.detail ||
          (typeof errorData === 'object'
            ? Object.entries(errorData)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                .join(' | ')
            : '');
        throw new Error(backendMessage || `HTTP error! status: ${response.status}`);
      }

      // Update manager hierarchy via the hierarchy endpoint
      const editedUser = users.find(
        (u) => (u.email || '').toLowerCase() === editingRow.originalEmail.toLowerCase()
      );
      if (editedUser?.tenant_membership_id) {
        const managerUser = editingRow.managerEmail.trim()
          ? users.find((u) => (u.email || '').toLowerCase() === editingRow.managerEmail.trim().toLowerCase())
          : null;
        const parentMembershipId = managerUser?.tenant_membership_id ?? null;
        try {
          const hierarchyUrl = `${baseUrl}/membership/users/hierarchy/`;
          await fetch(hierarchyUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              assignments: [{ membership_id: editedUser.tenant_membership_id, parent_membership_id: parentMembershipId }],
            }),
          });
        } catch {
          toast.error('User updated but failed to update manager hierarchy');
        }

        const editedRoleForLimits = roles.find((r) => r.id === editingRow.roleId);
        if (isCseRole(editedRoleForLimits)) {
          try {
            await patchSupportDailyKv(editedUser.tenant_membership_id, {
              resolveRateGoal: editingRow.supportResolveRateGoal,
              limitSelfTrial: editingRow.supportDailyLimitSelfTrial,
              limitOther: editingRow.supportDailyLimitOther,
            });
          } catch (patchError: any) {
            toast.error(
              patchError?.response?.data?.detail ||
                patchError?.message ||
                'User updated but failed to save support daily targets/limits'
            );
          }
        }
      }

      toast.success('User updated successfully!');
      handleCancelRowEdit();
      await fetchUsers();
      await fetchCoreSettings();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`Error updating user: ${error.message}`);
    } finally {
      setIsUpdatingRow(false);
    }
  };


  return {
    config,
    user,
    session,
    navigate,
    tenantSlug,
    tenantId,
    roles,
    setRoles,
    users,
    setUsers,
    myMembershipId,
    setMyMembershipId,
    selectedRoleId,
    setSelectedRoleId,
    newRoleName,
    setNewRoleName,
    newRoleKey,
    setNewRoleKey,
    formData,
    setFormData,
    isLoading,
    setIsLoading,
    showRoleFields,
    setShowRoleFields,
    coreSettingsMap,
    setCoreSettingsMap,
    availableLeadGroups,
    setAvailableLeadGroups,
    isCreatingUser,
    setIsCreatingUser,
    selectedQueueType,
    setSelectedQueueType,
    queueTypes,
    setQueueTypes,
    editingRowKey,
    setEditingRowKey,
    editingRow,
    setEditingRow,
    isUpdatingRow,
    setIsUpdatingRow,
    usersPdfLoading,
    setUsersPdfLoading,
    managerSearch,
    setManagerSearch,
    showManagerDropdown,
    setShowManagerDropdown,
    editManagerSearch,
    setEditManagerSearch,
    showEditManagerDropdown,
    setShowEditManagerDropdown,
    userSearchTerm,
    setUserSearchTerm,
    managerDropdownRef,
    editManagerDropdownRef,
    closeManagerDropdowns,
    fetchUsers,
    fetchCoreSettings,
    usersWithSettings,
    filteredUsersWithSettings,
    handleDownloadUsersPdf,
    handleChange,
    handleAddRole,
    handleAddUser,
    handleDeleteUser,
    getRowKey,
    handleEditUser,
    handleCancelRowEdit,
    handleSaveRowEdit,
  };
}

export type AddUserModel = ReturnType<typeof useAddUser>;
