const express = require('express');
const store = require('../store');
const { checkPassword } = require('../auth');
const { page, esc } = require('../views');

const router = express.Router();

function findPerson(db, username) {
  const u = String(username || '').trim().toLowerCase();
  return db.people.find((p) => p.username.toLowerCase() === u);
}

router.get('/login', (req, res) => {
  if (req.session.personId) return res.redirect('/');
  res.send(renderLogin());
});

router.post('/login', (req, res) => {
  const db = store.load();
  const person = findPerson(db, req.body.username);
  if (!person || !checkPassword(req.body.password || '', person.passwordHash)) {
    return res.status(401).send(renderLogin('Gebruikersnaam of wachtwoord klopt niet.'));
  }
  req.session.personId = person.id;
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

function requireLogin(req, res, next) {
  if (!req.session.personId) return res.redirect('/login');
  next();
}

router.get('/', requireLogin, (req, res) => {
  const db = store.load();
  const person = db.people.find((p) => p.id === req.session.personId);
  if (!person) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }
  const projects = db.projects.filter((pr) => person.projectIds.includes(pr.id));
  if (projects.length === 1) return res.redirect(`/bekijk/${projects[0].id}`);
  res.send(renderOverzicht(person, projects, db));
});

router.get('/bekijk/:projectId', requireLogin, (req, res) => {
  const db = store.load();
  const person = db.people.find((p) => p.id === req.session.personId);
  const project = db.projects.find((pr) => pr.id === req.params.projectId);
  if (!person || !project || !person.projectIds.includes(project.id)) {
    return res.status(403).send(page({ title: 'Geen toegang', body: `<div class="card"><h1>Geen toegang</h1><p class="sub" style="margin-top:8px">Dit project staat niet open voor jouw account. <a href="/">Terug</a></p></div>` }));
  }
  if (!project.html) {
    return res.send(page({ title: project.naam, body: `<div class="card"><h1>${esc(project.naam)}</h1><p class="sub" style="margin-top:8px">Nog geen pagina geplaatst voor dit project.</p></div>` }));
  }
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(project.html);
});

function renderLogin(error) {
  return page({
    title: 'Aanmelden',
    body: `
<h1>Aanmelden</h1>
<p class="sub">Log in om je project te bekijken.</p>
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

function renderOverzicht(person, projects, db) {
  const rows = projects
    .map((pr) => {
      const client = db.clients.find((c) => c.id === pr.clientId);
      return `<li><a href="/bekijk/${pr.id}">${esc(pr.naam)}<small>${esc(client ? client.naam : '')}</small></a></li>`;
    })
    .join('');
  return page({
    title: 'Projecten',
    brandSub: person.naam || person.username,
    body: `
<h1>Hallo${person.naam ? ', ' + esc(person.naam) : ''}</h1>
<p class="sub">Kies een project.</p>
<div class="card">
  <ul class="projlist">${rows || '<li class="empty">Nog geen project voor je klaargezet.</li>'}</ul>
</div>
<p class="muted" style="margin-top:16px"><a href="/logout">Afmelden</a></p>`,
  });
}

module.exports = router;
