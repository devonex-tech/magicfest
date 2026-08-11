// POST /api/newsletter - salvează un abonat la newsletter în Neon Postgres.
import { neon } from '@neondatabase/serverless';

// --- Rate limiting simplu în memorie, per IP ---
// NOTĂ: best-effort - Map-ul trăiește doar cât trăiește instanța funcției serverless
// (cold start = reset; instanțe paralele = contoare separate). Suficient ca frână de bază.
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minute
const RATE_MAX = 10; // max 10 abonări / IP / fereastră
const rateMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

// --- Validare / sanitizare, fără dependențe externe ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Elimină caracterele de control și trunchiază la o lungime maximă.
function clean(value, maxLen = 200) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const email = clean(body.email, 254);
  const lang = clean(body.lang, 10);
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (body.consent !== true) {
    return res.status(400).json({ error: 'Consent is required' });
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set - run `vercel integration add neon` and redeploy.');
    return res.status(503).json({ error: 'Service not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id serial PRIMARY KEY,
        created_at timestamptz DEFAULT now(),
        email text UNIQUE,
        consent boolean,
        lang text
      )`;
    // Abonare duplicată = tot succes (idempotent), fără a divulga că emailul există deja.
    await sql`
      INSERT INTO newsletter_subscribers (email, consent, lang)
      VALUES (${email}, ${true}, ${lang})
      ON CONFLICT (email) DO NOTHING`;
  } catch (err) {
    console.error('Newsletter insert failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Trimite abonatul si in Brevo, in lista din BREVO_LIST_ID.
  // Baza noastra ramane sursa de adevar: daca Brevo cade, abonarea tot reuseste.
  await syncToBrevo(email, lang);

  return res.status(200).json({ ok: true });
}

async function syncToBrevo(email, lang) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  if (!apiKey || !listId) return;

  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true, // contact existent = adaugat la lista, nu eroare
        attributes: { LIMBA: (lang || 'ro').toUpperCase(), SURSA: 'magicartfest.eu' },
      }),
    });

    if (!r.ok) {
      const body = await r.text();
      console.error('Brevo sync failed:', r.status, body.slice(0, 300));
    }
  } catch (err) {
    console.error('Brevo sync error:', err);
  }
}
