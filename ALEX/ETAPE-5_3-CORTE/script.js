//TAILWIND CONFIG 

// --- AUDIO SYSTEM ---
const AudioSys = {
    ctx: null,
    init: function () {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },
    playTone: function (freq, type, duration, vol = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playStep: function () {
        // Petit bruit blanc très court pour les pas
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.05; // 50ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.05;
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    },
    playWin: function () {
        this.playTone(440, 'square', 0.1, 0.2);
        setTimeout(() => this.playTone(554, 'square', 0.1, 0.2), 100);
        setTimeout(() => this.playTone(659, 'square', 0.2, 0.2), 200);
    },
    playCatch: function () {
        this.playTone(880, 'sine', 0.1, 0.3);
        this.playTone(1200, 'sine', 0.3, 0.3);
    },
    playFail: function () {
        this.playTone(200, 'sawtooth', 0.5, 0.3);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.5, 0.3), 400);
    }
};

const Game = {
    canvas: document.getElementById('gameCanvas'),
    ctx: document.getElementById('gameCanvas').getContext('2d'),

    // Config
    cols: 21,
    rows: 15,
    cellSize: 0,

    // Game Loop variables
    timeLeft: 60000, // 60s total mais on gagne du temps
    totalTime: 60000,
    lastTime: 0,
    running: false,
    round: 1,
    maxRounds: 3,

    // State
    maze: [],
    player: { x: 1, y: 1, color: '#1b91bc', nextDir: null, currentDir: null, moveProgress: 0, speed: 7.0, lastStepTime: 0 },
    enemy: { x: 19, y: 13, color: '#FFD700', moveTimer: 0, moveInterval: 300, lastPos: { x: -1, y: -1 } },

    init: function () {
        AudioSys.init();
        document.getElementById('intro-screen').classList.add('hidden');
        document.getElementById('fail-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        this.round = 1;
        this.timeLeft = 50000;
        this.totalTime = 50000;

        this.startRound();

        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    },

    startRound: function () {
        this.resize();
        this.generateMaze();

        // Difficulte progressive (PLUS VITE)
        // Round 1: 220ms (Rapide)
        // Round 2: 160ms (Très rapide)
        // Round 3: 110ms (Frénétique)
        this.enemy.moveInterval = Math.max(100, 280 - (this.round * 60));

        // Reset Entities
        this.player.x = 1; this.player.y = 1;
        this.player.moveProgress = 0;
        this.player.currentDir = null;
        this.player.nextDir = null;

        // Place enemy far away
        this.enemy.x = this.cols - 2;
        this.enemy.y = this.rows - 2;
        this.enemy.moveTimer = 0;
        this.enemy.lastPos = { x: -1, y: -1 };

        document.getElementById('round-indicator').innerText = `MANCHE ${this.round}/${this.maxRounds}`;
        AudioSys.playTone(600, 'sine', 0.2); // Start beep
    },

    reset: function () {
        document.getElementById('fail-screen').classList.add('hidden');
        document.getElementById('intro-screen').classList.remove('hidden');
    },

    resize: function () {
        const wrapper = document.getElementById('canvas-wrapper');
        let w = wrapper.clientWidth;
        let h = wrapper.clientHeight;
        this.cellSize = Math.floor(Math.min(w / this.cols, h / this.rows));
        this.canvas.width = this.cellSize * this.cols;
        this.canvas.height = this.cellSize * this.rows;
    },

    generateMaze: function () {
        this.maze = [];
        for (let y = 0; y < this.rows; y++) {
            let row = [];
            for (let x = 0; x < this.cols; x++) row.push(1);
            this.maze.push(row);
        }

        const stack = [];
        const start = { x: 1, y: 1 };
        this.maze[start.y][start.x] = 0;
        stack.push(start);

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = [];
            const dirs = [{ x: 0, y: -2 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: -2, y: 0 }];

            for (let d of dirs) {
                const nx = current.x + d.x;
                const ny = current.y + d.y;
                if (nx > 0 && nx < this.cols - 1 && ny > 0 && ny < this.rows - 1 && this.maze[ny][nx] === 1) {
                    neighbors.push({ x: nx, y: ny, dx: d.x / 2, dy: d.y / 2 });
                }
            }

            if (neighbors.length > 0) {
                const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
                this.maze[chosen.y][chosen.x] = 0;
                this.maze[current.y + chosen.dy][current.x + chosen.dx] = 0;
                stack.push({ x: chosen.x, y: chosen.y });
            } else {
                stack.pop();
            }
        }

        // Plus de boucles pour le round 3 pour compliquer la poursuite
        const loopCount = 10 + (this.round * 5);
        for (let i = 0; i < loopCount; i++) {
            let rx = Math.floor(Math.random() * (this.cols - 2)) + 1;
            let ry = Math.floor(Math.random() * (this.rows - 2)) + 1;
            if (this.maze[ry][rx] === 1) this.maze[ry][rx] = 0;
        }
    },

    loop: function (timestamp) {
        if (!this.running) return;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.update(dt, timestamp); // Passe le timestamp à update
        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    },

    update: function (dt, timestamp) { // Accepte le timestamp
        // Timer
        this.timeLeft -= dt;
        const pct = Math.max(0, (this.timeLeft / this.totalTime) * 100);
        const bar = document.getElementById('timer-bar');
        bar.style.width = pct + '%';

        if (pct < 20) bar.style.backgroundColor = 'var(--au-danger)';
        else bar.style.backgroundColor = 'var(--au-success)';

        if (this.timeLeft <= 0) {
            this.endGame(false);
            return;
        }

        // Player Movement
        if (this.player.currentDir === null) {
            if (this.player.nextDir) {
                const targetX = this.player.x + this.player.nextDir.x;
                const targetY = this.player.y + this.player.nextDir.y;
                if (this.maze[targetY][targetX] === 0) {
                    this.player.currentDir = this.player.nextDir;
                    this.player.moveProgress = 0;
                    if (timestamp - this.player.lastStepTime > 300) {
                        AudioSys.playStep(); // Sound!
                        this.player.lastStepTime = timestamp;
                    }
                }
            }
        }

        if (this.player.currentDir) {
            this.player.moveProgress += (this.player.speed * dt) / 1000;
            if (this.player.moveProgress >= 1) {
                this.player.x += this.player.currentDir.x;
                this.player.y += this.player.currentDir.y;
                this.player.moveProgress = 0;
                this.player.currentDir = null;
                if (this.player.nextDir) {
                    const tx = this.player.x + this.player.nextDir.x;
                    const ty = this.player.y + this.player.nextDir.y;
                    if (this.maze[ty][tx] === 0) {
                        this.player.currentDir = this.player.nextDir;
                        AudioSys.playStep();
                    } else {
                        this.player.nextDir = null;
                    }
                }
            }
        }

        // Enemy Logic (Timer based)
        this.enemy.moveTimer += dt;
        if (this.enemy.moveTimer > this.enemy.moveInterval) {
            this.enemy.moveTimer = 0;
            this.moveEnemySmart();
        }

        // Collision
        const dx = this.player.x - this.enemy.x;
        const dy = this.player.y - this.enemy.y;
        if (Math.sqrt(dx * dx + dy * dy) < 1.0) {
            this.catchTarget();
        }
    },

    moveEnemySmart: function () {
        const possibleMoves = [
            { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
        ];

        let bestMove = null;
        let maxScore = -999999;

        // 1. Identifier les voisins valides
        const validMoves = possibleMoves.filter(m => {
            const tx = this.enemy.x + m.x;
            const ty = this.enemy.y + m.y;
            return this.maze[ty][tx] === 0;
        });

        // Si cul de sac (1 seul chemin), on est obligé de le prendre
        if (validMoves.length === 1) {
            this.enemy.lastPos = { x: this.enemy.x, y: this.enemy.y };
            this.enemy.x += validMoves[0].x;
            this.enemy.y += validMoves[0].y;
            return;
        }

        // Vecteur Joueur -> Ennemi (Direction de la menace)
        const threatX = this.enemy.x - this.player.x;
        const threatY = this.enemy.y - this.player.y;

        // Sinon, on évalue les meilleurs choix
        for (let m of validMoves) {
            const tx = this.enemy.x + m.x;
            const ty = this.enemy.y + m.y;

            // A. Distance au carré (Base)
            const distSq = Math.pow((tx - this.player.x), 2) + Math.pow((ty - this.player.y), 2);
            let score = distSq * 10;

            // B. Vecteur de Fuite (Produit Scalaire)
            // Si le mouvement va dans le même sens que (Ennemi - Joueur), c'est une bonne fuite.
            // Cela permet de fuir "en diagonale" ou à l'opposé exact.
            const dotProduct = (m.x * threatX) + (m.y * threatY);
            if (dotProduct > 0) {
                score += 300; // GROS BONUS pour s'éloigner activement
            } else if (dotProduct < 0) {
                score -= 200; // PENALITÉ pour se rapprocher de l'axe du joueur
            }

            // C. Liberté de mouvement (Anticipation)
            let exits = 0;
            for (let sm of possibleMoves) {
                if (this.maze[ty + sm.y][tx + sm.x] === 0) exits++;
            }
            score += exits * 50; // Privilégier les carrefours

            // D. Pénalité de retour (Anti-Ping-Pong)
            if (tx === this.enemy.lastPos.x && ty === this.enemy.lastPos.y) {
                score -= 5000;
            }

            // E. Pénalité Cul-de-sac (Danger de mort)
            if (exits <= 1) {
                score -= 2000;
            }

            if (score > maxScore) {
                maxScore = score;
                bestMove = m;
            }
        }

        if (bestMove) {
            this.enemy.lastPos = { x: this.enemy.x, y: this.enemy.y };
            this.enemy.x += bestMove.x;
            this.enemy.y += bestMove.y;
        }
    },

    catchTarget: function () {
        if (this.round < this.maxRounds) {
            // Next Round
            this.running = false;
            AudioSys.playCatch();

            const overlay = document.getElementById('level-overlay');
            overlay.style.opacity = '1';
            overlay.style.transform = 'translate(-50%, -50%) scale(1.2)';

            setTimeout(() => {
                this.round++;
                this.timeLeft += 10000; // Bonus time
                if (this.timeLeft > this.totalTime) this.timeLeft = this.totalTime;

                overlay.style.opacity = '0';
                overlay.style.transform = 'translate(-50%, -50%) scale(1)';

                this.startRound();
                this.running = true;
                this.lastTime = performance.now();
                requestAnimationFrame((t) => this.loop(t));
            }, 1000);
        } else {
            this.endGame(true);
        }
    },

    draw: function () {
        const ctx = this.ctx;
        const cs = this.cellSize;

        ctx.fillStyle = '#222226';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#1a1a1d';
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.maze[y][x] === 1) {
                    ctx.fillRect(x * cs, y * cs, cs, cs);
                    ctx.strokeStyle = '#2a2a2e';
                    ctx.strokeRect(x * cs, y * cs, cs, cs);
                } else {
                    // Floor
                    if (x % 2 === 0 && y % 2 === 0) {
                        ctx.fillStyle = 'rgba(255,255,255,0.03)';
                        ctx.fillRect(x * cs, y * cs, cs, cs);
                        ctx.fillStyle = '#1a1a1d';
                    }
                }
            }
        }

        // Draw Enemy
        const ex = this.enemy.x * cs + cs / 2;
        const ey = this.enemy.y * cs + cs / 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.enemy.color;
        ctx.fillStyle = this.enemy.color;
        ctx.beginPath();
        ctx.arc(ex, ey, cs / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Player
        let px = this.player.x * cs;
        let py = this.player.y * cs;
        if (this.player.currentDir) {
            px += (this.player.currentDir.x * cs) * this.player.moveProgress;
            py += (this.player.currentDir.y * cs) * this.player.moveProgress;
        }
        px += cs / 2;
        py += cs / 2;

        ctx.shadowBlur = 10;
        ctx.shadowColor = this.player.color;
        ctx.fillStyle = this.player.color;
        ctx.beginPath();
        ctx.arc(px, py, cs / 3, 0, Math.PI * 2);
        ctx.fill();
        // Visor
        ctx.fillStyle = '#87CEEB';
        ctx.beginPath();
        ctx.ellipse(px + 4, py - 2, cs / 8, cs / 6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    },

    endGame: function (win) {
        this.running = false;
        document.getElementById('game-screen').classList.add('hidden');
        if (win) {
            AudioSys.playWin();
            document.getElementById('win-screen').classList.remove('hidden');
        } else {
            AudioSys.playFail();
            document.getElementById('fail-screen').classList.remove('hidden');
        }
    }
};

window.addEventListener('keydown', (e) => {
    if (!Game.running) return;
    switch (e.key) {
        case 'ArrowUp': case 'z': Game.player.nextDir = { x: 0, y: -1 }; break;
        case 'ArrowDown': case 's': Game.player.nextDir = { x: 0, y: 1 }; break;
        case 'ArrowLeft': case 'q': Game.player.nextDir = { x: -1, y: 0 }; break;
        case 'ArrowRight': case 'd': Game.player.nextDir = { x: 1, y: 0 }; break;
    }
});

const bindTouch = (id, x, y) => {
    const btn = document.getElementById(id);
    const setDir = (e) => { e.preventDefault(); if (Game.running) Game.player.nextDir = { x, y }; };
    btn.addEventListener('touchstart', setDir, { passive: false });
    btn.addEventListener('mousedown', setDir);
};
bindTouch('btn-up', 0, -1);
bindTouch('btn-down', 0, 1);
bindTouch('btn-left', -1, 0);
bindTouch('btn-right', 1, 0);

window.addEventListener('resize', () => { if (Game.running) Game.resize(); });