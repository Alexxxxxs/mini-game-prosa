const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiLayer = document.getElementById('ui-layer');
const actionBtn = document.getElementById('action-btn');
const menuContent = document.getElementById('menu-content');
const timerEl = document.getElementById('timer-el');

// --- AUDIO SYSTEM (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;

    if (type === 'tick') {
        // Click mécanique grave
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);
        
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        osc.start(now);
        osc.stop(now + 0.05);
    } 
    else if (type === 'ding') {
        // Ding Aigu Victoire
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1); // Octave up
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc.start(now);
        osc.stop(now + 0.5);
    }
    else if (type === 'unlock') {
        // Gros son de succès
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.2);
        
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.0);
        
        osc.start(now);
        osc.stop(now + 1.0);
    }
    else if (type === 'fail') {
        // Son échec
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.5);
        
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
        
        osc.start(now);
        osc.stop(now + 0.5);
    }
}

// --- CONFIG ---
const COLORS = {
    gear: '#5d4037',
    gearActive: '#d32f2f',
    text: '#0f0',
    textWrong: '#555',
    indicator: '#fff',
    correct: '#0f0'
};

let width, height;
let gears = [];
let secretCode = [];
let timeLeft = 30;
let timerInterval = null;
let isPlaying = false;

let isDragging = false;
let dragGear = null;
let lastAngle = 0;

// --- CLASS GEAR ---
class NumberGear {
    constructor(x, y, radius, targetNum) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.angle = 0; // Rotation actuelle en radians
        this.targetNum = targetNum; // Le bon chiffre (0-9)
        this.currentNum = 0; // Le chiffre actuellement en haut
        this.isCorrect = false;
        this.velocity = 0;
    }

    update() {
        // Inertie simple
        this.angle += this.velocity;
        this.velocity *= 0.90; // Frottement
        
        // Normaliser l'angle (0 à 2PI)
        if (this.angle < 0) this.angle += Math.PI * 2;
        if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;

        // Calculer quel chiffre est en haut (à -PI/2 ou 270deg)
        // On divise le cercle en 10 segments de 36deg (PI/5)
        // L'angle 0 est à droite (3 heures). Pour que le chiffre soit en haut (12h), il faut ajuster.
        // Disons que le chiffre 0 est dessiné à l'angle 0.
        // Si on tourne de -90deg (-PI/2), le 0 est en haut.
        
        // Angle courant corrigé pour lire la valeur du haut
        const segmentAngle = (Math.PI * 2) / 10;
        // Valeur brute
        let val = Math.round(((Math.PI * 1.5 - this.angle) % (Math.PI * 2)) / segmentAngle);
        if (val < 0) val += 10;
        val = val % 10;

        // Détection de changement (Click)
        if (val !== this.currentNum) {
            this.currentNum = val;
            // Vérifier si c'est le bon
            if (this.currentNum === this.targetNum) {
                playSound('ding');
                this.isCorrect = true;
            } else {
                playSound('tick');
                this.isCorrect = false;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Corps de l'engrenage - NE CHANGE PLUS DE COULEUR
        ctx.fillStyle = COLORS.gear;
        ctx.beginPath();
        // Dents
        const teeth = 10;
        const outerR = this.radius;
        const innerR = this.radius - 10;
        
        for (let i = 0; i < teeth * 2; i++) {
            const r = (i % 2 === 0) ? outerR : innerR;
            const a = (Math.PI * 2 * i) / (teeth * 2);
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        // Bordure standard - NE PASSE PLUS AU VERT
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Chiffres
        ctx.font = 'bold 24px VT323';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for(let i=0; i<10; i++) {
            const ang = i * ((Math.PI * 2) / 10);
            const numX = Math.cos(ang) * (this.radius - 25);
            const numY = Math.sin(ang) * (this.radius - 25);
            
            ctx.save();
            ctx.translate(numX, numY);
            ctx.rotate(ang + Math.PI/2); // Tourner le texte pour qu'il soit lisible
            
            ctx.fillStyle = '#aaa';
            ctx.fillText(i.toString(), 0, 0);
            ctx.restore();
        }

        // Centre
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();

        ctx.restore();

        // Indicateur FIXE au dessus de l'engrenage
        // RESTE BLANC (Pas de vert)
        ctx.beginPath();
        ctx.moveTo(this.x - 10, this.y - this.radius - 15);
        ctx.lineTo(this.x + 10, this.y - this.radius - 15);
        ctx.lineTo(this.x, this.y - this.radius - 5);
        ctx.fillStyle = '#fff'; 
        ctx.fill();
        
        // PLUS D'AFFICHAGE DU CHIFFRE EN GROS AU DESSUS
    }
}

// --- GAME LOGIC ---

function initGame() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    
    gears = [];
    secretCode = [];
    timeLeft = 30; // Temps limite
    updateTimerDisplay();

    // Générer code
    for(let i=0; i<4; i++) {
        secretCode.push(Math.floor(Math.random() * 10));
    }
    console.log("Code Secret (Chut!):", secretCode);

    // Créer 4 engrenages alignés
    const startX = width / 2 - 150;
    const gap = 100;
    const gearY = height / 2;

    for(let i=0; i<4; i++) {
        // Position aléatoire de départ pour ne pas commencer sur 0
        const g = new NumberGear(startX + (i * gap), gearY, 40, secretCode[i]);
        g.angle = Math.random() * Math.PI * 2; 
        gears.push(g);
    }
}

function update() {
    if (!isPlaying) return;

    let correctCount = 0;
    gears.forEach(g => {
        g.update();
        if(g.isCorrect && Math.abs(g.velocity) < 0.01) correctCount++;
    });

    // Win Condition
    if (correctCount === 4) {
        endGame(true);
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // Cadre décoratif
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.strokeRect(width/2 - 220, height/2 - 100, 440, 200);

    gears.forEach(g => g.draw(ctx));
}

function loop() {
    update();
    draw();
    if(isPlaying) requestAnimationFrame(loop);
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            endGame(false);
        }
    }, 1000);
}

