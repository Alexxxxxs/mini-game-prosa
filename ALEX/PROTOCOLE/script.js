
const gameArea = document.getElementById('game-area');
const consoleMsg = document.getElementById('console-msg');
const levelDisplay = document.getElementById('level-display');

let state = {
    level: 1,
    lives: 3,
    isLocked: false,
    animFrame: null // Pour stocker l'ID de l'animation et l'annuler proprement
};

// --- AUDIO ENGINE ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const Sfx = {
    // Générateur de bruit blanc (Static radio)
    playRadioStatic: function (vol = 0.1) {
        const bufferSize = audioCtx.sampleRate * 2; // 2 secondes
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

    // Son de bip simple
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

    // Tonalité continue (pour le scan)
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

// --- CORE FUNCTIONS ---

function cleanup() {
    // Arrête toute animation en cours pour éviter les bugs
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
    Sfx.beep(150, 'sawtooth', 0.3); // Son d'erreur
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
    setTimeout(() => Sfx.beep(1200, 'sine', 0.2), 100); // Double bip victoire

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
                <h1 class="text-4xl text-red-500 font-bold mb-4">ÉCHEC DU SYSTEME</h1>
                <button onclick="location.reload()" class="px-6 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition">REBOOT</button>
            `;
    state.isLocked = true;
}

// --- LEVEL 1: SURCHARGE DE TENSION ---
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
                <div class="text-5xl font-bold border-2 border-cyan-800 p-4 rounded bg-slate-800">${target}v</div>
                <div class="mt-2 text-sm text-cyan-600">ACTUEL</div>
                <div id="current-display" class="text-3xl text-gray-500">0v</div>
            `;
    gameArea.appendChild(targetDisplay);

    const grid = document.createElement('div');
    grid.className = "grid grid-cols-3 gap-3";

    potentialValues.forEach(val => {
        const btn = document.createElement('button');
        btn.className = "w-20 h-20 border border-cyan-700 rounded bg-slate-800 text-xl font-bold text-cyan-500 transition-all active:scale-95";
        btn.innerText = `+${val}`;
        btn.onclick = () => {
            Sfx.beep(400 + (val * 10), 'square', 0.05); // Petit bip touche
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

// --- LEVEL 2: SPECTRE RADIO (Avec Audio !) ---
function loadLevel2() {
    cleanup();
    levelDisplay.innerText = "LVL 2: FREQUENCE";
    consoleMsg.innerText = "Trouvez le signal. Maintenez pour décrypter.";

    gameArea.innerHTML = '';

    // Initialiser les sons
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Bruit de fond (Static)
    const staticNode = Sfx.playRadioStatic(0);
    // Tonalité de signal
    const toneNode = Sfx.playTone(0);

    const targetVal = Math.floor(Math.random() * 80) + 10;
    let isDecrypting = false;
    let decryptProgress = 0;
    let decryptInterval;

    const wrapper = document.createElement('div');
    wrapper.className = "w-full max-w-xs relative";

    const visualizer = document.createElement('div');
    visualizer.className = "h-32 w-full bg-slate-800 border border-cyan-900 mb-8 flex items-end justify-center gap-1 p-1 overflow-hidden";
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

    // Nettoyage des sons quand on quitte le niveau
    const stopSounds = () => {
        try {
            staticNode.source.stop();
            toneNode.osc.stop();
        } catch (e) { }
    };

    // Hook sur la fonction success/fail globale pour couper le son
    const originalSuccess = success;
    success = (msg) => { stopSounds(); originalSuccess(msg); };
    const originalFail = fail;
    fail = (msg) => { if (state.lives <= 1) stopSounds(); originalFail(msg); };


    function updateVisuals(val) {
        const diff = Math.abs(val - targetVal);
        const proximity = Math.max(0, 100 - (diff * 5)); // 0 à 100%

        // Audio Logic
        // Plus on est proche, moins il y a de static, plus le tone est fort et clair
        const volStatic = (100 - proximity) / 400; // Max 0.25
        staticNode.gain.gain.setTargetAtTime(volStatic, audioCtx.currentTime, 0.1);

        const volTone = proximity / 200; // Max 0.5
        toneNode.gain.gain.setTargetAtTime(volTone, audioCtx.currentTime, 0.1);

        // La fréquence change aussi pour donner un indice
        toneNode.osc.frequency.setTargetAtTime(440 + (diff * 10), audioCtx.currentTime, 0.1);


        for (let i = 0; i < 20; i++) {
            const bar = document.getElementById(`bar-${i}`);
            const noise = Math.random() * 20;
            let height = noise;
            if (proximity > 0) {
                height += (proximity * (Math.random() * 0.5 + 0.5));
            }
            bar.style.height = `${height}%`;
            bar.className = proximity > 80 ? "w-2 bg-green-400 transition-all" : "w-2 bg-cyan-800 transition-all";
        }
        return proximity;
    }

    // Démarrer le son au premier touch
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
        // Son de lock
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

// --- LEVEL 3: LE PARE-FEU (CORRECTIF BUG) ---
function loadLevel3() {
    cleanup();
    levelDisplay.innerText = "LVL 3: PARE-FEU";
    consoleMsg.innerText = "Synchronisez l'injection du virus.";

    gameArea.innerHTML = '';

    const container = document.createElement('div');
    container.className = "relative w-64 h-64 flex items-center justify-center";

    const ring = document.createElement('div');
    // Retrait de la classe d'animation CSS pour contrôle JS total
    ring.className = "absolute w-full h-full border-8 border-cyan-900 rounded-full border-t-transparent border-r-cyan-400 border-b-cyan-400 border-l-cyan-400";
    // Ajout d'un marqueur visuel pour le trou
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

        // Normalisation de l'angle pour calcul
        // Le trou est à 0°. L'injecteur est à 0° (top).
        // Quand rotation = 0, trou en haut. 
        // Quand rotation = 10, trou décalé de 10° à droite.
        // Hitbox élargie pour éviter la frustration (335° à 25°)
        let normalizedRot = rotation % 360;
        let hit = (normalizedRot >= 335 || normalizedRot <= 25);

        if (hit) {
            successes++;
            consoleMsg.innerText = `INJECTION ${successes}/${needed} RÉUSSIE`;
            consoleMsg.classList.add('text-green-400');
            speed += 1.5; // Accélération
            Sfx.beep(800 + (successes * 200), 'square', 0.1); // Bip positif

            // Feedback Vert
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
                playing = false; // Stop logic
                cleanup(); // Stop animation
                btn.disabled = true; // Empêcher double clic
                btn.innerText = "OK";
                btn.classList.add("bg-green-600", "border-green-400");
                success("Pare-feu détruit.");
            }
        } else {
            // Échec
            playing = false; // Pause pour l'effet d'échec
            cleanup();

            fail("Collision détectée.");

            // Reset visuel après un délai court
            setTimeout(() => {
                if (state.lives > 0) {
                    successes = 0;
                    speed = 2.5;
                    rotation = 0; // Reset position
                    playing = true;
                    consoleMsg.innerText = "Nouvelle tentative...";
                    animate();
                }
            }, 800);
        }
    };
}

function showWin() {
    cleanup();
    gameArea.innerHTML = `
                <div class="text-center animate-bounce">
                    <div class="text-6xl mb-4 text-green-400">ACCESS GRANTED</div>
                    <p class="text-cyan-600 font-mono text-xs">DOWNLOADING DATA...</p>
                </div>
                <button onclick="state.level=1; state.lives=3; loadLevel()" class="mt-12 px-8 py-3 bg-slate-800 border border-green-500 text-green-500 hover:bg-green-900 transition">NOUVELLE CIBLE</button>
            `;
    consoleMsg.innerText = "";
}

function loadLevel() {
    if (state.level === 1) loadLevel1();
    if (state.level === 2) loadLevel2();
    if (state.level === 3) loadLevel3();
}

// Start
loadLevel();

