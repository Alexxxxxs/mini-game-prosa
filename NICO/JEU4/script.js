const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiLayer = document.getElementById('ui-layer');
const actionBtn = document.getElementById('action-btn');
const menuContent = document.getElementById('menu-content');
const levelEl = document.getElementById('level-el');
const resetBtn = document.getElementById('reset-level-btn');

// --- CONFIG ---
const COLORS = {
    motor: '#0f0',      // Vert fluo
    targetOff: '#f00',  // Rouge fluo
    targetOn: '#0f0',   // Devient vert quand allumé
    loose: '#d32f2f',   // Rouge sombre (rouille/wire)
    looseActive: '#ff5722', // Orange quand actif
    metal: '#5d4037',
    bg: '#1a1a1a'
};

let width, height;
let gears = [];
let isDragging = false;
let dragGear = null;
let dragOffsetX, dragOffsetY;
let level = 1;
let isLevelComplete = false;

// --- GEAR CLASS ---
class Gear {
    constructor(x, y, radius, teeth, type) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.teeth = teeth;
        this.angle = 0;
        this.speed = 0; // Vitesse de rotation (radians par frame)
        this.type = type; // 'motor', 'target', 'loose'
        this.isPowered = false;
        
        // Pour la physique simplifiée
        this.parent = null; // L'engrenage qui entraîne celui-ci
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Couleur basée sur l'état
        let color = COLORS.loose;
        let glow = false;

        if (this.type === 'motor') {
            color = COLORS.motor;
            glow = true;
        } else if (this.type === 'target') {
            color = this.isPowered ? COLORS.targetOn : COLORS.targetOff;
            glow = this.isPowered;
        } else if (this.type === 'loose') {
            color = this.isPowered ? COLORS.looseActive : COLORS.metal;
        }

        ctx.fillStyle = color;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;

        // Dessin des dents
        const outerRadius = this.radius;
        const innerRadius = this.radius * 0.85;
        const holeRadius = this.radius * 0.3;

        ctx.beginPath();
        const step = (Math.PI * 2) / this.teeth;
        