function updateTimerDisplay() {
    timerEl.innerText = timeLeft;
    if(timeLeft < 10) {
        timerEl.classList.add('text-neon-red');
        timerEl.classList.remove('text-neon-green');
    } else {
        timerEl.classList.remove('text-neon-red');
        timerEl.classList.add('text-neon-green');
    }
}

function endGame(win) {
    isPlaying = false;
    clearInterval(timerInterval);
    
    uiLayer.classList.remove('hidden');
    
    if (win) {
        playSound('unlock');
        menuContent.innerHTML = `
            <p class="text-neon-green text-4xl mb-4 font-bold">ACCÈS AUTORISÉ</p>
            <p class="text-white">CODE: <span class="tracking-widest font-bold">${secretCode.join(' ')}</span></p>
            <p class="text-sm mt-4 text-rust-light">COFFRE OUVERT</p>
        `;
        actionBtn.innerText = "NOUVEAU CASSE";
        timerEl.classList.add('text-neon-green');
    } else {
        playSound('fail');
        menuContent.innerHTML = `
            <p class="text-neon-red text-4xl mb-4 font-bold">ALERTE !</p>
            <p class="text-white">TEMPS ÉCOULÉ</p>
            <p class="text-sm mt-4 text-rust-light">LA POLICE ARRIVE...</p>
        `;
        actionBtn.innerText = "RÉESSAYER";
    }
}

// --- INPUTS (DRAG ROTATION) ---
function getPointerPos(e) {
    if(e.touches) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

function getAngle(x, y, gear) {
    return Math.atan2(y - gear.y, x - gear.x);
}

function handleStart(e) {
    if(!isPlaying) return;
    const pos = getPointerPos(e);
    
    // Check hit
    for(let g of gears) {
        const dx = pos.x - g.x;
        const dy = pos.y - g.y;
        if(dx*dx + dy*dy < g.radius * g.radius * 2) { // Zone de touche généreuse
            isDragging = true;
            dragGear = g;
            dragGear.velocity = 0; // Stop inertie
            lastAngle = getAngle(pos.x, pos.y, g);
            return;
        }
    }
}

function handleMove(e) {
    if(!isDragging || !dragGear) return;
    e.preventDefault();

    const pos = getPointerPos(e);
    const currentAngle = getAngle(pos.x, pos.y, dragGear);
    
    // Calculer delta
    let delta = currentAngle - lastAngle;
    // Correction passage -PI / PI
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    dragGear.angle += delta;
    lastAngle = currentAngle;
}

function handleEnd(e) {
    isDragging = false;
    // Ajouter un peu d'inertie au lacher ?
    // dragGear.velocity = ... (complexe à calculer sans delta time précis ici)
    // On laisse simple pour l'instant
    
    // Snap to grid au lacher pour être propre ?
    if(dragGear) {
        const segment = (Math.PI*2)/10;
        const r = Math.round(dragGear.angle / segment) * segment;
        // Animation vers r ? Trop complexe pour ce snippet.
        // On laisse le joueur ajuster.
    }
    dragGear = null;
}

// Listeners
window.addEventListener('resize', () => {
    if(!isPlaying) initGame();
});

canvas.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);

canvas.addEventListener('touchstart', handleStart, {passive: false});
window.addEventListener('touchmove', handleMove, {passive: false});
window.addEventListener('touchend', handleEnd);

actionBtn.addEventListener('click', () => {
    // Audio context must be resumed on user gesture
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    uiLayer.classList.add('hidden');
    initGame();
    isPlaying = true;
    startTimer();
    loop();
});

// Init screen
width = canvas.width = window.innerWidth;
height = canvas.height = window.innerHeight;