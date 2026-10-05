const express = require('express');
const multer = require('multer');
const store = require('../store');
const { hashPassword, timingSafeEqual, randomPassword } = require('../auth');
const { page, esc } = require('../views');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) return res.redirect('/admin/login');
  next();
}

router.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.send(renderAdminLogin());
});

router.post('/admin/login', (req, res) => {
  const user = process.env.ADMIN_USER || '';
  const pass = process.env.ADMIN_PASSWORD || '';
  if (!pass) {
    return res.status(500).send(renderAdminLogin('ADMIN_PASSWORD staat niet in .env op de server.'));
  }
  const ok = timingSafeEqual(req.body.username || '', user) && timingSafeEqual(req.body.password || '', pass);
  if (!ok) return res.status(401).send(renderAdminLogin('Gebruikersnaam of wachtwoord klopt niet.'));
  req.session.isAdmin = true;
  res.redirect('/admin');
});

router.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.use('/admin', requireAdmin);

// ---- Dashboard: alle klanten ----
router.get('/admin', (req, res) => {
  const db = store.load();
  res.send(renderDashboard(db));
});

router.post('/admin/clients', async (req, res) => {
  const naam = String(req.body.naam || '').trim();
  if (!naam) return res.redirect('/admin');
  await store.update((db) => {
    const slug = uniqueSlug(db.clients.map((c) => c.slug), store.slugify(naam));
    db.clients.push({ id: store.id(), naam, slug, createdAt: new Date().toISOString() });
  });
  res.redirect('/admin');
});

router.post('/admin/clients/:clientId/delete', async (req, res) => {
  await store.update((db) => {
    const projectIds = db.projects.filter((p) => p.clientId === req.params.clientId).map((p) => p.id);
    db.projects = db.projects.filter((p) => p.clientId !== req.params.clientId);
    db.people.forEach((p) => { p.projectIds = p.projectIds.filter((id) => !projectIds.includes(id)); });
    db.clients = db.clients.filter((c) => c.id !== req.params.clientId);
  });
  res.redirect('/admin');
});

// ---- Eén klant: projecten + personen van die klant ----
router.get('/admin/clients/:clientId', (req, res) => {
  const db = store.load();
  const client = db.clients.find((c) => c.id === req.params.clientId);
  if (!client) return res.status(404).send(page({ title: 'Niet gevonden', body: '<div class="card"><h1>Niet gevonden</h1><p class="sub" style="margin-top:8px">Klant niet gevonden. <a href="/admin">Terug</a></p></div>' }));
  res.send(renderClient(db, client));
});

router.post('/admin/clients/:clientId/projects', upload.single('html'), async (req, res) => {
  const naam = String(req.body.naam || '').trim();
  if (!naam) return res.redirect(`/admin/clients/${req.params.clientId}`);
  let newId;
  await store.update((db) => {
    const client = db.clients.find((c) => c.id === req.params.clientId);
    if (!client) return;
    const slug = uniqueSlug(db.projects.filter((p) => p.clientId === client.id).map((p) => p.slug), store.slugify(naam));
    newId = store.id();
    db.projects.push({
      id: newId,
      clientId: client.id,
      naam,
      slug,
      html: req.file ? req.file.buffer.toString('utf8') : '',
      createdAt: new Date().toISOString(),
    });
  });
  res.redirect(newId ? `/admin/projects/${newId}` : `/admin/clients/${req.params.clientId}`);
});

router.post('/admin/projects/:projectId/delete', async (req, res) => {
  const db = store.load();
  const project = db.projects.find((p) => p.id === req.params.projectId);
  const clientId = project ? project.clientId : null;
  await store.update((db2) => {
    db2.projects = db2.projects.filter((p) => p.id !== req.params.projectId);
    db2.people.forEach((p) => { p.projectIds = p.projectIds.filter((id) => id !== req.params.projectId); });
  });
  res.redirect(clientId ? `/admin/clients/${clientId}` : '/admin');
});

// ---- Eén project: HTML plaatsen, toegang beheren ----
router.get('/admin/projects/:projectId', (req, res) => {
  const db = store.load();
  const project = db.projects.find((p) => p.id === req.params.projectId);
  if (!project) return res.status(404).send(page({ title: 'Niet gevonden', body: '<div class="card"><h1>Niet gevonden</h1><p class="sub" style="margin-top:8px">Project niet gevonden. <a href="/admin">Terug</a></p></div>' }));
  const client = db.clients.find((c) => c.id === project.clientId);
  res.send(renderProject(db, client, project, req.query));
});

