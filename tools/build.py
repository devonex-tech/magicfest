# -*- coding: utf-8 -*-
"""
Generator static MagicArt Fest 2027.

Rulează:  python3 tools/build.py
Generează HTML-ul pentru toate paginile în RO (rădăcină), EN (/en/) și ES (/es/),
plus sitemap.xml. Textele stau în tools/i18n_{ro,en,es}.py — modifici acolo,
rulezi scriptul și toate cele 3 limbi se regenerează consistent.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from i18n_ro import T as RO
from i18n_en import T as EN
from i18n_es import T as ES

LANGS = [RO, EN, ES]
SITE = "https://magicartfest.eu"
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))

PAGES = [
    "index", "gala-show", "competitie", "inscriere", "bilete", "faq", "contact",
    "editia-2026/castigatori", "editia-2026/invitati", "editia-2026/juriu", "editia-2026/galerie",
]

GUESTS_2026 = [
    {"img": "kimoon-do.png", "name": "Kimoon Do", "country": "🇰🇷 Coreea de Sud", "country_en": "🇰🇷 South Korea", "country_es": "🇰🇷 Corea del Sur", "role": "lecture_gala"},
    {"img": "jeki-yoo.png", "name": "Jeki Yoo", "country": "🇰🇷 Coreea de Sud / SUA", "country_en": "🇰🇷 South Korea / USA", "country_es": "🇰🇷 Corea del Sur / EE. UU.", "role": "lecture_gala"},
    {"img": "gabriel-gascon.png", "name": "Gabriel Gascón", "country": "🇨🇱 Chile", "country_en": "🇨🇱 Chile", "country_es": "🇨🇱 Chile", "role": "lecture_gala"},
    {"img": "piksi.png", "name": "Piksi", "country": "🇷🇸 Serbia", "country_en": "🇷🇸 Serbia", "country_es": "🇷🇸 Serbia", "role": "gala"},
    {"img": "teatro-blu-magic.png", "name": "Teatro Blu Magic", "country": "🇷🇴 România", "country_en": "🇷🇴 Romania", "country_es": "🇷🇴 Rumanía", "role": "gala"},
    {"img": "eduard-bianca.png", "name": "Eduard și Bianca", "country": "🇷🇴 România", "country_en": "🇷🇴 Romania", "country_es": "🇷🇴 Rumanía", "role": "gala"},
]

JURY_2026 = [
    {"img": "xavier-tapias.png", "name": "Xavier Tapias", "country": "🇪🇸", "role": "tapias"},
    {"img": "serge-odin.png", "name": "Serge Odin", "country": "🇫🇷", "role": "odin"},
    {"img": "lee.png", "name": "Lee Alex", "country": "🇬🇧", "role": "lee"},
    {"img": "christianis-president.jpg", "name": "Christianis", "country": "🇷🇴", "role": "christianis"},
]

WINNERS_2026 = [
    {"medal": "🥇", "prize": "first", "name": "Tony Vasil", "country": "🇺🇦 Ucraina", "country_en": "🇺🇦 Ukraine", "country_es": "🇺🇦 Ucrania", "category": None, "cls": "winner-first"},
    {"medal": "🥈", "prize": "second", "name": "Bozhidar Kolev", "country": "🇧🇬 Bulgaria", "country_en": "🇧🇬 Bulgaria", "country_es": "🇧🇬 Bulgaria", "category": None, "cls": ""},
    {"medal": "🥉", "prize": "third", "name": "Iulian Paraschiv", "country": "🇷🇴 România", "country_en": "🇷🇴 Romania", "country_es": "🇷🇴 Rumanía", "category": "closeup", "cls": ""},
]

CHECK_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'

SILHOUETTE_SVG = '''<svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="silBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2E2E38"/>
      <stop offset="100%" stop-color="#191920"/>
    </linearGradient>
  </defs>
  <g fill="url(#silBody)" stroke="rgba(212,175,55,0.65)" stroke-width="2">
    <rect x="68" y="10" width="64" height="54" rx="6"/>
    <rect x="46" y="60" width="108" height="13" rx="6.5"/>
    <circle cx="100" cy="108" r="31"/>
    <path d="M22 250 C22 182 62 152 100 152 C138 152 178 182 178 250 Z"/>
  </g>
  <rect x="68" y="48" width="64" height="9" fill="rgba(212,175,55,0.55)"/>
</svg>'''


def country_for(item, t):
    lang = t["lang"]
    if lang == "en":
        return item.get("country_en", item["country"])
    if lang == "es":
        return item.get("country_es", item["country"])
    return item["country"]


def href(t, page):
    """Link intern curat (Vercel cleanUrls)."""
    if page == "index":
        return "/" + t["prefix"] if t["prefix"] else "/"
    return "/" + t["prefix"] + page


def canonical(t, page):
    p = href(t, page)
    return SITE + (p if p != "/" else "/")


def hreflang_links(page):
    out = []
    for lang in LANGS:
        out.append(f'    <link rel="alternate" hreflang="{lang["lang"]}" href="{canonical(lang, page)}">')
    out.append(f'    <link rel="alternate" hreflang="x-default" href="{canonical(RO, page)}">')
    return "\n".join(out)


def head(t, page, title, description, extra_jsonld=""):
    org = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Asociația Magic Art (A.M.A.)",
        "url": SITE,
        "logo": SITE + "/images/logo-ama.png",
        "email": "festmagic@yahoo.com",
        "telephone": "+40729290290",
        "address": {"@type": "PostalAddress", "streetAddress": "Strada Republicii", "addressLocality": "Buhuși", "postalCode": "605100", "addressRegion": "Bacău", "addressCountry": "RO"},
        "sameAs": [
            "https://facebook.com/magicart.fest",
            "https://instagram.com/magicart.fest",
            "https://youtube.com/@magicart.fest",
            "https://tiktok.com/@magicart.fest",
        ],
    }
    return f'''<!DOCTYPE html>
<html lang="{t["lang"]}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <meta name="description" content="{description}">
    <link rel="canonical" href="{canonical(t, page)}">
{hreflang_links(page)}
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="{canonical(t, page)}">
    <meta property="og:image" content="{SITE}/images/hero-background.jpg">
    <meta property="og:locale" content="{t["lang"]}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎩</text></svg>">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/animations.css">
    <link rel="stylesheet" href="/css/pages.css">
    <script type="application/ld+json">{json.dumps(org, ensure_ascii=False)}</script>{extra_jsonld}
</head>
<body>
'''


def navbar(t, page):
    n = t["nav"]
    def act(p):
        return ' active' if p == page else ''
    e2026_pages = {"editia-2026/castigatori", "editia-2026/invitati", "editia-2026/juriu", "editia-2026/galerie"}
    e_act = ' active' if page in e2026_pages else ''

    lang_sw = []
    mobile_lang = []
    for lang in LANGS:
        cls = ' class="active"' if lang["lang"] == t["lang"] else ''
        lang_sw.append(f'<a href="{href(lang, page)}"{cls} hreflang="{lang["lang"]}">{lang["lang"].upper()}</a>')
        mobile_lang.append(f'<a href="{href(lang, page)}"{cls}>{lang["lang"].upper()}</a>')
    lang_sw = "\n                    ".join(lang_sw)
    mobile_lang = " ".join(mobile_lang)

    return f'''    <!-- Navigation -->
    <header id="navbar" class="navbar">
        <div class="nav-container">
            <a href="{href(t, "index")}" class="nav-logo">
                <img src="/images/logo-ama.png" alt="MagicArt Fest" class="nav-logo-img">
            </a>
            <nav class="nav-menu" id="navMenu">
                <a href="{href(t, "gala-show")}" class="nav-link{act("gala-show")}">{n["gala"]}</a>
                <a href="{href(t, "competitie")}" class="nav-link{act("competitie")}">{n["competition"]}</a>
                <div class="nav-item-dropdown">
                    <a href="{href(t, "editia-2026/galerie")}" class="nav-link nav-dropdown-toggle{e_act}">
                        {n["edition2026"]}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </a>
                    <div class="nav-dropdown">
                        <a href="{href(t, "editia-2026/castigatori")}">🏆 {n["winners"]}</a>
                        <a href="{href(t, "editia-2026/invitati")}">🎩 {n["guests"]}</a>
                        <a href="{href(t, "editia-2026/juriu")}">⚖️ {n["jury"]}</a>
                        <a href="{href(t, "editia-2026/galerie")}">📸 {n["gallery"]}</a>
                    </div>
                </div>
                <a href="{href(t, "bilete")}" class="nav-link{act("bilete")}">{n["tickets"]}</a>
                <a href="{href(t, "inscriere")}" class="nav-link{act("inscriere")}">{n["register"]}</a>
                <a href="{href(t, "faq")}" class="nav-link{act("faq")}">{n["faq"]}</a>
                <a href="{href(t, "contact")}" class="nav-link{act("contact")}">{n["contact"]}</a>
            </nav>
            <div class="nav-actions">
                <div class="lang-switcher" aria-label="Language">
                    {lang_sw}
                </div>
                <a href="{href(t, "bilete")}" class="nav-cta">{n["cta"]}</a>
                <button class="nav-toggle" id="navToggle" aria-label="Menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </div>
    </header>

    <!-- Mobile Menu Overlay -->
    <div class="mobile-menu" id="mobileMenu">
        <nav class="mobile-nav">
            <a href="{href(t, "index")}" class="mobile-link">{n["home"]}</a>
            <a href="{href(t, "gala-show")}" class="mobile-link">{n["gala"]}</a>
            <a href="{href(t, "competitie")}" class="mobile-link">{n["competition"]}</a>
            <a href="{href(t, "editia-2026/castigatori")}" class="mobile-link mobile-sublink">🏆 {n["winners"]}</a>
            <a href="{href(t, "editia-2026/invitati")}" class="mobile-link mobile-sublink">🎩 {n["guests"]}</a>
            <a href="{href(t, "editia-2026/juriu")}" class="mobile-link mobile-sublink">⚖️ {n["jury"]}</a>
            <a href="{href(t, "editia-2026/galerie")}" class="mobile-link mobile-sublink">📸 {n["gallery"]}</a>
            <a href="{href(t, "bilete")}" class="mobile-link">{n["tickets"]}</a>
            <a href="{href(t, "inscriere")}" class="mobile-link">{n["register"]}</a>
            <a href="{href(t, "faq")}" class="mobile-link">{n["faq"]}</a>
            <a href="{href(t, "contact")}" class="mobile-link">{n["contact"]}</a>
            <div class="mobile-lang">
                {mobile_lang}
            </div>
        </nav>
    </div>
'''


def newsletter_popup(t):
    nl = t["newsletter"]
    return f'''    <!-- Newsletter Popup -->
    <div class="newsletter-popup" id="newsletterPopup" role="dialog" aria-modal="true" aria-labelledby="nlTitle">
        <div class="newsletter-card">
            <button class="newsletter-close" id="newsletterClose" aria-label="{nl["close"]}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="newsletter-icon">🎩✨</div>
            <h3 id="nlTitle">{nl["title"]}</h3>
            <p>{nl["desc"]}</p>
            <form class="newsletter-form" id="newsletterForm" novalidate>
                <input type="email" name="email" id="newsletterEmail" placeholder="{nl["placeholder"]}" required autocomplete="email">
                <button type="submit" class="btn btn-primary"><span>{nl["btn"]}</span></button>
            </form>
            <label class="newsletter-consent">
                <input type="checkbox" id="newsletterConsent" required>
                <span>{nl["consent"]}</span>
            </label>
            <div class="newsletter-status" id="newsletterStatus"></div>
        </div>
    </div>
    <script type="application/json" id="mafNlI18n">{json.dumps({"success": nl["success"], "error": nl["error"], "err_email": nl["err_email"], "err_consent": nl["err_consent"], "lang": t["lang"]}, ensure_ascii=False)}</script>
'''


def footer(t, page, include_particles=False):
    n = t["nav"]
    f = t["footer"]
    particles = '\n    <script src="/js/particles.js"></script>' if include_particles else ''
    nl = t["newsletter"]
    return f'''    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-newsletter">
                <div class="footer-newsletter-text">
                    <h4>📩 {nl["title"]}</h4>
                    <p>{nl["desc"]}</p>
                </div>
                <div class="footer-newsletter-action">
                    <form class="newsletter-form" id="nlFooterForm" novalidate>
                        <input type="email" name="email" id="nlFooterEmail" placeholder="{nl["placeholder"]}" required autocomplete="email">
                        <button type="submit" class="btn btn-primary"><span>{nl["btn"]}</span></button>
                    </form>
                    <label class="newsletter-consent">
                        <input type="checkbox" id="nlFooterConsent" required>
                        <span>{nl["consent"]}</span>
                    </label>
                    <div class="newsletter-status" id="nlFooterStatus"></div>
                </div>
            </div>
            <div class="footer-top">
                <div class="footer-brand">
                    <a href="{href(t, "index")}" class="footer-logo-link">
                        <img src="/images/logo-ama.png" alt="Asociația Magic Art" class="footer-logo-img">
                    </a>
                    <p>{f["tagline"]}</p>
                </div>
                <div class="footer-links">
                    <div class="footer-col">
                        <h4>{f["nav_title"]}</h4>
                        <a href="{href(t, "gala-show")}">{n["gala"]}</a>
                        <a href="{href(t, "competitie")}">{n["competition"]}</a>
                        <a href="{href(t, "editia-2026/galerie")}">{n["edition2026"]}</a>
                        <a href="{href(t, "inscriere")}">{n["register"]}</a>
                    </div>
                    <div class="footer-col">
                        <h4>{f["info_title"]}</h4>
                        <a href="{href(t, "bilete")}">{n["tickets"]}</a>
                        <a href="{href(t, "faq")}">{n["faq"]}</a>
                        <a href="{href(t, "contact")}">{n["contact"]}</a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>{f["rights"]}</p>
                <div class="footer-social">
                    <a href="https://facebook.com/magicart.fest" target="_blank" rel="noopener" aria-label="Facebook">FB</a>
                    <a href="https://instagram.com/magicart.fest" target="_blank" rel="noopener" aria-label="Instagram">IG</a>
                    <a href="https://youtube.com/@magicart.fest" target="_blank" rel="noopener" aria-label="YouTube">YT</a>
                    <a href="https://tiktok.com/@magicart.fest" target="_blank" rel="noopener" aria-label="TikTok">TK</a>
                </div>
            </div>
        </div>
    </footer>

    <!-- Back to Top -->
    <button id="backToTop" class="back-to-top" aria-label="Back to top">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
    </button>

    <!-- Scripts -->{particles}
    <script src="/js/animations.js"></script>
    <script src="/js/main.js"></script>
    <script src="/js/site.js"></script>
</body>
</html>
'''


def page_hero(t, tag, title, sub=None, crumbs=None):
    sub_html = f'\n            <p class="page-hero-subtitle">{sub}</p>' if sub else ''
    crumbs_html = ''
    if crumbs:
        parts = []
        for label, link in crumbs:
            if link:
                parts.append(f'<a href="{link}">{label}</a>')
            else:
                parts.append(f'<span>{label}</span>')
        crumbs_html = f'\n            <nav class="breadcrumbs" aria-label="Breadcrumb">{" <span>›</span> ".join(parts)}</nav>'
    return f'''    <section class="page-hero">
        <div class="container">
            <span class="page-hero-tag">{tag}</span>
            <h1 class="page-hero-title">{title}</h1>{sub_html}{crumbs_html}
        </div>
    </section>
'''


def silhouette_card(t, label):
    h = t["home"]
    return f'''                    <div class="artist-photo-card">
                        <div class="artist-photo silhouette-figure">
                            {SILHOUETTE_SVG}
                            <span class="silhouette-q">?</span>
                        </div>
                        <div class="artist-photo-info">
                            <span class="artist-name">{h["tba"]}</span>
                            <span class="tba-badge">{h["tba_badge"]}</span>
                        </div>
                    </div>'''


# ============================================================ PAGES

def page_index(t):
    h = t["home"]
    event = {
        "@context": "https://schema.org",
        "@type": "Festival",
        "name": "MagicArt Fest 2027",
        "startDate": "2027-05-07",
        "endDate": "2027-05-08",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {"@type": "Place", "name": 'Casa de Cultură "Elisabeta Bostan"', "address": {"@type": "PostalAddress", "addressLocality": "Buhuși", "addressRegion": "Bacău", "addressCountry": "RO"}},
        "image": SITE + "/images/hero-background.jpg",
        "description": h["description"],
        "organizer": {"@type": "Organization", "name": "Asociația Magic Art (A.M.A.)", "url": SITE},
    }
    extra_jsonld = f'\n    <script type="application/ld+json">{json.dumps(event, ensure_ascii=False)}</script>'

    features_icons = [
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>',
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 9l6 6 6-6"></path><circle cx="12" cy="12" r="10"></circle></svg>',
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
    ]
    features = "\n".join(
        f'''                    <div class="feature-card">
                        <div class="feature-icon">{features_icons[i]}</div>
                        <h3>{f["title"]}</h3>
                        <p>{f["desc"]}</p>
                    </div>''' for i, f in enumerate(h["features"]))

    marquee_spans = "\n".join(f'                <span>✦ {w}</span>' for w in (h["marquee"] * 2))

    silhouettes_guests = "\n".join(silhouette_card(t, None) for _ in range(4))
    silhouettes_jury = "\n".join(silhouette_card(t, None) for _ in range(4))

    edition_cards = "\n".join(
        f'''                <a href="/{t["prefix"]}{c["href"]}" class="edition-link-card">
                    <span class="icon">{c["icon"]}</span>
                    <h3>{c["title"]}</h3>
                    <p>{c["desc"]}</p>
                    <span class="arrow">{h["edition_view_all"]} →</span>
                </a>''' for c in h["edition_links"])

    body = f'''    <!-- Preloader -->
    <div id="preloader">
        <div class="preloader-inner">
            <div class="magic-circle">
                <div class="circle-ring"></div>
                <div class="circle-ring"></div>
                <div class="circle-ring"></div>
            </div>
            <img src="/images/logo-ama.png" alt="MagicArt" class="preloader-logo">
        </div>
    </div>

    <!-- Cursor -->
    <div class="custom-cursor"></div>
    <div class="cursor-follower"></div>

{navbar(t, "index")}
    <!-- ========== HERO ========== -->
    <section id="hero" class="hero">
        <div class="hero-bg-image" style="background-image: url('/images/hero-background.jpg')"></div>
        <canvas id="heroCanvas" class="hero-canvas"></canvas>
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <div class="hero-badge" data-animate="fade-down">
                <span class="badge-line"></span>
                <span>{h["badge"]}</span>
                <span class="badge-line"></span>
            </div>
            <div class="hero-logo-wrapper" data-animate="fade-up">
                <img src="/images/header-magicart.png" alt="MagicArt Fest Romania" class="hero-logo-img">
            </div>
            <p class="hero-subtitle" data-animate="fade-up" data-delay="200">
                {h["subtitle"]}
            </p>
            <div class="hero-info" data-animate="fade-up" data-delay="400">
                <div class="hero-info-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>{h["date"]}</span>
                </div>
                <div class="hero-info-divider"></div>
                <div class="hero-info-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>{h["location"]}</span>
                </div>
                <div class="hero-info-divider"></div>
                <div class="hero-info-item">
                    <img src="/images/whatsapp-image.png" alt="FISM Qualified Contest" class="hero-fism-badge">
                </div>
            </div>
            <div class="hero-buttons" data-animate="fade-up" data-delay="600">
                <a href="{href(t, "bilete")}" class="btn btn-primary">
                    <span>{h["btn_reserve"]}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </a>
                <a href="#edition2026" class="btn btn-outline">
                    <span>{h["btn_edition"]}</span>
                </a>
            </div>
        </div>
        <div class="hero-scroll" data-animate="fade-up" data-delay="800">
            <span>{h["scroll"]}</span>
            <div class="scroll-line"></div>
        </div>

        <div class="hero-float hero-float-1">✦</div>
        <div class="hero-float hero-float-2">✧</div>
        <div class="hero-float hero-float-3">⬥</div>
    </section>

    <!-- ========== ABOUT ========== -->
    <section id="about" class="section about">
        <div class="container">
            <div class="section-header" data-animate="fade-up">
                <span class="section-tag">{h["about_tag"]}</span>
                <h2 class="section-title">{h["about_title"]}</h2>
                <div class="section-line"></div>
            </div>
            <div class="about-grid">
                <div class="about-text" data-animate="fade-right">
                    <div class="about-logo-badge">
                        <img src="/images/logo-ama.png" alt="Asociația Magic Art - A.M.A. - Since 2005" class="about-ama-logo">
                    </div>
                    <p class="about-lead">
                        {h["about_lead"]}
                    </p>
                    <p>
                        {h["about_body"]}
                    </p>
                    <div class="about-badges">
                        <div class="about-badge-item">
                            <img src="/images/whatsapp-image.png" alt="FISM Qualified Contest" class="fism-logo">
                            <span>{h["fism_badge"]}</span>
                        </div>
                    </div>
                    <div class="about-stats">
                        <div class="stat-item">
                            <span class="stat-number" data-count="3">0</span>
                            <span class="stat-label">{h["stat_days"]}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" data-count="15">0</span>
                            <span class="stat-label">{h["stat_artists"]}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" data-count="500">0</span>
                            <span class="stat-label">{h["stat_spectators"]}</span>
                        </div>
                    </div>
                </div>
                <div class="about-features" data-animate="fade-left">
{features}
                </div>
            </div>
        </div>
    </section>

    <!-- ========== GUESTS OF HONOR 2027 ========== -->
    <section id="guests2027" class="section">
        <div class="container">
            <div class="section-header" data-animate="fade-up">
                <span class="section-tag">{h["guests_tag"]}</span>
                <h2 class="section-title">{h["guests_title"]}</h2>
                <div class="section-line"></div>
                <p class="section-description">{h["guests_desc"]}</p>
            </div>
            <div class="past-artists-section" data-animate="fade-up">
                <div class="artists-photo-grid stagger-children">
{silhouettes_guests}
                </div>
            </div>
        </div>
    </section>

    <!-- ========== MARQUEE ========== -->
    <div class="marquee-section">
        <div class="marquee-track">
            <div class="marquee-content">
{marquee_spans}
            </div>
        </div>
    </div>

    <!-- ========== JURY 2027 ========== -->
    <section id="jury2027" class="section">
        <div class="container">
            <div class="section-header" data-animate="fade-up">
                <span class="section-tag">{h["jury_tag"]}</span>
                <h2 class="section-title">{h["jury_title"]}</h2>
                <div class="section-line"></div>
                <p class="section-description">{h["jury_desc"]}</p>
            </div>
            <div class="past-artists-section" data-animate="fade-up">
                <div class="artists-photo-grid stagger-children">
{silhouettes_jury}
                </div>
            </div>
        </div>
    </section>

    <!-- ========== EDITION 2026 (PAST) ========== -->
    <section id="edition2026" class="section edition-past">
        <div class="container">
            <div class="section-header" data-animate="fade-up">
                <span class="section-tag">{h["edition_tag"]}</span>
                <h2 class="section-title">{h["edition_title"]}</h2>
                <div class="section-line"></div>
                <p class="section-description">
                    {h["edition_desc"]}
                </p>
            </div>

            <div class="past-edition-showcase" data-animate="fade-up">
                <div class="past-poster img-reveal">
                    <img src="/images/gala-show.jpeg" alt="MagicArt Fest 2026 - International Gala Show">
                    <div class="past-poster-overlay">
                        <span class="past-label">{h["edition_poster_label"]}</span>
                    </div>
                </div>
                <div class="past-details">
                    <h3 class="past-subtitle">{h["edition_sub"]}</h3>
                    <p class="past-description">
                        {h["edition_body"]}
                    </p>
                    <div class="past-stats-row">
                        <div class="past-stat">
                            <span class="past-stat-num" data-count="7">0</span>
                            <span class="past-stat-label">{h["edition_stat_artists"]}</span>
                        </div>
                        <div class="past-stat">
                            <span class="past-stat-num" data-count="5">0</span>
                            <span class="past-stat-label">{h["edition_stat_countries"]}</span>
                        </div>
                        <div class="past-stat">
                            <span class="past-stat-num" data-count="3">0</span>
                            <span class="past-stat-label">{h["edition_stat_days"]}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="edition-links-grid" data-animate="fade-up">
{edition_cards}
            </div>
        </div>
    </section>

    <!-- ========== CTA ========== -->
    <section class="cta-band">
        <div class="container" data-animate="fade-up">
            <h2>{h["cta_title"]}</h2>
            <p>{h["cta_desc"]}</p>
            <div class="hero-buttons">
                <a href="{href(t, "bilete")}" class="btn btn-primary"><span>{h["cta_btn_tickets"]}</span></a>
                <a href="{href(t, "inscriere")}" class="btn btn-outline"><span>{h["cta_btn_register"]}</span></a>
            </div>
        </div>
    </section>

{newsletter_popup(t)}'''
    return head(t, "index", h["title"], h["description"], extra_jsonld) + body + footer(t, "index", include_particles=True)


def page_gala(t):
    g = t["gala"]
    body = f'''{navbar(t, "gala-show")}
{page_hero(t, g["hero_tag"], g["hero_title"], g["hero_sub"])}
    <!-- ========== GALA SHOW ========== -->
    <section id="gala" class="section gala">
        <div class="gala-bg-pattern"></div>
        <div class="container">
            <div class="gala-showcase">
                <div class="gala-main" data-animate="fade-up">
                    <div class="gala-image-wrapper">
                        <div class="gala-image">
                            <img src="/images/event-photo-1.jpg" alt="MagicArt Fest Gala Show 2027" class="gala-img">
                        </div>
                        <div class="gala-date-badge">
                            <span class="date-month">{g["date_month"]}</span>
                            <span class="date-year">{g["date_year"]}</span>
                        </div>
                    </div>
                </div>
                <div class="gala-details" data-animate="fade-left">
                    <h3 class="gala-subtitle">{g["sub"]}</h3>
                    <p class="gala-description">
                        {g["body"]}
                    </p>
                    <div class="gala-info-list">
                        <div class="gala-info-item">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <div>
                                <strong>{g["when_label"]}</strong>
                                <span> {g["when"]}</span>
                            </div>
                        </div>
                        <div class="gala-info-item">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <div>
                                <strong>{g["where_label"]}</strong>
                                <span>{g["where"]}</span>
                            </div>
                        </div>
                        <div class="gala-info-item">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                            <div>
                                <strong>{g["age_label"]}</strong>
                                <span>{g["age"]}</span>
                            </div>
                        </div>
                        <div class="gala-info-item">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                            <div>
                                <strong>{g["price_label"]}</strong>
                                <span>{g["price"]}</span>
                            </div>
                        </div>
                    </div>
                    <a href="{href(t, "bilete")}" class="btn btn-primary">
                        <span>{g["btn"]}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </a>
                </div>
            </div>
        </div>
    </section>

{newsletter_popup(t)}'''
    return head(t, "gala-show", g["title"], g["description"]) + body + footer(t, "gala-show")


def page_competition(t):
    c = t["competition"]
    cat_icons = [
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="2" width="20" height="20" rx="2"></rect><path d="M7 12l5 5 5-5M12 7v10"></path></svg>',
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>',
    ]
    cats = "\n".join(
        f'''                <div class="category-card" data-animate="fade-up" data-delay="{i * 150}">
                    <div class="category-number">{cat["num"]}</div>
                    <div class="category-icon">{cat_icons[i]}</div>
                    <h3>{cat["title"]}</h3>
                    <p>{cat["desc"]}</p>
                    <div class="category-line"></div>
                </div>''' for i, cat in enumerate(c["categories"]))
    rules = "\n".join(
        f'''                        <li>
                            {CHECK_SVG}
                            {r}
                        </li>''' for r in c["rules"])

    body = f'''{navbar(t, "competitie")}
{page_hero(t, c["hero_tag"], c["hero_title"], c["hero_sub"])}
    <!-- ========== COMPETITION ========== -->
    <section id="competition" class="section competition">
        <div class="container">
            <div class="competition-categories">
{cats}
            </div>

            <div class="section-header" data-animate="fade-up" style="margin-top: 90px;">
                <h2 class="section-title">{c["rules_title"]}</h2>
                <div class="section-line"></div>
            </div>
            <div class="register-form-wrapper" data-animate="fade-up">
                <ul class="ticket-features" style="display: flex; flex-direction: column; gap: 14px;">
{rules}
                </ul>
                <div class="package-info-box visible" style="margin-top: 26px;">
                    <h4>{c["awards_title"]}</h4>
                    <p style="font-size: 14px; color: var(--color-text-muted);">{c["awards"]}</p>
                </div>
            </div>

            <div class="competition-cta" data-animate="fade-up">
                <a href="{href(t, "inscriere")}" class="btn btn-primary">{c["cta"]}</a>
            </div>
        </div>
    </section>

{newsletter_popup(t)}'''
    return head(t, "competitie", c["title"], c["description"]) + body + footer(t, "competitie")


def page_tickets(t):
    tk = t["tickets"]
    cards = []
    for i, card in enumerate(tk["cards"]):
        feats = "\n".join(
            f'''                            <li>
                                {CHECK_SVG}
                                {f}
                            </li>''' for f in card["features"])
        badge = f'\n                    <div class="ticket-badge">{tk["popular"]}</div>' if card["featured"] else ''
        cls = ' featured' if card["featured"] else ''
        btn_cls = 'btn-primary' if card["featured"] else 'btn-outline'
        cards.append(f'''                <div class="ticket-card{cls}" data-animate="fade-up" data-delay="{i * 150}">{badge}
                    <div class="ticket-header">
                        <span class="ticket-type">{card["type"]}</span>
                        <div class="ticket-price">
                            <span class="price-amount">{card["price"]}</span>
                            <span class="price-currency">{tk["currency"]}</span>
                        </div>
                    </div>
                    <div class="ticket-body">
                        <ul class="ticket-features">
{feats}
                        </ul>
                    </div>
                    <div class="ticket-footer">
                        <a href="{href(t, "contact")}" class="btn {btn_cls} btn-full">{tk["buy"]}</a>
                    </div>
                </div>''')
    cards = "\n".join(cards)

    body = f'''{navbar(t, "bilete")}
{page_hero(t, tk["hero_tag"], tk["hero_title"], tk["hero_sub"])}
    <!-- ========== TICKETS ========== -->
    <section id="tickets" class="section tickets">
        <div class="tickets-bg"></div>
        <div class="container">
            <div class="tickets-grid">
{cards}
            </div>
        </div>
    </section>

{newsletter_popup(t)}'''
    return head(t, "bilete", tk["title"], tk["description"]) + body + footer(t, "bilete")


def package_features_list(features):
    return "\n".join(
        f'''                        <li>
                            {CHECK_SVG}
                            <span>{f}</span>
                        </li>''' for f in features)


def page_register(t):
    r = t["register"]
    steps_progress = "\n".join(
        f'''                    <div class="form-progress-step{' active' if i == 0 else ''}" data-step-ind="{i + 1}">
                        <span class="form-progress-num">{i + 1}</span>
                        <span class="form-progress-label">{s}</span>
                    </div>''' for i, s in enumerate(r["steps"]))

    std_box = "\n".join(f'                                <li>{f}</li>' for f in r["standard_features"])
    full_box = "\n".join(f'                                <li>{f}</li>' for f in r["full_features"])

    i18n_payload = {
        "err_required": r["err_required"], "err_email": r["err_email"], "err_terms": r["err_terms"],
        "success": r["success"], "error": r["error"], "sending": r["sending"], "send": r["btn_send"],
        "summary_labels": r["summary_labels"], "lang": t["lang"],
        "acc_with": r["acc_with"], "acc_without": r["acc_without"],
        "cat_none": r["cat_none"],
    }

    body = f'''{navbar(t, "inscriere")}
{page_hero(t, r["hero_tag"], r["hero_title"], r["hero_sub"])}
    <!-- ========== PACKAGES ========== -->
    <section id="packages" class="section">
        <div class="container">
            <div class="section-header" data-animate="fade-up">
                <h2 class="section-title">{r["packages_title"]}</h2>
                <div class="section-line"></div>
            </div>
            <div class="packages-grid">
                <div class="package-card" data-animate="fade-up">
                    <span class="package-name">{r["standard_name"]}</span>
                    <span class="package-includes-label">{r["includes"]}</span>
                    <div class="package-price">{r["price_tba"]}</div>
                    <ul class="package-features">
{package_features_list(r["standard_features"])}
                    </ul>
                    <a href="#registerForm" class="btn btn-outline btn-full">{r["register_now"]}</a>
                </div>
                <div class="package-card featured" data-animate="fade-up" data-delay="150">
                    <span class="package-name">{r["full_name"]}</span>
                    <span class="package-includes-label">{r["includes"]}</span>
                    <div class="package-price">{r["price_tba"]}</div>
                    <ul class="package-features">
{package_features_list(r["full_features"])}
                    </ul>
                    <a href="#registerForm" class="btn btn-primary btn-full">{r["register_now"]}</a>
                </div>
            </div>
            <p class="package-note">{r["packages_note"]}</p>
        </div>
    </section>

    <!-- ========== REGISTRATION FORM ========== -->
    <section id="registerForm" class="section" style="padding-top: 40px;">
        <div class="container">
            <div class="section-header" data-animate="fade-up">
                <h2 class="section-title">{r["form_title"]}</h2>
                <div class="section-line"></div>
            </div>
            <div class="register-form-wrapper" data-animate="fade-up">
                <div class="form-progress" id="formProgress">
{steps_progress}
                </div>
                <form id="mafRegisterForm" novalidate>
                    <input type="text" name="company" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">

                    <!-- STEP 1: personal -->
                    <div class="form-step active" data-step="1">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="f-first-name">{r["f_first_name"]} <span class="req">*</span></label>
                                <input type="text" id="f-first-name" name="first_name" required autocomplete="given-name">
                                <span class="form-error">{r["err_required"]}</span>
                            </div>
                            <div class="form-group">
                                <label for="f-last-name">{r["f_last_name"]} <span class="req">*</span></label>
                                <input type="text" id="f-last-name" name="last_name" required autocomplete="family-name">
                                <span class="form-error">{r["err_required"]}</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="f-country">{r["f_country"]} <span class="req">*</span></label>
                            <input type="text" id="f-country" name="country" required autocomplete="country-name">
                            <span class="form-error">{r["err_required"]}</span>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="f-whatsapp">{r["f_whatsapp"]} <span class="req">*</span></label>
                                <input type="tel" id="f-whatsapp" name="whatsapp" required autocomplete="tel">
                                <span class="form-error">{r["err_required"]}</span>
                            </div>
                            <div class="form-group">
                                <label for="f-email">{r["f_email"]} <span class="req">*</span></label>
                                <input type="email" id="f-email" name="email" required autocomplete="email">
                                <span class="form-error">{r["err_email"]}</span>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 2: package & stay -->
                    <div class="form-step" data-step="2">
                        <div class="form-group">
                            <label>{r["f_package"]} <span class="req">*</span></label>
                            <div class="radio-cards">
                                <label class="radio-card">
                                    <input type="radio" name="package" value="Full" checked>
                                    <span>{r["pkg_full"]}</span>
                                </label>
                                <label class="radio-card">
                                    <input type="radio" name="package" value="Standard">
                                    <span>{r["pkg_standard"]}</span>
                                </label>
                            </div>
                        </div>

                        <div class="package-info-box" id="pkgInfoFull">
                            <h4>{r["you_enjoy"]}</h4>
                            <ul>
{full_box}
                            </ul>
                            <p class="info-note">{r["packages_note"]}</p>
                        </div>
                        <div class="package-info-box" id="pkgInfoStandard">
                            <h4>{r["you_enjoy"]}</h4>
                            <ul>
{std_box}
                            </ul>
                            <p class="info-note">{r["packages_note"]}</p>
                        </div>

                        <div class="form-group">
                            <label>{r["f_accommodation"]} <span class="req">*</span></label>
                            <div class="radio-cards">
                                <label class="radio-card">
                                    <input type="radio" name="accommodation" value="With accommodation" checked>
                                    <span>{r["acc_with"]}</span>
                                </label>
                                <label class="radio-card">
                                    <input type="radio" name="accommodation" value="Without accommodation">
                                    <span>{r["acc_without"]}</span>
                                </label>
                            </div>
                        </div>

                        <div class="form-group conditional-field" id="roommateField">
                            <label for="f-roommate">{r["f_roommate"]}</label>
                            <input type="text" id="f-roommate" name="roommate">
                        </div>
                    </div>

                    <!-- STEP 3: artist -->
                    <div class="form-step" data-step="3">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="f-stage-name">{r["f_stage_name"]} <span class="req">*</span></label>
                                <input type="text" id="f-stage-name" name="stage_name" required>
                                <span class="form-error">{r["err_required"]}</span>
                            </div>
                            <div class="form-group">
                                <label for="f-society">{r["f_society"]}</label>
                                <input type="text" id="f-society" name="magic_society">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>{r["f_category"]} <span class="req">*</span></label>
                            <div class="radio-cards cols-3">
                                <label class="radio-card">
                                    <input type="radio" name="category" value="Stage">
                                    <span>{r["cat_stage"]}</span>
                                </label>
                                <label class="radio-card">
                                    <input type="radio" name="category" value="Close-Up">
                                    <span>{r["cat_closeup"]}</span>
                                </label>
                                <label class="radio-card">
                                    <input type="radio" name="category" value="None" checked>
                                    <span>{r["cat_none"]}</span>
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>{r["f_dealer"]}</label>
                            <div class="radio-cards">
                                <label class="radio-card">
                                    <input type="radio" name="dealer_upgrade" value="No" checked>
                                    <span>{r["dealer_no"]}</span>
                                </label>
                                <label class="radio-card">
                                    <input type="radio" name="dealer_upgrade" value="Yes">
                                    <span>{r["dealer_yes"]}</span>
                                </label>
                            </div>
                        </div>
                        <div class="conditional-field" id="dealerFields">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="f-store">{r["f_store"]}</label>
                                    <input type="text" id="f-store" name="store_name">
                                </div>
                                <div class="form-group">
                                    <label for="f-website">{r["f_website"]}</label>
                                    <input type="url" id="f-website" name="website" placeholder="https://">
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="f-comments">{r["f_comments"]}</label>
                            <textarea id="f-comments" name="comments" rows="4"></textarea>
                        </div>
                    </div>

                    <!-- STEP 4: confirmation -->
                    <div class="form-step" data-step="4">
                        <div class="form-summary" id="formSummary">
                            <h4>{r["summary_title"]}</h4>
                            <dl id="formSummaryList"></dl>
                        </div>
                        <div class="package-info-box visible">
                            <h4>{r["confirm_title"]}</h4>
                            <p style="font-size: 13px; color: var(--color-text-muted); margin-bottom: 10px;">{r["confirm_body"]}</p>
                            <p style="font-size: 13px; color: var(--color-text-muted); margin-bottom: 10px;">{r["confirm_important"]}</p>
                            <p style="font-size: 12px; color: var(--color-text-dim);">{r["confirm_gdpr"]}</p>
                        </div>
                        <label class="checkbox-row">
                            <input type="checkbox" name="terms" id="f-terms" required>
                            <span>{r["f_terms"]} <span class="req">*</span></span>
                        </label>
                        <span class="form-error" id="termsError" style="display:none;">{r["err_terms"]}</span>
                    </div>

                    <div class="form-nav">
                        <button type="button" class="btn btn-back" id="formBack" style="visibility: hidden;">
                            <span>← {r["btn_back"]}</span>
                        </button>
                        <button type="button" class="btn btn-primary" id="formNext">
                            <span>{r["btn_next"]} →</span>
                        </button>
                    </div>
                    <div class="form-status" id="formStatus" role="status"></div>
                </form>
            </div>
        </div>
    </section>
    <script type="application/json" id="mafFormI18n">{json.dumps(i18n_payload, ensure_ascii=False)}</script>

{newsletter_popup(t)}'''
    return (head(t, "inscriere", r["title"], r["description"]) + body
            + footer(t, "inscriere").replace('<script src="/js/site.js"></script>',
                                             '<script src="/js/site.js"></script>\n    <script src="/js/form.js"></script>'))


def page_faq(t):
    fq = t["faq"]
    faq_jsonld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": it["q"], "acceptedAnswer": {"@type": "Answer", "text": it["a"]}}
            for it in fq["items"]
        ],
    }
    extra = f'\n    <script type="application/ld+json">{json.dumps(faq_jsonld, ensure_ascii=False)}</script>'
    items = "\n".join(
        f'''                <div class="faq-item">
                    <button class="faq-question">
                        <span>{it["q"]}</span>
                        <svg class="faq-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <div class="faq-answer">
                        <p>{it["a"]}</p>
                    </div>
                </div>''' for it in fq["items"])

    body = f'''{navbar(t, "faq")}
{page_hero(t, fq["hero_tag"], fq["hero_title"])}
    <!-- ========== FAQ ========== -->
    <section id="faq" class="section faq" style="padding-top: 40px;">
        <div class="container">
            <div class="faq-list" data-animate="fade-up">
{items}
            </div>
        </div>
    </section>

{newsletter_popup(t)}'''
    return head(t, "faq", fq["title"], fq["description"], extra) + body + footer(t, "faq")


def page_contact(t):
    c = t["contact"]
    body = f'''{navbar(t, "contact")}
{page_hero(t, c["hero_tag"], c["hero_title"])}
    <!-- ========== CONTACT ========== -->
    <section id="contact" class="section contact" style="padding-top: 40px;">
        <div class="container">
            <div class="contact-grid">
                <div class="contact-info" data-animate="fade-right">
                    <h3>{c["info_title"]}</h3>
                    <p>{c["info_body"]}</p>
                    <div class="contact-methods">
                        <a href="https://wa.me/40729290290" class="contact-method" target="_blank" rel="noopener">
                            <div class="contact-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </div>
                            <div>
                                <strong>WhatsApp</strong>
                                <span>+40 729 290 290</span>
                            </div>
                        </a>
                        <a href="mailto:festmagic@yahoo.com" class="contact-method">
                            <div class="contact-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </div>
                            <div>
                                <strong>Email</strong>
                                <span>festmagic@yahoo.com</span>
                            </div>
                        </a>
                        <div class="contact-method">
                            <div class="contact-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            </div>
                            <div>
                                <strong>{c["location_label"]}</strong>
                                <span>{c["location"]}</span>
                            </div>
                        </div>
                    </div>
                    <div class="contact-social">
                        <h4>{c["follow"]}</h4>
                        <div class="social-links">
                            <a href="https://facebook.com/magicart.fest" target="_blank" rel="noopener" aria-label="Facebook">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            </a>
                            <a href="https://instagram.com/magicart.fest" target="_blank" rel="noopener" aria-label="Instagram">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                            </a>
                            <a href="https://youtube.com/@magicart.fest" target="_blank" rel="noopener" aria-label="YouTube">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                            </a>
                            <a href="https://tiktok.com/@magicart.fest" target="_blank" rel="noopener" aria-label="TikTok">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                            </a>
                        </div>
                    </div>
                </div>
                <div class="contact-map" data-animate="fade-left">
                    <div class="map-wrapper">
                        <iframe
                            src="https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1sCasa+de+Cultura+Elisabeta+Bostan+Buhusi"
                            width="100%"
                            height="100%"
                            style="border:0;"
                            allowfullscreen=""
                            loading="lazy"
                            title="{c["map_title"]}">
                        </iframe>
                    </div>
                </div>
            </div>
        </div>
    </section>

{newsletter_popup(t)}'''
    return head(t, "contact", c["title"], c["description"]) + body + footer(t, "contact")


def e2026_crumbs(t, self_label):
    return [
        (t["nav"]["home"], href(t, "index")),
        (t["e2026"]["breadcrumb"], None),
        (self_label, None),
    ]


def page_winners(t):
    w = t["e2026"]["winners"]
    cards = []
    for item in WINNERS_2026:
        cat = f'\n                    <div class="winner-category">{w["closeup_cat"]}</div>' if item["category"] else ''
        cards.append(f'''                <div class="winner-card {item["cls"]}" data-animate="fade-up">
                    <div class="winner-medal">{item["medal"]}</div>
                    <span class="winner-prize">{w[item["prize"]]}</span>
                    <h2 class="winner-name">{item["name"]}</h2>
                    <div class="winner-country">{country_for(item, t)}</div>{cat}
                </div>''')
    cards = "\n".join(cards)

    body = f'''{navbar(t, "editia-2026/castigatori")}
{page_hero(t, w["hero_tag"], w["hero_title"], w["hero_sub"], e2026_crumbs(t, t["nav"]["winners"]))}
    <section class="section">
        <div class="container">
            <div class="winners-grid">
{cards}
            </div>
        </div>
    </section>

    <section class="cta-band">
        <div class="container" data-animate="fade-up">
            <h2>{w["cta_title"]}</h2>
            <div class="hero-buttons">
                <a href="{href(t, "inscriere")}" class="btn btn-primary"><span>{w["cta_btn"]}</span></a>
            </div>
        </div>
    </section>

{newsletter_popup(t)}'''
    return head(t, "editia-2026/castigatori", w["title"], w["description"]) + body + footer(t, "editia-2026/castigatori")


def page_guests_2026(t):
    g = t["e2026"]["guests"]
    cards = []
    for item in GUESTS_2026:
        role = g["role_lecture_gala"] if item["role"] == "lecture_gala" else g["role_gala"]
        cards.append(f'''                    <div class="artist-photo-card">
                        <div class="artist-photo">
                            <img src="/images/{item["img"]}" alt="{item["name"]}" loading="lazy">
                        </div>
                        <div class="artist-photo-info">
                            <span class="artist-name">{item["name"]}</span>
                            <span class="artist-country">{country_for(item, t)}</span>
                            <span class="tba-badge">{role}</span>
                        </div>
                    </div>''')
    cards = "\n".join(cards)

    body = f'''{navbar(t, "editia-2026/invitati")}
{page_hero(t, g["hero_tag"], g["hero_title"], g["hero_sub"], e2026_crumbs(t, t["nav"]["guests"]))}
    <section class="section">
        <div class="container">
            <div class="past-artists-section" data-animate="fade-up">
                <div class="artists-photo-grid stagger-children">
{cards}
                </div>
            </div>
        </div>
    </section>

{newsletter_popup(t)}'''
    return head(t, "editia-2026/invitati", g["title"], g["description"]) + body + footer(t, "editia-2026/invitati")


def page_jury_2026(t):
    j = t["e2026"]["jury"]
    cards = []
    for item in JURY_2026:
        cards.append(f'''                    <div class="artist-photo-card">
                        <div class="artist-photo">
                            <img src="/images/{item["img"]}" alt="{item["name"]}" loading="lazy">
                        </div>
                        <div class="artist-photo-info">
                            <span class="artist-name">{item["name"]} {item["country"]}</span>
                            <span class="artist-country">{j["roles"][item["role"]]}</span>
                        </div>
                    </div>''')
    cards = "\n".join(cards)

    body = f'''{navbar(t, "editia-2026/juriu")}
{page_hero(t, j["hero_tag"], j["hero_title"], j["hero_sub"], e2026_crumbs(t, t["nav"]["jury"]))}
    <section class="section">
        <div class="container">
            <div class="past-artists-section" data-animate="fade-up">
                <div class="artists-photo-grid stagger-children">
{cards}
                </div>
            </div>
        </div>
    </section>

{newsletter_popup(t)}'''
    return head(t, "editia-2026/juriu", j["title"], j["description"]) + body + footer(t, "editia-2026/juriu")


def page_gallery_2026(t):
    g = t["e2026"]["gallery"]
    photos = "\n".join(
        f'''                    <div class="gallery-item">
                        <img src="/images/galerie-2026/galerie-2026-{i:02d}.jpg" alt="{g["img_alt"]}" loading="lazy">
                    </div>''' for i in range(1, 13))

    body = f'''{navbar(t, "editia-2026/galerie")}
{page_hero(t, g["hero_tag"], g["hero_title"], g["hero_sub"], e2026_crumbs(t, t["nav"]["gallery"]))}
    <section class="section" style="padding-top: 40px;">
        <div class="container">
            <div class="section-header" data-animate="fade-up">
                <h2 class="section-title">{g["photos_title"]}</h2>
                <div class="section-line"></div>
            </div>
            <div class="event-gallery" data-animate="fade-up">
                <div class="gallery-grid">
{photos}
                </div>
            </div>

            <div class="section-header" data-animate="fade-up" style="margin-top: 90px;">
                <h2 class="section-title">{g["videos_title"]}</h2>
                <div class="section-line"></div>
            </div>
            <div class="video-grid" data-animate="fade-up">
                <!-- Când primim linkurile video, înlocuim placeholder-ul cu:
                     <div class="video-embed"><iframe src="https://www.youtube.com/embed/VIDEO_ID" title="..." allowfullscreen loading="lazy"></iframe></div> -->
                <div class="video-embed">
                    <div class="video-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        <span>{g["video_placeholder"]}</span>
                        <a href="https://youtube.com/@magicart.fest" target="_blank" rel="noopener" class="btn btn-outline"><span>{g["video_cta"]}</span></a>
                    </div>
                </div>
            </div>
        </div>
    </section>

{newsletter_popup(t)}'''
    return head(t, "editia-2026/galerie", g["title"], g["description"]) + body + footer(t, "editia-2026/galerie")


# ============================================================ BUILD

BUILDERS = {
    "index": page_index,
    "gala-show": page_gala,
    "competitie": page_competition,
    "inscriere": page_register,
    "bilete": page_tickets,
    "faq": page_faq,
    "contact": page_contact,
    "editia-2026/castigatori": page_winners,
    "editia-2026/invitati": page_guests_2026,
    "editia-2026/juriu": page_jury_2026,
    "editia-2026/galerie": page_gallery_2026,
}


def build():
    written = []
    for t in LANGS:
        for page, builder in BUILDERS.items():
            html = builder(t)
            rel = t["prefix"] + page + ".html"
            path = os.path.join(ROOT, rel)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(html)
            written.append(rel)

    # sitemap.xml
    urls = []
    for page in PAGES:
        for t in LANGS:
            alts = "\n".join(
                f'    <xhtml:link rel="alternate" hreflang="{l["lang"]}" href="{canonical(l, page)}"/>'
                for l in LANGS)
            urls.append(f'''  <url>
    <loc>{canonical(t, page)}</loc>
{alts}
    <xhtml:link rel="alternate" hreflang="x-default" href="{canonical(RO, page)}"/>
  </url>''')
    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
               'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
               + "\n".join(urls) + "\n</urlset>\n")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sitemap)
    written.append("sitemap.xml")

    print(f"OK — {len(written)} fișiere generate:")
    for w in written:
        print("  ", w)


if __name__ == "__main__":
    build()
