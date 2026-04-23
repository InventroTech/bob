let currentAccessToken: string | null = null;

export const setAccessToken = (token: string | null | undefined): void => {
  currentAccessToken = token ?? null;
};

export const getAccessToken = (): string | null => {
  return currentAccessToken;
};

export const clearAccessToken = (): void => {
  currentAccessToken = null;
};
