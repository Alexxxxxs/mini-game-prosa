// --- Audio System (Synthesizer) ---
class AudioSys {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.gain = this.ctx.createGain();
        this.gain.connect(this.ctx.destination);
        this.gain.gain.value = 0.3; // Master volume
    }

    // Humming background noise
    playHum() {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 50; // 50hz hum

        const gain = this.ctx.createGain();
        gain.gain.value = 0.05;

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        this.humOsc = osc;
    }

    // Connection snap sound
    playSnap() {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    // Electrical spark/fizz
    playSpark() {
        const bufferSize = this.ctx.sampleRate * 0.2; // 0.2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    // Breaker switch clunk
    playClunk() {
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    // Power on chord
    playPowerOn() {
        const freqs = [220, 277.18, 329.63, 440]; // A major
        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = f;

            const gain = this.ctx.createGain();
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.1 + (i * 0.1));
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 3);
        });
    }
}

// --- Game Logic ---

const COLORS = ['red', 'blue', 'yellow', 'green'];
const HEX_COLORS = {
    'red': '#d32f2f',
    'blue': '#1976d2',
    'yellow': '#fbc02d',
    'green': '#388e3c'
};

let audioSys = null;
let wires = []; // { color, startEl, endEl, connected, currentPos }
let isDragging = false;
let activeWire = null;
let mousePos = { x: 0, y: 0 };
let breakerUnlocked = false;

