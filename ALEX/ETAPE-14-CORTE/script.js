//TAILWIND CONFIG


const MAX_STEPS = 5;
const MAX_TIME = 60;
// Insérez votre clé API Gemini ici si vous l'avez
const apiKey = "";

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let state = {
    active: false,
    time: MAX_TIME,
    step: 0,
    safePath: 0,     // 0=Left, 1=Center, 2=Right
    selectedPath: null,

    player: {
        x: 0.5, y: 0.9,
        scale: 1,
        opacity: 1,
        walkFrame: 0,
        rotation: 0
    },
    animData: {
        active: false,
        pathIndex: 0,
        progress: 0
    },

    particles: [],
    trees: [],
    orcuAlpha: 0,
    fulettuAlpha: 0,
    oracleCooldown: false
};

let mouseX = 0;
let mouseY = 0;
let audioCtx;
let timerInterval;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateTrees();
}
window.addEventListener('resize', resize);

function generateTrees() {
    state.trees = [];
    // Background layer
    for (let i = 0; i < 60; i++) {
        state.trees.push({
            x: Math.random(),
            height: 0.3 + Math.random() * 0.2,
            layer: 0, // Far
            type: Math.random() > 0.5 ? 'pine' : 'bush'
        });
    }
    // Foreground layer (Sides) - Avoid center hub
    for (let i = 0; i < 20; i++) {
        let x = Math.random();
        if (x > 0.35 && x < 0.65) continue; // Hub clearing
        state.trees.push({
            x: x,
            height: 0.4 + Math.random() * 0.3,
            layer: 1, // Near
            type: 'pine'
        });
    }
}

function initParticles() {
    for (let i = 0; i < 60; i++) {
        state.particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            alpha: Math.random()
        });
    }
}

function draw() {
    updateAnimation();

    // 1. CLEAR & SKY
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;

    let grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#0f0c29");
    grd.addColorStop(0.5, "#302b63");
    grd.addColorStop(1, "#24243e");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    let sunGrd = ctx.createRadialGradient(W / 2, H * 0.6, 10, W / 2, H * 0.6, W * 0.6);
    sunGrd.addColorStop(0, "rgba(255, 100, 50, 0.2)");
    sunGrd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sunGrd;
    ctx.fillRect(0, 0, W, H);

    // 2. MOUNTAINS
    ctx.fillStyle = "#161626";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.6);
    ctx.lineTo(W * 0.2, H * 0.4);
    ctx.lineTo(W * 0.5, H * 0.55);
    ctx.lineTo(W * 0.8, H * 0.35);
    ctx.lineTo(W, H * 0.6);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();

    // 3. FAR TREES
    drawTreeLayer(0);

    // 4. GROUND (BASE LAYER)
    ctx.fillStyle = "#0a0a10";
    ctx.fillRect(0, H * 0.6, W, H * 0.4);

    // 5. PATHS (Merged)
    // We draw the paths sequentially. To prevent ugly overlapping with transparency,
    // we use a solid base color first, then a highlight overlay.

    // Base paths (Solid - no overlap visible)
    drawPath(0, false);
    drawPath(1, false);
    drawPath(2, false);

    // Highlight layer (Only for selected/hovered)
    drawPath(0, true);
    drawPath(1, true);
    drawPath(2, true);

    // 6. NEAR TREES
    drawTreeLayer(1);

    // 7. ENTITIES
    if (state.orcuAlpha > 0) drawOrcu();
    if (state.fulettuAlpha > 0) drawFulettu();

    // 8. PLAYER
    drawPlayer();

    // 9. PARTICLES
    drawParticles();

    requestAnimationFrame(draw);
}

