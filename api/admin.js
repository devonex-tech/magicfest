import { neon } from '@neondatabase/serverless';
import { timingSafeEqual } from 'node:crypto';

// Pagina de administrare: /admin (rewrite către /api/admin în vercel.json).
// Protejată cu HTTP Basic Auth - user "admin", parola din env ADMIN_PASSWORD.
// GET /admin                     → tabelele cu înscrieri și abonați
// GET /admin?export=registrations → CSV înscrieri
// GET /admin?export=newsletter    → CSV abonați

const attempts = new Map(); // rate-limit best-effort per instanță

function tooManyAttempts(ip) {
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, start: now };
  if (now - rec.start > 10 * 60 * 1000) {
    rec.count = 0;
    rec.start = now;
  }
  rec.count += 1;
  attempts.set(ip, rec);
  return rec.count > 20;
}

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const given = Buffer.from(decoded);
  const wanted = Buffer.from(`admin:${expected}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function csv(rows, columns) {
  const escape = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = [columns.map(escape).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c])).join(','));
  }
  return '﻿' + lines.join('\r\n'); // BOM ca Excel să deschidă diacriticele corect
}

const REG_COLS = ['id', 'created_at', 'first_name', 'last_name', 'country', 'whatsapp', 'email', 'package', 'accommodation', 'roommate', 'stage_name', 'magic_society', 'category', 'dealer_upgrade', 'store_name', 'website', 'comments', 'lang', 'payment_choice'];
const NL_COLS = ['id', 'created_at', 'email', 'consent', 'lang'];

const RO_DATE = new Intl.DateTimeFormat('ro-RO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Bucharest' });

function page(regs, subs) {
  const regRows = regs.map((r) => `<tr>
    <td>${esc(RO_DATE.format(new Date(r.created_at)))}</td>
    <td><strong>${esc(r.first_name)} ${esc(r.last_name)}</strong><br><span class="dim">${esc(r.stage_name)}</span></td>
    <td>${esc(r.country)}</td>
    <td>${esc(r.email)}<br><span class="dim">${esc(r.whatsapp)}</span></td>
    <td><span class="badge ${r.package === 'Full' ? 'gold' : ''}">${esc(r.package)}</span></td>
    <td>${r.payment_choice === 'later' ? 'Mai târziu' : 'Online'}</td>
    <td>${r.accommodation === 'With accommodation' ? 'Cu cazare' : 'Fără cazare'}${r.roommate ? `<br><span class="dim">Coleg: ${esc(r.roommate)}</span>` : ''}</td>
    <td>${r.category === 'None' ? ' - ' : esc(r.category)}</td>
    <td>${r.dealer_upgrade === 'Yes' ? `Da${r.store_name ? ` - ${esc(r.store_name)}` : ''}` : ' - '}</td>
    <td class="comments">${esc(r.comments) || ' - '}</td>
  </tr>`).join('');

  const subRows = subs.map((s) => `<tr>
    <td>${esc(RO_DATE.format(new Date(s.created_at)))}</td>
    <td>${esc(s.email)}</td>
    <td>${s.lang ? esc(s.lang.toUpperCase()) : ' - '}</td>
  </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>MagicArt Fest - Administrare</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: #0A0A0B; color: #F0F0F2; padding: 32px 20px; }
  .wrap { max-width: 1280px; margin: 0 auto; }
  h1 { font-size: 22px; margin-bottom: 4px; } h1 span { color: #D4AF37; }
  .sub { color: #7A7A86; font-size: 13px; margin-bottom: 28px; }
  h2 { font-size: 16px; margin: 34px 0 12px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .count { background: #D4AF37; color: #0A0A0B; font-size: 13px; border-radius: 12px; padding: 1px 10px; }
  a.export { font-size: 12px; color: #D4AF37; border: 1px solid rgba(212,175,55,.4); border-radius: 6px; padding: 4px 12px; text-decoration: none; }
  a.export:hover { background: rgba(212,175,55,.12); }
  .scroll { overflow-x: auto; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; min-width: 900px; }
  th { text-align: left; background: #16161A; color: #B0B0BA; font-weight: 600; white-space: nowrap; }
  th, td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.06); vertical-align: top; }
  tr:hover td { background: rgba(212,175,55,.04); }
  .dim { color: #7A7A86; font-size: 12px; }
  .badge { border: 1px solid rgba(255,255,255,.2); border-radius: 10px; padding: 1px 9px; font-size: 12px; }
  .badge.gold { border-color: #D4AF37; color: #D4AF37; }
  .comments { max-width: 220px; }
  .empty { padding: 22px; color: #7A7A86; font-size: 14px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>🎩 MagicArt Fest - <span>Administrare</span></h1>
  <p class="sub">Datele se actualizează la fiecare încărcare a paginii. Exportul CSV se deschide direct în Excel.</p>

  <h2>Înscrieri participanți <span class="count">${regs.length}</span> <a class="export" href="/admin?export=registrations">⬇ Export Excel (CSV)</a></h2>
  <div class="scroll">
  ${regs.length ? `<table>
    <tr><th>Data</th><th>Nume / Scenă</th><th>Țara</th><th>Contact</th><th>Pachet</th><th>Plată</th><th>Cazare</th><th>Concurs</th><th>Dealer</th><th>Comentarii</th></tr>
    ${regRows}
  </table>` : '<p class="empty">Nicio înscriere încă.</p>'}
  </div>

  <h2>Abonați newsletter <span class="count">${subs.length}</span> <a class="export" href="/admin?export=newsletter">⬇ Export Excel (CSV)</a></h2>
  <div class="scroll">
  ${subs.length ? `<table>
    <tr><th>Data</th><th>Email</th><th>Limba</th></tr>
    ${subRows}
  </table>` : '<p class="empty">Niciun abonat încă.</p>'}
  </div>
</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooManyAttempts(ip)) {
    res.status(429).send('Too many attempts. Try again later.');
    return;
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD is not set.');
    res.status(503).send('Admin is not configured.');
    return;
  }

  if (!authorized(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="MagicArt Fest Admin", charset="UTF-8"');
    res.status(401).send('Autentificare necesară.');
    return;
  }
  attempts.delete(ip);

  if (!process.env.DATABASE_URL) {
    res.status(503).send('Database is not configured.');
    return;
  }

  const sql = neon(process.env.DATABASE_URL);
  const [regs, subs] = await Promise.all([
    sql`SELECT * FROM registrations ORDER BY created_at DESC`.catch(() => []),
    sql`SELECT * FROM newsletter_subscribers ORDER BY created_at DESC`.catch(() => []),
  ]);

  const exp = req.query && req.query.export;
  if (exp === 'registrations' || exp === 'newsletter') {
    const isReg = exp === 'registrations';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="magicartfest-${isReg ? 'inscrieri' : 'newsletter'}.csv"`);
    res.status(200).send(csv(isReg ? regs : subs, isReg ? REG_COLS : NL_COLS));
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(page(regs, subs));
}
