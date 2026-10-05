const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ROLE_LABEL = { owner: 'Owner', client: 'Client', reviewer: 'Reviewer' };

// Huisstijl: zelfde WIT-laag als de andere WIT-apps (dashboard, Adtool):
// dezelfde tokens, tekstlogo, doorschijnende kop met hoofdletter-navigatie,
// kaarten met ronde hoeken, pill-knoppen met lift, eyebrow + dunne
// Montserrat-titel met één spray-woord. Dit scherm is het enige wat een
// klant buiten de eigen opgeleverde pagina ziet, dus alleen "WIT" — geen
// verwijzing naar de bouwer van deze software.
const BASE_CSS = `
:root{
  --wit-white:#FFFFFF;--wit-mist:#F5F6F8;--wit-cloud:#ECEEF2;--wit-line:#E4E6EC;--wit-line-strong:#D3D6DE;
  --wit-ink:#0B0B0C;--wit-ink-soft:#26282D;--wit-ink-muted:#6A6E77;--wit-ink-faint:#9AA0A9;
  --wit-cyan:#14C4E3;--wit-violet:#7A3FF2;--wit-pink:#FF2E8B;--wit-coral:#FF5A3C;--wit-lime:#CDF73A;
  --wit-violet-wash:#ECE4FE;--wit-pink-wash:#FFE3F0;--wit-coral-wash:#FFE7E1;--wit-lime-wash:#F6FDD5;--wit-cyan-wash:#E1F8FC;
  --wit-spray-full:linear-gradient(105deg,#14C4E3 0%,#7A3FF2 38%,#FF2E8B 70%,#FF5A3C 100%);
  --r-sm:8px;--r-md:12px;--r-lg:18px;--r-xl:28px;--r-pill:999px;
  --sh-sm:0 2px 6px rgba(11,11,12,.06);--sh-md:0 8px 24px rgba(11,11,12,.08);--sh-lg:0 20px 48px rgba(11,11,12,.10);
  --font-head:'Montserrat','Helvetica Neue',Arial,sans-serif;--font-body:'Manrope','Helvetica Neue',Arial,sans-serif;
  --ok:#1F8A4C;--bad:#C8321F;
  color-scheme:light;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--wit-white);color:var(--wit-ink-soft);font:400 15px/1.55 var(--font-body)}
a{color:var(--wit-ink);text-decoration:none}a:hover{color:var(--wit-pink)}
::selection{background:var(--wit-lime);color:var(--wit-ink)}
:focus-visible{outline:3px solid var(--wit-violet);outline-offset:2px;border-radius:var(--r-sm)}
h1,h2,h3{font-family:var(--font-head);color:var(--wit-ink);margin:0}
h1{font-weight:200;font-size:clamp(34px,5.5vw,60px);line-height:1.05;letter-spacing:-.03em;text-wrap:balance}
h2{font-weight:300;font-size:22px;letter-spacing:-.01em}
.spray{background-image:var(--wit-spray-full);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;font-weight:300;padding-right:.04em}
.eyebrow{font:600 12px var(--font-body);letter-spacing:.16em;text-transform:uppercase;color:var(--wit-ink-muted)}
.sub,.muted{color:var(--wit-ink-muted);font-size:13px;margin:0}
.sub{font-size:15px}

/* kop */
.top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.82);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--wit-line);flex-shrink:0}
.top .in{max-width:1200px;margin:0 auto;padding:14px 32px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
.logo{display:inline-flex;align-items:baseline;line-height:1}.logo:hover{color:inherit}
.logo .w{font:900 26px/1 'Archivo','Helvetica Neue',Arial,sans-serif;letter-spacing:-.03em;background-image:var(--wit-spray-full);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.logo .a{font:600 12px/1 'Syne','Helvetica Neue',Arial,sans-serif;color:var(--wit-ink)}
.top nav{display:flex;align-items:center;gap:28px;flex-wrap:wrap}
.top nav a.nl{font:600 13px var(--font-body);letter-spacing:.12em;text-transform:uppercase;color:var(--wit-ink-soft);padding:6px 0;border-bottom:2px solid transparent}
.top nav a.nl:hover{color:var(--wit-pink)}
.top nav a.nl[aria-current=page]{color:var(--wit-ink);border-bottom-color:var(--wit-ink)}
.top form{margin:0}
.who{display:flex;align-items:center;gap:12px}
.who .naam{font-size:13px;color:var(--wit-ink-muted)}

/* knoppen */
button,.btn{font:700 13px var(--font-body);letter-spacing:.04em;border-radius:var(--r-pill);padding:10px 20px;border:1px solid var(--wit-ink);background:var(--wit-ink);color:#fff;cursor:pointer;display:inline-block;text-align:center;margin-top:20px;transition:transform .15s,box-shadow .15s,background .15s,color .15s}
button:hover,.btn:hover{transform:translateY(-2px);box-shadow:var(--sh-md);color:#fff}
button.secondary,.btn.secondary{background:var(--wit-white);color:var(--wit-ink);border-color:var(--wit-line-strong)}
button.secondary:hover,.btn.secondary:hover{color:var(--wit-ink)}
button.approve{background:var(--ok);border-color:var(--ok)}
button.danger{background:var(--wit-white);color:var(--bad);border-color:currentColor}
button.danger:hover{color:var(--bad)}
button.small{margin-top:0;padding:7px 14px;font-size:12.5px}
button:disabled{opacity:.45;cursor:not-allowed;transform:none!important;box-shadow:none!important}

/* formulieren */
label{display:flex;flex-direction:column;gap:8px;font:600 13px var(--font-body);letter-spacing:.1em;text-transform:uppercase;color:var(--wit-ink-muted);margin:18px 0 0}
label:first-child{margin-top:0}
input,select,textarea{font:500 16px var(--font-body);letter-spacing:0;text-transform:none;color:var(--wit-ink);background:var(--wit-white);border:1px solid var(--wit-line-strong);border-radius:var(--r-md);padding:13px 16px;max-width:100%;width:100%;transition:border-color .15s}
input:hover,select:hover,textarea:hover{border-color:var(--wit-ink-faint)}
input::placeholder,textarea::placeholder{color:var(--wit-ink-faint)}
input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--wit-violet);outline-offset:2px;border-color:var(--wit-violet)}
input[type=file]{padding:9px 12px;font-size:14px}
textarea{min-height:96px;resize:vertical}
select{width:auto}

/* pagina en kaarten */
body.center{min-height:100vh;display:flex;flex-direction:column}
body.center main{flex:1;display:grid;place-items:center;padding:48px 20px}
.page{max-width:1200px;margin:0 auto;padding:56px 32px 80px;display:flex;flex-direction:column;gap:32px;width:100%;flex:1}
.page.narrow{max-width:560px}
.lead{display:flex;flex-direction:column;gap:12px}
.card{border:1px solid var(--wit-line);border-radius:var(--r-lg);padding:28px;background:var(--wit-white);min-width:0}
.card h2{margin-bottom:6px}
.login{width:100%;max-width:440px;display:flex;flex-direction:column;gap:18px;background:var(--wit-white);border:1px solid var(--wit-line);border-radius:var(--r-xl);padding:40px;box-shadow:var(--sh-lg)}
.login h1{font-size:clamp(34px,8vw,48px)}
.login label{margin:0}
.login button[type=submit]{padding:15px 32px;font-size:15px;margin-top:6px}
.foot{border-top:1px solid var(--wit-line);flex-shrink:0}
.foot .in{max-width:1200px;margin:0 auto;padding:28px 32px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;font-size:14px;color:var(--wit-ink-muted)}
.foot a{color:var(--wit-ink-muted)}.foot a:hover{color:var(--wit-pink)}
.foot .logo a,.foot a.logo{color:inherit}

/* meldingen */
.error,.notice{border-radius:var(--r-md);padding:12px 16px;font-size:14px;margin-bottom:18px;border:1px solid var(--wit-line);background:var(--wit-mist);color:var(--wit-ink-soft)}
.error{background:var(--wit-pink-wash);border-color:#FFB8D6;color:var(--wit-ink)}
.notice{background:var(--wit-lime-wash);border-color:#E3F59A}
code{font:13px ui-monospace,Menlo,monospace;background:var(--wit-white);padding:2px 8px;border-radius:var(--r-sm);border:1px solid var(--wit-line);user-select:all}

/* tabellen */
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:8px}
th,td{padding:12px;text-align:left;border-top:1px solid var(--wit-line);vertical-align:middle}
th{font:600 11.5px var(--font-body);letter-spacing:.12em;text-transform:uppercase;color:var(--wit-ink-muted);border-top:0}
tbody tr:hover td,table tr:hover td{background:var(--wit-mist)}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.row form{margin:0}
td .row button{margin-top:0}
.row input{width:auto;flex:1 1 180px;min-width:0}
.row select{flex:0 0 auto}
.row button{margin-top:0}
.card p.muted{margin:4px 0 14px}
.card form + form,.card .row{margin-top:18px}

/* kruimelpad, labels, lijsten */
nav.crumbs{font-size:13px;color:var(--wit-ink-muted);display:flex;gap:6px;flex-wrap:wrap}
nav.crumbs a{color:var(--wit-ink-muted)}nav.crumbs a:hover{color:var(--wit-pink)}
nav.crumbs a + a::before{content:"/";margin-right:6px;color:var(--wit-ink-faint)}
.pill{display:inline-block;border-radius:var(--r-pill);padding:3px 11px;font:700 11px var(--font-body);letter-spacing:.12em;text-transform:uppercase;background:var(--wit-mist);color:var(--wit-ink-soft)}
.pill.owner{background:var(--wit-ink);color:#fff}
.pill.client{background:var(--wit-violet-wash);color:var(--wit-violet)}
.pill.reviewer{background:var(--wit-cyan-wash);color:#0A8199}
.pill.ok{background:var(--wit-lime-wash);color:#4A6A00}
.pill.wijzig{background:var(--wit-pink-wash);color:#C4125F}
.list{list-style:none;margin:0;padding:0}
.list li a{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;border-top:1px solid var(--wit-line);font-weight:600;color:var(--wit-ink)}
.list li:first-child a{border-top:0}
.list li a:hover{color:var(--wit-pink)}
.comment{padding:14px 0;border-top:1px solid var(--wit-line)}
.comment:first-of-type{border-top:0}
.comment .meta{font-size:12px;color:var(--wit-ink-muted);margin-bottom:4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.comment p{margin:0;white-space:pre-wrap}

/* weergave van een opgeleverde pagina */
body.viewer{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.viewer-main{flex:1;display:flex;min-height:0}
.viewer-main iframe{flex:1;border:0;background:#fff;min-width:0}
.panel{width:340px;border-left:1px solid var(--wit-line);background:var(--wit-mist);overflow:auto;padding:24px;flex-shrink:0}
.panel textarea{min-height:80px;background:#fff}
.panel button{margin-top:12px}
@media (max-width:820px){
  .top .in{padding:12px 16px}.top nav{gap:14px}.page{padding:36px 16px 56px}.card{padding:20px}.login{padding:28px}.foot .in{padding:24px 16px}
  .viewer-main{flex-direction:column}
  .panel{width:auto;border-left:0;border-top:1px solid var(--wit-line);max-height:42vh}
  .hide-narrow{display:none}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const HEAD = (title) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/assets/favicon.png">
<link rel="preload" href="/assets/fonts/manrope-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<title>${esc(title)} · WIT.agency</title>
<style>${BASE_CSS}</style>`;

