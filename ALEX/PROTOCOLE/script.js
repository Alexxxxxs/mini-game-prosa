
// --- Références DOM ---
const gameArea = document.getElementById('game-area');
const consoleMsg = document.getElementById('console-msg');
const levelDisplay = document.getElementById('level-display');

// --- État du Jeu ---
let state = {
    level: 1,
    lives: 3,
    maxLives: 3,
    isLocked: false,
    animFrame: null,
    startTime: 0
};

// --- Moteur Audio (AudioContext) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const Sfx = {
    playRadioStatic: function (vol = 0.1) {
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = vol;
        noise.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        noise.start();
        return { source: noise, gain: gainNode };
    },

    beep: function (freq = 600, type = 'square', duration = 0.1) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        osc.stop(audioCtx.currentTime + duration);
    },

    playTone: function (freq = 440) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.value = 0;
        osc.start();
        return { osc, gain };
    }
};

// --- Fonctions Principales (Core) ---

function cleanup() {
    if (state.animFrame) {
        cancelAnimationFrame(state.animFrame);
        state.animFrame = null;
    }
}

function updateLives() {
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById(`life-${i}`);
        if (i > state.lives) {
            el.className = "w-8 h-2 bg-red-900 opacity-30";
        } else {
            el.className = "w-8 h-2 bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.8)]";
        }
    }
    if (state.lives <= 0) gameOver();
}

function fail(msg) {
    Sfx.beep(150, 'sawtooth', 0.3);
    state.lives--;
    updateLives();
    consoleMsg.innerText = `ERREUR: ${msg}`;
    consoleMsg.classList.add('text-red-500');
    gameArea.classList.add('glitch');
    setTimeout(() => {
        consoleMsg.classList.remove('text-red-500');
        gameArea.classList.remove('glitch');
    }, 500);
}

function success(msg, nextDelay = 1000) {
    Sfx.beep(800, 'sine', 0.1);
    setTimeout(() => Sfx.beep(1200, 'sine', 0.2), 100);

    consoleMsg.innerText = `SUCCÈS: ${msg}`;
    consoleMsg.className = "text-center text-green-400 font-bold";
    setTimeout(() => {
        state.level++;
        consoleMsg.className = "text-center text-cyan-200 animate-pulse";
        loadLevel();
    }, nextDelay);
}

function gameOver() {
    cleanup();
    gameArea.innerHTML = `
                <div class="text-center">
                    <h1 class="text-6xl text-red-600 font-bold mb-4 glitch">ECHEC</h1>
                    <div class="h-1 w-24 bg-red-600 mx-auto mb-8"></div>
                    <p class="text-red-400 mb-8">CONNEXION PERDUE</p>
                    <button onclick="location.reload()" class="px-8 py-3 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition rounded uppercase tracking-widest">Reboot System</button>
                </div>
            `;
    consoleMsg.innerText = "CRITICAL ERROR DETECTED";
    consoleMsg.classList.add("text-red-500");
    state.isLocked = true;
}

