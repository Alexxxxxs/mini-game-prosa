/**
 * AUDIO ENGINE (Simple Synth pour éviter les fichiers externes)
 */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'blip') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'success') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }
}

/**
 * GAME ENGINE
 */
const game = {
    stage: 0,
    isRunning: false,
    timerInterval: null,
    animationFrame: null,
    timeLeft: 0,
    maxTime: 0,

    // DOM Elements
    ui: {
        screens: {
            start: document.getElementById('start-screen'),
            gameOver: document.getElementById('game-over-screen'),
            win: document.getElementById('win-screen')
        },
        instruction: document.getElementById('current-instruction'),
        timerBar: document.getElementById('timer-bar'),
        levelIndicator: document.getElementById('level-indicator'),
        modules: document.querySelectorAll('.qte-module')
    },

    // QTE Configs
    levels: [
        { type: 'mash', time: 5000, label: "SURCHARGEZ LE SYSTÈME", target: 15 },
        { type: 'sequence', time: 6000, label: "ENTREZ LE CODE", length: 5 },
        { type: 'reflex', time: 4000, label: "NEUTRALISEZ LA CIBLE", count: 3 }, // 3 cibles à cliquer
        { type: 'timing', time: 4000, label: "SYNCHRONISATION", speed: 2 },
        { type: 'hold', time: 6000, label: "STABILISATION PRESSION", duration: 1500 } // Tenir 1.5s
    ],

    start: function () {
        this.stage = 0;
        this.isRunning = true;

        // Hide screens
        Object.values(this.ui.screens).forEach(s => s.classList.add('hidden'));

        this.nextLevel();
    },

    nextLevel: function () {
        if (this.stage >= this.levels.length) {
            this.win();
            return;
        }

        const level = this.levels[this.stage];
        this.ui.levelIndicator.innerText = `PROTOCOLE ${this.stage + 1}/${this.levels.length}`;
        this.ui.instruction.innerText = level.label;

        // Reset and show Module
        this.hideAllModules();
        this.startTimer(level.time);

        // Init Specific Logic
        switch (level.type) {
            case 'mash': qteMash.init(level); break;
            case 'sequence': qteSequence.init(level); break;
            case 'timing': qteTiming.init(level); break;
            case 'reflex': qteReflex.init(level); break;
            case 'hold': qteHold.init(level); break;
        }
    },

    hideAllModules: function () {
        this.ui.modules.forEach(m => m.style.display = 'none');
    },

    startTimer: function (ms) {
        clearInterval(this.timerInterval);
        this.maxTime = ms;
        this.timeLeft = ms;

        this.updateTimerBar();

        const startTime = Date.now();

        this.timerInterval = setInterval(() => {
            if (!this.isRunning) return;

            const elapsed = Date.now() - startTime;
            this.timeLeft = Math.max(0, this.maxTime - elapsed);

            this.updateTimerBar();

            if (this.timeLeft <= 0) {
                this.fail("Temps écoulé !");
            }
        }, 16); // 60fps approx
    },

    updateTimerBar: function () {
        const pct = (this.timeLeft / this.maxTime) * 100;
        this.ui.timerBar.style.width = `${pct}%`;
        if (pct < 30) this.ui.timerBar.style.background = 'var(--danger)';
        else this.ui.timerBar.style.background = 'var(--warning)';
    },

    success: function () {
        playSound('success');
        clearInterval(this.timerInterval);
        cancelAnimationFrame(this.animationFrame);
        this.stage++;
        setTimeout(() => this.nextLevel(), 500);
    },

    fail: function (reason) {
        if (!this.isRunning) return;
        this.isRunning = false;
        playSound('fail');
        clearInterval(this.timerInterval);
        cancelAnimationFrame(this.animationFrame);

        document.getElementById('fail-reason').innerText = reason;
        this.ui.screens.gameOver.classList.remove('hidden');
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);
    },

    win: function () {
        this.isRunning = false;
        playSound('success');
        clearInterval(this.timerInterval);
        this.ui.screens.win.classList.remove('hidden');
    }
};

/**
 * QTE 1: MASH (Bourrinage)
 */
