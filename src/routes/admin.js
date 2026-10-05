const express = require('express');
const multer = require('multer');
const store = require('../store');
const { hashPassword, randomPassword } = require('../auth');
const { page, esc } = require('../views');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = express.Router();

const OWNER = { role: 'owner', naam: 'WIT', username: 'owner' };

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) return res.redirect('/login');
  next();
}

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
  if (!client) return res.status(404).send(page({ user: OWNER, title: 'Niet gevonden', body: '<div class="card">Klant niet gevonden. <a href="/admin">Terug</a></div>' }));
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
  if (!project) return res.status(404).send(page({ user: OWNER, title: 'Niet gevonden', body: '<div class="card">Project niet gevonden. <a href="/admin">Terug</a></div>' }));
  const client = db.clients.find((c) => c.id === project.clientId);
  res.send(renderProject(db, client, project, req.query));
});

router.post('/admin/projects/:projectId/html', upload.single('html'), async (req, res) => {
  const html = req.file ? req.file.buffer.toString('utf8') : String(req.body.htmlPaste || '');
  await store.update((db) => {
    const project = db.projects.find((p) => p.id === req.params.projectId);
    if (project && html) {
      project.html = html;
      project.status = 'open';
      project.besluit = null;
    }
  });
  res.redirect(`/admin/projects/${req.params.projectId}`);
});

