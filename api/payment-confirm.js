// /api/payment-confirm - confirma o plata Stripe si o marcheaza in Brevo si in
// baza de date.
//
// DOUA MODURI:
//
// 1) Normal (chemat de pagina de multumire, dupa redirectul de la Stripe):
//    POST /api/payment-confirm  { "sid": "cs_live_..." }
//    sau GET /api/payment-confirm?sid=cs_live_...
//    Singurul lucru pe care il credem din browser este id-ul sesiunii. Suma,
//    emailul si pachetul se citesc de la Stripe, nu din pagina - altfel oricine
//    si-ar putea marca singur plata ca facuta.
//
// 2) Sincronizare in masa (plasa de siguranta, manuala, protejata cu secret):
//    daca omul inchide browserul inainte de redirect, plata exista la Stripe
//    dar nimeni nu cheama confirmarea. Modul asta ia toate sesiunile platite
//    din ultimele 30 de zile si le marcheaza.
//
//      curl -X POST "https://magicartfest.eu/api/payment-confirm?sync=1" \
//           -H "x-sync-secret: SECRETUL_DIN_VERCEL"
//
//    Secretul se pune in variabila de mediu SYNC_SECRET (Vercel > Settings >
//    Environment Variables). Fara ea, modul de sincronizare e oprit complet.
//    Se poate rula oricand si de cate ori vrei: sesiunile deja marcate sunt
//    sarite. NU exista cron automat - se cheama cu mana.

import { neon } from '@neondatabase/serverless';
import { timingSafeEqual } from 'node:crypto';
import { brevoDate, markPaidInBrevo } from './_brevo.js';

const STRIPE_API = 'https://api.stripe.com/v1';
const DAYS_BACK = 30;
const MAX_PAGES = 10; // 10 x 100 sesiuni - suficient si fara sa depaseasca timpul functiei
const MAX_UPDATES = 100; // restul se prind la urmatoarea rulare (e idempotent)

// Frana de baza pe modul normal: sid-ul vine din browser si fiecare apel
// inseamna o cerere catre Stripe. Best-effort, ca in /api/register.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
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

// Comparatie in timp constant, ca in /api/admin.
function secretMatches(given, expected) {
  if (!given || !expected) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Id-urile de sesiune Stripe arata mereu la fel. Filtrul asta opreste
// incercarile de a ne face sa chemam alte cai din API-ul Stripe.
const SID_RE = /^cs_[A-Za-z0-9_]{10,100}$/;

// ATENTIE: antetul Stripe-Version prost trimis a rupt deja apeluri pe acest
// proiect. Aici nu il trimitem deloc, deci Stripe foloseste versiunea
// implicita a contului. Daca vreodata e nevoie de el, se copiaza EXACT
// valoarea din api/checkout.js, nu alta.
async function stripeGet(path, key) {
  const r = await fetch(`${STRIPE_API}/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    console.error('Stripe GET esuat:', path.split('?')[0], r.status, JSON.stringify(data).slice(0, 300));
    return null;
  }
  return data;
}

// Coloanele de plata lipsesc din tabelul creat inainte de plata online.
async function ensureColumns(sql) {
  await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS paid_at timestamptz`;
  await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS paid_amount numeric`;
  await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS stripe_session_id text`;
}

// Ce ne intereseaza dintr-o sesiune Stripe. Nimic din asta nu pleaca spre
// browser.
function readSession(session) {
  if (!session || session.payment_status !== 'paid') return null;
  const email =
    (session.customer_details && session.customer_details.email) || session.customer_email || '';
  if (!email) return null;
  const paidAt = session.created ? new Date(session.created * 1000) : new Date();
  return {
    sid: session.id,
    email,
    amount: typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
    paidAt,
    pachet: (session.metadata && session.metadata.pachet) || '',
  };
}

// Marcheaza plata pe randul de inscriere potrivit. Idempotent: la a doua
// chemare cu acelasi sid se actualizeaza acelasi rand cu aceleasi valori.
// Randul deja legat de ALTA sesiune nu e atins (om inscris de doua ori).
async function markPaidInDb(sql, p) {
  const rows = await sql`
    UPDATE registrations
       SET paid_at = ${p.paidAt.toISOString()},
           paid_amount = ${p.amount},
           stripe_session_id = ${p.sid}
     WHERE id = (
       SELECT id FROM registrations
        WHERE lower(email) = lower(${p.email})
          AND (stripe_session_id = ${p.sid} OR stripe_session_id IS NULL)
        ORDER BY CASE WHEN stripe_session_id = ${p.sid} THEN 0 ELSE 1 END, created_at DESC
        LIMIT 1
     )
     RETURNING id`;
  return Array.isArray(rows) && rows.length > 0;
}

async function confirmOne(p) {
  let inDb = false;
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      await ensureColumns(sql);
      inDb = await markPaidInDb(sql, p);
      if (!inDb) {
        console.error('Plata fara inscriere in baza (email negasit):', p.email, p.sid);
      }
    } catch (err) {
      console.error('Marcarea platii in baza a esuat:', err);
    }
  }

  const inBrevo = await markPaidInBrevo(
    process.env.BREVO_API_KEY,
    Number(process.env.BREVO_PARTICIPANTS_LIST_ID),
    { email: p.email, amount: p.amount, date: brevoDate(p.paidAt), pachet: p.pachet }
  );

  if (!inBrevo) {
    console.error('Plata confirmata la Stripe dar NEMARCATA in Brevo:', p.email, p.sid);
  }
  return { inDb, inBrevo };
}

