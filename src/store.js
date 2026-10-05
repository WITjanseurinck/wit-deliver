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

// Versie van de structuur van db.json. Bij elke wijziging aan de structuur:
// verhoog dit getal en voeg een stap toe in MIGRATIONS.
const SCHEMA_VERSION = 2;

function empty() {
  return { schemaVersion: SCHEMA_VERSION, clients: [], projects: [], people: [], comments: [] };
}

// Elke stap zet versie n-1 om naar n en mag alleen aanvullen, nooit data weggooien.
const MIGRATIONS = {
  // v1 (zonder schemaVersion) -> v2: rollen, startwachtwoord-vlag, feedback.
  2(db) {
    db.clients = db.clients || [];
    db.projects = db.projects || [];
    db.people = db.people || [];
    db.comments = db.comments || [];
    db.people.forEach((p) => {
      // Bestaande accounts waren klanten en hebben al een eigen wachtwoord:
      // niet dwingen om het opnieuw te kiezen.
      if (!p.role) p.role = 'client';
      if (p.mustChange === undefined) p.mustChange = false;
      p.projectIds = p.projectIds || [];
    });
    db.projects.forEach((pr) => {
      if (!pr.status) pr.status = 'open';
      if (pr.besluit === undefined) pr.besluit = null;
    });
  },
};

function migrate(db) {
  let from = db.schemaVersion || 1;
  if (from > SCHEMA_VERSION) {
    throw new Error(`db.json is van een nieuwere versie (${from}) dan deze code (${SCHEMA_VERSION}).`);
  }
  while (from < SCHEMA_VERSION) {
    from += 1;
    MIGRATIONS[from](db);
    db.schemaVersion = from;
  }
  return db;
}

// Bij het opstarten: als db.json van een oudere versie is, eerst een
// back-up ernaast zetten en dan pas omzetten en wegschrijven.
function init() {
  if (!fs.existsSync(DB_FILE)) return { migrated: false };
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    throw new Error(`data/db.json is beschadigd of onleesbaar: ${e.message}`);
  }
  const from = raw.schemaVersion || 1;
  if (from === SCHEMA_VERSION) return { migrated: false };
  const backup = `${DB_FILE}.v${from}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
  fs.copyFileSync(DB_FILE, backup);
  save(migrate(raw));
  return { migrated: true, from, to: SCHEMA_VERSION, backup };
}

function load() {
  if (!fs.existsSync(DB_FILE)) return empty();
  try {
    return migrate(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
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

module.exports = { init, migrate, SCHEMA_VERSION, load, save, update, id, slugify, DATA_DIR };
