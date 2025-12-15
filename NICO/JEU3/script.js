// --- CONFIG ---
const TARGET_SCORE = 150; // Objectif de victoire
const GRAVITY_FORCE = 1.8; 
const GAME_SPEED_START = 9; 
const MAX_SPEED = 20; 

// Limites du terrain (en px, calculé au resize)
let FLOOR_Y = 0;
let CEIL_Y = 0;

// --- ETAT ---
let isPlaying = false;
let score = 0;
let gameSpeed = GAME_SPEED_START;
let frameCount = 0;

// Player state
let pY = 0;
let pVy = 0;
let pGravityDir = 1; // 1 = tombe vers le bas, -1 = tombe vers le haut
let isGrounded = false;

// Game Loop ID
let animationId;

// DOM Elements
const playerEl = document.getElementById('player');
const obstaclesContainer = document.getElementById('obstacles-container');
const scoreEl = document.getElementById('score-val');
const uiLayer = document.getElementById('ui-layer');
const endMsg = document.getElementById('end-message');
const container = document.getElementById('game-container');

// Initialisation des dimensions
function resize() {
    const h = container.clientHeight;
    // On laisse 10% de marge en haut et en bas
    CEIL_Y = h * 0.1;
    FLOOR_Y = h * 0.9 - 40; // 40 = hauteur player
}
window.addEventListener('resize', resize);
resize();

// Obstacles array
let obstacles = []; // { el: DOMElement, x: number, w: number, h: number, y: number }

function spawnObstacle() {
    const obs = document.createElement('div');
    obs.className = 'obstacle';
    
    // Random: Sol ou Plafond ?
    const isFloor = Math.random() > 0.5;
    
    // Dimensions PLUS DIFFICILES
    const h = 50 + Math.random() * 100; // Hauteur variable
    const w = 40 + Math.random() * 30;  // Largeur variable
    
    // Position Y
    let yPos;
    if (isFloor) {
        yPos = (container.clientHeight * 0.9) - h;
        obs.style.borderBottom = 'none';
    } else {
        yPos = container.clientHeight * 0.1;
        obs.style.borderTop = 'none';
    }

    // Style
    obs.style.width = w + 'px';
    obs.style.height = h + 'px';
    obs.style.left = '100vw'; // Commence hors écran à droite
    obs.style.top = yPos + 'px';

    obstaclesContainer.appendChild(obs);

    obstacles.push({
        el: obs,
        x: window.innerWidth,
        y: yPos,
        w: w,
        h: h
    });
}

function updatePhysics() {
    // Appliquer gravité
    pVy += GRAVITY_FORCE * pGravityDir;
    pY += pVy;

    // Collisions avec Sol / Plafond
    isGrounded = false;

    if (pY >= FLOOR_Y) {
        pY = FLOOR_Y;
        pVy = 0;
        if (pGravityDir === 1) isGrounded = true;
    } else if (pY <= CEIL_Y) {
        pY = CEIL_Y;
        pVy = 0;
        if (pGravityDir === -1) isGrounded = true;
    }

    // Update DOM Player
    playerEl.style.transform = `translateY(${pY}px)`;
    
    // Rotation visuelle pour effet
    if(!isGrounded) {
            playerEl.style.transform += ` rotate(${pVy * 2}deg)`;
    }
}

function updateObstacles() {
    // Spawn obstacle ?
    // Fréquence dépend de la vitesse
    if (frameCount % Math.floor(700 / gameSpeed) === 0) {
        spawnObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        o.x -= gameSpeed;
        o.el.style.left = o.x + 'px';

        // Nettoyage hors écran & Score
        if (o.x + o.w < -50) {
            o.el.remove();
            obstacles.splice(i, 1);
            score += 10;
            scoreEl.innerText = score;
            
            // CHECK VICTOIRE
            if (score >= TARGET_SCORE) {
                winGame();
                return;
            }

            // Accélération progressive
            if(gameSpeed < MAX_SPEED) gameSpeed += 0.2;
            continue;
        }

        // COLLISION JOUEUR
        // Player box: X fixe (15% de screenW), Y = pY, W=40, H=40
        const pX = window.innerWidth * 0.15;
        const pW = 40;
        const pH = 40;

        // AABB Collision (Axis-Aligned Bounding Box)
        if (
            pX < o.x + o.w &&
            pX + pW > o.x &&
            pY < o.y + o.h &&
            pY + pH > o.y
        ) {
            gameOver();
        }
    }
}

function createTrail() {
    if (frameCount % 5 !== 0) return;
    
    const trail = document.createElement('div');
    trail.className = 'trail';
    trail.style.left = (window.innerWidth * 0.15) + 'px';
    trail.style.transform = `translateY(${pY}px)`;
    
    container.appendChild(trail);

    // Animation fade out
    let opacity = 0.3;
    const fade = setInterval(() => {
        opacity -= 0.05;
        trail.style.opacity = opacity;
        if(opacity <= 0) {
            clearInterval(fade);
            trail.remove();
        }
    }, 50);
}

function switchGravity() {
    if(!isPlaying) return;
    
    // On inverse la direction
    pGravityDir *= -1;
    pVy = 0; // Reset inertie pour départ sec
}

function loop() {
    if (!isPlaying) return;
    
    updatePhysics();
    updateObstacles();
    createTrail();
    
    frameCount++;
    animationId = requestAnimationFrame(loop);
}

function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    
    playerEl.style.backgroundColor = 'var(--neon-red)';
    uiLayer.classList.remove('hidden');
    uiLayer.classList.remove('node-pop');
    void uiLayer.offsetWidth; // Reflow
    uiLayer.classList.add('node-pop');
    
    endMsg.innerText = "SYSTEME CRASHÉ";
    endMsg.classList.remove('text-neon-green');
    endMsg.classList.add('text-neon-red');
    endMsg.classList.remove('hidden');
}

function winGame() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    
    playerEl.style.backgroundColor = '#fff'; // Flash blanc
    uiLayer.classList.remove('hidden');
    uiLayer.classList.remove('node-pop');
    void uiLayer.offsetWidth; 
    uiLayer.classList.add('node-pop');
    
    endMsg.innerText = "MISSION ACCOMPLIE !";
    endMsg.classList.remove('text-neon-red');
    endMsg.classList.add('text-neon-green');
    endMsg.classList.remove('hidden');
}

function startGame() {
    resize();
    // Reset
    score = 0;
    scoreEl.innerText = "0";
    gameSpeed = GAME_SPEED_START;
    obstacles.forEach(o => o.el.remove());
    obstacles = [];
    
    pY = FLOOR_Y;
    pVy = 0;
    pGravityDir = 1; // Gravité normale
    playerEl.style.backgroundColor = 'var(--neon-green)';
    
    uiLayer.classList.add('hidden');
    isPlaying = true;
    
    loop();
}

// --- INPUTS ---

// Mobile / Mouse
document.addEventListener('touchstart', (e) => {
    // Eviter le click sur bouton start
    if(e.target.id === 'start-btn') return;
    e.preventDefault();
    switchGravity();
}, {passive: false});

document.addEventListener('mousedown', (e) => {
    if(e.target.id === 'start-btn') return;
    switchGravity();
});

// Keyboard (Space)
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if(isPlaying) switchGravity();
        else if(!uiLayer.classList.contains('hidden')) startGame();
    }
});

document.getElementById('start-btn').addEventListener('click', startGame);