const qteMash = {
    clicks: 0,
    target: 0,
    element: document.getElementById('qte-mash'),
    btn: document.getElementById('mash-btn'),
    bar: document.getElementById('mash-progress'),

    init: function (config) {
        this.element.style.display = 'flex';
        this.clicks = 0;
        this.target = config.target;
        this.updateUI();

        // Listeners
        this.btn.onclick = () => this.mash();
        window.onkeydown = (e) => {
            if (game.isRunning && game.levels[game.stage].type === 'mash' && e.code === 'Space') {
                this.mash();
            }
        };
    },

    mash: function () {
        this.clicks++;
        playSound('blip');
        this.updateUI();
        if (this.clicks >= this.target) {
            game.success();
            window.onkeydown = null;
            this.btn.onclick = null;
        }
    },

    updateUI: function () {
        const pct = Math.min(100, (this.clicks / this.target) * 100);
        this.bar.style.width = `${pct}%`;
    }
};

/**
 * QTE 2: SEQUENCE (Mémoire/Code)
 */
const qteSequence = {
    element: document.getElementById('qte-sequence'),
    sequence: [],
    inputIndex: 0,
    keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    visuals: {
        'ArrowUp': document.getElementById('key-up'),
        'ArrowDown': document.getElementById('key-down'),
        'ArrowLeft': document.getElementById('key-left'),
        'ArrowRight': document.getElementById('key-right')
    },

    init: function (config) {
        this.element.style.display = 'flex';
        this.sequence = [];
        this.inputIndex = 0;

        // Reset Visuals
        Object.values(this.visuals).forEach(el => {
            el.className = 'arrow-key';
            el.onclick = () => this.checkInput(el.id === 'key-up' ? 'ArrowUp' : el.id === 'key-down' ? 'ArrowDown' : el.id === 'key-left' ? 'ArrowLeft' : 'ArrowRight');
        });

        // Generate Sequence
        const display = document.getElementById('seq-display');
        display.innerHTML = '';
        for (let i = 0; i < config.length; i++) {
            const k = this.keys[Math.floor(Math.random() * this.keys.length)];
            this.sequence.push(k);

            const span = document.createElement('span');
            span.innerText = k === 'ArrowUp' ? '▲' : k === 'ArrowDown' ? '▼' : k === 'ArrowLeft' ? '◀' : '▶';
            span.style.color = '#555';
            span.id = `seq-icon-${i}`;
            display.appendChild(span);
        }

        // Highlight first
        document.getElementById(`seq-icon-0`).style.color = 'var(--text)';

        window.onkeydown = (e) => {
            if (game.isRunning && game.levels[game.stage].type === 'sequence' && this.keys.includes(e.code)) {
                e.preventDefault();
                this.checkInput(e.code);
            }
        };
    },

    checkInput: function (code) {
        const expected = this.sequence[this.inputIndex];
        const uiKey = this.visuals[code];

        // Feedback visuel sur la touche virtuelle
        uiKey.classList.add('active');
        setTimeout(() => uiKey.classList.remove('active'), 100);

        if (code === expected) {
            playSound('blip');
            // Update icons
            document.getElementById(`seq-icon-${this.inputIndex}`).style.color = 'var(--success)';

            this.inputIndex++;
            if (this.inputIndex < this.sequence.length) {
                document.getElementById(`seq-icon-${this.inputIndex}`).style.color = 'var(--text)';
            } else {
                game.success();
            }
        } else {
            game.fail("Mauvais Code !");
        }
    }
};

/**
 * QTE 3: TIMING (Sniper)
 */
const qteTiming = {
    element: document.getElementById('qte-timing'),
    cursor: document.getElementById('timing-cursor'),
    target: document.getElementById('timing-target'),
    btn: document.getElementById('timing-btn'),
    pos: 0,
    direction: 1,
    speed: 1,
    targetLeft: 0,
    targetWidth: 10, // Percent

    init: function (config) {
        this.element.style.display = 'flex';
        this.pos = 0;
        this.direction = 1;
        this.speed = config.speed;

        // Random Target Position (between 20% and 70%)
        this.targetLeft = 20 + Math.random() * 50;
        this.target.style.left = `${this.targetLeft}%`;
        this.target.style.width = `${this.targetWidth}%`;

        this.btn.onclick = () => this.stop();
        window.onkeydown = (e) => {
            if (game.isRunning && game.levels[game.stage].type === 'timing' && e.code === 'Enter') {
                this.stop();
            }
        };

        this.loop();
    },

    loop: function () {
        if (!game.isRunning) return;

        this.pos += this.speed * this.direction;
        if (this.pos >= 100 || this.pos <= 0) this.direction *= -1;

        this.cursor.style.left = `${this.pos}%`;

        game.animationFrame = requestAnimationFrame(() => this.loop());
    },

    stop: function () {
        if (!game.isRunning) return;

        // Check collision (cursor center vs target bounds)
        // Cursor width is tiny, treat as point
        if (this.pos >= this.targetLeft && this.pos <= (this.targetLeft + this.targetWidth)) {
            game.success();
        } else {
            game.fail("Cible manquée !");
        }
    }
};

