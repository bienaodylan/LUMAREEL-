/**
 * Tests du registre des billets physiques (src/server/db.ts).
 * Lancer : bun run test   (ou : npx tsx --test tests/*.test.ts)
 * Les données sont écrites dans un dossier temporaire : jamais dans data/.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lumareel-db-'));
process.chdir(work); // DATA_DIR = <cwd>/data, résolu au chargement du module

const load = async (tag: string) => (await import(`../src/server/db.ts?${tag}`)).db;

const EVENT = 'evt_wantche';
const CAT = 'cat_wantche_vip';

test('un lot physique a des séries P00001… uniques et des jetons uniques', async () => {
  const db = await load('a');
  const lot1 = db.createPrintBatch({ eventId: EVENT, categoryId: CAT, quantity: 40, requestId: 'req-1' });
  const lot2 = db.createPrintBatch({ eventId: EVENT, categoryId: CAT, quantity: 25, requestId: 'req-2' });
  assert.ok(lot1.success && lot2.success);
  assert.equal(lot1.tickets.length, 40);
  assert.match(lot1.tickets[0].serialNumber, /^LMR-\d{4}-[A-Z]{3}-P00001$/);
  assert.match(lot2.tickets[0].serialNumber, /-P00041$/, 'le 2e lot continue la séquence');
  const all = [...lot1.tickets, ...lot2.tickets];
  assert.equal(new Set(all.map((t: any) => t.serialNumber)).size, 65);
  assert.equal(new Set(all.map((t: any) => t.token)).size, 65);
});

test('deux concerts du même artiste ne partagent aucune série', async () => {
  const db = await load('a'); // même instance : la séquence est globale
  const other = db.createPrintBatch({
    eventId: 'evt_inconnu_2', categoryId: 'c', quantity: 5, requestId: 'req-3',
    snapshot: { eventTitle: 'WANTCHÉ 2', artist: 'WANTCHÉ', date: '2027-01-01', time: '20:00', venue: 'Salle', categoryName: 'VIP' },
  });
  assert.ok(other.success);
  assert.match(other.tickets[0].serialNumber, /-P00066$/);
});

test('un billet en ligne ne croise jamais un billet physique', async () => {
  const db = await load('a');
  const serials = new Set<string>();
  const tokens = new Set<string>();
  for (const t of db.createPrintBatch({ eventId: EVENT, categoryId: CAT, quantity: 30, requestId: 'req-4' }).tickets) {
    serials.add(t.serialNumber); tokens.add(t.token);
  }
  let online = 0;
  for (let i = 0; i < 60; i++) {
    const pending = db.createPendingOrder({
      customerId: 'guest', customerName: 'T', customerEmail: `t${i}@x.com`, eventId: EVENT, categoryId: CAT, quantity: 3,
    });
    assert.ok(pending.success, JSON.stringify(pending));
    const paid = db.confirmPaymentAndIssueTickets(pending.order.id, `ref${i}`);
    for (const t of paid.tickets) {
      assert.ok(!serials.has(t.serialNumber), `doublon de série ${t.serialNumber}`);
      assert.ok(!tokens.has(t.token), 'doublon de jeton');
      assert.doesNotMatch(t.serialNumber, /-[PC]\d{5}$/, 'format réservé aux billets physiques');
      serials.add(t.serialNumber); tokens.add(t.token); online++;
    }
  }
  assert.equal(online, 180);
});

test('requête rejouée (même requestId) : le même lot, jamais un second', async () => {
  const db = await load('a');
  const before = db.getPrintTicketCount();
  const first = db.createPrintBatch({ eventId: EVENT, categoryId: CAT, quantity: 12, requestId: 'req-idem' });
  const again = db.createPrintBatch({ eventId: EVENT, categoryId: CAT, quantity: 12, requestId: 'req-idem' });
  assert.ok(first.success && again.success);
  assert.equal(again.reused, true);
  assert.deepEqual(again.tickets, first.tickets);
  assert.equal(db.getPrintTicketCount(), before + 12);
});

test('concert inconnu sans description : erreur claire ; avec description : lot créé', async () => {
  const db = await load('a');
  const refused = db.createPrintBatch({ eventId: 'evt_zzz', categoryId: 'c', quantity: 3, requestId: 'req-x' });
  assert.equal(refused.success, false);
  assert.equal(refused.code, 'CONCERT');
  const ok = db.createPrintBatch({
    eventId: 'evt_zzz', categoryId: 'c', quantity: 3, requestId: 'req-y',
    snapshot: { eventTitle: 'ZZZ', artist: 'ZZZ', date: '2027-02-02', time: '19:00', venue: 'V', categoryName: 'GP' },
  });
  assert.ok(ok.success);
});

test('quantités invalides refusées', async () => {
  const db = await load('a');
  for (const q of [0, -1, 1.5, 10001, NaN]) {
    const r = db.createPrintBatch({ eventId: EVENT, categoryId: CAT, quantity: q, requestId: `q${q}` });
    assert.equal(r.success, false, `quantité ${q}`);
  }
});

test('échec d’écriture disque : aucun billet n’existe, erreur renvoyée', async () => {
  const db = await load('a');
  const before = db.getPrintTicketCount();
  const real = fs.renameSync;
  (fs as any).renameSync = () => { throw new Error('ENOSPC simulé'); };
  const silence = console.error; console.error = () => {};
  let r: any;
  try { r = db.createPrintBatch({ eventId: EVENT, categoryId: CAT, quantity: 7, requestId: 'req-disk' }); }
  finally { (fs as any).renameSync = real; console.error = silence; }
  assert.equal(r.success, false);
  assert.equal(r.code, 'DISQUE');
  assert.equal(db.getPrintTicketCount(), before, 'rien ne doit rester en mémoire');
  const retry = db.createPrintBatch({ eventId: EVENT, categoryId: CAT, quantity: 7, requestId: 'req-disk' });
  assert.ok(retry.success && !retry.reused, 'le même requestId peut être rejoué après un échec');
});

test('après un redémarrage, les billets sont reconnus et la séquence continue', async () => {
  const db = await load('a');
  const last = db.createPrintBatch({ eventId: EVENT, categoryId: CAT, quantity: 4, requestId: 'req-last' }).tickets;
  const restarted = await load('b'); // nouvelle instance : relit data/*.json
  for (const t of last) assert.ok(restarted.getTicketByToken(t.token), 'billet inconnu après redémarrage');
  const next = restarted.createPrintBatch({ eventId: EVENT, categoryId: CAT, quantity: 2, requestId: 'req-next' }).tickets;
  const used = new Set(last.map((t: any) => t.serialNumber));
  for (const t of next) assert.ok(!used.has(t.serialNumber));
});

test('registre corrompu : restauré depuis la copie de secours', async () => {
  const file = path.join(work, 'data', 'print_tickets.json');
  assert.ok(fs.existsSync(`${file}.bak`), 'copie de secours absente');
  fs.writeFileSync(file, '{ corrompu');
  const silence = console.error; console.error = () => {};
  let db: any;
  try { db = await load('c'); } finally { console.error = silence; }
  assert.ok(db.getPrintTicketCount() > 0, 'le registre ne doit pas repartir vide');
});
