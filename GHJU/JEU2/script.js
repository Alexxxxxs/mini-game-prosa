// ===== WAVE SYNCHRONIZATION GAME =====

// Canvas Setup
const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');

// Game State
let timeLeft = 50;
let gameIsRunning = false;
let timerInterval = null;
let animationFrame = null;
let successCount = 0;
let targetDrift = 0; // Pour l'animation de dérive de l'onde cible

// Wave Parameters
const FREQUENCY = 8;
const PHASE_TOLERANCE = 0.05;
const AMPLITUDE_TOLERANCE = 5;

let targetPhase = 0;
let targetAmplitude = 60;
let playerPhase = Math.PI;
let playerAmplitude = 60;

let syncHoldTime = 0;
const SYNC_HOLD_DURATION = 600; // 0.6 seconde de maintien pour valider

// DOM Elements - Game
const timerDisplay = document.getElementById('timer');
const messageText = document.getElementById('messageText');
const startBtn = document.getElementById('startBtn');
const phaseStatus = document.getElementById('phaseStatus');
const amplitudeStatus = document.getElementById('amplitudeStatus');
const successCountDisplay = document.getElementById('successCount');
const tuningSliderPhase = document.getElementById('tuningSliderPhase');
const tuningSliderAmplitude = document.getElementById('tuningSliderAmplitude');
const needlePhase = document.getElementById('needlePhase');
const needleAmplitude = document.getElementById('needleAmplitude');
const gameContainer = document.getElementById('gameContainer');

// DOM Elements - Modals
const radioModal = document.getElementById('radioModal');
const rulesModal = document.getElementById('rulesModal');
const radioMessageDiv = document.getElementById('radioMessage');
const skipRadioBtn = document.getElementById('skipRadio');
const continueFromRadioBtn = document.getElementById('continueFromRadio');
const closeModalBtn = document.getElementById('closeModal');

// Radio Message
const radioMessage = `<p><span class="emphasis">[GRÉSILLEMENT... SIGNAL FAIBLE...]</span></p>

<p>...si quelqu'un... peut... entendre...</p>

<p>Je m'appelle... peu importe qui je suis. Ce qui compte, c'est ce que j'ai vu.</p>

<p>Il existe un endroit... <span class="location">une île, quelque part entre Toulon et Corte</span>... épargnée par <span class="emphasis">La Ruina</span>.</p>

<p>Pendant que vous survivez dans les décombres, <span class="emphasis">eux</span> vivent dans l'abondance. Eau potable. Nourriture. Électricité. Tout ce que le monde a perdu.</p>

<p>Mais ils ne partagent rien. Ils nous regardent mourir depuis leurs tours d'ivoire.</p>

<p>J'ai vécu parmi eux. J'ai profité de leur confort pendant que des gens comme vous... comme moi autrefois... mouraient de faim dans les ruines.</p>

<p><span class="emphasis">Je ne peux plus.</span></p>

<p>J'ai essayé de les affronter. J'ai échoué. Maintenant je suis... emprisonné. Mais même d'ici, je peux encore lancer cet appel.</p>

<p><span class="emphasis">Rejoignez-moi. Finissez ce que j'ai commencé.</span></p>

<p>Cette île doit tomber. Ses ressources doivent être partagées. Le monde mérite mieux qu'une dictature égoïste.</p>

<p>Si vous m'entendez... si vous avez encore la force de vous battre...</p>

<p><span class="location">Trouvez l'île. Trouvez-moi. Ensemble, nous pouvons encore changer les choses.</span></p>

<p><span class="emphasis">[SIGNAL PERDU... TRANSMISSION TERMINÉE]</span></p>`;

// ===== MODAL FUNCTIONS =====

let typingIndex = 0;
let typingSpeed = 30;
let isTyping = false;

function typeMessage() {
    isTyping = true;
    radioMessageDiv.classList.add('typing-cursor');
    
    function typeChar() {
        if (typingIndex < radioMessage.length) {
            radioMessageDiv.innerHTML = radioMessage.substring(0, typingIndex + 1);
            typingIndex++;
            setTimeout(typeChar, typingSpeed);
        } else {
            radioMessageDiv.classList.remove('typing-cursor');
            isTyping = false;
            continueFromRadioBtn.style.display = 'block';
            skipRadioBtn.style.display = 'none';
        }
    }
    
    typeChar();
}

function showRadioModal() {
    radioModal.style.display = 'flex';
    typingIndex = 0;
    radioMessageDiv.innerHTML = '';
    continueFromRadioBtn.style.display = 'none';
    skipRadioBtn.style.display = 'block';
    typeMessage();
}