/**
 * QTE 4: REFLEX (Whack-a-mole style)
 */
const qteReflex = {
    element: document.getElementById('qte-reflex'),
    container: document.getElementById('reflex-container'),
    targetsLeft: 0,
    gridSize: 9,

    init: function (config) {
        this.element.style.display = 'flex';
        this.targetsLeft = config.count;
        this.createGrid();
        this.spawnTarget();
    },

    createGrid: function () {
        this.container.innerHTML = '';
        for (let i = 0; i < this.gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'reflex-cell';
            cell.dataset.id = i;
            cell.onclick = (e) => this.handleClick(e.target);
            this.container.appendChild(cell);
        }
    },

    spawnTarget: function () {
        // Clear old
        document.querySelectorAll('.reflex-target').forEach(el => el.classList.remove('reflex-target'));

        // Pick random
        const cells = document.querySelectorAll('.reflex-cell');
        const randomIdx = Math.floor(Math.random() * cells.length);
        cells[randomIdx].classList.add('reflex-target');

        playSound('blip');
    },

    handleClick: function (el) {
        if (!game.isRunning) return;

        if (el.classList.contains('reflex-target')) {
            this.targetsLeft--;
            if (this.targetsLeft <= 0) {
                game.success();
            } else {
                this.spawnTarget();
            }
        } else {
            // Clicking empty cell fails immediately? Or just penalty? Let's punish.
            game.fail("Mauvaise Cible !");
        }
    }
};

/**
 * QTE 5: HOLD (Stabilization)
 */
const qteHold = {
    element: document.getElementById('qte-hold'),
    btn: document.getElementById('hold-btn'),
    fill: document.getElementById('hold-gauge-fill'),
    level: 0, // 0 to 100
    isHolding: false,
    decay: 0.5,
    growth: 1.5,
    targetMin: 60,
    targetMax: 80,
    holdDurationNeeded: 0, // ms
    holdTimeAccumulated: 0,

    init: function (config) {
        this.element.style.display = 'flex';
        this.level = 0;
        this.holdTimeAccumulated = 0;
        this.holdDurationNeeded = config.duration;
        this.isHolding = false;

        // Setup Target Zone Visual
        const zone = document.getElementById('hold-target-zone');
        zone.style.bottom = `${this.targetMin}%`;
        zone.style.height = `${this.targetMax - this.targetMin}%`;

        // Listeners
        const startHold = (e) => {
            e.preventDefault();
            this.isHolding = true;
            this.btn.classList.add('holding');
        };
        const endHold = (e) => {
            e.preventDefault();
            this.isHolding = false;
            this.btn.classList.remove('holding');
        };

        this.btn.onmousedown = startHold;
        this.btn.onmouseup = endHold;
        this.btn.ontouchstart = startHold;
        this.btn.ontouchend = endHold;

        window.onkeydown = (e) => {
            if (game.isRunning && game.levels[game.stage].type === 'hold' && e.code === 'KeyH') {
                if (!this.isHolding) startHold(e);
            }
        };
        window.onkeyup = (e) => {
            if (game.isRunning && game.levels[game.stage].type === 'hold' && e.code === 'KeyH') {
                endHold(e);
            }
        };

        this.loop();
    },

    loop: function () {
        if (!game.isRunning || game.levels[game.stage].type !== 'hold') return;

        // Physics
        if (this.isHolding) {
            this.level += this.growth;
        } else {
            this.level -= this.decay;
        }

        // Clamp
        if (this.level < 0) this.level = 0;
        if (this.level > 100) this.level = 100;

        // Update Visual
        this.fill.style.height = `${this.level}%`;

        // Check Zone
        if (this.level >= this.targetMin && this.level <= this.targetMax) {
            this.fill.style.background = 'var(--success)';
            this.holdTimeAccumulated += 16; // approx 60fps
        } else {
            this.fill.style.background = 'var(--warning)';
            if (this.level > this.targetMax) this.fill.style.background = 'var(--danger)';
        }

        // Win Condition
        if (this.holdTimeAccumulated >= this.holdDurationNeeded) {
            game.success();
            return;
        }

        game.animationFrame = requestAnimationFrame(() => this.loop());
    }
};