const LOGO = (cls = 'logo') => `<a class="${cls}" href="/" aria-label="WIT.agency"><span class="w">WIT</span><span class="a">.agency</span></a>`;

// user: { role, naam, username } of null (niet aangemeld)
// Altijd zichtbare balk bovenaan: logo, navigatie en afmelden.
function header(user, crumb) {
  let nav = '';
  if (user) {
    const links = [];
    if (user.role === 'owner') {
      links.push('<a class="nl" href="/admin">Beheer</a>');
      if (crumb) links.push(`<a class="nl" href="${esc(crumb.href)}">${esc(crumb.label)}</a>`);
    } else {
      links.push('<a class="nl" href="/?alle=1">Overzicht</a>');
      links.push('<a class="nl" href="/wachtwoord">Wachtwoord</a>');
    }
    nav = `<nav>${links.join('')}
<span class="who"><span class="naam hide-narrow">${esc(user.naam || user.username)}</span><span class="pill ${esc(user.role)}">${ROLE_LABEL[user.role]}</span>
<form method="post" action="/logout"><button class="secondary small" type="submit">Afmelden</button></form></span></nav>`;
  }
  const home = user ? (user.role === 'owner' ? '/admin' : '/?alle=1') : '/login';
  return `<header class="top"><div class="in">${LOGO().replace('href="/"', `href="${home}"`)}${nav}</div></header>`;
}