skipRadioBtn.addEventListener('click', function() {
    if (isTyping) {
        typingIndex = radioMessage.length;
        radioMessageDiv.innerHTML = radioMessage;
        radioMessageDiv.classList.remove('typing-cursor');
        isTyping = false;
        continueFromRadioBtn.style.display = 'block';
        skipRadioBtn.style.display = 'none';
    }
});

continueFromRadioBtn.addEventListener('click', function() {
    radioModal.style.display = 'none';
    console.log('Mission terminée - Transition vers le prochain niveau');
});

closeModalBtn.addEventListener('click', function() {
    rulesModal.style.display = 'none';
    gameContainer.style.display = 'block';
});

// ===== WAVE GENERATION =====

function generateRandomTarget() {
    targetPhase = Math.random() * Math.PI * 2;
    targetAmplitude = 10 + Math.random() * 50; // Entre 10 et 60
    targetDrift = 0;
}

// ===== WAVE DRAWING FUNCTIONS =====

function drawWave(phase, amplitude, color, lineWidth, label) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x++) {
        const t = (x / canvas.width) * Math.PI * 4;
        const y = canvas.height / 2 + Math.sin(FREQUENCY * t + phase) * amplitude;
        
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = '12px "Courier New"';
    ctx.fillText(label, 10, label === 'CIBLE' ? 20 : 40);
}

function drawWaves() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    
    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Vertical lines
    for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Center line
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // Draw waves avec dérive de la cible
    drawWave(targetPhase + targetDrift, targetAmplitude, '#00ff00', 3, 'CIBLE');
    drawWave(playerPhase, playerAmplitude, '#00ffff', 2, 'JOUEUR');
}

// ===== NEEDLE POSITION =====

function updateNeedles() {
    // Phase needle
    const phaseDiff = Math.abs(playerPhase - (targetPhase + targetDrift));
    const normalizedPhaseDiff = Math.min(phaseDiff, Math.PI * 2 - phaseDiff);
    const phaseSyncPercentage = 1 - (normalizedPhaseDiff / Math.PI);
    
    const phaseDeviation = (1 - phaseSyncPercentage) * 40;
    const phaseDirection = playerPhase > (targetPhase + targetDrift) ? 1 : -1;
    const phasePosition = 50 + (phaseDeviation * phaseDirection);
    needlePhase.style.left = `${Math.max(5, Math.min(95, phasePosition))}%`;
    
    // Amplitude needle
    const ampDiff = Math.abs(playerAmplitude - targetAmplitude);
    const ampSyncPercentage = 1 - Math.min(ampDiff / 60, 1);
    
    const ampDeviation = (1 - ampSyncPercentage) * 40;
    const ampDirection = playerAmplitude > targetAmplitude ? 1 : -1;
    const ampPosition = 50 + (ampDeviation * ampDirection);
    needleAmplitude.style.left = `${Math.max(5, Math.min(95, ampPosition))}%`;
}

// ===== TUNING CONTROLS =====

tuningSliderPhase.addEventListener('input', function() {
    if (gameIsRunning) {
        playerPhase = parseFloat(this.value) / 100;
        drawWaves();
        updateNeedles();
        checkSynchronization();
    }
});

tuningSliderAmplitude.addEventListener('input', function() {
    if (gameIsRunning) {
        playerAmplitude = parseFloat(this.value);
        drawWaves();
        updateNeedles();
        checkSynchronization();
    }
});

// ===== SYNCHRONIZATION CHECK =====

function checkSynchronization() {
    const phaseDiff = Math.abs(playerPhase - (targetPhase + targetDrift));
    const normalizedPhaseDiff = Math.min(phaseDiff, Math.PI * 2 - phaseDiff);
    const ampDiff = Math.abs(playerAmplitude - targetAmplitude);
    
    const phaseSynced = normalizedPhaseDiff < PHASE_TOLERANCE;
    const ampSynced = ampDiff < AMPLITUDE_TOLERANCE;
    
    // Update status displays
    if (phaseSynced) {
        phaseStatus.textContent = 'SYNC OK';
        phaseStatus.style.color = '#00ffff';
    } else if (normalizedPhaseDiff < PHASE_TOLERANCE * 2) {
        phaseStatus.textContent = 'PROCHE';
        phaseStatus.style.color = '#ffff00';
    } else {
        phaseStatus.textContent = 'DÉSYNC';
        phaseStatus.style.color = '#00ff00';
    }
    
    if (ampSynced) {
        amplitudeStatus.textContent = 'SYNC OK';
        amplitudeStatus.style.color = '#00ffff';
    } else if (ampDiff < AMPLITUDE_TOLERANCE * 2) {
        amplitudeStatus.textContent = 'PROCHE';
        amplitudeStatus.style.color = '#ffff00';
    } else {
        amplitudeStatus.textContent = 'DÉSYNC';
        amplitudeStatus.style.color = '#00ff00';
    }
    
    return phaseSynced && ampSynced;
}

