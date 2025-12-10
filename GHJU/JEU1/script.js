// Canvas Setup
const canvas = document.getElementById('radarCanvas');
const ctx = canvas.getContext('2d');
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radarRadius = 220;

// Game State
const NUM_SUPPLIES = 15;
let score = 0;
let timeLeft = 30;
let gameIsRunning = false;
let timerInterval = null;
let sweepAngle = 0;

// Player Cursor
let player = {
    x: 0,
    y: 0,
    size: 8
};

// Supplies Array
let supplies = [];

// Key States
let keys = {};

// DOM Elements
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const messageText = document.getElementById('messageText');
const startBtn = document.getElementById('startBtn');
const modal = document.getElementById('rulesModal');
const closeModalBtn = document.getElementById('closeModal');

// Modal Logic
closeModalBtn.addEventListener('click', function() {
    modal.classList.add('hidden');
    startGame();
});

// Initialize Supplies
function initSupplies() {
    supplies = [];
    for (let i = 0; i < NUM_SUPPLIES; i++) {
        let angle = Math.random() * Math.PI * 2;
        let distance = Math.random() * (radarRadius - 30);
        
        supplies.push({
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            collected: false
        });
    }
}

// Start Game
function startGame() {
    if (!gameIsRunning) {
        gameIsRunning = true;
        score = 0;
        timeLeft = 15;
        player.x = 0;
        player.y = 0;
        
        initSupplies();
        updateDisplay();
        
        startBtn.disabled = true;
        messageText.innerHTML = '<span class="prompt">&gt;</span> Mission Active! Collectez les 15 points de données!';
        
        // Start Timer
        timerInterval = setInterval(function() {
            timeLeft--;
            timerDisplay.textContent = timeLeft.toString().padStart(2, '0');
            
            if (timeLeft <= 0) {
                endGame('<span class="prompt">&gt;</span> TEMPS ÉCOULÉ! Mission échouée. Score Final: ' + score + '/15');
            }
        }, 1000);
    }
}

// Button Start (pour recommencer après le modal)
startBtn.addEventListener('click', function() {
    startGame();
});

// End Game
function endGame(message) {
    gameIsRunning = false;
    clearInterval(timerInterval);
    messageText.innerHTML = message;
    startBtn.disabled = false;
}

// Update Display
function updateDisplay() {
    scoreDisplay.textContent = score.toString().padStart(2, '0');
    timerDisplay.textContent = timeLeft.toString().padStart(2, '0');
}

// Keyboard Input
window.addEventListener('keydown', function(e) {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', function(e) {
    keys[e.key.toLowerCase()] = false;
});

// Update Player Position
function updatePlayer() {
    if (!gameIsRunning) return;
    
    const speed = 3;
    let newX = player.x;
    let newY = player.y;
    
    // ZQSD Keys
    if (keys['z']) newY -= speed;
    if (keys['s']) newY += speed;
    if (keys['q']) newX -= speed;
    if (keys['d']) newX += speed;

    // Arrow Keys
    if (keys['arrowup']) newY -= speed;
    if (keys['arrowdown']) newY += speed;
    if (keys['arrowleft']) newX -= speed;
    if (keys['arrowright']) newX += speed;
    
    // Check if new position is within radar boundary
    let distance = Math.sqrt(newX * newX + newY * newY);
    if (distance <= radarRadius - player.size) {
        player.x = newX;
        player.y = newY;
    }
    
    // Check for supply collection
    checkCollection();
}

// Check Supply Collection
function checkCollection() {
    const collectionRadius = 15;
    
    for (let i = 0; i < supplies.length; i++) {
        if (!supplies[i].collected) {
            let dx = player.x - supplies[i].x;
            let dy = player.y - supplies[i].y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < collectionRadius) {
                supplies[i].collected = true;
                score++;
                scoreDisplay.textContent = score.toString().padStart(2, '0');
                
                // Check win condition
                if (score >= NUM_SUPPLIES) {
                    endGame('<span class="prompt">&gt;</span> MISSION RÉUSSIE! Toutes les données collectées en ' + (15 - timeLeft) + ' secondes!');
                }
            }
        }
    }
}

// Draw Game
function drawGame() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Translate to center
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // Draw radar circle
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff00';
    ctx.beginPath();
    ctx.arc(0, 0, radarRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw concentric rings
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 5;
    for (let r = radarRadius / 4; r < radarRadius; r += radarRadius / 4) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw quadrant lines
    ctx.beginPath();
    ctx.moveTo(-radarRadius, 0);
    ctx.lineTo(radarRadius, 0);
    ctx.moveTo(0, -radarRadius);
    ctx.lineTo(0, radarRadius);
    ctx.stroke();
    
    // Draw rotating sweep line
    if (gameIsRunning) {
        sweepAngle += 0.02;
        
        // Sweep gradient
        let gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radarRadius);
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radarRadius, sweepAngle - 0.3, sweepAngle);
        ctx.closePath();
        ctx.fill();
        
        // Sweep line
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(
            Math.cos(sweepAngle) * radarRadius,
            Math.sin(sweepAngle) * radarRadius
        );
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    
    // Draw supplies
    for (let supply of supplies) {
        if (!supply.collected) {
            // Pulsing glow effect
            let pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            
            ctx.shadowBlur = 20 * pulse;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ff0000';
            
            ctx.beginPath();
            ctx.arc(supply.x, supply.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Outer glow ring
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(supply.x, supply.y, 8 * pulse, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    ctx.shadowBlur = 0;
    
    // Draw player cursor (triangle)
    ctx.fillStyle = '#00ff00';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff00';
    
    ctx.save();
    ctx.translate(player.x, player.y);
    
    ctx.beginPath();
    ctx.moveTo(0, -player.size);
    ctx.lineTo(-player.size, player.size);
    ctx.lineTo(player.size, player.size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw crosshair on player
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-8, 0);
    ctx.moveTo(12, 0);
    ctx.lineTo(8, 0);
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -8);
    ctx.moveTo(0, 12);
    ctx.lineTo(0, 8);
    ctx.stroke();
    
    ctx.restore();
    ctx.shadowBlur = 0;
    
    ctx.restore();
}

// Game Loop
function gameLoop() {
    updatePlayer();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// Initialize
initSupplies();
gameLoop();