router.post('/admin/projects/:projectId/html', upload.single('html'), async (req, res) => {
  const html = req.file ? req.file.buffer.toString('utf8') : String(req.body.htmlPaste || '');
  await store.update((db) => {
    const project = db.projects.find((p) => p.id === req.params.projectId);
    if (project && html) project.html = html;
  });
  res.redirect(`/admin/projects/${req.params.projectId}`);
});

router.post('/admin/projects/:projectId/people', async (req, res) => {
  const db = store.load();
  const project = db.projects.find((p) => p.id === req.params.projectId);
  if (!project) return res.redirect('/admin');
  const naam = String(req.body.naam || '').trim();
  const username = String(req.body.username || '').trim();
  if (!username) return res.redirect(`/admin/projects/${req.params.projectId}`);
  const password = randomPassword();
  await store.update((db2) => {
    if (db2.people.some((p) => p.username.toLowerCase() === username.toLowerCase())) return;
    db2.people.push({
      id: store.id(),
      clientId: project.clientId,
      naam,
      username,
      passwordHash: hashPassword(password),
      projectIds: [project.id],
      createdAt: new Date().toISOString(),
    });
  });
  res.redirect(`/admin/projects/${req.params.projectId}?nieuwWachtwoord=${encodeURIComponent(password)}&nieuwGebruiker=${encodeURIComponent(username)}`);
});

router.post('/admin/projects/:projectId/grant', async (req, res) => {
  await store.update((db) => {
    const project = db.projects.find((p) => p.id === req.params.projectId);
    const person = db.people.find((p) => p.id === req.body.personId);
    // Een account hoort bij precies één klant (person.clientId); nooit toegang geven tot een
    // project van een andere klant, ook niet per ongeluk via een gemanipuleerde form-post.
    if (project && person && person.clientId === project.clientId && !person.projectIds.includes(project.id)) {
      person.projectIds.push(project.id);
    }
  });
  res.redirect(`/admin/projects/${req.params.projectId}`);
});

router.post('/admin/projects/:projectId/revoke/:personId', async (req, res) => {
  await store.update((db) => {
    const person = db.people.find((p) => p.id === req.params.personId);
    if (person) person.projectIds = person.projectIds.filter((id) => id !== req.params.projectId);
  });
  res.redirect(`/admin/projects/${req.params.projectId}`);
});

router.post('/admin/people/:personId/reset-password', async (req, res) => {
  const password = randomPassword();
  let projectId;
  await store.update((db) => {
    const person = db.people.find((p) => p.id === req.params.personId);
    if (person) {
      person.passwordHash = hashPassword(password);
      projectId = person.projectIds[0];
    }
  });
  const back = req.body.returnTo || (projectId ? `/admin/projects/${projectId}` : '/admin');
  res.redirect(`${back}${back.includes('?') ? '&' : '?'}nieuwWachtwoord=${encodeURIComponent(password)}&nieuwGebruiker=${encodeURIComponent(req.body.username || '')}`);
});

router.post('/admin/people/:personId/delete', async (req, res) => {
  const back = req.body.returnTo || '/admin';
  await store.update((db) => {
    db.people = db.people.filter((p) => p.id !== req.params.personId);
  });
  res.redirect(back);
});

// ---------------------------------------------------------------------

function uniqueSlug(existing, base) {
  let slug = base;
  let n = 2;
  while (existing.includes(slug)) slug = `${base}-${n++}`;
  return slug;
}

function renderAdminLogin(error) {
  return page({
    title: 'Beheer · aanmelden',
    body: `
<h1>Beheer</h1>
<p class="sub">wit-deliver</p>
<div class="card">
  ${error ? `<div class="error">${esc(error)}</div>` : ''}
  <form method="post" action="/admin/login">
    <label for="username">Gebruikersnaam</label>
    <input type="text" id="username" name="username" autocomplete="username" required autofocus>
    <label for="password">Wachtwoord</label>
    <input type="password" id="password" name="password" autocomplete="current-password" required>
    <button type="submit">Aanmelden</button>
  </form>
</div>`,
  });
}

function nav(...crumbs) {
  return `<nav>${crumbs.map((c) => (typeof c === 'string' ? c : `<a href="${c.href}">${esc(c.label)}</a>`)).join('<span class="sep">/</span>')}
  <span style="float:right"><a href="#" onclick="document.getElementById('lo').submit();return false">Afmelden</a></span>
  <form id="lo" method="post" action="/admin/logout" style="display:none"></form></nav>`;
}