// ===== GAME LOOP =====

let lastSyncCheck = Date.now();

function gameLoop() {
    if (!gameIsRunning) return;
    
    // Drift de l'onde cible
    targetDrift += 0.002;
    
    drawWaves();
    updateNeedles();
    
    const now = Date.now();
    if (now - lastSyncCheck > 100) {
        const isSynced = checkSynchronization();
        
        if (isSynced) {
            syncHoldTime += (now - lastSyncCheck);
            
            if (syncHoldTime >= SYNC_HOLD_DURATION) {
                // Synchronisation validée !
                successCount++;
                successCountDisplay.textContent = `${successCount}/3`;
                syncHoldTime = 0;
                
                if (successCount >= 3) {
                    endGame(true);
                    return;
                } else {
                    // Nouvelle cible
                    messageText.className = 'status-content partial';
                    messageText.innerHTML = `<span class="prompt">&gt;</span> SIGNAL ${successCount}/3 VERROUILLÉ ! Préparation du prochain signal...`;
                    
                    setTimeout(() => {
                        generateRandomTarget();
                        messageText.className = 'status-content';
                        messageText.innerHTML = `<span class="prompt">&gt;</span> Nouveau signal détecté. Synchronisation requise...`;
                    }, 1500);
                }
            } else {
                // En cours de maintien
                const progress = Math.floor((syncHoldTime / SYNC_HOLD_DURATION) * 100);
                messageText.className = 'status-content partial';
                messageText.innerHTML = `<span class="prompt">&gt;</span> Maintien de la synchronisation... ${progress}%`;
            }
        } else {
            syncHoldTime = 0;
            if (successCount === 0) {
                messageText.className = 'status-content';
                messageText.innerHTML = `<span class="prompt">&gt;</span> Ajustez la phase ET l'amplitude pour synchroniser le signal...`;
            }
        }
        
        lastSyncCheck = now;
    }
    
    animationFrame = requestAnimationFrame(gameLoop);
}

// ===== GAME LOGIC =====

function startGame() {
    if (gameIsRunning) return;
    
    gameIsRunning = true;
    timeLeft = 50;
    successCount = 0;
    syncHoldTime = 0;
    successCountDisplay.textContent = '0/3';
    
    generateRandomTarget();
    
    playerPhase = Math.PI;
    playerAmplitude = 60;
    tuningSliderPhase.value = 314;
    tuningSliderAmplitude.value = 60;
    
    startBtn.disabled = true;
    startBtn.textContent = '> EN COURS...';
    messageText.className = 'status-content';
    messageText.innerHTML = '<span class="prompt">&gt;</span> Synchronisation en cours... Ajustez la phase ET l\'amplitude.';
    
    phaseStatus.textContent = 'DÉSYNC';
    phaseStatus.style.color = '#00ff00';
    amplitudeStatus.textContent = 'DÉSYNC';
    amplitudeStatus.style.color = '#00ff00';
    
    drawWaves();
    updateNeedles();
    
    timerInterval = setInterval(function() {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            endGame(false);
        }
    }, 1000);
    
    lastSyncCheck = Date.now();
    gameLoop();
}

function endGame(victory) {
    gameIsRunning = false;
    clearInterval(timerInterval);
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    startBtn.disabled = true;
    
    if (victory) {
        messageText.className = 'status-content synced';
        messageText.innerHTML = '<span class="prompt">&gt;</span> SIGNAL ACQUIS. TRANSMISSION ÉTABLIE.<br><br>Tous les signaux ont été synchronisés. Réception du message entrant...';
        phaseStatus.textContent = 'VERROUILLÉ';
        phaseStatus.style.color = '#00ffff';
        amplitudeStatus.textContent = 'VERROUILLÉ';
        amplitudeStatus.style.color = '#00ffff';
        
        setTimeout(function() {
            showRadioModal();
        }, 2000);
    } else {
        messageText.className = 'status-content failed';
        messageText.innerHTML = `<span class="prompt">&gt;</span> PERTE DE SIGNAL. TROP LENT.<br><br>Signaux synchronisés: ${successCount}/3. Le signal s'est dissipé avant synchronisation complète.`;
        phaseStatus.textContent = 'ÉCHEC';
        phaseStatus.style.color = '#ff0000';
        amplitudeStatus.textContent = 'ÉCHEC';
        amplitudeStatus.style.color = '#ff0000';
        
        startBtn.disabled = false;
        startBtn.textContent = '> RÉESSAYER';
    }
}

// ===== EVENT LISTENERS =====

startBtn.addEventListener('click', startGame);

// ===== INITIALIZATION =====

drawWaves();
updateNeedles();