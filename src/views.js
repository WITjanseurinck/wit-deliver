const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Bewust neutrale stijl: dit scherm is het enige wat een klant ooit ziet
// buiten hun eigen opgeleverde pagina, dus geen tool- of merknaam van de
// leverancier van deze software — alleen "WIT" (het bureau dat dit
// opstuurt), nergens een Claude/Anthropic-verwijzing.
const BASE_CSS = `
*{box-sizing:border-box}
:root{
  --ink:#13202C; --ink-soft:#4E6072; --line:#E2E8EE; --mist:#F4F6F9;
  --paper:#fff; --accent:#0B5FFF; --accent-ink:#fff;
  --danger:#B3261E; --danger-bg:#FDECEA; --danger-line:#F5C6C2;
  --ok:#1E6B34; --ok-bg:#EAF5EC; --ok-line:#C7E6CD;
  --radius:10px; --shadow:0 1px 2px rgba(19,32,44,.04), 0 8px 24px -12px rgba(19,32,44,.12);
}
html{-webkit-text-size-adjust:100%}
body{
  margin:0;min-height:100vh;background:var(--mist);color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased
}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}

.brandbar{border-bottom:1px solid var(--line);background:var(--paper)}
.brandbar-in{max-width:880px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;gap:10px}
.mark{display:inline-flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.01em;color:var(--ink);font-size:14px}
.mark i{display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--accent)}
.brand-sub{color:var(--ink-soft);font-size:13px}

.wrap{max-width:460px;margin:0 auto;padding:56px 20px 80px}
.wrap.wide{max-width:900px}

h1{font-size:21px;margin:0 0 4px;letter-spacing:-.01em}
h2{font-size:14px;margin:0 0 4px;letter-spacing:-.005em}
.sub{color:var(--ink-soft);margin:0 0 26px;font-size:13.5px}

.card{background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);padding:26px;box-shadow:var(--shadow)}
.card + .card{margin-top:18px}
.card-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px}

label{display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;letter-spacing:.01em}
label:first-child{margin-top:0}
input[type=text],input[type=password],input[type=email],textarea,select{
  width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:7px;
  font-size:14.5px;font-family:inherit;color:var(--ink);background:var(--paper);
  transition:border-color .12s, box-shadow .12s
}
input:focus,textarea:focus,select:focus{
  outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(11,95,255,.14)
}
textarea{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;min-height:160px}
select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%234E6072'%3E%3Cpath d='M5.5 7.5l4.5 5 4.5-5z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:32px}

button,.btn{
  display:inline-flex;align-items:center;gap:6px;margin-top:20px;background:var(--ink);color:#fff;border:0;
  border-radius:7px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;
  transition:background .12s, transform .05s
}
button:hover,.btn:hover{background:#243545;text-decoration:none}
button:active,.btn:active{transform:translateY(1px)}
button.secondary,.btn.secondary{background:var(--paper);color:var(--ink);border:1px solid var(--line)}
button.secondary:hover,.btn.secondary:hover{background:var(--mist)}
button.danger{background:var(--danger)}
button.danger:hover{background:#8f1f18}
button.small,.btn.small{padding:7px 12px;font-size:13px;margin-top:0}

.error{background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-line);border-radius:8px;padding:11px 14px;margin-bottom:18px;font-size:13.5px}
.notice{background:var(--ok-bg);color:var(--ok);border:1px solid var(--ok-line);border-radius:8px;padding:11px 14px;margin-bottom:18px;font-size:13.5px}
.notice code{background:rgba(30,107,52,.1);padding:1px 6px;border-radius:4px;font-size:13px}

table{width:100%;border-collapse:collapse;margin-top:4px}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--mist);font-size:13.5px;vertical-align:middle}
tr:last-child td{border-bottom:0}
th{color:var(--ink-soft);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding-bottom:8px}
td form{display:inline-block;margin:0}

.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.muted{color:var(--ink-soft);font-size:12.5px}
.empty{color:var(--ink-soft);font-size:13.5px;padding:6px 0}

nav{margin-bottom:22px;font-size:13px;color:var(--ink-soft)}
nav a{color:var(--ink-soft);margin-right:4px}
nav a:last-child{color:var(--ink);font-weight:600}
nav .sep{margin:0 6px;color:var(--line)}

.pill{display:inline-block;background:var(--mist);border-radius:999px;padding:3px 10px;font-size:11px;color:var(--ink-soft);font-weight:600;letter-spacing:.01em}
.pill.ok{background:var(--ok-bg);color:var(--ok)}

.projlist{list-style:none;margin:0;padding:0}
.projlist li{border-bottom:1px solid var(--mist)}
.projlist li:last-child{border-bottom:0}
.projlist a{display:block;padding:13px 4px;color:var(--ink);font-weight:600;font-size:14.5px;border-radius:6px}
.projlist a:hover{background:var(--mist);text-decoration:none}
.projlist small{display:block;color:var(--ink-soft);font-weight:400;font-size:12.5px;margin-top:2px}

@media (max-width:640px){
  .wrap{padding:36px 16px 60px}
  .card{padding:20px}
  table,thead,tbody,th,td,tr{display:block}
  thead{display:none}
  tr{border-bottom:1px solid var(--mist);padding:10px 0}
  tr:last-child{border-bottom:0}
  td{border:0;padding:3px 0}
  td:first-child{font-weight:600}
}
`;

function brandBar(sub) {
  return `<div class="brandbar"><div class="brandbar-in">
    <span class="mark"><i></i>WIT</span>
    ${sub ? `<span class="brand-sub">${esc(sub)}</span>` : ''}
  </div></div>`;
}

function page({ title, body, wide, brandSub }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
${brandBar(brandSub)}
<div class="wrap${wide ? ' wide' : ''}">
${body}
</div>
</body>
</html>`;
}

module.exports = { esc, page };
