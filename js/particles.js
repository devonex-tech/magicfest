/* ============================================
   MagicArt Fest - Hero Particle System
   ============================================ */

class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.stars = [];
        this.mouse = { x: 0, y: 0 };
        this.goldColor = { r: 212, g: 175, b: 55 };
        this.purpleColor = { r: 142, g: 68, b: 236 };

        this.resize();
        this.createStars();
        this.createParticles();
        this.bindEvents();
        this.animate();
    }

    resize() {
        this.width = this.canvas.width = this.canvas.offsetWidth;
        this.height = this.canvas.height = this.canvas.offsetHeight;
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            this.stars = [];
            this.createStars();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
    }

    createStars() {
        const count = Math.floor((this.width * this.height) / 8000);
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.2,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinkleOffset: Math.random() * Math.PI * 2,
            });
        }
    }

    createParticles() {
        const count = Math.min(60, Math.floor(this.width / 20));
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        const isGold = Math.random() > 0.3;
        const color = isGold ? this.goldColor : this.purpleColor;
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.4 + 0.1,
            color: color,
            life: Math.random() * 200 + 100,
            maxLife: 300,
        };
    }

    drawStars(time) {
        this.stars.forEach(star => {
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
            const opacity = star.opacity + twinkle * 0.2;

            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, opacity)})`;
            this.ctx.fill();
        });
    }

    drawParticles() {
        this.particles.forEach((p, i) => {
            // Mouse interaction
            const dx = this.mouse.x - p.x;
            const dy = this.mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 200) {
                const force = (200 - dist) / 200;
                p.vx -= (dx / dist) * force * 0.02;
                p.vy -= (dy / dist) * force * 0.02;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            // Damping
            p.vx *= 0.99;
            p.vy *= 0.99;

            // Wrap around
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
            if (p.y < 0) p.y = this.height;
            if (p.y > this.height) p.y = 0;

            // Fade based on life
            const lifeRatio = p.life / p.maxLife;
            const opacity = p.opacity * (lifeRatio < 0.2 ? lifeRatio / 0.2 : 1);

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${opacity})`;
            this.ctx.fill();

            // Draw glow
            const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
            gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${opacity * 0.3})`);
            gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Reset dead particles
            if (p.life <= 0) {
                this.particles[i] = this.createParticle();
            }
        });

        // Draw connections
        this.drawConnections();
    }

    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const a = this.particles[i];
                const b = this.particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    const opacity = (1 - dist / 150) * 0.08;
                    this.ctx.beginPath();
                    this.ctx.moveTo(a.x, a.y);
                    this.ctx.lineTo(b.x, b.y);
                    this.ctx.strokeStyle = `rgba(212, 175, 55, ${opacity})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        const time = Date.now();
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background gradient
        const bgGradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width * 0.7
        );
        bgGradient.addColorStop(0, 'rgba(15, 12, 25, 1)');
        bgGradient.addColorStop(0.5, 'rgba(10, 10, 15, 1)');
        bgGradient.addColorStop(1, 'rgba(10, 10, 11, 1)');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Subtle nebula effect
        const nebulaX = this.width * 0.3;
        const nebulaY = this.height * 0.4;
        const nebula = this.ctx.createRadialGradient(nebulaX, nebulaY, 0, nebulaX, nebulaY, 300);
        nebula.addColorStop(0, 'rgba(142, 68, 236, 0.03)');
        nebula.addColorStop(1, 'rgba(142, 68, 236, 0)');
        this.ctx.fillStyle = nebula;
        this.ctx.fillRect(0, 0, this.width, this.height);

        const nebula2X = this.width * 0.7;
        const nebula2Y = this.height * 0.6;
        const nebula2 = this.ctx.createRadialGradient(nebula2X, nebula2Y, 0, nebula2X, nebula2Y, 250);
        nebula2.addColorStop(0, 'rgba(212, 175, 55, 0.02)');
        nebula2.addColorStop(1, 'rgba(212, 175, 55, 0)');
        this.ctx.fillStyle = nebula2;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawStars(time);
        this.drawParticles();

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new ParticleSystem('heroCanvas');
});
