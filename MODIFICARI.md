# MagicArt Fest 2027 — Listă de modificări (structurată pe pagini)

> Sursă conținut ediția 2026: https://magicartfest.eu/ (site-ul actual).
> Toate punctele sunt fezabile. Singurul care necesită backend: newsletter-ul cu bază de date (se rezolvă pe Vercel cu o funcție serverless + storage).
> Cerință generală: structura site-ului rămâne în mare aceeași.

---

## 1. Pagini noi — „Istoric / Ediția 2026" (pagini separate)

Conținut preluat de pe site-ul actual. Propunere: un meniu „Ediția 2026" în navbar cu 4 pagini:

| Pagină | Conținut (de pe site-ul actual) |
|---|---|
| `2026/castigatori.html` | **Our Winners 2026**: Tony Vasil 🇺🇦 (Premiul I), Bozhidar Kolev 🇧🇬 (Premiul II), Iulian Paraschiv 🇷🇴 (Close-up, Premiul III) |
| `2026/invitati.html` | **Guests of Honor 2026**: Kimoon Do 🇰🇷, Jeki Yoo 🇰🇷, Gabriel Gascón 🇨🇱 (lecture & gala show), Piksi 🇷🇸, Teatro Blu Magic 🇷🇴, Eduard și Bianca 🇷🇴 (gala show) |
| `2026/juriu.html` | **International Jury 2026**: Xavier Tapias 🇪🇸 (președinte, FISM Europe President), Serge Odin 🇫🇷 (FISM official judge), Lee Alex 🇬🇧 (FISM judge in training), Christianis 🇷🇴 (General Manager) |
| `2026/galerie.html` | Foto + video din ediția 2026 |

- Pozele artiștilor/juriului există deja în repo (`images/`). Lipsesc: pozele câștigătorilor (se preiau de pe site-ul vechi).
- Secțiunea „Ediția 2026" de pe homepage devine un teaser scurt cu linkuri către aceste pagini.
- ❓ **De la client:** linkurile video (YouTube?) pentru galerie.

## 2. Pagina principală

- Secțiunea invitați: titlu **„Guest of Honor at MagicArt Fest 2027"** — poze înlocuite deocamdată cu **siluete** (placeholder).
- Secțiune juriu: titlu **„International Jury — 2027 Edition"** — tot siluete deocamdată.
- Grila actuală „Artiștii Gala Show 2026" se mută pe paginile de istoric.

## 3. Pagina de înregistrare (de construit în site-ul nou, portată de pe cel vechi)

Modificări față de formularul actual:
- **Pasul 2:** se scot „Acces la Mici — Magic Party" și „Seat in double room".
- Preferința „cameră single / dublă" devine: **„Pachet cu cazare / Pachet fără cazare"**.

Idei de îmbunătățire (cerute de client — de validat):
- indicator de progres (pasul 1/2/3) + rezumat înainte de trimitere;
- validare inline pe câmpuri, mesaje de eroare clare, datele nu se pierd la eroare;
- email de confirmare automat după înscriere;
- honeypot + rate limit anti-spam; checkbox GDPR (există deja pe site-ul vechi — se păstrează);
- contor „locuri rămase" real (pe site-ul vechi afișează „SEATS AVAILABLE 0");
- optimizare mobil (formularul actual e greoi pe telefon).

## 4. Pachete de înscriere

**STANDARD** (listă nouă):
1. Acces at Close-Up Competition
2. Acces at Stage Competition
3. Acces to the Dealer's Area
4. Acces at International Gala Show
5. Festive Dinner included
6. Magic Party Acces

**FULL** — rămâne ca pe site-ul actual (Standard + goody bag, 4 lectures, FISM Qualified, cazare).

- ❓ **Prețuri:** nedecise — se afișează „Early Bird în curând" / fără preț până decide clientul.

## 5. Newsletter (necesită backend — fezabil)

- Captare email la intrarea pe site, salvare **în bază de date**.
- Pe Vercel: funcție serverless + bază de date (ex. Neon Postgres / Upstash din Vercel Marketplace) sau un provider de email (Brevo/Mailchimp — oferă și trimiterea newsletterelor, nu doar stocare). **Recomandare:** provider de email, ca lista să fie direct utilizabilă.
- GDPR: consimțământ explicit + recomandat double opt-in.
- Recomandare UX: popup cu delay (după ~10s sau la scroll), nu instant la intrare — popup-ul imediat crește bounce rate.

## 6. Texte

- Clientul trimite texte pe fiecare rubrică; până atunci se preiau de pe site-ul actual.

## 7. Comparație cu festivaluri similare (în așteptare)

- Golden Cat + Türkiye Magic Festival — se face analiza comparativă când clientul trimite linkurile.

---

## Întrebări deschise pentru client

1. Linkurile video pentru galeria 2026 (YouTube?).
2. Pozele câștigătorilor 2026 (le preluăm de pe site-ul vechi sau trimite variante mai bune?).
3. Prețurile pachetelor — până atunci afișăm fără preț?
4. Site-ul vechi e în RO/EN/ES — site-ul nou rămâne doar RO sau facem și EN?
5. Newsletter: e ok popup cu delay în loc de popup imediat la intrare?
