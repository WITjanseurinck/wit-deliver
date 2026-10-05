const express = require('express');
const store = require('../store');
const {
  checkPassword, hashPassword, timingSafeEqual, currentUser,
  isThrottled, recordFailure, clearFailures, validNewPassword,
} = require('../auth');
const { page, viewerPage, esc } = require('../views');

const router = express.Router();

function findPerson(db, username) {
  const u = String(username || '').trim().toLowerCase();
  return db.people.find((p) => p.username.toLowerCase() === u);
}

// Nieuwe sessie na elke aanmelding, zodat een oude sessie-id nooit meeverhuist.
function startSession(req, res, patch, next) {
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Aanmelden mislukt.');
    Object.assign(req.session, patch);
    req.session.save(() => res.redirect(next));
  });
}

router.get('/login', (req, res) => {
  const user = currentUser(req, store.load());
  if (user) return res.redirect(user.role === 'owner' ? '/admin' : '/');
  res.send(renderLogin());
});

router.post('/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (isThrottled(req, username)) {
    return res.status(429).send(renderLogin('Te veel pogingen. Probeer het over een kwartier opnieuw.'));
  }
  // Owner: de gegevens uit .env. Beide waarden altijd vergelijken.
  const ownerUser = process.env.ADMIN_USER || '';
  const ownerPass = process.env.ADMIN_PASSWORD || '';
  const userOk = timingSafeEqual(username, ownerUser);
  const passOk = timingSafeEqual(password, ownerPass);
  if (ownerPass && userOk && passOk) {
    clearFailures(req, username);
    return startSession(req, res, { isAdmin: true }, '/admin');
  }
  const person = findPerson(store.load(), username);
  if (!person || !checkPassword(password, person.passwordHash)) {
    recordFailure(req, username);
    return res.status(401).send(renderLogin('Gebruikersnaam of wachtwoord klopt niet.'));
  }
  clearFailures(req, username);
  startSession(req, res, { personId: person.id }, person.mustChange ? '/wachtwoord' : '/');
});

function logout(req, res) {
  req.session.destroy(() => res.redirect('/login'));
}
router.post('/logout', logout);
router.get('/logout', logout);
router.get('/admin/login', (req, res) => res.redirect('/login'));
router.post('/admin/logout', logout);

function requireLogin(req, res, next) {
  const db = store.load();
  const user = currentUser(req, db);
  if (!user) return req.session.destroy(() => res.redirect('/login'));
  // Wie nog het doorgegeven startwachtwoord heeft, kiest eerst een eigen wachtwoord.
  if (user.role !== 'owner' && user.mustChange && req.path !== '/wachtwoord') {
    return res.redirect('/wachtwoord');
  }
  req.db = db;
  req.user = user;
  next();
}

function canSee(user, project) {
  return user.role === 'owner' || user.projectIds.includes(project.id);
}

router.get('/', requireLogin, (req, res) => {
  const { db, user } = req;
  if (user.role === 'owner') return res.redirect('/admin');
  const projects = db.projects.filter((pr) => user.projectIds.includes(pr.id));
  if (projects.length === 1) return res.redirect(`/bekijk/${projects[0].id}`);
  res.send(renderOverzicht(user, projects, db));
});

// ---- Eigen wachtwoord kiezen ----
router.get('/wachtwoord', requireLogin, (req, res) => {
  if (req.user.role === 'owner') return res.redirect('/admin');
  res.send(renderWachtwoord(req.user));
});

router.post('/wachtwoord', requireLogin, async (req, res) => {
  const { user } = req;
  if (user.role === 'owner') return res.redirect('/admin');
  const huidig = String(req.body.huidig || '');
  const nieuw = String(req.body.nieuw || '');
  if (!checkPassword(huidig, user.passwordHash)) {
    return res.status(400).send(renderWachtwoord(user, 'Je huidige wachtwoord klopt niet.'));
  }
  const problem = validNewPassword(nieuw);
  if (problem) return res.status(400).send(renderWachtwoord(user, problem));
  if (nieuw !== String(req.body.herhaal || '')) {
    return res.status(400).send(renderWachtwoord(user, 'De twee nieuwe wachtwoorden zijn niet gelijk.'));
  }
  await store.update((db) => {
    const p = db.people.find((x) => x.id === user.id);
    if (p) {
      p.passwordHash = hashPassword(nieuw);
      p.mustChange = false;
    }
  });
  res.redirect('/');
});

