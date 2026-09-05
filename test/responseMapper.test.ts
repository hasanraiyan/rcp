import { describe, expect, it } from 'vitest';
import { applyResponseMappings } from '../src/responseMapper.js';

describe('applyResponseMappings', () => {
  it('passes data through unchanged when there are no mappings', () => {
    const data = { anything: true };
    expect(applyResponseMappings(data, undefined)).toBe(data);
    expect(applyResponseMappings(data, {})).toBe(data);
  });

  it('resolves a dotted path', () => {
    const data = { data: { user: { name: 'Ada' } } };
    expect(applyResponseMappings(data, { userName: '@data.user.name' })).toEqual({
      userName: 'Ada',
    });
  });

  it('indexes arrays with numeric segments', () => {
    const data = { items: [{ id: 'a' }, { id: 'b' }] };
    expect(applyResponseMappings(data, { firstId: '@items.0.id' })).toEqual({ firstId: 'a' });
  });

  it('returns undefined for a path that does not resolve, without throwing', () => {
    const data = { data: {} };
    expect(applyResponseMappings(data, { missing: '@data.nope.deeper' })).toEqual({
      missing: undefined,
    });
  });

  it('returns undefined for a path not starting with @', () => {
    const data = { data: { name: 'Ada' } };
    expect(applyResponseMappings(data, { name: 'data.name' })).toEqual({ name: undefined });
  });
});
