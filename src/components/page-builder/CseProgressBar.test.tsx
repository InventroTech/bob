import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CseProgressBar } from './CseProgressBar';

const get = vi.fn();
const auth = { session: { access_token: 'token' } };

vi.mock('@/lib/api/client', () => ({
  createApiClient: () => ({ get: (...args: unknown[]) => get(...args) }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth,
}));

const progress = (taken: number, resolved: number, goal = 70) => ({
  data: {
    taken_today: taken,
    resolved_today: resolved,
    resolve_rate: taken ? (resolved / taken) * 100 : null,
    goal_percent: goal,
  },
});

describe('CseProgressBar resolved count', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('shows the resolved count while below the goal', async () => {
    get.mockResolvedValue(progress(5, 2));
    render(<CseProgressBar config={{ refreshInterval: 0 }} />);

    expect(await screen.findByText('2 of 5 resolved today')).toBeTruthy();
    expect(screen.queryByText(/Goal met/)).toBeNull();
  });

  it('keeps showing the resolved count after the goal is met', async () => {
    get.mockResolvedValue(progress(10, 7));
    render(<CseProgressBar config={{ refreshInterval: 0 }} />);

    expect(await screen.findByText(/7 of 10 resolved today/)).toBeTruthy();
    expect(screen.getByText(/Goal met — keep going\./)).toBeTruthy();
  });
});