        for (let i = 0; i < this.teeth; i++) {
            const a1 = i * step;
            const a2 = a1 + step * 0.4; // Largeur dent
            const a3 = a1 + step * 0.6; // Espace
            const a4 = (i + 1) * step;

            // Extérieur dent
            ctx.lineTo(Math.cos(a1) * outerRadius, Math.sin(a1) * outerRadius);
            ctx.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
            
            // Intérieur (creux)
            ctx.lineTo(Math.cos(a3) * innerRadius, Math.sin(a3) * innerRadius);
            ctx.lineTo(Math.cos(a4) * innerRadius, Math.sin(a4) * innerRadius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Trou central
        ctx.beginPath();
        ctx.arc(0, 0, holeRadius, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.bg;
        ctx.fill();
        ctx.stroke();

        // Glow effect simple
        if (glow) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}

// --- GAME LOGIC ---

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    if(gears.length === 0) initLevel();
}

function initLevel() {
    gears = [];
    isLevelComplete = false;
    
    const centerX = width / 2;
    const centerY = height / 2;

    // --- CONFIGURATION DES NIVEAUX (1-5) ---
    let distance = 160;
    let yOffset = 0;
    let gearsCount = 3;

    switch(level) {
        case 1:
            distance = 160; // Court
            yOffset = 0;    // Droit
            gearsCount = 3; // Facile
            break;
        case 2:
            distance = 200;
            yOffset = 60;   // Léger décalage bas
            gearsCount = 4;
            break;
        case 3:
            distance = 240;
            yOffset = -80;  // Décalage haut
            gearsCount = 5;
            break;
        case 4:
            distance = 280; // Loin
            yOffset = 100;  // Gros décalage bas
            gearsCount = 6;
            break;
        case 5:
            distance = 320; // Très loin (Boss)
            yOffset = (Math.random() > 0.5 ? 120 : -120); // Extrême
            gearsCount = 8; // Beaucoup de pièces
            break;
        default:
            // Génération procédurale si on dépasse (ou backup)
            distance = 150 + (level * 30);
            yOffset = (Math.random() - 0.5) * 200;
            gearsCount = 2 + Math.floor(level / 2);
    }
    
    // 1. MOTEUR (Gauche)
    const mX = centerX - distance/2;
    const mY = centerY - yOffset/2;
    const tX = centerX + distance/2;
    const tY = centerY + yOffset/2;

    const motor = new Gear(mX, mY, 40, 12, 'motor');
    motor.speed = 0.05; // Vitesse constante
    motor.isPowered = true;
    gears.push(motor);

    // 2. CIBLE (Droite)
    const target = new Gear(tX, tY, 40, 12, 'target');
    gears.push(target);

    // 3. ENGRENAGES LIBRES (Toolbox en bas)
    const toolboxY = height - 80;
    const startX = (width - (gearsCount * 80)) / 2;

    for(let i=0; i<gearsCount; i++) {
        const sizeRand = Math.random();
        let r, t;
        if(sizeRand > 0.6) { r = 30; t = 10; }
        else if (sizeRand > 0.3) { r = 40; t = 12; }
        else { r = 50; t = 16; }

        gears.push(new Gear(startX + (i * 80) + 40, toolboxY, r, t, 'loose'));
    }
}

function checkConnections() {
    gears.forEach(g => {
        if(g.type !== 'motor') {
            g.isPowered = false;
            g.speed = 0;
            g.parent = null;
        }
    });

    let queue = gears.filter(g => g.type === 'motor');
    let visited = new Set(queue);

    while(queue.length > 0) {
        const current = queue.shift();

        for(let other of gears) {
            if(visited.has(other)) continue;

            const dx = current.x - other.x;
            const dy = current.y - other.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const radiiSum = current.radius + other.radius;
            
            const margin = 12; 

            if (dist < radiiSum + 5 && dist > radiiSum - margin) {
                other.isPowered = true;
                other.speed = -current.speed * (current.radius / other.radius);
                visited.add(other);
                queue.push(other);
            }
        }
    }

    const target = gears.find(g => g.type === 'target');
    if(target && target.isPowered && !isLevelComplete) {
        levelComplete();
    }
}

function update() {
    gears.forEach(g => {
        g.angle += g.speed;
    });
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, height - 140, width, 140);
    
    ctx.beginPath();
    ctx.moveTo(0, height - 140);
    ctx.lineTo(width, height - 140);
    ctx.strokeStyle = '#5d4037';
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    gears.forEach(g => g.draw(ctx));
    
    ctx.shadowOffsetY = 0;
}

function loop() {
    checkConnections(); 
    update();
    draw();
    requestAnimationFrame(loop);
}

function levelComplete() {
    isLevelComplete = true;
    setTimeout(() => {
        uiLayer.classList.remove('hidden');
        
        if (level >= 5) {
            menuContent.innerHTML = `
                <p class="text-neon-green text-4xl mb-4 font-bold tracking-widest">VICTOIRE TOTALE !</p>
                <p class="text-white">SYSTÈME ENTIÈREMENT OPÉRATIONNEL</p>
                <p class="text-sm mt-4 text-rust-light">MERCI D'AVOIR JOUÉ</p>
            `;
            actionBtn.innerText = "REJOUER DU DÉBUT";
            actionBtn.onclick = () => {
                level = 1;
                levelEl.innerText = level;
                initLevel();
                uiLayer.classList.add('hidden');
            };
        } else {
            menuContent.innerHTML = `<p class="text-neon-green text-3xl mb-4">SYSTEME RÉTABLI !</p><p>NIVEAU ${level} TERMINÉ</p>`;
            actionBtn.innerText = "NIVEAU SUIVANT >>";
            actionBtn.onclick = () => {
                level++;
                levelEl.innerText = level;
                initLevel();
                uiLayer.classList.add('hidden');
            };
        }
    }, 500);
}

// --- INPUTS ---
function getPointerPos(e) {
    if(e.touches) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

function handleStart(e) {
    if(!uiLayer.classList.contains('hidden')) return;

    const pos = getPointerPos(e);
    
    for(let i = gears.length - 1; i >= 0; i--) {
        const g = gears[i];
        if(g.type !== 'loose') continue;

        const dx = pos.x - g.x;
        const dy = pos.y - g.y;
        if(dx*dx + dy*dy < g.radius * g.radius) {
            isDragging = true;
            dragGear = g;
            dragOffsetX = dx;
            dragOffsetY = dy;
            
            gears.splice(i, 1);
            gears.push(g);
            return;
        }
    }
}

function handleMove(e) {
    if(!isDragging || !dragGear) return;
    e.preventDefault(); 

    const pos = getPointerPos(e);
    dragGear.x = pos.x - dragOffsetX;
    dragGear.y = pos.y - dragOffsetY;
}

function handleEnd(e) {
    isDragging = false;
    dragGear = null;
}

window.addEventListener('resize', resize);

document.addEventListener('mousedown', handleStart);
document.addEventListener('mousemove', handleMove);
document.addEventListener('mouseup', handleEnd);

document.addEventListener('touchstart', handleStart, {passive: false});
document.addEventListener('touchmove', handleMove, {passive: false});
document.addEventListener('touchend', handleEnd);

actionBtn.addEventListener('click', () => {
    uiLayer.classList.add('hidden');
    if(gears.length === 0) initLevel();
});

resetBtn.addEventListener('click', () => {
    initLevel();
    uiLayer.classList.add('hidden');
});

// Start
resize();
loop();
