import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhysicalBatch, BatchError, BatchDeps, BatchRequest } from '../src/utils/printBatch.ts';

const req: BatchRequest = {
  eventId: 'e1', categoryId: 'c1', quantity: 2, requestId: 'rid-1',
  snapshot: { eventTitle: 'T', artist: 'A', date: '2026-12-01', time: '20:00', venue: 'V', categoryName: 'VIP', price: 100 },
};
const tickets = [{ id: 'a', serialNumber: 'S1', token: 'T1' }, { id: 'b', serialNumber: 'S2', token: 'T2' }];
const json = (status: number, body: any) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const html = () => new Response('<html/>', { status: 200, headers: { 'content-type': 'text/html' } });

function deps(over: Partial<BatchDeps>): BatchDeps {
  return { fetch: async () => json(201, { success: true, batchId: 'prt_x', batchRef: 'LOT-1', tickets }),
    sleep: async () => {}, isOnline: () => true, cloud: null, timeoutMs: 50, retryDelaysMs: [1, 1], ...over };
}
const okCloud = (calls: string[] = []) => ({
  async createBatch() { calls.push('rpc'); return { data: { success: true, batchRef: 'LOT-C', tickets }, error: null }; },
  async mirror() { calls.push('mirror'); return { error: null }; },
  async ping() { return { ok: true, message: 'ok' }; },
  async hasBatchFunction() { return { ok: true, message: 'ok' }; },
});

test('succès serveur + copie cloud', async () => {
  const calls: string[] = [];
  const r = await createPhysicalBatch(req, deps({ cloud: okCloud(calls) }));
  assert.equal(r.source, 'serveur'); assert.equal(r.mirror, 'fait'); assert.deepEqual(calls, ['mirror']);
});

test('réessaie après coupure réseau avec le même requestId', async () => {
  const bodies: string[] = []; let n = 0;
  const r = await createPhysicalBatch(req, deps({ fetch: async (_u, init) => {
    bodies.push(String(init?.body)); if (++n < 3) throw new TypeError('fail'); return json(201, { success: true, batchId: 'p', batchRef: 'L', tickets });
  } }));
  assert.equal(n, 3); assert.equal(r.source, 'serveur');
  assert.ok(bodies.every((b) => JSON.parse(b).requestId === 'rid-1'));
});

test('serveur down -> repli cloud', async () => {
  const calls: string[] = [];
  const r = await createPhysicalBatch(req, deps({ fetch: async () => { throw new TypeError('x'); }, cloud: okCloud(calls) }));
  assert.equal(r.source, 'cloud'); assert.deepEqual(calls, ['rpc']);
});

test('hébergement statique (HTML) -> pas de retry, repli cloud', async () => {
  let n = 0;
  const r = await createPhysicalBatch(req, deps({ fetch: async () => { n++; return html(); }, cloud: okCloud() }));
  assert.equal(n, 1); assert.equal(r.source, 'cloud');
});

test('serveur down sans cloud -> erreur explicite, aucun billet', async () => {
  await assert.rejects(createPhysicalBatch(req, deps({ fetch: async () => { throw new TypeError('x'); } })),
    (e: any) => e instanceof BatchError && /Aucun billet n’a été créé/.test(e.message) && e.kind === 'reseau');
});

test('refus de validation : pas de repli', async () => {
  const calls: string[] = [];
  await assert.rejects(createPhysicalBatch(req, deps({ fetch: async () => json(400, { success: false, error: 'Concert introuvable' }), cloud: okCloud(calls) })),
    (e: any) => e.kind === 'refus' && /Concert introuvable/.test(e.message));
  assert.deepEqual(calls, []);
});

test('hors ligne', async () => {
  await assert.rejects(createPhysicalBatch(req, deps({ fetch: async () => { throw new TypeError('x'); }, isOnline: () => false, cloud: okCloud() })),
    (e: any) => e.kind === 'hors_ligne');
});

test('délai dépassé puis succès', async () => {
  let n = 0;
  const r = await createPhysicalBatch(req, deps({ fetch: (_u, init) => { n++; if (n === 1) return new Promise((_, rej) => init!.signal!.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' })))); return Promise.resolve(json(201, { success: true, batchId: 'p', batchRef: 'L', tickets })); } }));
  assert.equal(n, 2); assert.equal(r.source, 'serveur');
});

test('fonction SQL absente : message clair', async () => {
  const cloud = { ...okCloud(), async createBatch() { return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.create_print_batch' } }; } };
  await assert.rejects(createPhysicalBatch(req, deps({ fetch: async () => { throw new TypeError('x'); }, cloud })),
    (e: any) => /section 12/.test(e.message));
});

test('copie cloud en échec : lot valide + avertissement', async () => {
  const cloud = { ...okCloud(), async mirror() { return { error: 'boom' }; } };
  const r = await createPhysicalBatch(req, deps({ cloud }));
  assert.equal(r.mirror, 'echec'); assert.ok(r.notes.some((n) => /boom/.test(n)));
});