// ---- Een opgeleverde pagina bekijken, met feedbackpaneel ----
function noAccess(res, user) {
  return res.status(403).send(
    page({
      title: 'Geen toegang',
      user,
      body: `<div class="card"><h1>Geen toegang</h1><p class="sub">Dit project staat niet open voor jouw account. <a href="/">Terug</a></p></div>`,
    })
  );
}

router.get('/bekijk/:projectId', requireLogin, (req, res) => {
  const { db, user } = req;
  const project = db.projects.find((pr) => pr.id === req.params.projectId);
  if (!project || !canSee(user, project)) return noAccess(res, user);
  if (!project.html) {
    return res.send(page({ title: project.naam, user, body: `<div class="card"><h1>${esc(project.naam)}</h1><p class="sub">Nog geen pagina geplaatst voor dit project.</p></div>` }));
  }
  res.send(
    viewerPage({
      title: project.naam,
      user,
      src: `/inhoud/${project.id}`,
      panel: renderPanel(db, project, user),
    })
  );
});

// De opgeleverde HTML zelf. Draait in een sandbox zonder toegang tot deze
// site (geen same-origin), ook als iemand de URL rechtstreeks opent.
router.get('/inhoud/:projectId', requireLogin, (req, res) => {
  const { db, user } = req;
  const project = db.projects.find((pr) => pr.id === req.params.projectId);
  if (!project || !project.html || !canSee(user, project)) return res.status(403).send('Geen toegang.');
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Content-Security-Policy', 'sandbox allow-scripts allow-popups allow-forms allow-downloads');
  res.set('Cache-Control', 'private, no-store');
  res.send(project.html);
});

router.post('/bekijk/:projectId/reactie', requireLogin, async (req, res) => {
  const { db, user } = req;
  const project = db.projects.find((pr) => pr.id === req.params.projectId);
  if (!project || !canSee(user, project)) return noAccess(res, user);
  const tekst = String(req.body.tekst || '').trim().slice(0, 4000);
  if (tekst) {
    await store.update((d) => {
      d.comments.push({
        id: store.id(),
        projectId: project.id,
        personId: user.role === 'owner' ? null : user.id,
        door: user.naam || user.username,
        role: user.role,
        tekst,
        createdAt: new Date().toISOString(),
      });
    });
  }
  res.redirect(`/bekijk/${project.id}`);
});

// Alleen een client beslist; een reviewer en de owner kunnen dat niet.
router.post('/bekijk/:projectId/besluit', requireLogin, async (req, res) => {
  const { db, user } = req;
  const project = db.projects.find((pr) => pr.id === req.params.projectId);
  if (!project || !canSee(user, project)) return noAccess(res, user);
  if (user.role !== 'client') return res.status(403).send('Alleen een client kan goedkeuren.');
  const besluit = req.body.besluit === 'goedgekeurd' ? 'goedgekeurd' : 'wijzigingen';
  await store.update((d) => {
    const pr = d.projects.find((x) => x.id === project.id);
    pr.status = besluit;
    pr.besluit = { door: user.naam || user.username, op: new Date().toISOString() };
  });
  res.redirect(`/bekijk/${project.id}`);
});

// ---------------------------------------------------------------------

