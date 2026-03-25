import { describe, it, expect } from 'vitest';
import { classifyStatus } from '../goalStatus';

describe('classifyStatus', () => {
  it('returns on_track at 100% and above', () => {
    expect(classifyStatus(100)).toBe('on_track');
    expect(classifyStatus(150)).toBe('on_track');
  });

  it('returns close between 90% and 100%', () => {
    expect(classifyStatus(99.999)).toBe('close');
    expect(classifyStatus(90)).toBe('close');
  });

  it('returns off_target below 90% and for invalid input', () => {
    expect(classifyStatus(89.999)).toBe('off_target');
    expect(classifyStatus(0)).toBe('off_target');
    expect(classifyStatus(NaN)).toBe('off_target');
    expect(classifyStatus(Infinity)).toBe('off_target'); // not finite
  });
});