// CURVY PATH LOGIC (TRIDENT SHAPE)
function getPathPoints(index, W, H) {
    const startX = W * 0.5; // Single Hub Origin
    const startY = H;
    const endY = H * 0.6;   // Horizon

    let endX, c1X, c2X, c1Y, c2Y;

    // "Trident" with curves
    // Using control points to force a shared trunk before splitting

    const trunkHeight = H * 0.15; // How long they stay together loosely

    if (index === 0) { // Left (Curvy)
        endX = W * 0.2;
        c1X = W * 0.5; // Start vertical
        c1Y = H - trunkHeight;
        c2X = W * 0.2; // Then curve left
        c2Y = endY + (H * 0.1);
    } else if (index === 1) { // Center (Straight-ish)
        endX = W * 0.5;
        c1X = W * 0.5;
        c1Y = H - trunkHeight;
        c2X = W * 0.5;
        c2Y = endY + (H * 0.1);
    } else { // Right (Curvy)
        endX = W * 0.8;
        c1X = W * 0.5; // Start vertical
        c1Y = H - trunkHeight;
        c2X = W * 0.8; // Then curve right
        c2Y = endY + (H * 0.1);
    }

    return { startX, startY, endX, endY, c1X, c1Y, c2X, c2Y };
}

function drawPath(index, isHighlightPass) {
    const pts = getPathPoints(index, canvas.width, canvas.height);
    const W = canvas.width;

    // Mouse detection
    let isHover = false;
    if (mouseY > canvas.height * 0.6 && !state.animData.active && state.active) {
        const dx = mouseX - (canvas.width * 0.5);
        const dy = canvas.height - mouseY;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // Refined sectors
        if (index === 0 && angle > 100 && angle < 160) isHover = true;
        if (index === 1 && angle >= 80 && angle <= 100) isHover = true;
        if (index === 2 && angle > 20 && angle < 80) isHover = true;
    }

    const isSelected = (state.selectedPath === index);

    // Optimization: If highlighting pass, only draw if relevant
    if (isHighlightPass && !isHover && !isSelected) return;

    ctx.beginPath();
    // Path Shape: Starts wide at bottom center, narrows at horizon
    let startW = W * 0.05; // Base width
    let endW = W * 0.015;  // Horizon width

    ctx.moveTo(pts.startX - startW, pts.startY);
    ctx.bezierCurveTo(pts.c1X - startW * 0.5, pts.c1Y, pts.c2X - endW, pts.c2Y, pts.endX - endW, pts.endY);
    ctx.lineTo(pts.endX + endW, pts.endY);
    ctx.bezierCurveTo(pts.c2X + endW, pts.c2Y, pts.c1X + startW * 0.5, pts.c1Y, pts.startX + startW, pts.startY);
    ctx.closePath();

    if (isHighlightPass) {
        if (isSelected) {
            ctx.fillStyle = "rgba(255, 207, 64, 0.4)";
            ctx.shadowColor = "#ffcf40";
            ctx.shadowBlur = 30;
        } else if (isHover) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.shadowColor = "rgba(255,255,255,0.2)";
            ctx.shadowBlur = 15;
            document.body.style.cursor = 'pointer';
        }
    } else {
        // Base Pass: Solid dark earth color to hide overlaps
        ctx.fillStyle = "#1f1a18";
        ctx.shadowBlur = 0;
        if (!isHighlightPass && isHover === false && state.active) document.body.style.cursor = 'default';
    }
    ctx.fill();
    ctx.shadowBlur = 0;
}

function updateAnimation() {
    if (!state.animData.active) return;

    state.animData.progress += 0.01;
    let t = state.animData.progress;
    let ease = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    if (t >= 1) {
        state.animData.active = false;
        state.step++;
        updateHUD();
        if (state.step >= MAX_STEPS) endGame(true);
        else startRound();
        return;
    }

    const pts = getPathPoints(state.animData.pathIndex, canvas.width, canvas.height);

    const u = 1 - ease;
    const tt = ease * ease;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * ease;

    // Bezier interpolation for movement
    let bx = uuu * pts.startX;
    bx += 3 * uu * ease * pts.c1X;
    bx += 3 * u * tt * pts.c2X;
    bx += ttt * pts.endX;

    let by = uuu * pts.startY;
    by += 3 * uu * ease * pts.c1Y;
    by += 3 * u * tt * pts.c2Y;
    by += ttt * pts.endY;

    state.player.x = bx / canvas.width;
    state.player.y = by / canvas.height;
    state.player.scale = 1 - (ease * 0.85);
    state.player.opacity = 1 - ease;
    state.player.walkFrame += 0.2;

    let targetRot = (state.selectedPath - 1) * -0.2;
    state.player.rotation = targetRot * Math.sin(t * Math.PI);
}