function renderDashboard(db) {
  const rows = db.clients
    .map((c) => {
      const projectCount = db.projects.filter((p) => p.clientId === c.id).length;
      return `<tr>
        <td><a href="/admin/clients/${c.id}">${esc(c.naam)}</a></td>
        <td class="muted">${esc(c.slug)}</td>
        <td>${projectCount}</td>
        <td><form method="post" action="/admin/clients/${c.id}/delete" onsubmit="return confirm('Klant ${esc(c.naam)} en alle projecten verwijderen?')"><button type="submit" class="secondary danger small">verwijderen</button></form></td>
      </tr>`;
    })
    .join('');
  return page({
    wide: true,
    title: 'Beheer · klanten',
    brandSub: 'Beheer',
    body: `
${nav({ href: '/admin', label: 'Klanten' })}
<h1>Klanten</h1>
<p class="sub">Elke klant is afgeschermd van elke andere. Een project hoort bij één klant.</p>
<div class="card">
  <table>
    <tr><th>Naam</th><th>Slug</th><th>Projecten</th><th></th></tr>
    ${rows || '<tr><td colspan="4" class="empty">Nog geen klant.</td></tr>'}
  </table>
  <form method="post" action="/admin/clients" class="row" style="margin-top:20px">
    <input type="text" name="naam" placeholder="Naam van de klant" required style="flex:1;min-width:200px">
    <button type="submit">Klant toevoegen</button>
  </form>
</div>`,
  });
}

function renderClient(db, client) {
  const projects = db.projects.filter((p) => p.clientId === client.id);
  const rows = projects
    .map((p) => {
      const n = db.people.filter((pe) => pe.projectIds.includes(p.id)).length;
      return `<tr>
        <td><a href="/admin/projects/${p.id}">${esc(p.naam)}</a></td>
        <td class="muted">${esc(p.slug)}</td>
        <td>${p.html ? '<span class="pill ok">pagina geplaatst</span>' : '<span class="pill">nog leeg</span>'}</td>
        <td>${n}</td>
      </tr>`;
    })
    .join('');
  return page({
    wide: true,
    title: `Beheer · ${client.naam}`,
    brandSub: 'Beheer',
    body: `
${nav({ href: '/admin', label: 'Klanten' }, { href: `/admin/clients/${client.id}`, label: client.naam })}
<h1>${esc(client.naam)}</h1>
<p class="sub">Projecten van deze klant.</p>
<div class="card">
  <table>
    <tr><th>Project</th><th>Slug</th><th>Pagina</th><th>Personen</th></tr>
    ${rows || '<tr><td colspan="4" class="empty">Nog geen project.</td></tr>'}
  </table>
  <form method="post" action="/admin/clients/${client.id}/projects" enctype="multipart/form-data" style="margin-top:20px">
    <label>Naam van het project</label>
    <input type="text" name="naam" required>
    <label>Pagina (de opgeleverde HTML, optioneel nu meteen meegeven)</label>
    <input type="file" name="html" accept=".html,text/html">
    <button type="submit">Project toevoegen</button>
  </form>
</div>
${renderKoppelingen(client)}`,
  });
}

// ---- Koppelingen (referentie-info, geen live verbinding) ----
// Zie INTEGRATIES.md voor de afweging: hier staat alleen een vaste plek om
// account-/property-ID's per klant te noteren. Geen enkele van deze velden
// doet een API-call — er wordt niets opgehaald of weggeschreven bij Google
// Ads, Meta, LinkedIn of GA4. Dat is bewust een latere, losse stap (eigen
// OAuth-app per platform, credentials die alleen WIT kan aanmaken), niet iets
// wat deze sessie zonder toezicht kan of mag opzetten.
const PLATFORMS = [
  { key: 'googleAds', label: 'Google Ads', hint: 'klant-ID, bv. 123-456-7890' },
  { key: 'metaAds', label: 'Meta Ads', hint: 'ad-account-ID' },
  { key: 'linkedinAds', label: 'LinkedIn Ads', hint: 'account-ID' },
  { key: 'ga4', label: 'GA4', hint: 'property-ID' },
];

router.post('/admin/clients/:clientId/koppelingen', async (req, res) => {
  await store.update((db) => {
    const client = db.clients.find((c) => c.id === req.params.clientId);
    if (!client) return;
    client.koppelingen = client.koppelingen || {};
    for (const p of PLATFORMS) client.koppelingen[p.key] = String(req.body[p.key] || '').trim();
  });
  res.redirect(`/admin/clients/${req.params.clientId}`);
});

