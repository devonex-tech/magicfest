// POST /api/register - salvează o înscriere în Neon Postgres și (opțional) notifică organizatorul prin Resend.
import { neon } from '@neondatabase/serverless';
import { PLATA, ensureBrevoAttributes, brevoUpsert } from './_brevo.js';

// --- Rate limiting simplu în memorie, per IP ---
// NOTĂ: best-effort - Map-ul trăiește doar cât trăiește instanța funcției serverless
// (cold start = reset; instanțe paralele = contoare separate). Suficient ca frână de bază.
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minute
const RATE_MAX = 5; // max 5 înscrieri / IP / fereastră
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
const PACKAGES = ['Full', 'Standard'];
const ACCOMMODATIONS = ['With accommodation', 'Without accommodation'];
const CATEGORIES = ['Stage', 'Close-Up', 'None'];
const PAYMENT_CHOICES = ['now', 'later'];

// Ce scrie organizatorul in tabel si in email, nu ce trimite formularul.
const PAYMENT_CHOICE_RO = {
  now: 'Plateste acum (Stripe)',
  later: 'Plateste mai tarziu',
};

// Formularul trimite valorile in engleza (sunt aceleasi pentru toate limbile
// site-ului). In Brevo le scriem in romana, ca sa fie citibile de organizator.
const ACCOMMODATION_RO = {
  'With accommodation': 'Cu cazare',
  'Without accommodation': 'Fara cazare',
};
const CATEGORY_RO = {
  Stage: 'Stage Magic',
  'Close-Up': 'Close-Up Magic',
  None: 'Nu particip',
};

// Elimină caracterele de control și trunchiază la o lungime maximă.
function clean(value, maxLen = 200) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLen);
}

function validate(body) {
  const d = {
    first_name: clean(body.first_name),
    last_name: clean(body.last_name),
    country: clean(body.country),
    whatsapp: clean(body.whatsapp, 50),
    email: clean(body.email, 254),
    package: clean(body.package, 50),
    accommodation: clean(body.accommodation, 50),
    roommate: clean(body.roommate),
    stage_name: clean(body.stage_name),
    magic_society: clean(body.magic_society),
    category: clean(body.category, 50),
    dealer_upgrade: clean(body.dealer_upgrade, 50),
    store_name: clean(body.store_name),
    website: clean(body.website, 500),
    comments: clean(body.comments, 2000),
    lang: clean(body.lang, 10),
    payment_choice: clean(body.payment_choice, 10),
  };

  if (!d.first_name || !d.last_name || !d.country || !d.whatsapp || !d.stage_name) {
    return { error: 'Missing required fields' };
  }
  if (!EMAIL_RE.test(d.email)) return { error: 'Invalid email address' };
  if (!PACKAGES.includes(d.package)) return { error: 'Invalid package' };
  if (!ACCOMMODATIONS.includes(d.accommodation)) return { error: 'Invalid accommodation option' };
  if (!CATEGORIES.includes(d.category)) return { error: 'Invalid category' };
  if (!PAYMENT_CHOICES.includes(d.payment_choice)) d.payment_choice = 'now';
  return { data: d };
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS registrations (
      id serial PRIMARY KEY,
      created_at timestamptz DEFAULT now(),
      first_name text,
      last_name text,
      country text,
      whatsapp text,
      email text,
      package text,
      accommodation text,
      roommate text,
      stage_name text,
      magic_society text,
      category text,
      dealer_upgrade text,
      store_name text,
      website text,
      comments text,
      lang text,
      payment_choice text
    )`;
  // Tabelul exista deja din inscrierile de dinainte de butonul "platesc mai
  // tarziu", iar CREATE TABLE IF NOT EXISTS nu l-ar completa.
  await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_choice text`;
}

// Notificare pe email prin Resend - opțională; eșecul ei nu afectează răspunsul.
// Întoarce true DOAR dacă emailul chiar a plecat: valoarea asta e unul dintre
// cele trei canale pe care le numărăm ca "înscrierea e salvată undeva".
async function notifyOrganizer(d) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.NOTIFY_FROM || 'onboarding@resend.dev';
  const text = [
    `Nume: ${d.first_name} ${d.last_name}`,
    `Nume de scenă: ${d.stage_name}`,
    `Țara: ${d.country}`,
    `WhatsApp: ${d.whatsapp}`,
    `Email: ${d.email}`,
    `Pachet: ${d.package}`,
    `Cazare: ${d.accommodation}`,
    `Coleg de cameră: ${d.roommate || '-'}`,
    `Societate de magie: ${d.magic_society || '-'}`,
    `Categorie concurs: ${d.category}`,
    `Upgrade dealer: ${d.dealer_upgrade || '-'}`,
    `Nume magazin: ${d.store_name || '-'}`,
    `Website: ${d.website || '-'}`,
    `Comentarii: ${d.comments || '-'}`,
    `Limbă formular: ${d.lang || '-'}`,
    `Plată: ${PAYMENT_CHOICE_RO[d.payment_choice] || d.payment_choice}`,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: ['festmagic@yahoo.com'],
      subject: `Înscriere nouă MagicArt Fest: ${d.stage_name}`,
      text,
    }),
  });
  if (!res.ok) {
    console.error('Resend notification failed:', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
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

  const { error, data } = validate(body);
  if (error) return res.status(400).json({ error });

  // O inscriere e "salvata" daca a ajuns in cel putin unul dintre cele trei
  // locuri: baza noastra, emailul catre organizator sau Brevo. Pe planul
  // gratuit Neon suspenda instanta dupa inactivitate si trezirea poate depasi
  // timpul functiei, asa ca nu legam succesul doar de baza de date - altfel
  // am pierde o inscriere reala din cauza unui cold start.
  let savedToDb = false;
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      await ensureTable(sql);
      await sql`
        INSERT INTO registrations (
          first_name, last_name, country, whatsapp, email, package, accommodation,
          roommate, stage_name, magic_society, category, dealer_upgrade,
          store_name, website, comments, lang, payment_choice
        ) VALUES (
          ${data.first_name}, ${data.last_name}, ${data.country}, ${data.whatsapp},
          ${data.email}, ${data.package}, ${data.accommodation}, ${data.roommate},
          ${data.stage_name}, ${data.magic_society}, ${data.category},
          ${data.dealer_upgrade}, ${data.store_name}, ${data.website},
          ${data.comments}, ${data.lang}, ${data.payment_choice}
        )`;
      savedToDb = true;
    } catch (err) {
      console.error('Registration insert failed:', err);
    }
  } else {
    console.error('DATABASE_URL is not set.');
  }

  // Emailul catre organizator contine toate campurile, deci tine loc de
  // copie de siguranta daca baza de date n-a raspuns.
  let emailed = false;
  try {
    emailed = await notifyOrganizer(data);
  } catch (err) {
    console.error('Organizer notification failed:', err);
  }

  const inBrevo = await syncToBrevo(data);

  if (!savedToDb && !emailed && !inBrevo) {
    console.error('Inscriere PIERDUTA - niciun canal nu a raspuns:', data.email);
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  if (!savedToDb) {
    console.error('Inscriere salvata DOAR prin email/Brevo (baza de date a esuat):', data.email);
  }

  return res.status(200).json({ ok: true });
}

