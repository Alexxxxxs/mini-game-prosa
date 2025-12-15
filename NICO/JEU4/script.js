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
    targetWrongDir: '#ff9800', // Orange si mauvais sens
    loose: '#d32f2f',   // Rouge sombre
    looseActive: '#ff5722', // Orange
    metal: '#5d4037',
    bg: '#1a1a1a',
    obstacle: 'rgba(211, 47, 47, 0.3)'
};

let width, height;
let gears = [];
let obstacles = []; // Zones interdites
let isDragging = false;
let dragGear = null;
let dragOffsetX, dragOffsetY;
let level = 1;
let isLevelComplete = false;

// --- CLASSES ---

class Obstacle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = COLORS.obstacle;
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 2;
        
        // Hachures
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        
        // Motif hachuré
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(211, 47, 47, 0.5)';
        for(let i = 0; i < this.w + this.h; i+=15) {
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i - this.h, this.y + this.h);
        }
        ctx.stroke();
        
        // Croix interdite au centre
        const cx = this.x + this.w/2;
        const cy = this.y + this.h/2;
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy - 15); ctx.lineTo(cx + 15, cy + 15);
        ctx.moveTo(cx + 15, cy - 15); ctx.lineTo(cx - 15, cy + 15);
        ctx.stroke();
        
        ctx.restore();
    }
}

class Gear {
    constructor(x, y, radius, teeth, type) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.teeth = teeth;
        this.angle = 0;
        this.speed = 0; 
        this.type = type; // 'motor', 'target', 'loose'
        this.isPowered = false;
        this.locked = false; 
        
        // Nouveau: Sens de rotation requis (pour les cibles)
        // 1 = Clockwise, -1 = Counter-Clockwise, 0 = Peu importe
        this.requiredDir = 0; 
        this.wrongDirection = false; // Flag pour feedback visuel
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
            if (this.isPowered) {
                if (this.wrongDirection) color = COLORS.targetWrongDir;
                else color = COLORS.targetOn;
            } else {
                color = COLORS.targetOff;
            }
            glow = this.isPowered;
        } else if (this.type === 'loose') {
            color = this.isPowered ? COLORS.looseActive : COLORS.metal;
            if(this.locked) color = '#8d6e63';
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
            const a2 = a1 + step * 0.4;
            const a3 = a1 + step * 0.6;
            const a4 = (i + 1) * step;

            ctx.lineTo(Math.cos(a1) * outerRadius, Math.sin(a1) * outerRadius);
            ctx.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
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

        // Indicateur de verrouillage
        if (this.locked) {
            ctx.fillStyle = '#d32f2f';
            ctx.beginPath();
            ctx.arc(0, 0, holeRadius * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-4, -4); ctx.lineTo(4, 4);
            ctx.moveTo(4, -4); ctx.lineTo(-4, 4);
            ctx.stroke();
        }

        // Glow
        if (glow) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.restore();

        // NOUVEAU: Indicateur de sens requis sur la cible (TEXTE SIMPLE)
        if (this.type === 'target' && this.requiredDir !== 0) {
            ctx.save();
            ctx.font = 'bold 24px VT323';
            ctx.textAlign = 'center';
            
            if (this.requiredDir === 1) {
                ctx.fillStyle = '#fff';
                ctx.fillText("SENS HORAIRE", this.x, this.y - this.radius - 20);
                // Petite icône textuelle
                ctx.font = '20px Arial';
                ctx.fillText("↻", this.x, this.y - this.radius - 45);
            } else {
                ctx.fillStyle = '#fff';
                ctx.fillText("SENS ANTI-HORAIRE", this.x, this.y - this.radius - 20);
                ctx.font = '20px Arial';
                ctx.fillText("↺", this.x, this.y - this.radius - 45);
            }
            ctx.restore();
        }
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
    obstacles = [];
    isLevelComplete = false;
    
    const centerX = width / 2;
    const centerY = height / 2;

    let distance = 160;
    let yOffset = 0;
    let gearsCount = 3;
    let targetDir = 0; // 0 = libre, 1 = horaire, -1 = anti

    switch(level) {
        case 1:
            distance = 160; yOffset = 0; gearsCount = 3;
            break;
        case 2: // Intro direction
            distance = 200; yOffset = 0; gearsCount = 4;
            targetDir = 1; // Doit tourner Horaire
            break;
        case 3: // Intro obstacles
            distance = 250; yOffset = -50; gearsCount = 5;
            obstacles.push(new Obstacle(centerX - 40, centerY + 20, 80, 80));
            break;
        case 4: // Direction + Obstacles
            distance = 280; yOffset = 0; gearsCount = 6;
            targetDir = -1; // Anti-horaire
            obstacles.push(new Obstacle(centerX - 60, centerY - 100, 120, 80));
            break;
        case 5: // Hardcore
            distance = 320; yOffset = 100; gearsCount = 8;
            targetDir = 1;
            // Deux murs qui forcent un chemin détourné
            obstacles.push(new Obstacle(centerX - 80, centerY - 60, 160, 40));
            obstacles.push(new Obstacle(centerX - 80, centerY + 60, 160, 40));
            break;
        default:
            distance = 150 + (level * 30);
            gearsCount = 2 + Math.floor(level / 2);
    }
    
    const mX = centerX - distance/2;
    const mY = centerY - yOffset/2;
    const tX = centerX + distance/2;
    const tY = centerY + yOffset/2;

    const motor = new Gear(mX, mY, 40, 12, 'motor');
    motor.speed = 0.05; 
    motor.isPowered = true;
    motor.locked = true; 
    gears.push(motor);

    const target = new Gear(tX, tY, 40, 12, 'target');
    target.locked = true; 
    target.requiredDir = targetDir;
    gears.push(target);

    const toolboxY = height - 80;
    const startX = (width - (gearsCount * 80)) / 2;

    for(let i=0; i<gearsCount; i++) {
        const sizeRand = Math.random();
        let r, t;
        if(sizeRand > 0.6) { r = 30; t = 10; }
        else if (sizeRand > 0.3) { r = 40; t = 12; }
        else { r = 50; t = 16; }

        // Pour rendre le puzzle de direction intéressant, il faut varier les tailles
        gears.push(new Gear(startX + (i * 80) + 40, toolboxY, r, t, 'loose'));
    }
}

