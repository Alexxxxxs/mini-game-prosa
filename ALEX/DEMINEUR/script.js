
// --- CONFIGURATION ---
const GAME_CONFIG = {
    size: 7,      // Grille 7x7 (Rapide)
    mines: 8      // 8 Mines
};

// --- ICONS (SVG Strings) ---
const ICONS = {
    bomb: `<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C11.5 2 11 2.2 10.6 2.6L9.2 4H14.8L13.4 2.6C13 2.2 12.5 2 12 2M12 5C7.6 5 4 8.6 4 13C4 17.4 7.6 21 12 21C16.4 21 20 17.4 20 13C20 8.6 16.4 5 12 5M12 7C15.3 7 18 9.7 18 13C18 16.3 15.3 19 12 19C8.7 19 6 16.3 6 13C6 9.7 8.7 7 12 7Z"/></svg>`,
    flag: `<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5V21H7V14H12.6L13 16H20V6H14.4Z"/></svg>`,
    shovel: `<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M19.66 11.53L12.47 4.34C12.16 4.03 11.66 4.03 11.34 4.34L9.93 5.76L16.07 11.9C15.68 12.29 15.68 12.92 16.07 13.31L17.49 14.73C17.88 15.12 18.51 15.12 18.9 14.73L21.07 12.56L22.49 13.97L19.66 16.8L18.25 15.39L15.42 18.22C14.64 19 13.36 19 12.59 18.22L6.93 12.56C6.15 11.78 6.15 10.5 6.93 9.73L9.76 6.9L8.34 5.49L5.51 8.31L2.68 5.49L1.26 6.9L6.21 11.85L5.5 12.56L4.09 11.14L2.68 12.56L9.76 19.63C11.32 21.19 13.84 21.19 15.4 19.63L19.64 15.39L21.06 16.8L22.47 15.39L20.35 13.27L21.77 11.85L19.66 11.53Z"/></svg>`,
    times: `<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/></svg>`
};

// --- STATE ---
let grid = [];
let gameActive = false;
let isFlagMode = false;
let minesLeft = 0;
let firstClick = true;

// --- DOM ELEMENTS ---
const gridEl = document.getElementById('grid');
const minesDisplay = document.getElementById('mines-left');
const modeBtn = document.getElementById('mode-btn');
const modeIcon = document.getElementById('mode-icon');
const modeText = document.getElementById('mode-text');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalMsg = document.getElementById('modal-msg');
const modalIcon = document.getElementById('modal-icon');

const vibrate = (ms) => {
    if (navigator.vibrate) navigator.vibrate(ms);
};

