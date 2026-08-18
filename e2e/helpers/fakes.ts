export const QA_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'qa@pyro.test',
};

export const QA_TENANT = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'qa-org',
  roleId: '22222222-2222-4222-8222-222222222222',
  roleKey: 'PYRO_ADMIN',
  roleName: 'Pyro Admin',
  membershipId: 1,
};

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const NEW_PAGE_ID = '33333333-3333-4333-8333-333333333333';

export function fakeAccessToken(email = QA_USER.email): string {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    aud: 'authenticated',
    sub: QA_USER.id,
    email,
    role: 'authenticated',
    iat: now,
    exp: now + 60 * 60 * 24,
    user_data: {
      role_id: QA_TENANT.roleId,
      tenant_id: QA_TENANT.id,
      user_id: QA_USER.id,
    },
  })}.sig`;
}

export function fakeSession(email = QA_USER.email) {
  const now = Math.floor(Date.now() / 1000);
  const iso = new Date().toISOString();
  return {
    access_token: fakeAccessToken(email),
    token_type: 'bearer',
    expires_in: 86_400,
    expires_at: now + 86_400,
    refresh_token: 'e2e-refresh-token',
    user: {
      id: QA_USER.id,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: iso,
      phone: '',
      confirmed_at: iso,
      last_sign_in_at: iso,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { email, full_name: 'QA User' },
      identities: [],
      created_at: iso,
      updated_at: iso,
    },
  };
}

export const qaMembership = {
  role_key: QA_TENANT.roleKey,
  role_name: QA_TENANT.roleName,
  role_id: QA_TENANT.roleId,
  tenant_id: QA_TENANT.id,
  tenant_slug: QA_TENANT.slug,
  is_active: true,
  tenant_membership_id: QA_TENANT.membershipId,
  user_parent_id: null,
};

export const qaRoles = {
  results: [{ id: QA_TENANT.roleId, name: QA_TENANT.roleName, key: QA_TENANT.roleKey }],
};