function fmtDate(iso) {
  return new Date(iso).toLocaleString('nl-BE', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusPill(project) {
  if (project.status === 'goedgekeurd') return '<span class="pill ok">goedgekeurd</span>';
  if (project.status === 'wijzigingen') return '<span class="pill wijzig">wijzigingen gevraagd</span>';
  return '<span class="pill">in review</span>';
}

function renderPanel(db, project, user) {
  const comments = db.comments
    .filter((c) => c.projectId === project.id)
    .map(
      (c) => `<div class="comment"><div class="meta"><b>${esc(c.door)}</b><span class="pill ${esc(c.role)}">${esc(c.role)}</span>${esc(fmtDate(c.createdAt))}</div><p>${esc(c.tekst)}</p></div>`
    )
    .join('');
  const decide =
    user.role === 'client'
      ? `<form method="post" action="/bekijk/${project.id}/besluit" class="row" style="margin-bottom:8px">
  <button class="approve small" name="besluit" value="goedgekeurd" type="submit">Goedkeuren</button>
  <button class="secondary small" name="besluit" value="wijzigingen" type="submit">Wijzigingen vragen</button>
</form>`
      : '';
  const besluit = project.besluit
    ? `<p class="muted">Laatste besluit: ${esc(project.besluit.door)} · ${esc(fmtDate(project.besluit.op))}</p>`
    : '';
  return `<h2>${esc(project.naam)}</h2>
<p style="margin:6px 0 16px">${statusPill(project)}</p>
${decide}${besluit}
<h2 style="margin-top:22px">Opmerkingen</h2>
${comments || '<p class="muted">Nog geen opmerkingen.</p>'}
<form method="post" action="/bekijk/${project.id}/reactie">
  <label for="tekst">Schrijf een opmerking</label>
  <textarea id="tekst" name="tekst" maxlength="4000" required></textarea>
  <button type="submit" class="secondary small">Plaatsen</button>
</form>`;
}

function renderLogin(error) {
  return page({
    title: 'Aanmelden',
    body: `
<h1>Aanmelden</h1>
<p class="sub">Je opgeleverde werk, afgeschermd.</p>
<div class="card">
  ${error ? `<div class="error">${esc(error)}</div>` : ''}
  <form method="post" action="/login">
    <label for="username">Gebruikersnaam</label>
    <input type="text" id="username" name="username" autocomplete="username" required autofocus>
    <label for="password">Wachtwoord</label>
    <input type="password" id="password" name="password" autocomplete="current-password" required>
    <button type="submit">Aanmelden</button>
  </form>
</div>`,
  });
}

function renderWachtwoord(user, error) {
  const eerste = user.mustChange;
  return page({
    title: 'Wachtwoord',
    user,
    body: `
<h1>${eerste ? 'Kies je eigen wachtwoord' : 'Wachtwoord wijzigen'}</h1>
<p class="sub">${eerste ? 'Je bent aangemeld met een startwachtwoord. Kies nu een wachtwoord dat alleen jij kent.' : 'Minstens 10 tekens.'}</p>
<div class="card">
  ${error ? `<div class="error">${esc(error)}</div>` : ''}
  <form method="post" action="/wachtwoord">
    <label for="huidig">Huidig wachtwoord</label>
    <input type="password" id="huidig" name="huidig" autocomplete="current-password" required>
    <label for="nieuw">Nieuw wachtwoord</label>
    <input type="password" id="nieuw" name="nieuw" autocomplete="new-password" minlength="10" required>
    <label for="herhaal">Herhaal nieuw wachtwoord</label>
    <input type="password" id="herhaal" name="herhaal" autocomplete="new-password" minlength="10" required>
    <button type="submit">Opslaan</button>
  </form>
</div>`,
  });
}

function renderOverzicht(user, projects, db) {
  const rows = projects
    .map((pr) => {
      const client = db.clients.find((c) => c.id === pr.clientId);
      return `<li><a href="/bekijk/${pr.id}"><span>${esc(client ? client.naam : '')} · ${esc(pr.naam)}</span>${statusPill(pr)}</a></li>`;
    })
    .join('');
  return page({
    title: 'Projecten',
    user,
    body: `
<h1>Hallo${user.naam ? ', ' + esc(user.naam) : ''}</h1>
<p class="sub">Kies een project.</p>
<div class="card">
  <ul class="list">${rows || '<li class="muted" style="padding:12px 0">Nog geen project voor je klaargezet.</li>'}</ul>
</div>`,
  });
}

module.exports = router;