// --- INITIALIZATION ---
function initGame() {
    grid = [];
    gameActive = true;
    firstClick = true;
    minesLeft = GAME_CONFIG.mines;

    minesDisplay.textContent = minesLeft.toString().padStart(2, '0');
    modal.classList.add('hidden');

    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${GAME_CONFIG.size}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${GAME_CONFIG.size}, 1fr)`;

    for (let i = 0; i < GAME_CONFIG.size * GAME_CONFIG.size; i++) {
        const cell = document.createElement('div');
        cell.className = `
                    relative bg-slate-500 hover:bg-slate-400 
                    rounded-sm cursor-pointer flex items-center justify-center 
                    text-lg font-bold select-none cell-base transition-colors duration-75 overflow-hidden
                `;
        cell.style.fontSize = "clamp(12px, 5vw, 24px)";
        cell.dataset.index = i;
        cell.onclick = () => handleCellClick(i);

        gridEl.appendChild(cell);

        grid.push({
            element: cell,
            hasMine: false,
            revealed: false,
            flagged: false,
            neighborMines: 0
        });
    }
}

// --- LOGIC ---
function placeMines(safeIndex) {
    let minesPlaced = 0;
    const totalCells = GAME_CONFIG.size * GAME_CONFIG.size;
    const safeZone = [safeIndex, ...getNeighbors(safeIndex)];

    while (minesPlaced < GAME_CONFIG.mines) {
        let idx = Math.floor(Math.random() * totalCells);
        if (!grid[idx].hasMine && !safeZone.includes(idx)) {
            grid[idx].hasMine = true;
            minesPlaced++;
        }
    }
    calculateNumbers();
}

function calculateNumbers() {
    for (let i = 0; i < grid.length; i++) {
        if (grid[i].hasMine) continue;
        let mines = 0;
        getNeighbors(i).forEach(nIdx => { if (grid[nIdx].hasMine) mines++; });
        grid[i].neighborMines = mines;
    }
}

function getNeighbors(idx) {
    const size = GAME_CONFIG.size;
    const x = idx % size;
    const y = Math.floor(idx / size);
    const neighbors = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) neighbors.push(ny * size + nx);
        }
    }
    return neighbors;
}

// --- INTERACTION ---
modeBtn.addEventListener('click', () => {
    isFlagMode = !isFlagMode;
    if (isFlagMode) {
        modeBtn.classList.remove('bg-blue-600', 'border-blue-900');
        modeBtn.classList.add('bg-orange-500', 'border-orange-800');
        modeIcon.innerHTML = ICONS.flag;
        modeText.textContent = "DRAPEAU";
        vibrate(40);
    } else {
        modeBtn.classList.remove('bg-orange-500', 'border-orange-800');
        modeBtn.classList.add('bg-blue-600', 'border-blue-900');
        modeIcon.innerHTML = ICONS.shovel;
        modeText.textContent = "CREUSER";
        vibrate(40);
    }
});

function handleCellClick(idx) {
    if (!gameActive) return;
    const cell = grid[idx];

    if (isFlagMode) {
        toggleFlag(cell);
    } else {
        if (cell.flagged) return;
        if (firstClick) { placeMines(idx); firstClick = false; }
        revealCell(cell);
    }
}

function toggleFlag(cell) {
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;

    if (cell.flagged) {
        cell.element.innerHTML = `<div class="w-3/5 h-3/5 text-red-500">${ICONS.flag}</div>`;
    } else {
        cell.element.innerHTML = '';
    }

    const currentFlags = grid.filter(c => c.flagged).length;
    minesLeft = GAME_CONFIG.mines - currentFlags;
    minesDisplay.textContent = minesLeft.toString().padStart(2, '0');
    vibrate(20);
}

function revealCell(cell) {
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    cell.element.classList.remove('bg-slate-500', 'cell-base', 'hover:bg-slate-400');
    cell.element.classList.add('cell-revealed', 'bg-slate-300', 'cursor-default');

    if (cell.hasMine) {
        // LOSE
        cell.element.classList.remove('bg-slate-300');
        cell.element.classList.add('bg-red-500');
        cell.element.innerHTML = `<div class="w-4/5 h-4/5 text-white animate-mine">${ICONS.bomb}</div>`;
        vibrate([50, 50, 200]);
        gameOver(false);
    } else {
        // WIN/NUMBER
        if (cell.neighborMines > 0) {
            cell.element.textContent = cell.neighborMines;
            const colors = ['text-blue-600', 'text-green-600', 'text-red-600', 'text-purple-800', 'text-amber-800', 'text-cyan-800', 'text-black', 'text-gray-600'];
            cell.element.className += ` ${colors[cell.neighborMines - 1]}`;
        } else {
            getNeighbors(grid.indexOf(cell)).forEach(nIdx => {
                if (!grid[nIdx].revealed) revealCell(grid[nIdx]);
            });
        }
        checkWin();
    }
}

function checkWin() {
    const revealedCount = grid.filter(c => c.revealed && !c.hasMine).length;
    if (revealedCount === (GAME_CONFIG.size * GAME_CONFIG.size) - GAME_CONFIG.mines) {
        vibrate([100, 50, 100, 50, 100]);
        gameOver(true);
    }
}

function gameOver(win) {
    gameActive = false;

    grid.forEach(c => {
        if (c.hasMine) {
            if (!c.revealed && !win) {
                c.element.innerHTML = `<div class="w-3/5 h-3/5 text-gray-800 opacity-60">${ICONS.bomb}</div>`;
                c.element.classList.remove('cell-base');
            } else if (win) {
                c.element.innerHTML = `<div class="w-3/5 h-3/5 text-green-500">${ICONS.flag}</div>`;
                c.element.classList.remove('bg-slate-500', 'cell-base');
                c.element.classList.add('bg-slate-700', 'cell-revealed');
            }
        } else if (c.flagged && !c.hasMine) {
            c.element.innerHTML = `<div class="w-3/5 h-3/5 text-red-800">${ICONS.times}</div>`;
            c.element.classList.add('bg-red-300');
        }
    });

    setTimeout(() => {
        modal.classList.remove('hidden');
        if (win) {
            modalIcon.textContent = "⭐️";
            modalTitle.textContent = "VICTOIRE !";
            modalMsg.textContent = "Tu as désamorcé toutes les mines.";
        } else {
            modalIcon.textContent = "💥";
            modalTitle.textContent = "BOOM !";
            modalMsg.textContent = "Tu as marché sur une mine.";
        }
    }, 800);
}

initGame();
