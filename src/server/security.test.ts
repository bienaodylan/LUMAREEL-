import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertBootSecurityConfig,
  hashPasswordScrypt,
  verifyPasswordWithUpgrade,
} from './security';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('boot security configuration', () => {
  it('fails closed when SESSION_SECRET is absent in a non-production runtime', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('SESSION_SECRET', '');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code): never => {
      throw new Error(`process.exit(${code})`);
    });

    expect(() => assertBootSecurityConfig()).toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(process.env.SESSION_SECRET).toBe('');
  });

  it('fails closed when SESSION_SECRET is shorter than 32 characters', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('SESSION_SECRET', 'too-short');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code): never => {
      throw new Error(`process.exit(${code})`);
    });

    expect(() => assertBootSecurityConfig()).toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('accepts an explicitly configured session secret of at least 32 characters', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('SESSION_SECRET', 'a'.repeat(64));

    expect(() => assertBootSecurityConfig()).not.toThrow();
  });
});

describe('password hashing', () => {
  it('uses a per-password random salt and verifies only the correct password', () => {
    const first = hashPasswordScrypt('correct horse battery staple');
    const second = hashPasswordScrypt('correct horse battery staple');

    expect(first).not.toBe(second);
    expect(first.split('$')[4]).not.toBe(second.split('$')[4]);
    expect(verifyPasswordWithUpgrade('correct horse battery staple', first)).toEqual({
      valid: true,
      needsUpgrade: false,
    });
    expect(verifyPasswordWithUpgrade('incorrect password', first)).toEqual({
      valid: false,
      needsUpgrade: false,
    });
  });
});
