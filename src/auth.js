const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}

function checkPassword(pw, hash) {
  if (!pw || !hash) return false;
  try {
    return bcrypt.compareSync(pw, hash);
  } catch {
    return false;
  }
}

// Voor de vergelijking met de admin-wachtwoord-omgevingsvariabele: geen
// bcrypt nodig (geen opgeslagen hash, gewoon een .env-waarde), maar wel
// timing-safe zodat je niet per toeval het wachtwoord karakter voor
// karakter kan afgaan op responstijd.
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function randomPassword() {
  // Leesbaar genoeg om mondeling of via een beveiligd kanaal door te geven:
  // geen 0/O/1/l/I, geen leestekens.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 14; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return out;
}

// Wie is er aangemeld? Eén van drie rollen:
//   owner     — WIT zelf (ADMIN_USER/ADMIN_PASSWORD uit .env): beheert alles
//   client    — een persoon van de klant: bekijkt en keurt goed of vraagt wijzigingen
//   reviewer  — meelezer (ook extern): bekijkt en geeft opmerkingen, beslist niet
function currentUser(req, db) {
  if (req.session.isAdmin) {
    return { role: 'owner', naam: 'WIT', username: process.env.ADMIN_USER || 'owner' };
  }
  if (!req.session.personId) return null;
  const p = db.people.find((x) => x.id === req.session.personId);
  return p || null;
}

// Eenvoudige rem op wachtwoord raden: per IP + gebruikersnaam, 8 mislukte
// pogingen per 15 minuten. In het geheugen is genoeg voor één proces.
const failures = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX_FAILS = 8;
function throttleKey(req, username) {
  return `${req.ip}|${String(username || '').toLowerCase()}`;
}
function isThrottled(req, username) {
  const k = throttleKey(req, username);
  const f = (failures.get(k) || []).filter((t) => Date.now() - t < WINDOW);
  failures.set(k, f);
  return f.length >= MAX_FAILS;
}
function recordFailure(req, username) {
  const k = throttleKey(req, username);
  failures.set(k, [...(failures.get(k) || []), Date.now()]);
}
function clearFailures(req, username) {
  failures.delete(throttleKey(req, username));
}

function validNewPassword(pw) {
  if (String(pw || '').length < 10) return 'Kies een wachtwoord van minstens 10 tekens.';
  return null;
}

module.exports = {
  hashPassword, checkPassword, timingSafeEqual, randomPassword,
  currentUser, isThrottled, recordFailure, clearFailures, validNewPassword,
};