function renderKoppelingen(client) {
  const k = client.koppelingen || {};
  const fields = PLATFORMS.map(
    (p) => `<label>${esc(p.label)}</label><input type="text" name="${p.key}" placeholder="${esc(p.hint)}" value="${esc(k[p.key] || '')}">`
  ).join('');
  return `
<div class="card" style="margin-top:18px">
  <div class="card-head"><h2>Koppelingen</h2><span class="pill">referentie, nog niet live</span></div>
  <p class="muted" style="margin:0 0 14px">Account-/property-ID's per platform, zodat je ze bij de hand hebt. Dit haalt nog niets op en zet niets weg bij het platform zelf — zie <code>INTEGRATIES.md</code> voor het plan daarnaartoe.</p>
  <form method="post" action="/admin/clients/${client.id}/koppelingen">
    ${fields}
    <button type="submit" class="secondary">Opslaan</button>
  </form>
</div>`;
}

function renderProject(db, client, project, query) {
  const people = db.people.filter((p) => p.projectIds.includes(project.id));
  const clientPeopleZonderToegang = db.people.filter((p) => p.clientId === project.clientId && !p.projectIds.includes(project.id));
  const rows = people
    .map(
      (p) => `<tr>
        <td>${esc(p.naam || '—')}</td>
        <td>${esc(p.username)}</td>
        <td class="row">
          <form method="post" action="/admin/people/${p.id}/reset-password">
            <input type="hidden" name="returnTo" value="/admin/projects/${project.id}">
            <input type="hidden" name="username" value="${esc(p.username)}">
            <button type="submit" class="secondary">nieuw wachtwoord</button>
          </form>
          <form method="post" action="/admin/projects/${project.id}/revoke/${p.id}">
            <button type="submit" class="secondary">toegang intrekken</button>
          </form>
        </td>
      </tr>`
    )
    .join('');
  const grantOptions = clientPeopleZonderToegang.map((p) => `<option value="${p.id}">${esc(p.naam || p.username)} (${esc(p.username)})</option>`).join('');
  const nieuwWachtwoord = query.nieuwWachtwoord
    ? `<div class="notice">Account <b>${esc(query.nieuwGebruiker)}</b> — wachtwoord: <code>${esc(query.nieuwWachtwoord)}</code><br>Dit wachtwoord wordt maar één keer getoond. Geef het buiten dit scherm om door (niet per mail als het gevoelig ligt).</div>`
    : '';
  return page({
    wide: true,
    title: `Beheer · ${project.naam}`,
    brandSub: 'Beheer',
    body: `
${nav({ href: '/admin', label: 'Klanten' }, { href: `/admin/clients/${client.id}`, label: client.naam }, { href: `/admin/projects/${project.id}`, label: project.naam })}
<h1>${esc(project.naam)}</h1>
<p class="sub">${esc(client.naam)} · publieke weergave na aanmelden: <code>/bekijk/${project.id}</code></p>
${nieuwWachtwoord}
<div class="card">
  <div class="card-head"><h2>Pagina</h2>${project.html ? `<a href="/bekijk/${project.id}" target="_blank">bekijken ↗</a>` : ''}</div>
  <p class="muted" style="margin:0 0 4px">${project.html ? 'Er staat een pagina klaar.' : 'Nog geen pagina geplaatst.'}</p>
  <form method="post" action="/admin/projects/${project.id}/html" enctype="multipart/form-data">
    <label>Nieuw HTML-bestand plaatsen (vervangt de huidige pagina)</label>
    <input type="file" name="html" accept=".html,text/html">
    <button type="submit" class="secondary">Plaatsen</button>
  </form>
</div>
<div class="card">
  <h2>Wie heeft toegang</h2>
  <table>
    <tr><th>Naam</th><th>Gebruikersnaam</th><th></th></tr>
    ${rows || '<tr><td colspan="3" class="empty">Nog niemand.</td></tr>'}
  </table>
  <form method="post" action="/admin/projects/${project.id}/people" class="row" style="margin-top:20px">
    <input type="text" name="naam" placeholder="Naam (optioneel)">
    <input type="text" name="username" placeholder="Gebruikersnaam" required>
    <button type="submit">Nieuw account + toegang</button>
  </form>
  ${clientPeopleZonderToegang.length ? `
  <form method="post" action="/admin/projects/${project.id}/grant" class="row" style="margin-top:12px">
    <select name="personId" required><option value="">— bestaand account bij ${esc(client.naam)} —</option>${grantOptions}</select>
    <button type="submit" class="secondary">Toegang geven</button>
  </form>` : ''}
</div>
<form method="post" action="/admin/projects/${project.id}/delete" onsubmit="return confirm('Project ${esc(project.naam)} verwijderen?')">
  <button type="submit" class="secondary danger small">Project verwijderen</button>
</form>`,
  });
}

module.exports = router;
