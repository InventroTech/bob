import { describe, expect, it } from 'vitest';
import { stateNameLookup } from './useRmFilterOptions';

describe('stateNameLookup', () => {
  it('maps each option value to its label', () => {
    const map = stateNameLookup([
      { value: 'All states', label: 'All states' },
      { value: '72631', label: 'Tamil Nadu' },
      { value: '33009', label: 'Andhra Pradesh' },
    ]);
    expect(map).toEqual({
      'All states': 'All states',
      '72631': 'Tamil Nadu',
      '33009': 'Andhra Pradesh',
    });
  });

  it('returns an empty map for an empty list', () => {
    expect(stateNameLookup([])).toEqual({});
  });
});
