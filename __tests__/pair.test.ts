import { canonicalPair } from '@/lib/pair';

describe('canonicalPair', () => {
  it('orders any two ids deterministically for the a<b constraint', () => {
    expect(canonicalPair('b-id', 'a-id')).toEqual(['a-id', 'b-id']);
    expect(canonicalPair('a-id', 'b-id')).toEqual(['a-id', 'b-id']);
    expect(canonicalPair('same', 'same')).toEqual(['same', 'same']);
  });
});