router.post('/admin/projects/:projectId/people', async (req, res) => {
  const db = store.load();
  const project = db.projects.find((p) => p.id === req.params.projectId);
  if (!project) return res.redirect('/admin');
  const naam = String(req.body.naam || '').trim();
  const username = String(req.body.username || '').trim();
  const role = req.body.role === 'reviewer' ? 'reviewer' : 'client';
  if (!username) return res.redirect(`/admin/projects/${req.params.projectId}`);
  const password = randomPassword();
  await store.update((db2) => {
    if (db2.people.some((p) => p.username.toLowerCase() === username.toLowerCase())) return;
    db2.people.push({
      id: store.id(),
      clientId: project.clientId,
      naam,
      username,
      role,
      mustChange: true,
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
      person.mustChange = true;
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
    // Opmerkingen blijven staan, met de naam waaronder ze geplaatst zijn.
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

function renderDashboard(db) {
  const rows = db.clients
    .map((c) => {
      const projectCount = db.projects.filter((p) => p.clientId === c.id).length;
      return `<tr>
        <td><a href="/admin/clients/${c.id}">${esc(c.naam)}</a></td>
        <td class="muted">${c.slug}</td>
        <td>${projectCount}</td>
        <td><form method="post" action="/admin/clients/${c.id}/delete" onsubmit="return confirm('Klant ${esc(c.naam)} en alle projecten verwijderen?')"><button type="submit" class="danger small">verwijderen</button></form></td>
      </tr>`;
    })
    .join('');
  return page({
    wide: true,
    user: OWNER,
    title: 'Beheer · klanten',
    body: `
<nav class="crumbs"><a href="/admin">Klanten</a></nav>
<div class="lead"><div class="eyebrow">Beheer</div>
<h1><span class="spray">Klanten</span></h1>
<p class="sub">Elke klant is afgeschermd van elke andere. Een project hoort bij één klant.</p></div>
<div class="card">
  <table>
    <tr><th>Naam</th><th>Slug</th><th>Projecten</th><th></th></tr>
    ${rows || '<tr><td colspan="4" class="muted">Nog geen klant.</td></tr>'}
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
        <td class="muted">${p.slug}</td>
        <td>${p.html ? '<span class="pill">pagina geplaatst</span>' : '<span class="pill">nog leeg</span>'}</td>
        <td>${n}</td>
      </tr>`;
    })
    .join('');
  return page({
    wide: true,
    user: OWNER,
    title: `Beheer · ${client.naam}`,
    body: `
<nav class="crumbs"><a href="/admin">Klanten</a><a href="/admin/clients/${client.id}">${esc(client.naam)}</a></nav>
<div class="lead"><div class="eyebrow">Klant</div>
<h1><span class="spray">${esc(client.naam)}</span></h1>
<p class="sub">Projecten van deze klant.</p></div>
<div class="card">
  <table>
    <tr><th>Project</th><th>Slug</th><th>Pagina</th><th>Personen</th></tr>
    ${rows || '<tr><td colspan="4" class="muted">Nog geen project.</td></tr>'}
  </table>
  <form method="post" action="/admin/clients/${client.id}/projects" enctype="multipart/form-data" style="margin-top:20px">
    <label>Naam van het project</label>
    <input type="text" name="naam" required>
    <label>Pagina (de opgeleverde HTML, optioneel nu meteen meegeven)</label>
    <input type="file" name="html" accept=".html,text/html">
    <button type="submit">Project toevoegen</button>
  </form>
</div>`,
  });
}

function renderFeedback(db, project) {
  const status = project.status === 'goedgekeurd' ? '<span class="pill ok">goedgekeurd</span>'
    : project.status === 'wijzigingen' ? '<span class="pill wijzig">wijzigingen gevraagd</span>'
    : '<span class="pill">in review</span>';
  const comments = db.comments.filter((c) => c.projectId === project.id).map((c) =>
    `<div class="comment"><div class="meta"><b>${esc(c.door)}</b><span class="pill ${esc(c.role)}">${esc(c.role)}</span>${esc(new Date(c.createdAt).toLocaleString('nl-BE', { dateStyle: 'medium', timeStyle: 'short' }))}</div><p>${esc(c.tekst)}</p></div>`
  ).join('');
  const besluit = project.besluit ? ` · ${esc(project.besluit.door)}` : '';
  return `<div class="card">
  <h2>Feedback ${status}<span class="muted">${besluit}</span></h2>
  ${comments || '<p class="muted">Nog geen opmerkingen.</p>'}
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
        <td><span class="pill ${p.role}">${p.role === 'reviewer' ? 'Reviewer' : 'Client'}</span></td>
        <td class="row">
          <form method="post" action="/admin/people/${p.id}/reset-password">
            <input type="hidden" name="returnTo" value="/admin/projects/${project.id}">
            <input type="hidden" name="username" value="${esc(p.username)}">
            <button type="submit" class="secondary small">nieuw wachtwoord</button>
          </form>
          <form method="post" action="/admin/projects/${project.id}/revoke/${p.id}">
            <button type="submit" class="secondary small">toegang intrekken</button>
          </form>
        </td>
      </tr>`
    )
    .join('');
  const grantOptions = clientPeopleZonderToegang.map((p) => `<option value="${p.id}">${esc(p.naam || p.username)} (${esc(p.username)})</option>`).join('');
  const nieuwWachtwoord = query.nieuwWachtwoord
    ? `<div class="notice">Account <b>${esc(query.nieuwGebruiker)}</b> — wachtwoord: <code>${esc(query.nieuwWachtwoord)}</code><br>Dit startwachtwoord wordt maar één keer getoond; bij de eerste aanmelding kiest de persoon een eigen wachtwoord. Geef het buiten dit scherm om door (niet per mail als het gevoelig ligt).</div>`
    : '';
  return page({
    wide: true,
    user: OWNER,
    title: `Beheer · ${project.naam}`,
    body: `
<nav class="crumbs"><a href="/admin">Klanten</a><a href="/admin/clients/${client.id}">${esc(client.naam)}</a><a href="/admin/projects/${project.id}">${esc(project.naam)}</a></nav>
<div class="lead"><div class="eyebrow">Project</div>
<h1><span class="spray">${esc(project.naam)}</span></h1>
<p class="sub">${esc(client.naam)} · publieke weergave na aanmelden: <code>/bekijk/${project.id}</code></p></div>
${nieuwWachtwoord}
<div class="card">
  <h2>Pagina</h2>
  <p class="muted">${project.html ? 'Er staat een pagina klaar.' : 'Nog geen pagina geplaatst.'} ${project.html ? `<a href="/bekijk/${project.id}" target="_blank">bekijken</a>` : ''}</p>
  <form method="post" action="/admin/projects/${project.id}/html" enctype="multipart/form-data">
    <label>Nieuw HTML-bestand plaatsen (vervangt de huidige pagina)</label>
    <input type="file" name="html" accept=".html,text/html">
    <button type="submit" class="secondary">Plaatsen</button>
  </form>
</div>
${renderFeedback(db, project)}
<div class="card">
  <h2>Wie heeft toegang</h2>
  <table>
    <tr><th>Naam</th><th>Gebruikersnaam</th><th>Rol</th><th></th></tr>
    ${rows || '<tr><td colspan="4" class="muted">Nog niemand.</td></tr>'}
  </table>
  <form method="post" action="/admin/projects/${project.id}/people" class="row" style="margin-top:20px">
    <input type="text" name="naam" placeholder="Naam (optioneel)">
    <input type="text" name="username" placeholder="Gebruikersnaam" required>
    <select name="role" style="width:auto" aria-label="Rol"><option value="client">Client (beslist)</option><option value="reviewer">Reviewer (reageert)</option></select>
    <button type="submit" style="margin-top:0">Nieuw account + toegang</button>
  </form>
  ${clientPeopleZonderToegang.length ? `
  <form method="post" action="/admin/projects/${project.id}/grant" class="row" style="margin-top:12px">
    <select name="personId" required><option value="">— bestaand account bij ${esc(client.naam)} —</option>${grantOptions}</select>
    <button type="submit" class="secondary">Toegang geven</button>
  </form>` : ''}
</div>
<form method="post" action="/admin/projects/${project.id}/delete" style="margin-top:20px" onsubmit="return confirm('Project ${esc(project.naam)} verwijderen?')">
  <button type="submit" class="danger">Project verwijderen</button>
</form>`,
  });
}

module.exports = router;
