import { describe, it, expect } from 'vitest';

describe('Testing Setup Verification', () => {
  it('should have vitest configured correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support async/await', async () => {
    const result = await Promise.resolve('testing works');
    expect(result).toBe('testing works');
  });

  it('should support TypeScript', () => {
    const message: string = 'TypeScript works';
    expect(message).toBeTypeOf('string');
  });

  it('should support ES6 imports', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });
});