function checkConnections() {
    gears.forEach(g => {
        if(g.type !== 'motor') {
            g.isPowered = false;
            g.speed = 0;
            g.wrongDirection = false;
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

    // Check Win Condition
    const target = gears.find(g => g.type === 'target');
    if(target && target.isPowered && !isLevelComplete) {
        // Check direction requirement
        let valid = true;
        if (target.requiredDir !== 0) {
            // Signe de la vitesse actuelle vs requise
            if (Math.sign(target.speed) !== target.requiredDir) {
                valid = false;
                target.wrongDirection = true;
            }
        }

        if (valid) {
            levelComplete();
        }
    }
}

function update() {
    gears.forEach(g => {
        g.angle += g.speed;
    });
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw Obstacles
    obstacles.forEach(o => o.draw(ctx));

    // Toolbox Zone
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, height - 140, width, 140);
    
    ctx.beginPath();
    ctx.moveTo(0, height - 140);
    ctx.lineTo(width, height - 140);
    ctx.strokeStyle = '#5d4037';
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.font = '20px VT323';
    ctx.fillStyle = '#5d4037';
    ctx.textAlign = 'center';
    ctx.fillText("ZONE DE STOCKAGE", width/2, height - 120);

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

function checkObstacleCollision(gear) {
    // Carré englobant de l'engrenage
    const gLeft = gear.x - gear.radius;
    const gRight = gear.x + gear.radius;
    const gTop = gear.y - gear.radius;
    const gBottom = gear.y + gear.radius;

    for(let o of obstacles) {
        // AABB Collision (Box vs Box) pour simplifier
        if (gLeft < o.x + o.w &&
            gRight > o.x &&
            gTop < o.y + o.h &&
            gBottom > o.y) {
            return true;
        }
    }
    return false;
}

function handleStart(e) {
    if(!uiLayer.classList.contains('hidden')) return;

    const pos = getPointerPos(e);
    
    for(let i = gears.length - 1; i >= 0; i--) {
        const g = gears[i];
        if(g.type !== 'loose' || g.locked) continue;

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
    if (isDragging && dragGear) {
        const onBoard = dragGear.y < height - 140;
        
        // Vérifier collision obstacle
        if (onBoard && checkObstacleCollision(dragGear)) {
            // REJETÉ ! Retourne dans la boite (animation simple: on le met en bas)
            // On le remet au pif dans la zone toolbox
            dragGear.y = height - 80;
            dragGear.x = width / 2; // Centre approximatif
            // Feedback visuel ?
            // Pas de lock
        } else if (onBoard) {
            dragGear.locked = true;
        }
    }
    isDragging = false;
    dragGear = null;
}

// Listeners
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