function drawTreeLayer(layerId) {
    const W = canvas.width;
    const H = canvas.height;
    const horizon = H * 0.6;
    ctx.fillStyle = layerId === 0 ? "#111" : "#000";
    state.trees.forEach(t => {
        if (t.layer !== layerId) return;
        let x = t.x * W;
        let h = t.height * H;
        let w = h * 0.4;
        let y = horizon + (layerId * 50);
        ctx.beginPath();
        if (t.type === 'pine') {
            ctx.moveTo(x, y - h);
            ctx.lineTo(x + w / 2, y);
            ctx.lineTo(x - w / 2, y);
        } else {
            ctx.arc(x, y - h / 4, w / 2, 0, Math.PI, true);
        }
        ctx.fill();
    });
}

function drawPlayer() {
    const W = canvas.width;
    const H = canvas.height;

    let x = state.player.x * W;
    let y = state.player.y * H;
    let s = state.player.scale;

    let bob = 0;
    let legSwing = 0;

    if (state.animData.active) {
        bob = Math.abs(Math.sin(state.player.walkFrame * Math.PI)) * 10 * s;
        legSwing = Math.sin(state.player.walkFrame * Math.PI) * 15;
    } else {
        bob = Math.sin(Date.now() / 500) * 3 * s;
    }

    ctx.save();
    ctx.translate(x, y - bob);
    ctx.scale(s, s);
    ctx.rotate(state.player.rotation);
    ctx.globalAlpha = state.player.opacity;

    ctx.fillStyle = "#080808";

    ctx.save();
    ctx.translate(-8, 0);
    ctx.rotate(legSwing * Math.PI / 180);
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.roundRect(-4, 0, 8, 50, 4);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(8, 0);
    ctx.rotate(-legSwing * Math.PI / 180);
    ctx.fillStyle = "#080808";
    ctx.beginPath();
    ctx.roundRect(-4, 0, 8, 50, 4);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-12, -50);
    ctx.lineTo(12, -50);
    ctx.lineTo(15, 0);
    ctx.fill();

    ctx.save();
    ctx.translate(0, -40);
    ctx.rotate(legSwing * 0.1 * Math.PI / 180);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.roundRect(-10, 0, 20, 25, 3);
    ctx.fill();

    ctx.shadowColor = "#a29bfe";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#a29bfe";
    ctx.beginPath();
    ctx.roundRect(-3, 5, 6, 15, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, -65, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#080808";
    ctx.fill();

    ctx.restore();
}

