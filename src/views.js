const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ROLE_LABEL = { owner: 'Owner', client: 'Client', reviewer: 'Reviewer' };

// Huisstijl: WIT design system (docs/design-handoff in wit-website) — wit wit
// canvas, hairline Montserrat voor titels, Manrope voor tekst, de "spray"
// als leesteken en niet als behang. Dit scherm is het enige wat een klant
// buiten de eigen opgeleverde pagina ziet, dus alleen "WIT" — geen verwijzing
// naar de bouwer van deze software.
const BASE_CSS = `
:root{
  --paper:#fff;--mist:#F5F6F8;--cloud:#ECEEF2;--line:#E4E6EC;--line-strong:#D3D6DE;
  --ink:#0B0B0C;--ink-soft:#26282D;--ink-muted:#6A6E77;--ink-faint:#9AA0A9;
  --cyan:#14C4E3;--violet:#7A3FF2;--pink:#FF2E8B;--coral:#FF5A3C;--lime:#CDF73A;
  --cyan-wash:#E1F8FC;--violet-wash:#ECE4FE;--pink-wash:#FFE3F0;--lime-wash:#F6FDD5;
  --success:#22B27A;--danger:#E11D48;
  --spray:linear-gradient(100deg,#14C4E3 0%,#7A3FF2 48%,#FF2E8B 100%);
  --font-display:'Montserrat',system-ui,-apple-system,'Segoe UI',sans-serif;
  --font-body:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif;
  --shadow-sm:0 2px 6px rgba(11,11,12,.06);--shadow-md:0 8px 24px rgba(11,11,12,.08);
  --ease:cubic-bezier(.22,1,.36,1);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:var(--font-body);font-size:16px;line-height:1.6;background:var(--paper);color:var(--ink-soft)}
.topbar{height:4px;background:var(--spray)}
header.site{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:1200px;margin:0 auto;padding:22px 24px;width:100%}
header.site img{height:22px;width:auto;display:block}
header.site .who{display:flex;align-items:center;gap:14px;font-size:13px;color:var(--ink-muted);flex-wrap:wrap}
header.site .who a{text-decoration:none;color:var(--ink-muted)}
header.site .who form{margin:0}
.wrap{max-width:520px;margin:0 auto;padding:56px 24px 80px}
.wrap.wide{max-width:1000px}
h1,h2,h3{font-family:var(--font-display);color:var(--ink);letter-spacing:-.02em}
h1{font-size:34px;line-height:1.08;font-weight:200;margin:0 0 8px}
h2{font-size:17px;line-height:1.2;font-weight:600;margin:0 0 4px;letter-spacing:-.005em}
.sub{color:var(--ink-muted);margin:0 0 32px;font-size:15px}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:28px;box-shadow:var(--shadow-sm)}
.card + .card{margin-top:20px}
label{display:block;font-size:13px;font-weight:600;color:var(--ink);margin:18px 0 6px}
label:first-child{margin-top:0}
input[type=text],input[type=password],input[type=email],textarea,select{
  width:100%;padding:11px 14px;border:1px solid var(--line-strong);border-radius:8px;font-size:15px;
  font-family:inherit;color:var(--ink);background:#fff;transition:border-color .12s,box-shadow .12s}
input[type=file]{font-family:inherit;font-size:14px}
textarea{min-height:96px;resize:vertical}
input:focus,textarea:focus,select:focus,button:focus-visible,a:focus-visible{
  outline:none;box-shadow:0 0 0 3px rgba(122,63,242,.28);border-color:var(--violet)}
button,.btn{display:inline-block;margin-top:20px;background:var(--ink);color:#fff;border:1px solid var(--ink);
  border-radius:999px;padding:11px 22px;font-family:var(--font-body);font-size:14px;font-weight:700;
  letter-spacing:.01em;cursor:pointer;text-decoration:none;transition:transform .12s var(--ease),box-shadow .12s}
button:hover,.btn:hover{transform:translateY(-1px);box-shadow:0 12px 34px rgba(255,46,139,.28)}
button.secondary,.btn.secondary{background:#fff;color:var(--ink);border-color:var(--line-strong)}
button.secondary:hover,.btn.secondary:hover{box-shadow:var(--shadow-md)}
button.approve{background:var(--success);border-color:var(--success)}
button.danger{background:#fff;color:var(--danger);border-color:#F5B5C2}
button.small{margin-top:0;padding:6px 14px;font-size:12px}
.error{background:#FFE9EE;color:#A3123A;border:1px solid #F8C3CF;border-radius:8px;padding:11px 14px;margin-bottom:18px;font-size:14px}
.notice{background:var(--lime-wash);color:#3C4A06;border:1px solid #E3F29A;border-radius:8px;padding:11px 14px;margin-bottom:18px;font-size:14px}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;background:var(--mist);border-radius:4px;padding:1px 6px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{text-align:left;padding:11px 8px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:middle}
th{color:var(--ink-muted);font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.12em}
a{color:var(--ink);text-decoration-color:var(--pink);text-underline-offset:3px}
a:hover{color:var(--pink)}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.row form{margin:0}
.muted{color:var(--ink-muted);font-size:13px}
nav.crumbs{margin-bottom:28px;font-size:13px;color:var(--ink-muted)}
nav.crumbs a{margin-right:6px;text-decoration:none;color:var(--ink-muted)}
nav.crumbs a:hover{color:var(--pink)}
nav.crumbs a + a::before{content:"/";margin-right:6px;color:var(--ink-faint)}
.pill{display:inline-block;border-radius:999px;padding:2px 11px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:var(--cloud);color:var(--ink-muted)}
.pill.owner{background:var(--ink);color:#fff}
.pill.client{background:var(--violet-wash);color:var(--violet)}
.pill.reviewer{background:var(--cyan-wash);color:#0A8199}
.pill.ok{background:#DDF5EB;color:#14805A}
.pill.wijzig{background:var(--pink-wash);color:#C4125F}
.list{list-style:none;margin:0;padding:0}
.list li{border-bottom:1px solid var(--line)}
.list li:last-child{border-bottom:0}
.list a{display:flex;justify-content:space-between;align-items:center;padding:16px 4px;text-decoration:none;font-weight:600;color:var(--ink)}
.list a:hover{color:var(--pink)}
.comment{padding:14px 0;border-bottom:1px solid var(--line)}
.comment:last-child{border-bottom:0}
.comment .meta{font-size:12px;color:var(--ink-muted);margin-bottom:4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.comment p{margin:0;white-space:pre-wrap}
body.viewer{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.viewer-main{flex:1;display:flex;min-height:0}
.viewer-main iframe{flex:1;border:0;background:#fff;min-width:0}
.panel{width:340px;border-left:1px solid var(--line);background:var(--mist);overflow:auto;padding:20px;flex-shrink:0}
.panel textarea{min-height:80px}
.panel button{margin-top:12px}
@media (max-width:820px){
  .viewer-main{flex-direction:column}
  .panel{width:auto;border-left:0;border-top:1px solid var(--line);max-height:42vh}
  h1{font-size:28px}
  .wrap{padding-top:36px}
  .hide-narrow{display:none}
}
`;

