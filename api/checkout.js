// POST /api/checkout - creeaza o sesiune de plata Stripe pentru un pachet de inscriere.
//
// Plata NU e conditia ca inscrierea sa existe. Formularul salveaza intai
// inscrierea (/api/register), abia apoi trimite omul spre plata. Daca renunta
// la plata sau ii pica cardul, inscrierea ramane in baza cu plata in asteptare
// si organizatorul poate lua legatura. Altfel am pierde un participant real
// din cauza unui card refuzat.

// Id-urile de pret din Stripe, pe pachet. Se pot suprascrie din variabile de
// mediu (Vercel), ca sa nu fie nevoie de deploy cand organizatorul creeaza un
// pret nou. Fallback-urile sunt preturile care exista deja in cont:
//   price_1U3JCOFnA2m4RznsZB6bLbmG = 119 EUR
//   price_1U3JCOFnA2m4RznsRfUVEyBt = 149 EUR
// Pachetul Dealer (189 EUR) NU are inca pret in Stripe: pana cand apare
// STRIPE_PRICE_DEALER, inscrierea merge pe traseul "platesc mai tarziu".
const PRICE_119 = 'price_1U3JCOFnA2m4RznsZB6bLbmG';
const PRICE_149 = 'price_1U3JCOFnA2m4RznsRfUVEyBt';

const PRICES = {
  Magician: process.env.STRIPE_PRICE_MAGICIAN || PRICE_119, // 119 EUR
  Competitor: process.env.STRIPE_PRICE_COMPETITOR || PRICE_149, // 149 EUR
  Dealer: process.env.STRIPE_PRICE_DEALER || '', // 189 EUR - lipseste inca
  'Dealer Assistant': process.env.STRIPE_PRICE_DEALER_ASSISTANT || PRICE_119, // 119 EUR
  // Denumirile vechi, pentru cine are pagina veche in cache dupa deploy.
  Standard: PRICE_119,
  Full: PRICE_149,
};

const SITE = 'https://magicartfest.eu';

// Paginile de rezultat difera pe limba, ca omul sa nu fie aruncat brusc in
// alta limba dupa ce plateste.
const PATHS = {
  ro: { ok: '/inscriere/succes', back: '/inscriere' },
  en: { ok: '/en/inscriere/succes', back: '/en/inscriere' },
  es: { ok: '/es/inscriere/succes', back: '/es/inscriere' },
};

function clean(value, maxLen = 200) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('STRIPE_SECRET_KEY lipseste.');
    return res.status(503).json({ error: 'Payments not configured' });
  }

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const pkg = clean(body.package, 20);
  const email = clean(body.email, 254);
  const name = clean(body.name, 200);
  const lang = ['ro', 'en', 'es'].includes(body.lang) ? body.lang : 'ro';

  // Fara pret in Stripe nu inseamna eroare: inscrierea e deja salvata, iar
  // formularul stie sa treaca pe "platesc mai tarziu" cand nu primeste url.
  // Asa nu pierdem un participant real doar pentru ca lipseste un id de pret.
  const price = PRICES[pkg];
  if (!price) {
    if (Object.prototype.hasOwnProperty.call(PRICES, pkg)) {
      console.error('Pachet fara pret in Stripe, trimit spre plata ulterioara:', pkg);
    } else {
      console.error('Pachet necunoscut la checkout:', pkg);
    }
    return res.status(200).json({ url: null, pay_later: true });
  }

  const paths = PATHS[lang];
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('line_items[0][price]', price);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', `${SITE}${paths.ok}?sid={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${SITE}${paths.back}?plata=anulata`);
  params.set('locale', lang);
  // Codurile FISM10 / UNDER18 / FIDEL5 se introduc de client in pagina Stripe.
  params.set('allow_promotion_codes', 'true');
  params.set('billing_address_collection', 'required');
  if (email) params.set('customer_email', email);
  params.set('metadata[pachet]', pkg);
  params.set('metadata[nume]', name);
  params.set('metadata[limba]', lang);
  params.set('payment_intent_data[description]', `Inscriere MagicArt Fest 2027 - pachet ${pkg}`);

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-06-20',
      },
      body: params.toString(),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('Stripe checkout failed:', r.status, JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: 'Payment session could not be created' });
    }

    return res.status(200).json({ url: data.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(502).json({ error: 'Payment session could not be created' });
  }
}