// Brevo valideaza atributul WHATSAPP ca numar de telefon real si il trateaza ca
// identificator unic. Doua situatii perfect normale il fac sa refuze contactul:
//   - numar scris local ("0729 290 290", cum scrie majoritatea romanilor);
//   - acelasi numar folosit deja de alt contact (sot/sotie, duo, agent).
// In ambele cazuri Brevo raspunde cu eroare si participantul NU mai ajunge in
// lista, desi vizitatorul vede "trimis cu succes". De aceea numarul asa cum a
// fost scris merge intotdeauna in TELEFON (text simplu, fara validare), iar daca
// Brevo refuza din cauza lui reincercam fara WHATSAPP - contactul in lista e mai
// important decat campul de WhatsApp.
function normalizePhone(raw) {
  if (!raw) return '';
  const plus = raw.trim().startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  return plus ? '+' + digits : digits;
}

async function syncToBrevo(d) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_PARTICIPANTS_LIST_ID);
  if (!apiKey || !listId) return false;

  // Atributele de plata trebuie sa existe in cont inainte de contact, altfel
  // Brevo respinge tot contactul. Esecul crearii lor NU opreste inscrierea:
  // reincercarile de mai jos trimit contactul si fara coloana noua.
  await ensureBrevoAttributes(apiKey);

  const attributes = {
    // FIRSTNAME/LASTNAME sunt atribute de sistem, Brevo le foloseste la
    // personalizarea campaniilor. Le pastram si dublam in PRENUME/NUME,
    // ca sa fie coloanele lizibile in romana in interfata.
    FIRSTNAME: d.first_name,
    LASTNAME: d.last_name,
    PRENUME: d.first_name,
    NUME: d.last_name,
    TELEFON: d.whatsapp, // exact ce a scris omul - nu se pierde niciodata
    TARA: d.country,
    PACHET: d.package,
    CAZARE: ACCOMMODATION_RO[d.accommodation] || d.accommodation,
    CATEGORIE: CATEGORY_RO[d.category] || d.category,
    NUME_SCENA: d.stage_name,
    SOCIETATE: d.magic_society,
    LIMBA: (d.lang || 'ro').toUpperCase(),
    SURSA: 'inscriere magicartfest.eu',
  };

  // Starea platii, asa cum o vede organizatorul in Brevo. La inscriere nu
  // exista inca nicio plata confirmata, deci DATA_PLATA si SUMA_PLATITA raman
  // goale; le completeaza /api/payment-confirm cand Stripe confirma.
  const paymentAttributes = {
    PLATA: d.payment_choice === 'later' ? PLATA.MAI_TARZIU : PLATA.ASTEPTARE,
  };

  const post = (attrs) => brevoUpsert(apiKey, d.email, listId, attrs);

  try {
    const phone = normalizePhone(d.whatsapp);
    const withPayment = { ...attributes, ...paymentAttributes };

    // Incercam de la cel mai complet spre cel mai sigur si ne oprim la prima
    // reusita. Doua lucruri pot face Brevo sa refuze contactul: numarul de
    // telefon (vezi explicatia de mai sus) si atributul PLATA, daca nu a putut
    // fi creat in cont. Nu stim care dintre ele, asa ca le scoatem pe rand.
    const attempts = [];
    if (phone) attempts.push({ label: 'complet', attrs: { ...withPayment, WHATSAPP: phone } });
    attempts.push({ label: 'fara WHATSAPP', attrs: withPayment });
    if (phone) attempts.push({ label: 'fara PLATA', attrs: { ...attributes, WHATSAPP: phone } });
    attempts.push({ label: 'fara WHATSAPP si fara PLATA', attrs: attributes });

    for (let i = 0; i < attempts.length; i += 1) {
      const r = await post(attempts[i].attrs);
      if (r.ok) {
        if (i > 0) {
          console.error('Brevo: contact adaugat', attempts[i].label, '-', d.email);
        }
        return true;
      }
      const body = await r.text().catch(() => '');
      console.error('Brevo participant sync failed (' + attempts[i].label + '):', r.status, body.slice(0, 300));
    }
    return false;
  } catch (err) {
    console.error('Brevo participant sync error:', err);
    return false;
  }
}