// --- Modul 2: sincronizare in masa ---
async function bulkSync(key) {
  const since = Math.floor(Date.now() / 1000) - DAYS_BACK * 24 * 60 * 60;
  const paid = [];
  let startingAfter = '';

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams();
    params.set('limit', '100');
    params.set('created[gte]', String(since));
    if (startingAfter) params.set('starting_after', startingAfter);

    const list = await stripeGet(`checkout/sessions?${params.toString()}`, key);
    if (!list || !Array.isArray(list.data)) break;

    for (const session of list.data) {
      const p = readSession(session);
      if (p) paid.push(p);
    }
    if (!list.has_more || list.data.length === 0) break;
    startingAfter = list.data[list.data.length - 1].id;
  }

  // Sarim peste ce e deja marcat, ca sa nu batem degeaba la Brevo.
  let done = new Set();
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      await ensureColumns(sql);
      const rows = await sql`
        SELECT stripe_session_id FROM registrations
         WHERE stripe_session_id IS NOT NULL AND paid_at IS NOT NULL`;
      done = new Set(rows.map((r) => r.stripe_session_id));
    } catch (err) {
      console.error('Nu am putut citi sesiunile deja marcate:', err);
    }
  }

  let updated = 0;
  for (const p of paid) {
    if (done.has(p.sid)) continue;
    if (updated >= MAX_UPDATES) {
      console.error('Limita de', MAX_UPDATES, 'atinsa; mai rulati o data pentru restul.');
      break;
    }
    await confirmOne(p);
    updated += 1;
  }

  return { platite: paid.length, actualizate: updated };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('STRIPE_SECRET_KEY lipseste.');
    return res.status(503).json({ error: 'Not configured' });
  }

  const query = req.query || {};
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // --- Sincronizare in masa: doar cu secret ---
  if (query.sync === '1' || body.sync === '1' || body.sync === true) {
    const expected = process.env.SYNC_SECRET;
    const given = req.headers['x-sync-secret'] || query.secret || body.secret;
    if (!secretMatches(given, expected)) {
      return res.status(404).json({ error: 'Not found' });
    }
    try {
      const summary = await bulkSync(key);
      return res.status(200).json({ ok: true, ...summary });
    } catch (err) {
      console.error('Sincronizarea in masa a esuat:', err);
      return res.status(500).json({ error: 'Sync failed' });
    }
  }

  // --- Confirmare pentru o singura sesiune ---
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const sid =
    typeof body.sid === 'string' ? body.sid : typeof query.sid === 'string' ? query.sid : '';
  if (!SID_RE.test(sid)) {
    return res.status(400).json({ error: 'Invalid session' });
  }

  try {
    const session = await stripeGet(`checkout/sessions/${sid}`, key);
    const p = readSession(session);
    // Sesiune inexistenta, neplatita sau fara email: nu e o eroare pentru
    // vizitator si nu ii spunem ce anume lipseste.
    if (!p) return res.status(200).json({ ok: false });

    await confirmOne(p);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Confirmarea platii a esuat:', err);
    return res.status(500).json({ error: 'Confirmation failed' });
  }
}