const FOOTER = `<footer class="foot"><div class="in">${LOGO()}<span><a href="mailto:jan@wit.agency">jan@wit.agency</a></span></div></footer>`;

function page({ title, body, wide, user, crumb, center }) {
  if (center) {
    return `<!doctype html>
<html lang="nl">
<head>
${HEAD(title)}
</head>
<body class="center">
${header(user, crumb)}
<main>${body}</main>
${FOOTER}
</body>
</html>`;
  }
  return `<!doctype html>
<html lang="nl">
<head>
${HEAD(title)}
</head>
<body class="center">
${header(user, crumb)}
<div class="page${wide ? '' : ' narrow'}">
${body}
</div>
${FOOTER}
</body>
</html>`;
}

// Volledig scherm: opgeleverde pagina links, feedbackpaneel rechts.
function viewerPage({ title, user, src, panel, crumb }) {
  return `<!doctype html>
<html lang="nl">
<head>
${HEAD(title)}
</head>
<body class="viewer">
${header(user, crumb)}
<div class="viewer-main">
  <iframe src="${esc(src)}" title="${esc(title)}" sandbox="allow-scripts allow-popups allow-forms allow-downloads"></iframe>
  <aside class="panel">${panel}</aside>
</div>
</body>
</html>`;
}

module.exports = { esc, page, viewerPage, ROLE_LABEL };
