let currentAccessToken: string | null = null;

const SPOOF_JWT_KEY = 'pyro_spoof_jwt';

const getSpoofAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SPOOF_JWT_KEY);
  } catch {
    return null;
  }
};

export const setAccessToken = (token: string | null | undefined): void => {
  currentAccessToken = token ?? null;
};

export const getAccessToken = (): string | null => {
  const spoofToken = getSpoofAccessToken();
  if (spoofToken) return spoofToken;
  return currentAccessToken;
};

export const isUsingSpoofAccessToken = (): boolean => {
  return !!getSpoofAccessToken();
};

export const clearAccessToken = (): void => {
  currentAccessToken = null;
};
