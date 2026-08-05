/* ============================================
   MagicArt Fest - Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ---- Preloader (doar pe pagina principală) ----
    const preloader = document.getElementById('preloader');
    if (preloader) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                preloader.classList.add('hidden');
            }, 800);
        });
        // Fallback: hide preloader after 3s
        setTimeout(() => {
            preloader.classList.add('hidden');
        }, 3000);
    }

    // ---- Custom Cursor ----
    const cursor = document.querySelector('.custom-cursor');
    const follower = document.querySelector('.cursor-follower');

    if (cursor && follower && window.innerWidth > 1024) {
        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animateCursor() {
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;
            followerX += (mouseX - followerX) * 0.08;
            followerY += (mouseY - followerY) * 0.08;

            cursor.style.transform = `translate(${cursorX - 4}px, ${cursorY - 4}px)`;
            follower.style.transform = `translate(${followerX - 18}px, ${followerY - 18}px)`;

            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        // Hover effects on interactive elements
        const hoverElements = document.querySelectorAll('a, button, .btn, .faq-question');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                follower.style.width = '56px';
                follower.style.height = '56px';
                follower.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                cursor.style.transform += ' scale(0.5)';
            });
            el.addEventListener('mouseleave', () => {
                follower.style.width = '36px';
                follower.style.height = '36px';
                follower.style.borderColor = '';
                cursor.style.transform = cursor.style.transform.replace(' scale(0.5)', '');
            });
        });
    }

    // ---- Navbar ----
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const navLinks = document.querySelectorAll('.nav-link');

    // Scroll behavior
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });

    // Mobile menu toggle
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });

    // Close mobile menu on link click
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });

    // Active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    function updateActiveNav() {
        const scrollY = window.scrollY + 100;
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollY >= top && scrollY < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    window.addEventListener('scroll', updateActiveNav);

    // ---- Schedule Tabs ----
    const scheduleTabs = document.querySelectorAll('.schedule-tab');
    const scheduleDays = document.querySelectorAll('.schedule-day');

    scheduleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const day = tab.getAttribute('data-day');

            scheduleTabs.forEach(t => t.classList.remove('active'));
            scheduleDays.forEach(d => d.classList.remove('active'));

            tab.classList.add('active');
            document.querySelector(`.schedule-day[data-day="${day}"]`).classList.add('active');

            // Re-trigger animations for timeline items
            const activeDay = document.querySelector(`.schedule-day[data-day="${day}"]`);
            activeDay.querySelectorAll('.timeline-item').forEach((item, i) => {
                item.classList.remove('in-view');
                setTimeout(() => {
                    item.classList.add('in-view');
                }, i * 100);
            });
        });
    });

    // ---- FAQ Accordion ----
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all
            faqItems.forEach(i => i.classList.remove('active'));

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // ---- Smooth Scroll ----
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ---- Back to Top ----
    const backToTop = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // ---- Parallax Effect for Hero ----
    const heroContent = document.querySelector('.hero-content');
    const heroFloats = document.querySelectorAll('.hero-float');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        if (scrollY < window.innerHeight) {
            const parallax = scrollY * 0.3;
            if (heroContent) {
                heroContent.style.transform = `translateY(${parallax}px)`;
                heroContent.style.opacity = 1 - (scrollY / window.innerHeight) * 1.2;
            }
            heroFloats.forEach((float, i) => {
                float.style.transform = `translateY(${scrollY * (0.1 + i * 0.05)}px)`;
            });
        }
    });

    // ---- Magnetic Effect on Buttons (desktop only) ----
    if (window.innerWidth > 1024) {
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

    // ---- Tilt Effect on Cards (desktop only) ----
    if (window.innerWidth > 1024) {
        document.querySelectorAll('.feature-card, .category-card, .ticket-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                const rotateX = (y - 0.5) * -6;
                const rotateY = (x - 0.5) * 6;
                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // ---- Marquee Duplicate for Seamless Loop ----
    const marqueeTrack = document.querySelector('.marquee-track');
    if (marqueeTrack) {
        const content = marqueeTrack.querySelector('.marquee-content');
        if (content) {
            const clone = content.cloneNode(true);
            marqueeTrack.appendChild(clone);
        }
    }

    // ---- Page Visibility - Pause animations when tab is hidden ----
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.body.classList.add('paused');
        } else {
            document.body.classList.remove('paused');
        }
    });

});
