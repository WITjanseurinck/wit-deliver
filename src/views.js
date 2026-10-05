const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Bewust neutrale, kale stijl: dit scherm is het enige wat een klant ooit
// ziet buiten hun eigen opgeleverde pagina, dus geen tool- of merknaam van
// de leverancier van deze software — alleen "WIT" (de naam van het bureau
// dat dit opstuurt, geen Claude/Anthropic-verwijzing).
const BASE_CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;background:#F4F6F8;color:#15202B}
.wrap{max-width:520px;margin:0 auto;padding:64px 20px}
.wrap.wide{max-width:880px}
h1{font-size:22px;margin:0 0 4px}
.sub{color:#5B6B7A;margin:0 0 28px;font-size:14px}
.card{background:#fff;border:1px solid #E1E7EC;border-radius:10px;padding:28px}
label{display:block;font-size:13px;font-weight:600;margin:16px 0 6px}
label:first-child{margin-top:0}
input[type=text],input[type=password],input[type=email],textarea,select{
  width:100%;padding:10px 12px;border:1px solid #CBD5DE;border-radius:6px;font-size:14px;font-family:inherit}
textarea{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;min-height:160px}
button,.btn{display:inline-block;margin-top:20px;background:#15202B;color:#fff;border:0;border-radius:6px;
  padding:11px 18px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none}
button.secondary,.btn.secondary{background:#fff;color:#15202B;border:1px solid #CBD5DE}
button.danger{background:#B3261E}
.error{background:#FDECEA;color:#9A1C13;border:1px solid #F5C6C2;border-radius:6px;padding:10px 14px;margin-bottom:18px;font-size:13px}
.notice{background:#EAF5EC;color:#1E6B34;border:1px solid #C7E6CD;border-radius:6px;padding:10px 14px;margin-bottom:18px;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #EEF2F5;font-size:13px;vertical-align:top}
th{color:#5B6B7A;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
a{color:#0B5FFF}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.muted{color:#5B6B7A;font-size:12px}
nav{margin-bottom:24px;font-size:13px}
nav a{margin-right:14px}
.pill{display:inline-block;background:#EEF2F5;border-radius:999px;padding:2px 10px;font-size:11px;color:#5B6B7A}
`;

function page({ title, body, wide }) {
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
<div class="wrap${wide ? ' wide' : ''}">
${body}
</div>
</body>
</html>`;
}

module.exports = { esc, page };