// --- NIVEAU 1 : Voltage ---
function loadLevel1() {
    cleanup();
    if (state.level > 3) return showWin();
    levelDisplay.innerText = "LVL 1: VOLTAGE";
    consoleMsg.innerText = "Ajustez la tension pour égaliser la cible.";

    const target = Math.floor(Math.random() * 30) + 20;
    let currentSum = 0;
    const potentialValues = [1, 2, 5, 8, 10, 12, 15, 20].sort(() => 0.5 - Math.random()).slice(0, 6);

    gameArea.innerHTML = '';

    const targetDisplay = document.createElement('div');
    targetDisplay.className = "mb-8 text-center";
    targetDisplay.innerHTML = `
                <div class="text-sm text-cyan-600">CIBLE</div>
                <div class="text-5xl font-bold border-2 border-cyan-800 p-4 rounded bg-slate-800 shadow-[0_0_20px_rgba(34,211,238,0.2)]">${target}v</div>
                <div class="mt-4 flex justify-between items-end w-48 mx-auto">
                    <span class="text-xs text-cyan-600">ACTUEL:</span>
                    <span id="current-display" class="text-3xl text-gray-500">0v</span>
                </div>
            `;
    gameArea.appendChild(targetDisplay);

    const grid = document.createElement('div');
    grid.className = "grid grid-cols-3 gap-3";

    potentialValues.forEach(val => {
        const btn = document.createElement('button');
        btn.className = "w-20 h-20 border border-cyan-700 rounded bg-slate-800 text-xl font-bold text-cyan-500 transition-all active:scale-95";
        btn.innerText = `+${val}`;
        btn.onclick = () => {
            Sfx.beep(400 + (val * 10), 'square', 0.05);
            if (btn.classList.contains('bg-cyan-900')) {
                btn.classList.remove('bg-cyan-900', 'border-cyan-400', 'shadow-[0_0_15px_cyan]');
                btn.classList.add('bg-slate-800');
                currentSum -= val;
            } else {
                btn.classList.remove('bg-slate-800');
                btn.classList.add('bg-cyan-900', 'border-cyan-400', 'shadow-[0_0_15px_cyan]');
                currentSum += val;
            }
            updateCheck();
        };
        grid.appendChild(btn);
    });
    gameArea.appendChild(grid);

    const checkDisplay = document.getElementById('current-display');

    function updateCheck() {
        checkDisplay.innerText = `${currentSum}v`;
        if (currentSum === target) {
            checkDisplay.className = "text-3xl text-green-400 font-bold";
            success("Tension stabilisée.");
        } else if (currentSum > target) {
            checkDisplay.className = "text-3xl text-red-500 font-bold";
        } else {
            checkDisplay.className = "text-3xl text-cyan-500";
        }
    }
}

// --- NIVEAU 2 : Fréquence ---
function loadLevel2() {
    cleanup();
    levelDisplay.innerText = "LVL 2: FREQUENCE";
    consoleMsg.innerText = "Trouvez le signal. Maintenez pour décrypter.";

    gameArea.innerHTML = '';

    if (audioCtx.state === 'suspended') audioCtx.resume();

    const staticNode = Sfx.playRadioStatic(0);
    const toneNode = Sfx.playTone(0);

    const targetVal = Math.floor(Math.random() * 80) + 10;
    let isDecrypting = false;
    let decryptProgress = 0;
    let decryptInterval;

    const wrapper = document.createElement('div');
    wrapper.className = "w-full max-w-xs relative";

    const visualizer = document.createElement('div');
    visualizer.className = "h-32 w-full bg-slate-800 border border-cyan-900 mb-8 flex items-end justify-center gap-1 p-1 overflow-hidden shadow-inner";
    for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = "w-2 bg-cyan-800 transition-all duration-100";
        bar.style.height = "10%";
        bar.id = `bar-${i}`;
        visualizer.appendChild(bar);
    }
    wrapper.appendChild(visualizer);

    const slider = document.createElement('input');
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.value = "0";
    slider.className = "w-full accent-cyan-400 h-12";
    wrapper.appendChild(slider);

    const progressContainer = document.createElement('div');
    progressContainer.className = "mt-6 h-2 w-full bg-slate-700 rounded overflow-hidden";
    const progressBar = document.createElement('div');
    progressBar.className = "h-full bg-green-500 w-0 transition-all duration-75";
    progressContainer.appendChild(progressBar);
    wrapper.appendChild(progressContainer);

    gameArea.appendChild(wrapper);

    const stopSounds = () => {
        try {
            staticNode.source.stop();
            toneNode.osc.stop();
        } catch (e) { }
    };

    const originalSuccess = success;
    success = (msg) => { stopSounds(); originalSuccess(msg); };
    const originalFail = fail;
    fail = (msg) => { if (state.lives <= 1) stopSounds(); originalFail(msg); };

    function updateVisuals(val) {
        const diff = Math.abs(val - targetVal);
        const proximity = Math.max(0, 100 - (diff * 5));

        const volStatic = (100 - proximity) / 400;
        staticNode.gain.gain.setTargetAtTime(volStatic, audioCtx.currentTime, 0.1);

        const volTone = proximity / 200;
        toneNode.gain.gain.setTargetAtTime(volTone, audioCtx.currentTime, 0.1);

        toneNode.osc.frequency.setTargetAtTime(440 + (diff * 10), audioCtx.currentTime, 0.1);

        for (let i = 0; i < 20; i++) {
            const bar = document.getElementById(`bar-${i}`);
            const noise = Math.random() * 20;
            let height = noise;
            if (proximity > 0) {
                height += (proximity * (Math.random() * 0.5 + 0.5));
            }
            bar.style.height = `${height}%`;
            bar.className = proximity > 80 ? "w-2 bg-green-400 transition-all shadow-[0_0_10px_#4ade80]" : "w-2 bg-cyan-800 transition-all";
        }
        return proximity;
    }

    let soundStarted = false;
    slider.addEventListener('input', (e) => {
        if (!soundStarted) {
            staticNode.gain.gain.value = 0.1;
            soundStarted = true;
        }
        const val = parseInt(e.target.value);
        const prox = updateVisuals(val);

        if (prox > 90) {
            if (!isDecrypting) {
                isDecrypting = true;
                if (navigator.vibrate) navigator.vibrate(50);
                startDecrypt();
            }
        } else {
            stopDecrypt();
        }
    });

    slider.addEventListener('touchend', stopDecrypt);
    slider.addEventListener('mouseup', stopDecrypt);

    function startDecrypt() {
        clearInterval(decryptInterval);
        toneNode.osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        toneNode.gain.gain.setValueAtTime(0.5, audioCtx.currentTime);

        decryptInterval = setInterval(() => {
            decryptProgress += 2;
            progressBar.style.width = `${decryptProgress}%`;
            if (navigator.vibrate) navigator.vibrate(10);

            if (decryptProgress >= 100) {
                clearInterval(decryptInterval);
                slider.disabled = true;
                stopSounds();
                success("Signal isolé.");
            }
        }, 30);
    }

    function stopDecrypt() {
        isDecrypting = false;
        clearInterval(decryptInterval);
        decryptProgress = 0;
        progressBar.style.width = "0%";
    }
}