function drawFulettu() {
    if (state.fulettuAlpha <= 0) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.save();
    ctx.globalAlpha = state.fulettuAlpha;
    ctx.fillStyle = "rgba(200, 255, 200, 0.8)";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.4, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(W / 2 - 20, H * 0.4 - 10, 10, 0, Math.PI * 2);
    ctx.arc(W / 2 + 20, H * 0.4 - 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawOrcu() {
    if (state.orcuAlpha <= 0) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.save();
    ctx.globalAlpha = state.orcuAlpha;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.8, 150, 300, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "red";
    ctx.shadowColor = "red";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(W * 0.45, H * 0.4, 5, 0, Math.PI * 2);
    ctx.arc(W * 0.55, H * 0.4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawParticles() {
    ctx.fillStyle = "rgba(255, 255, 200, 0.5)";
    state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

canvas.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

canvas.addEventListener('click', e => {
    if (!state.active || state.animData.active) return;
    const W = canvas.width;
    const H = canvas.height;
    if (mouseY > H * 0.6) {
        const dx = mouseX - (W * 0.5);
        const dy = H - mouseY;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        if (angle > 100 && angle < 160) selectPath(0);
        if (angle >= 80 && angle <= 100) selectPath(1);
        if (angle > 20 && angle < 80) selectPath(2);
    }
});

function startGame() {
    resize();
    generateTrees();
    initParticles();
    initAudio();
    document.getElementById('screen-intro').classList.remove('active');
    document.getElementById('btn-oracle').style.display = 'block';
    state.active = true;
    state.time = MAX_TIME;
    state.step = 0;
    draw();
    updateHUD();
    startRound();
    timerInterval = setInterval(() => {
        if (!state.active) return;
        state.time--;
        updateHUD();
        if (state.time <= 0) endGame(false);
    }, 1000);
}

function startRound() {
    state.safePath = Math.floor(Math.random() * 3);
    state.selectedPath = null;

    state.player.x = 0.5;
    state.player.y = 0.9; // Start at Hub
    state.player.scale = 1;
    state.player.opacity = 1;
    state.player.rotation = 0;
    state.player.walkFrame = 0;

    document.getElementById('btn-confirm').classList.remove('visible');
    showFeedback("Écoutez le vent...");
}

function selectPath(index) {
    if (state.selectedPath === index) return;
    state.selectedPath = index;
    if (index === state.safePath) {
        playWind();
        showFeedback("🌬️ Brise Calme");
    } else {
        playWhistle();
        showFeedback("⚠️ Sifflement");
    }
    document.getElementById('btn-confirm').classList.add('visible');
}

function confirmMove() {
    if (state.selectedPath === null) return;
    document.getElementById('btn-confirm').classList.remove('visible');
    if (state.selectedPath === state.safePath) {
        showFeedback("VOIE LIBRE");
        animateAdvance();
    } else {
        showFeedback("PIÈGE !");
        punish();
    }
}

function animateAdvance() {
    state.animData.active = true;
    state.animData.pathIndex = state.selectedPath;
    state.animData.progress = 0;
}

function punish() {
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 500);
    let fIn = setInterval(() => {
        state.fulettuAlpha += 0.05;
        if (state.fulettuAlpha >= 1) {
            clearInterval(fIn);
            setTimeout(() => {
                state.fulettuAlpha = 0;
                state.time = Math.max(0, state.time - 10);
                updateHUD();
                showFeedback("Temps perdu (-10s)");
                startRound();
            }, 1000);
        }
    }, 30);
}

function updateHUD() {
    document.getElementById('time-txt').innerText = state.time;
    document.getElementById('step-txt').innerText = `${state.step}/${MAX_STEPS}`;
}

function showFeedback(msg) {
    const el = document.getElementById('feedback-msg');
    el.innerText = msg;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2000);
}

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playWind() {
    const t = audioCtx.currentTime;
    const n = audioCtx.createBufferSource();
    const b = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = b;
    const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const g = audioCtx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + 0.5); g.gain.linearRampToValueAtTime(0, t + 2);
    n.connect(f); f.connect(g); g.connect(audioCtx.destination); n.start();
}

function playWhistle() {
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(800, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
    const g = audioCtx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.1); g.gain.linearRampToValueAtTime(0, t + 0.6);
    o.connect(g); g.connect(audioCtx.destination); o.start();
}

async function callGemini(prompt) {
    if (!apiKey) return "...";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    try {
        const r = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const d = await r.json();
        return d.candidates?.[0]?.content?.parts?.[0]?.text || "...";
    } catch (e) { return "..."; }
}

async function askOracle() {
    if (state.oracleCooldown || !state.active) return;
    state.oracleCooldown = true;
    const b = document.getElementById('oracle-bubble');
    b.innerText = "..."; b.classList.add('active');
    const txt = await callGemini(`Jeu étape 14 Corse. Reste ${state.time}s. Conseil mystique court (max 10 mots) pour écouter le vent.`);
    b.innerText = txt;
    setTimeout(() => { b.classList.remove('active'); state.oracleCooldown = false; }, 5000);
}

async function endGame(victory) {
    state.active = false;
    clearInterval(timerInterval);
    document.getElementById('ui-layer').style.opacity = 0;
    document.getElementById('btn-oracle').style.display = 'none';

    if (victory) {
        let oIn = setInterval(() => {
            state.orcuAlpha += 0.02;
            if (state.orcuAlpha >= 1) clearInterval(oIn);
        }, 30);
        const poem = await callGemini("Quatrain épique français: Victoire maquis corse, Orcu protecteur.");
        document.getElementById('poem-win').innerText = poem;
        setTimeout(() => document.getElementById('screen-win').classList.add('active'), 2500);
    } else {
        const poem = await callGemini("Quatrain triste français: Perdu maquis corse, Fulettu piège.");
        document.getElementById('poem-fail').innerText = poem;
        document.getElementById('screen-fail').classList.add('active');
    }
}