const canvas = document.getElementById('wire-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('wire-panel');

// Initialize Game
document.getElementById('start-overlay').addEventListener('click', () => {
    document.getElementById('start-overlay').style.display = 'none';
    audioSys = new AudioSys();
    audioSys.ctx.resume().then(() => {
        audioSys.playHum();
        initWires();
        renderLoop();
    });
});

function initWires() {
    const leftCol = document.getElementById('left-column');
    const rightCol = document.getElementById('right-column');

    // Shuffle colors for right side
    const rightColors = [...COLORS].sort(() => Math.random() - 0.5);

    COLORS.forEach((color, index) => {
        // Create Left Socket
        const lSocket = document.createElement('div');
        lSocket.className = 'socket';
        lSocket.dataset.color = color;
        lSocket.style.color = HEX_COLORS[color]; // For glow effect
        lSocket.style.borderColor = HEX_COLORS[color];
        leftCol.appendChild(lSocket);

        // Add Drag Event listeners to Left Sockets
        lSocket.addEventListener('mousedown', (e) => startDrag(e, index));
        lSocket.addEventListener('touchstart', (e) => startDrag(e, index));

        wires.push({
            color: color,
            startEl: lSocket,
            endEl: null, // Will be set if connected
            connected: false,
            currentPos: null // {x, y}
        });
    });

    rightColors.forEach(color => {
        const rSocket = document.createElement('div');
        rSocket.className = 'socket';
        rSocket.dataset.color = color;
        rSocket.style.color = HEX_COLORS[color];
        rSocket.style.borderColor = '#555'; // Grey until connected
        rightCol.appendChild(rSocket);
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
}

function getRelativePos(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrag(e, index) {
    if (wires[index].connected) return;
    e.preventDefault();
    isDragging = true;
    activeWire = wires[index];
    mousePos = getRelativePos(e);
    audioSys.playSpark(); // Small sound on touch
}

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        mousePos = getRelativePos(e);
    }
});

window.addEventListener('touchmove', (e) => {
    if (isDragging) {
        mousePos = getRelativePos(e);
    }
});

window.addEventListener('mouseup', endDrag);
window.addEventListener('touchend', endDrag);

function endDrag(e) {
    if (!isDragging || !activeWire) return;

    // Check collision with right sockets
    const rightSockets = Array.from(document.querySelectorAll('#right-column .socket'));
    const rect = container.getBoundingClientRect();

    // Get final position (handle both mouse and touch end)
    let checkX, checkY;
    if (e.changedTouches) {
        checkX = e.changedTouches[0].clientX;
        checkY = e.changedTouches[0].clientY;
    } else {
        checkX = e.clientX;
        checkY = e.clientY;
    }

    let hit = false;

    rightSockets.forEach(socket => {
        const sRect = socket.getBoundingClientRect();
        if (checkX >= sRect.left && checkX <= sRect.right &&
            checkY >= sRect.top && checkY <= sRect.bottom) {

            // Check color match
            if (socket.dataset.color === activeWire.color) {
                // Success Connection
                activeWire.connected = true;
                activeWire.endEl = socket;
                socket.classList.add('connected');
                socket.style.borderColor = HEX_COLORS[activeWire.color];
                audioSys.playSnap();
                createSparks(mousePos.x, mousePos.y);
                hit = true;
                checkWinCondition();
            } else {
                // Wrong color
                audioSys.playSpark(); // Error sound
            }
        }
    });

    isDragging = false;
    activeWire = null;
}

function createSparks(x, y) {
    for (let i = 0; i < 10; i++) {
        const spark = document.createElement('div');
        spark.className = 'spark';
        spark.style.left = (x + Math.random() * 20 - 10) + 'px';
        spark.style.top = (y + Math.random() * 20 - 10) + 'px';
        spark.style.backgroundColor = HEX_COLORS[activeWire.color];
        container.appendChild(spark);

        // Animate spark falling
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 5 + 2;
        let dx = Math.cos(angle) * velocity;
        let dy = Math.sin(angle) * velocity;
        let opacity = 1;

        const anim = setInterval(() => {
            const l = parseFloat(spark.style.left);
            const t = parseFloat(spark.style.top);
            spark.style.left = (l + dx) + 'px';
            spark.style.top = (t + dy) + 'px';
            dy += 0.5; // Gravity
            opacity -= 0.05;
            spark.style.opacity = opacity;

            if (opacity <= 0) {
                clearInterval(anim);
                spark.remove();
            }
        }, 16);
    }
}

function checkWinCondition() {
    const allConnected = wires.every(w => w.connected);
    if (allConnected) {
        document.getElementById('system-status').innerText = "CÂBLAGE OK";
        document.getElementById('system-status').style.color = "yellow";
        setTimeout(() => {
            document.getElementById('wire-panel').style.opacity = '0.2';
            document.getElementById('breaker-panel').style.display = 'flex';
            breakerUnlocked = true;
            audioSys.playClunk();
        }, 500);
    }
}

// --- Breaker Logic ---
const breakerHandle = document.getElementById('breaker-handle');
let breakerDragging = false;
let startY = 0;
let currentBottom = 10;

breakerHandle.addEventListener('mousedown', (e) => {
    if (!breakerUnlocked) return;
    breakerDragging = true;
    startY = e.clientY;
});

window.addEventListener('mousemove', (e) => {
    if (!breakerDragging) return;
    const deltaY = startY - e.clientY;
    let newBottom = 10 + deltaY;

    // Clamp values
    if (newBottom < 10) newBottom = 10;
    if (newBottom > 80) newBottom = 80;

    currentBottom = newBottom;
    breakerHandle.style.bottom = currentBottom + 'px';
});

window.addEventListener('mouseup', () => {
    if (!breakerDragging) return;
    breakerDragging = false;

    if (currentBottom > 60) {
        // Snapped ON
        breakerHandle.style.bottom = '80px';
        breakerHandle.classList.add('on');
        breakerHandle.innerText = "ON";
        activatePower();
    } else {
        // Snap back OFF
        breakerHandle.style.bottom = '10px';
        audioSys.playClunk(); // Heavy switch sound falling back
    }
});

function activatePower() {
    audioSys.playClunk();
    audioSys.playPowerOn();

    // Suppression du tremblement
    // const container = document.getElementById('game-container');
    // container.classList.add('shaking');

    document.getElementById('system-status').innerText = "EN LIGNE";
    document.getElementById('system-status').classList.add('success');
    document.getElementById('main-light').classList.add('active');

    let voltage = 0;
    const vText = document.getElementById('voltage-text');
    vText.style.color = "#0f0";
    vText.style.textShadow = "0 0 10px #0f0";

    const vInterval = setInterval(() => {
        voltage += Math.floor(Math.random() * 10) + 5;
        if (voltage >= 230) {
            voltage = 230;
            clearInterval(vInterval);
            // Afficher le bouton quitter
            document.getElementById('quit-btn').style.display = 'block';
        }
        vText.innerText = voltage + "V";
    }, 50);
}

// --- Render Loop (Canvas) ---
function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const containerRect = container.getBoundingClientRect();

    wires.forEach(wire => {
        const startRect = wire.startEl.getBoundingClientRect();

        // Calculate start point relative to canvas
        const x1 = (startRect.left + startRect.width / 2) - containerRect.left;
        const y1 = (startRect.top + startRect.height / 2) - containerRect.top;

        let x2, y2;

        if (wire.connected && wire.endEl) {
            const endRect = wire.endEl.getBoundingClientRect();
            x2 = (endRect.left + endRect.width / 2) - containerRect.left;
            y2 = (endRect.top + endRect.height / 2) - containerRect.top;
        } else if (wire === activeWire && isDragging) {
            x2 = mousePos.x;
            y2 = mousePos.y;
        } else {
            // Resting position (dangling slightly)
            x2 = x1 + 20;
            y2 = y1;
        }

        ctx.strokeStyle = HEX_COLORS[wire.color];
        ctx.shadowBlur = 10;
        ctx.shadowColor = HEX_COLORS[wire.color];

        ctx.beginPath();
        ctx.moveTo(x1, y1);

        // Bezier curve for realistic wire droop
        const cp1x = x1 + Math.abs(x2 - x1) / 2;
        const cp1y = y1;
        const cp2x = x2 - Math.abs(x2 - x1) / 2;
        const cp2y = y2;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        ctx.stroke();

        // Draw end connector
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(x2, y2, 8, 0, Math.PI * 2);
        ctx.fill();
    });

    requestAnimationFrame(renderLoop);
}