// --- NIVEAU 3 : Pare-Feu ---
function loadLevel3() {
    cleanup();
    levelDisplay.innerText = "LVL 3: PARE-FEU";
    consoleMsg.innerText = "Synchronisez l'injection du virus.";

    gameArea.innerHTML = '';

    const container = document.createElement('div');
    container.className = "relative w-64 h-64 flex items-center justify-center";

    const ring = document.createElement('div');
    ring.className = "absolute w-full h-full border-8 border-cyan-900 rounded-full border-t-transparent border-r-cyan-400 border-b-cyan-400 border-l-cyan-400";
    const holeMarker = document.createElement('div');
    holeMarker.className = "absolute top-[-4px] left-1/2 -translate-x-1/2 w-4 h-4 bg-cyan-900/50 rounded-full";
    ring.appendChild(holeMarker);

    container.appendChild(ring);

    const injector = document.createElement('div');
    injector.className = "absolute top-0 w-1 h-8 bg-red-500 shadow-[0_0_10px_red] z-10";
    injector.style.top = "-15px";
    container.appendChild(injector);

    const btn = document.createElement('button');
    btn.className = "w-24 h-24 bg-cyan-900 rounded-full border-2 border-cyan-500 text-cyan-200 font-bold active:bg-cyan-400 active:text-black z-20 shadow-[0_0_20px_cyan]";
    btn.innerText = "INJECT";
    container.appendChild(btn);

    gameArea.appendChild(container);

    let rotation = 0;
    let speed = 2.5;
    let successes = 0;
    const needed = 3;
    let playing = true;

    function animate() {
        if (!playing) return;
        rotation = (rotation + speed) % 360;
        ring.style.transform = `rotate(${rotation}deg)`;
        state.animFrame = requestAnimationFrame(animate);
    }
    animate();

    btn.onclick = () => {
        if (!playing) return;

        let normalizedRot = rotation % 360;
        let hit = (normalizedRot >= 335 || normalizedRot <= 25);

        if (hit) {
            successes++;
            consoleMsg.innerText = `INJECTION ${successes}/${needed} RÉUSSIE`;
            consoleMsg.classList.add('text-green-400');
            speed += 1.5;
            Sfx.beep(800 + (successes * 200), 'square', 0.1);

            ring.style.borderColor = "#4ade80";
            ring.style.borderTopColor = "transparent";

            setTimeout(() => {
                ring.style.borderColor = "";
                ring.style.borderTopColor = "transparent";
                ring.style.borderRightColor = "#22d3ee";
                ring.style.borderBottomColor = "#22d3ee";
                ring.style.borderLeftColor = "#22d3ee";
                consoleMsg.classList.remove('text-green-400');
            }, 200);

            if (successes >= needed) {
                playing = false;
                cleanup();
                btn.disabled = true;
                btn.innerText = "OK";
                btn.classList.add("bg-green-600", "border-green-400");
                success("Pare-feu détruit.");
            }
        } else {
            playing = false;
            cleanup();
            fail("Collision détectée.");

            setTimeout(() => {
                if (state.lives > 0) {
                    successes = 0;
                    speed = 2.5;
                    rotation = 0;
                    playing = true;
                    consoleMsg.innerText = "Nouvelle tentative...";
                    animate();
                }
            }, 800);
        }
    };
}

