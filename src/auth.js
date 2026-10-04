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

module.exports = { hashPassword, checkPassword, timingSafeEqual, randomPassword };
