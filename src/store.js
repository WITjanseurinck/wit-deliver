// Platte JSON-opslag. Bewust geen databasemotor of native module: dit moet
// met `npm install` zonder compiler op gelijk welke VPS kunnen draaien, bij
// een handvol klanten/projecten/personen is dat ruim voldoende.
// Elke wijziging schrijft het hele bestand opnieuw weg (tmp-bestand +
// rename), zodat een crash tijdens het schrijven nooit een half bestand
// achterlaat.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function empty() {
  return { clients: [], projects: [], people: [], comments: [] };
}

function load() {
  if (!fs.existsSync(DB_FILE)) return empty();
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    // Oudere databestanden (van voor rollen en feedback) aanvullen.
    if (!db.comments) db.comments = [];
    db.people.forEach((p) => { if (!p.role) p.role = 'client'; });
    return db;
  } catch (e) {
    throw new Error(`data/db.json is beschadigd of onleesbaar: ${e.message}`);
  }
}

function save(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// Eén simpele vergrendeling per proces: twee requests na elkaar die allebei
// lezen-wijzigen-schrijven, mogen elkaar niet overschrijven. Voor een
// admin-tool met weinig gelijktijdig gebruik is een in-process mutex genoeg;
// meerdere Node-processen tegelijk op hetzelfde databestand wordt niet
// ondersteund (start dit dus niet twee keer tegelijk op dezelfde DATA_DIR).
let queue = Promise.resolve();
function update(fn) {
  queue = queue.then(() => {
    const db = load();
    const result = fn(db);
    save(db);
    return result;
  });
  return queue;
}

function id() {
  return crypto.randomBytes(8).toString('hex');
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'x';
}

module.exports = { load, save, update, id, slugify, DATA_DIR };
