//TAILWIND

tailwind.config = {
    theme: {
        extend: {
            colors: {
                'industrial-bg': '#050505',
                'game-bg': '#111',
                'brand-orange': '#e65100',
                'success-green': '#4caf50',
                'danger-red': '#d32f2f',
            },
            fontFamily: {
                'mono': ['"Courier Prime"', 'monospace'],
            },
            dropShadow: {
                'glow': '0 0 10px rgba(230, 81, 0, 0.5)',
                'glow-strong': '0 0 15px rgba(230, 81, 0, 0.4)',
            }
        }
    }
}


/**
 * SoundManager: Handles Web Audio API synthesis
 */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.stepTimer = 0;
        this.ambientOsc = null;
        this.gainNode = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.startAmbience();
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    startAmbience() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = 50;

        filter.type = 'lowpass';
        filter.frequency.value = 120;

        gain.gain.value = 0.05;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        this.ambientOsc = osc;

        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.1;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
    }

    playStep() {
        const now = this.ctx.currentTime;
        if (now - this.stepTimer < 0.4) return;
        this.stepTimer = now;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.1);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(t + 0.1);
    }

    playWin() {
        const t = this.ctx.currentTime;
        [440, 554, 659].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, t + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.1, t + i * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.6);
        });

        const noise = this.ctx.createOscillator();
        const nGain = this.ctx.createGain();
        noise.type = 'sawtooth';
        noise.frequency.value = 50;
        noise.frequency.linearRampToValueAtTime(20, t + 1);
        nGain.gain.setValueAtTime(0.05, t);
        nGain.gain.linearRampToValueAtTime(0, t + 1.5);
        noise.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(t);
        noise.stop(t + 1.5);
    }

    playLose() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(50, t + 1);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 1);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.timerEl = document.getElementById('timer');
        this.screens = {
            lore: document.getElementById('lore-screen'),
            start: document.getElementById('start-screen'),
            win: document.getElementById('win-screen'),
            lose: document.getElementById('lose-screen')
        };

        this.soundManager = new SoundManager();

        this.state = 'LORE'; // LORE, MENU, PLAYING, GAMEOVER
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.lastTime = 0;
        this.timeLeft = 60;

        // Player properties
        this.player = {
            x: 0,
            y: 0,
            radius: 8,
            speed: 180,
            angle: 0
        };

        // Input
        this.input = {
            active: false,
            x: 0,
            y: 0
        };

        // World
        this.obstacles = [];
        this.dustParticles = [];
        this.target = { x: 0, y: 0, w: 60, h: 60 };

        window.addEventListener('resize', () => this.resize());

        const handleStart = (e) => {
            if (this.state !== 'PLAYING') return;
            e.preventDefault();
            this.input.active = true;
            this.updateInputPos(e);
        };
        const handleMove = (e) => {
            if (this.state !== 'PLAYING') return;
            e.preventDefault();
            if (this.input.active) this.updateInputPos(e);
        };
        const handleEnd = (e) => {
            if (e.type !== 'mouseup') e.preventDefault();
            this.input.active = false;
        };

        this.canvas.addEventListener('mousedown', handleStart);
        this.canvas.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        this.canvas.addEventListener('touchstart', handleStart, { passive: false });
        this.canvas.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);

        this.resize();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    updateInputPos(e) {
        if (e.touches) {
            this.input.x = e.touches[0].clientX;
            this.input.y = e.touches[0].clientY;
        } else {
            this.input.x = e.clientX;
            this.input.y = e.clientY;
        }
    }

    initLevel() {
        this.player.x = this.width / 2;
        this.player.y = this.height - 50;

        this.timeLeft = 60;
        this.timerEl.innerText = "60";

        // Reset styles (Tailwind classes)
        this.timerEl.classList.remove('text-red-500', 'animate-pulse');
        this.timerEl.classList.add('text-white');

        this.obstacles = [];
        const cols = 5;
        const rows = 8;
        const cellW = this.width / cols;
        const cellH = (this.height - 100) / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > 0.4) {
                    let w = cellW * 0.7;
                    let h = cellH * 0.7;
                    let x = c * cellW + (cellW - w) / 2 + (Math.random() * 10 - 5);
                    let y = r * cellH + (cellH - h) / 2 + (Math.random() * 10 - 5);

                    if (Math.abs(x - this.player.x) < 50 && Math.abs(y - this.player.y) < 50) continue;

                    this.obstacles.push({ x, y, w, h, type: Math.random() > 0.8 ? 'broken' : 'solid' });
                }
            }
        }

        this.target.w = 50;
        this.target.h = 50;
        this.target.x = Math.random() * (this.width - 100) + 25;
        this.target.y = 50;

        this.obstacles = this.obstacles.filter(obs => {
            const dist = Math.hypot(obs.x - this.target.x, obs.y - this.target.y);
            return dist > 80;
        });

        this.dustParticles = [];
        for (let i = 0; i < 50; i++) {
            this.dustParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: Math.random() * 2
            });
        }
    }

    // New method: Go from Lore -> Mission
    showMission() {
        this.screens.lore.classList.add('hidden'); // Tailwind hidden
        this.screens.start.classList.remove('hidden');
        this.state = 'MENU';

        // Try to init audio context early if browser allows on click
        this.soundManager.init();
    }

    start() {
        this.soundManager.init();
        this.screens.start.classList.add('hidden');
        this.state = 'PLAYING';
        this.initLevel();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    reset() {
        this.screens.win.classList.add('hidden');
        this.screens.lose.classList.add('hidden');
        // Go back to Mission screen, not Lore
        this.screens.start.classList.remove('hidden');
        this.state = 'MENU';
    }

    gameOver(won) {
        this.state = 'GAMEOVER';
        this.input.active = false;
        if (won) {
            this.soundManager.playWin();
            this.screens.win.classList.remove('hidden');
        } else {
            this.soundManager.playLose();
            this.screens.lose.classList.remove('hidden');
        }
    }

    checkCollision(newX, newY) {
        if (newX < 0 || newX > this.width || newY < 0 || newY > this.height) return true;

        const pR = this.player.radius;
        for (let obs of this.obstacles) {
            if (newX + pR > obs.x && newX - pR < obs.x + obs.w &&
                newY + pR > obs.y && newY - pR < obs.y + obs.h) {
                return true;
            }
        }
        return false;
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        this.timeLeft -= dt;
        if (this.timeLeft <= 10) {
            // Apply Tailwind classes for danger state
            this.timerEl.classList.remove('text-white');
            this.timerEl.classList.add('text-red-500', 'animate-pulse');
        }
        this.timerEl.innerText = Math.ceil(this.timeLeft);

        if (this.timeLeft <= 0) {
            this.gameOver(false);
            return;
        }

        if (this.input.active) {
            const dx = this.input.x - this.player.x;
            const dy = this.input.y - this.player.y;
            const dist = Math.hypot(dx, dy);

            this.player.angle = Math.atan2(dy, dx);

            if (dist > 5) {
                const moveDist = this.player.speed * dt;
                const moveX = Math.cos(this.player.angle) * moveDist;
                const moveY = Math.sin(this.player.angle) * moveDist;

                let moved = false;
                if (!this.checkCollision(this.player.x + moveX, this.player.y)) {
                    this.player.x += moveX;
                    moved = true;
                }
                if (!this.checkCollision(this.player.x, this.player.y + moveY)) {
                    this.player.y += moveY;
                    moved = true;
                }

                if (moved) this.soundManager.playStep();
            }
        }

        if (this.player.x > this.target.x - 10 && this.player.x < this.target.x + this.target.w + 10 &&
            this.player.y > this.target.y - 10 && this.player.y < this.target.y + this.target.h + 10) {
            this.gameOver(true);
        }

        this.dustParticles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
            if (p.y < 0) p.y = this.height;
            if (p.y > this.height) p.y = 0;
        });
    }

    draw() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const t = this.target;
        this.ctx.fillStyle = '#3a3a3a';
        this.ctx.fillRect(t.x - 2, t.y - 2, t.w + 4, t.h + 4);
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(t.x, t.y, t.w, t.h);
        this.ctx.strokeStyle = '#111';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(t.x, t.y + t.h / 2);
        this.ctx.lineTo(t.x + t.w, t.y + t.h / 2);
        this.ctx.stroke();
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(t.x + 2, t.y + 2, 4, 4);
        this.ctx.fillRect(t.x + t.w - 6, t.y + 2, 4, 4);
        this.ctx.fillRect(t.x + 2, t.y + t.h - 6, 4, 4);
        this.ctx.fillRect(t.x + t.w - 6, t.y + t.h - 6, 4, 4);
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(t.x + t.w / 2 - 8, t.y + t.h / 2 - 4, 16, 8);
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(t.x + t.w / 2 - 8, t.y + t.h / 2 - 4, 16, 8);

        this.obstacles.forEach(obs => {
            this.ctx.fillStyle = '#5d4037';
            this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            this.ctx.fillStyle = '#795548';
            this.ctx.fillRect(obs.x, obs.y, obs.w, 5);

            if (obs.type === 'broken') {
                this.ctx.fillStyle = '#3e2723';
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x, obs.y + obs.h);
                this.ctx.lineTo(obs.x + 10, obs.y + obs.h - 15);
                this.ctx.lineTo(obs.x + 20, obs.y + obs.h);
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = '#3e2723';
                this.ctx.beginPath();
                this.ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.globalCompositeOperation = 'source-over';

        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.1)';
        this.dustParticles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.save();
        const gradient = this.ctx.createRadialGradient(
            this.player.x, this.player.y, 20,
            this.player.x, this.player.y, 180
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.8, 'rgba(0,0,0,0.95)');
        gradient.addColorStop(1, 'rgba(0,0,0,1)');

        this.ctx.fillStyle = gradient;
        this.ctx.translate(this.player.x - this.width / 2, this.player.y - this.height / 2);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();
    }

    loop(timestamp) {
        if (this.state !== 'PLAYING') return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }
}

const game = new Game();