// --- NOUVEL ÉCRAN DE FIN (Victory Screen) ---
function showWin() {
    cleanup();

    // Calcul du score simple
    const score = (state.lives * 1000) + Math.floor(Math.random() * 500);

    gameArea.innerHTML = `
                <div class="matrix-bg w-full h-full absolute top-0 left-0 opacity-20 pointer-events-none"></div>
                
                <div class="z-10 w-full max-w-sm flex flex-col items-center">
                    <div class="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(74,222,128,0.4)] animate-pulse">
                        <svg class="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>

                    <h1 class="text-3xl font-bold text-green-400 tracking-widest mb-2">ACCESS GRANTED</h1>
                    <p class="text-xs text-cyan-600 font-mono mb-8">ROOT PRIVILEGES OBTAINED</p>

                    <!-- Rapport de mission -->
                    <div class="w-full bg-slate-800/80 border border-cyan-900 p-4 rounded mb-6">
                        <div class="flex justify-between text-sm mb-2">
                            <span class="text-cyan-600">INTEGRITY:</span>
                            <span class="text-white">${state.lives}/3</span>
                        </div>
                         <div class="flex justify-between text-sm mb-2">
                            <span class="text-cyan-600">ENCRYPTION:</span>
                            <span class="text-red-400 line-through decoration-red-500">BYPASSED</span>
                        </div>
                        <div class="flex justify-between text-xl font-bold border-t border-cyan-900 pt-2 mt-2">
                            <span class="text-cyan-400">SCORE:</span>
                            <span class="text-green-400">${score}</span>
                        </div>
                    </div>

                    <div class="w-full text-xs font-mono text-green-500 mb-8">
                        <p class="typing-effect w-full">Downloading database... 100%</p>
                    </div>

                    <button onclick="restartGame()" class="w-full py-4 bg-cyan-900/50 border border-cyan-500 text-cyan-400 rounded hover:bg-cyan-500 hover:text-white transition uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                        NOUVELLE CIBLE
                    </button>
                </div>
            `;
    consoleMsg.innerText = "SYSTEME SECURISE. EN ATTENTE.";
    levelDisplay.innerText = "ADMIN";
}

function restartGame() {
    state.level = 1;
    state.lives = 3;
    updateLives();
    loadLevel();
}

// --- Routeur de Niveaux ---
function loadLevel() {
    if (state.level === 1) loadLevel1();
    else if (state.level === 2) loadLevel2();
    else if (state.level === 3) loadLevel3();
    else if (state.level > 3) showWin(); // Correction: Affiche l'écran de fin si le niveau > 3
}

// Lancement initial
state.startTime = Date.now();
loadLevel();

