import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lumareel-upload-migration-'));
const dataDir = path.join(root, 'data');
const storageDir = path.join(root, 'storage', 'uploads');
const legacyDir = path.join(root, 'public', 'uploads');
const quarantineDir = path.join(root, 'quarantine');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(storageDir, { recursive: true });
fs.mkdirSync(legacyDir, { recursive: true });

process.env.VITEST = 'true';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'upload_migration_test_secret_0123456789abcdef0123456789';
process.env.LUMAREEL_DATA_DIR = dataDir;
process.env.LUMAREEL_STORAGE_DIR = storageDir;
process.env.LUMAREEL_LEGACY_UPLOADS_DIR = legacyDir;
process.env.LUMAREEL_QUARANTINE_DIR = quarantineDir;

let app: any;

describe('P0-8 legacy upload migration', () => {
  beforeAll(async () => {
    const validPng = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    }).png().toBuffer();

    fs.writeFileSync(path.join(legacyDir, 'valid-image.png'), validPng);
    fs.writeFileSync(path.join(legacyDir, 'fake-image.png'), '<html><script>alert(1)</script></html>');

    const server = await import('../server.ts');
    app = await server.createApp();
  });

  afterAll(() => {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  it('réencode les vraies images, met les fichiers actifs en quarantaine et ne sert pas le HTML', async () => {
    const storedFiles = fs.readdirSync(storageDir);
    const quarantinedFiles = fs.readdirSync(quarantineDir);

    expect(storedFiles).toHaveLength(1);
    expect(storedFiles[0]).toMatch(/^[a-f0-9-]+\.png$/i);
    expect(quarantinedFiles).toHaveLength(1);
    expect(quarantinedFiles[0]).toContain('fake-image.png');
    expect(fs.existsSync(path.join(legacyDir, 'valid-image.png'))).toBe(false);
    expect(fs.existsSync(path.join(legacyDir, 'fake-image.png'))).toBe(false);

    const imageResponse = await request(app).get(`/uploads/${storedFiles[0]}`);
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers['content-type']).toContain('image/png');
    expect(imageResponse.headers['x-content-type-options']).toBe('nosniff');

    const unsafeResponse = await request(app).get(`/uploads/${quarantinedFiles[0]}`);
    expect(unsafeResponse.status).toBe(404);
  });
});
