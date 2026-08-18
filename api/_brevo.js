// Cod comun pentru sincronizarea contactelor in Brevo.
//
// Numele fisierului incepe cu "_", asa ca Vercel NU il publica drept endpoint;
// e doar importat de /api/register.js si /api/payment-confirm.js. Il tinem
// separat ca valorile din coloana PLATA sa fie scrise intr-un singur loc: daca
// register scrie "In asteptare" si payment-confirm scrie "Platit ", in Brevo
// apar doua coloane de gunoi pe care organizatorul nu le poate filtra.

const API = 'https://api.brevo.com/v3';

// Valorile EXACTE care ajung in coloana PLATA. Fara diacritice: sunt etichete
// de filtrare in Brevo, nu text afisat vizitatorului.
export const PLATA = {
  ASTEPTARE: 'In asteptare', // a ales plata online, dar Stripe n-a confirmat inca
  MAI_TARZIU: 'Plateste mai tarziu', // a apasat butonul "platesc mai tarziu"
  PLATIT: 'Platit', // plata confirmata de Stripe
};

// Brevo refuza contactul daca trimiti un atribut care nu exista in cont, deci
// atributele trebuie sa existe INAINTE de primul contact care le foloseste.
const PAYMENT_ATTRS = [
  { name: 'PLATA', type: 'text' },
  { name: 'DATA_PLATA', type: 'date' },
  { name: 'SUMA_PLATITA', type: 'float' },
];

// Per instanta serverless: dupa ce atributele exista o data, nu mai batem la
// Brevo la fiecare inscriere. Cold start = o noua verificare, ieftina.
let attributesReady = false;

function headers(apiKey) {
  return {
    'api-key': apiKey,
    'content-type': 'application/json',
    accept: 'application/json',
  };
}

// Atributul exista deja = succes, nu eroare. Brevo raspunde diferit in functie
// de moment (400 cu "duplicate_parameter", 409, mesaj "already exists"), asa ca
// le tratam pe toate la fel.
function alreadyExists(status, body) {
  if (status === 409) return true;
  if (status !== 400) return false;
  return /duplicate|already exist|must be unique|exists/i.test(body || '');
}

// Creeaza PLATA / DATA_PLATA / SUMA_PLATITA in contul Brevo, o singura data.
// Nu arunca niciodata: daca nu reuseste, contactul trebuie sa intre in lista
// oricum (fara coloana noua), nu sa se piarda inscrierea.
export async function ensureBrevoAttributes(apiKey) {
  if (!apiKey) return false;
  if (attributesReady) return true;

  let allOk = true;
  for (const attr of PAYMENT_ATTRS) {
    try {
      const r = await fetch(`${API}/contacts/attributes/normal/${attr.name}`, {
        method: 'POST',
        headers: headers(apiKey),
        body: JSON.stringify({ type: attr.type }),
      });
      if (r.ok) continue; // 201 / 204 = creat acum
      const body = await r.text().catch(() => '');
      if (alreadyExists(r.status, body)) continue;
      allOk = false;
      console.error('Brevo: atributul', attr.name, 'nu a putut fi creat:', r.status, body.slice(0, 200));
    } catch (err) {
      allOk = false;
      console.error('Brevo: eroare la crearea atributului', attr.name, err);
    }
  }

  attributesReady = allOk;
  return allOk;
}

// Un singur upsert de contact. updateEnabled = contact existent actualizat,
// nu eroare de duplicat.
export function brevoUpsert(apiKey, email, listId, attributes) {
  const payload = { email, updateEnabled: true, attributes };
  if (listId) payload.listIds = [listId];
  return fetch(`${API}/contacts`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(payload),
  });
}

// Data in formatul asteptat de atributele de tip "date" din Brevo (YYYY-MM-DD),
// citita in fusul orar al festivalului. Cu UTC, o plata de la 01:30 noaptea ar
// aparea in Brevo cu ziua de ieri.
export function brevoDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(date);
}

// Marcheaza plata confirmata pe contactul cu emailul dat.
// Daca atributele noi lipsesc din cont (crearea lor a esuat), reincercam doar
// cu PLATA, apoi renuntam - la fel ca reincercarea fara WHATSAPP din register:
// mai bine o coloana lipsa decat un contact care nu se actualizeaza deloc.
export async function markPaidInBrevo(apiKey, listId, { email, amount, date, pachet }) {
  if (!apiKey || !email) return false;

  await ensureBrevoAttributes(apiKey);

  const full = { PLATA: PLATA.PLATIT };
  if (date) full.DATA_PLATA = date;
  if (typeof amount === 'number' && Number.isFinite(amount)) full.SUMA_PLATITA = amount;
  if (pachet) full.PACHET = pachet;

  const attempts = [full, { PLATA: PLATA.PLATIT }];
  for (let i = 0; i < attempts.length; i += 1) {
    try {
      const r = await brevoUpsert(apiKey, email, listId, attempts[i]);
      if (r.ok) {
        if (i > 0) console.error('Brevo: plata marcata doar cu PLATA (atribute noi respinse):', email);
        return true;
      }
      const body = await r.text().catch(() => '');
      console.error('Brevo: marcarea platii a esuat:', r.status, body.slice(0, 300));
    } catch (err) {
      console.error('Brevo: eroare la marcarea platii:', err);
      return false;
    }
  }
  return false;
}

// Plasa de siguranta: fisierele care incep cu "_" nu sunt publicate ca
// endpoint de Vercel. Daca vreodata regula asta s-ar schimba, calea
// /api/_brevo raspunde 404 in loc sa crape cu o eroare de server.
export default function handler(req, res) {
  return res.status(404).json({ error: 'Not found' });
}