const HEAD = (title) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/assets/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<title>${esc(title)}</title>
<style>${BASE_CSS}</style>`;

// user: { role, naam, username } of null (niet aangemeld)
function header(user) {
  const who = user
    ? `<div class="who"><span>${esc(user.naam || user.username)} <span class="pill ${user.role}">${ROLE_LABEL[user.role]}</span></span>
<a href="${user.role === 'owner' ? '/admin' : '/'}">Home</a>
${user.role === 'owner' ? '' : '<a href="/wachtwoord">Wachtwoord</a>'}
<form method="post" action="/logout"><button class="secondary small" type="submit">Afmelden</button></form></div>`
    : '';
  return `<div class="topbar"></div>
<header class="site"><a href="/"><img src="/assets/wit-logo.png" alt="WIT"></a>${who}</header>`;
}

function page({ title, body, wide, user }) {
  return `<!doctype html>
<html lang="nl">
<head>
${HEAD(title)}
</head>
<body>
${header(user)}
<div class="wrap${wide ? ' wide' : ''}">
${body}
</div>
</body>
</html>`;
}

// Volledig scherm: opgeleverde pagina links, feedbackpaneel rechts.
function viewerPage({ title, user, src, panel }) {
  return `<!doctype html>
<html lang="nl">
<head>
${HEAD(title)}
</head>
<body class="viewer">
${header(user)}
<div class="viewer-main">
  <iframe src="${esc(src)}" title="${esc(title)}" sandbox="allow-scripts allow-popups allow-forms allow-downloads"></iframe>
  <aside class="panel">${panel}</aside>
</div>
</body>
</html>`;
}

module.exports = { esc, page, viewerPage, ROLE_LABEL };
