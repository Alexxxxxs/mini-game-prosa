const state = {
    score: 0,
    maxScore: 20,
    errors: 0,
    maxErrors: 3,
    timeLeft: 30,
    isPlaying: false,
    gridSize: 2, // Commence en 2x2
    timerInterval: null
};

const dom = {
    grid: document.getElementById('grid-container'),
    score: document.getElementById('score'),
    timer: document.getElementById('timer'),
    strikes: document.getElementById('strikes'),
    overlay: document.getElementById('overlay'),
    title: document.getElementById('overlay-title'),
    subtitle: document.getElementById('overlay-subtitle'),
    btn: document.getElementById('start-btn'),
    feedback: document.getElementById('feedback-text')
};

// NIVEAUX & COULEURS
const levels = [
    { base: 'bg-rust-dark', intrue: 'bg-neon-green', diff: 'lvl-1' },     
    { base: 'bg-bg-metal', intrue: 'bg-wire-red', diff: 'lvl-2' },
    { base: 'bg-rust-dark', intrue: 'bg-rust-light', diff: 'lvl-3' }, 
    { base: 'bg-rust-light', intrue: 'bg-wire-red', diff: 'lvl-4' },
    { base: 'bg-wire-red', intrue: 'bg-neon-red', diff: 'lvl-5' }, 
    { base: 'bg-neon-green', intrue: 'bg-neon-green opacity-60', diff: 'lvl-6' }, 
    { base: 'bg-rust-light', intrue: 'bg-rust-light opacity-70', diff: 'lvl-7' },
    { base: 'bg-bg-metal', intrue: 'bg-rust-dark', diff: 'lvl-8' } 
];

function startGame() {
    state.score = 0;
    state.errors = 0;
    state.timeLeft = 20.0; 
    state.gridSize = 2;
    state.isPlaying = true;
    
    updateUI();
    dom.overlay.classList.add('hidden');
    
    startTimer();
    generateGrid();
}

function updateUI() {
    dom.score.innerText = state.score;
    
    // Affichage des erreurs sous forme de croix ou de texte
    let strikesText = "";
    if (state.errors === 0) strikesText = "OK";
    else {
        for(let i=0; i<state.errors; i++) strikesText += "X ";
    }
    dom.strikes.innerText = strikesText;
    if(state.errors > 0) dom.strikes.className = "text-neon-red text-lg tracking-widest animate-pulse";
    else dom.strikes.className = "text-neon-green text-lg tracking-widest";
}

function generateGrid() {
    dom.grid.innerHTML = '';
    
    const levelIndex = state.score % levels.length;
    const currentTheme = levels[levelIndex];

    if (state.score > 4) state.gridSize = 3;
    else state.gridSize = 2;

    const cellCount = state.gridSize * state.gridSize;
    const intrueIndex = Math.floor(Math.random() * cellCount);

    dom.grid.className = `flex-1 p-2 grid gap-2 z-20 transition-all duration-300 grid-cols-${state.gridSize}`;
    dom.grid.style.gridTemplateColumns = `repeat(${state.gridSize}, minmax(0, 1fr))`;

    for (let i = 0; i < cellCount; i++) {
        const cell = document.createElement('div');
        const isIntrue = i === intrueIndex;
        
        let classes = "rounded border border-black/20 cursor-pointer hover:scale-95 transition-transform shadow-sm node-pop flex items-center justify-center";
        
        if (isIntrue) {
            classes += ` ${currentTheme.intrue}`;
            cell.onclick = () => handleSuccess();
        } else {
            classes += ` ${currentTheme.base}`;
            cell.onclick = () => handleFail();
        }

        cell.className = classes;
        dom.grid.appendChild(cell);
    }
}

function handleSuccess() {
    if (!state.isPlaying) return;

    state.score++;
    state.timeLeft += 1.2; 
    updateUI();
    
    dom.feedback.innerText = "ANOMALY PURGED";
    dom.feedback.className = "text-xs text-neon-green transition-opacity duration-200";
    dom.feedback.classList.remove('opacity-0');
    setTimeout(() => dom.feedback.classList.add('opacity-0'), 500);

    // VICTOIRE ?
    if (state.score >= state.maxScore) {
        gameWin();
    } else {
        generateGrid();
    }
}

function handleFail() {
    if (!state.isPlaying) return;
    
    state.errors++;
    state.timeLeft -= 2.0; 
    updateUI();

    const screen = document.getElementById('game-screen');
    screen.classList.add('translate-x-2');
    setTimeout(() => screen.classList.remove('translate-x-2'), 50);

    dom.feedback.innerText = "ERROR DETECTED";
    dom.feedback.className = "text-xs text-neon-red transition-opacity duration-200";
    dom.feedback.classList.remove('opacity-0');
    setTimeout(() => dom.feedback.classList.add('opacity-0'), 500);

    // ECHEC PAR ERREURS ?
    if (state.errors >= state.maxErrors) {
        gameOver("CRITICAL ERRORS LIMIT");
    }
}

function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    
    state.timerInterval = setInterval(() => {
        state.timeLeft -= 0.1;
        dom.timer.innerText = state.timeLeft.toFixed(1);

        if (state.timeLeft <= 5) {
            dom.timer.classList.replace('text-wire-red', 'text-neon-red');
            dom.timer.classList.add('scale-110');
        } else {
            dom.timer.classList.replace('text-neon-red', 'text-wire-red');
            dom.timer.classList.remove('scale-110');
        }

        if (state.timeLeft <= 0) {
            gameOver("CONNECTION LOST");
        }
    }, 100);
}

function gameWin() {
    state.isPlaying = false;
    clearInterval(state.timerInterval);

    dom.title.innerText = "SYSTEM CLEANSED";
    dom.title.className = "text-5xl text-neon-green mb-2 shadow-glow-green tracking-tighter text-center leading-none";
    
    dom.subtitle.innerHTML = `PROTOCOL COMPLETE.<br>FINAL SCORE: 20/20`;
    dom.subtitle.className = "text-neon-green mb-8 text-lg text-center px-4";
    
    dom.btn.innerText = "REBOOT SYSTEM";
    dom.btn.className = "px-8 py-3 bg-rust-dark border-2 border-neon-green text-neon-green text-2xl hover:bg-neon-green hover:text-black transition-all shadow-glow-green cursor-pointer";
    
    dom.overlay.classList.remove('hidden');
}

function gameOver(reason) {
    state.isPlaying = false;
    clearInterval(state.timerInterval);
    
    dom.title.innerText = "MISSION FAILED";
    dom.title.className = "text-5xl text-neon-red mb-2 shadow-glow-red tracking-tighter text-center leading-none";
    
    dom.subtitle.innerHTML = `REASON: ${reason}<br>SCORE: ${state.score}/${state.maxScore}`;
    dom.subtitle.className = "text-neon-red mb-8 text-lg text-center px-4";
    
    dom.btn.innerText = "RETRY PROTOCOL";
    dom.btn.className = "px-8 py-3 bg-rust-dark border-2 border-neon-red text-neon-red text-2xl hover:bg-neon-red hover:text-black transition-all shadow-glow-red cursor-pointer";

    dom.overlay.classList.remove('hidden');
}