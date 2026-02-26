/* ============================================
   MagicArt Fest - Enhanced Scroll Animations
   ============================================ */

class ScrollAnimations {
    constructor() {
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupCounters();
        this.setupParallaxElements();
        this.setupImageReveals();
        this.setupSectionHeaders();
    }

    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '0px 0px -80px 0px',
            threshold: 0.1,
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, options);

        // Observe all animated elements
        document.querySelectorAll('[data-animate]').forEach(el => {
            observer.observe(el);
        });

        // Observe timeline items
        document.querySelectorAll('.timeline-item').forEach(el => {
            observer.observe(el);
        });

        // Observe stagger containers
        document.querySelectorAll('.stagger-children').forEach(el => {
            observer.observe(el);
        });

        // Observe image reveal elements
        document.querySelectorAll('.img-reveal').forEach(el => {
            observer.observe(el);
        });
    }

    setupSectionHeaders() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, { threshold: 0.2 });

        document.querySelectorAll('.section-header').forEach(el => {
            observer.observe(el);
        });
    }

    setupCounters() {
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('[data-count]').forEach(el => {
            counterObserver.observe(el);
        });
    }

    animateCounter(element) {
        const target = parseInt(element.getAttribute('data-count'));
        const duration = 2200;
        const start = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out expo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const value = Math.floor(eased * target);
            element.textContent = value;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target;
            }
        };

        requestAnimationFrame(update);
    }

    setupParallaxElements() {
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        if (parallaxElements.length === 0) return;

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            parallaxElements.forEach(el => {
                const speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
                const rect = el.getBoundingClientRect();
                const offset = (rect.top + scrollY - window.innerHeight / 2) * speed;
                el.style.transform = `translateY(${offset}px)`;
            });
        }, { passive: true });
    }

    setupImageReveals() {
        // Add subtle hover tilt on gallery items
        if (window.innerWidth > 1024) {
            document.querySelectorAll('.gallery-item').forEach(item => {
                item.addEventListener('mousemove', (e) => {
                    const rect = item.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width - 0.5;
                    const y = (e.clientY - rect.top) / rect.height - 0.5;
                    item.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
                });
                item.addEventListener('mouseleave', () => {
                    item.style.transform = '';
                });
            });
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new ScrollAnimations();
});
