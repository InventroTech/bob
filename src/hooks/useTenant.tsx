export interface TenantContext {
  tenantId: string | null;
  role: 'owner' | 'editor' | 'viewer' | 'app_user' | null;
}

export function useTenant(): TenantContext {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer' | 'app_user' | null>(null);

  useEffect(() => {
    async function fetchTenant() {
      if (!user) return;
      const { data, error } = await supabase
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single();
      if (!error && data) {
        setTenantId(data.tenant_id);
        setRole(data.role as 'owner' | 'editor' | 'viewer' | 'app_user');
      }
    }
    fetchTenant();
  }, [user]);

  return { tenantId, role };
} 