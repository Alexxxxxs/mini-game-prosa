// TAILWIND CONFIG
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'term-bg': '#0a0a0a',      // Fond noir terminal
                'term-green': '#33ff00',   // Vert Phosphore
                'term-red': '#ff3300',     // Rouge Alerte
                'term-dim': '#1a4d1a',     // Vert sombre
                'glass': 'rgba(255, 255, 255, 0.05)',
            },
            fontFamily: {
                'tech': ['"Share Tech Mono"', 'monospace'],
            },
            boxShadow: {
                'glow-green': '0 0 10px #33ff00',
                'glow-red': '0 0 10px #ff3300',
                'screen-inset': 'inset 0 0 50px rgba(0, 0, 0, 0.8)',
            },
            textShadow: {
                'neon': '0 0 5px currentColor',
            },
            animation: {
                'blink-led': 'blink 1s infinite',
            },
            keyframes: {
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.3' },
                }
            }
        }
    }
}

const game = {
    level: 1,
    maxLevels: 3,
    sequence: [],
    playerSequence: [],
    canClick: false,
    baseSeqLength: 3, // Longueur de départ (Niveau 1 = 4 chiffres)

    start: function () {
        this.level = 1;
        this.showScreen('screen-memory');
        document.getElementById('system-status').innerText = "DÉCRYPTAGE EN COURS...";
        document.getElementById('main-led').style.backgroundColor = "yellow";
        this.initLevel();
    },

    showScreen: function (id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    updateProgress: function () {
        // Calculer le pourcentage basé sur le niveau actuel
        const pct = ((this.level - 1) / this.maxLevels) * 100;
        document.getElementById('progress-fill').style.width = pct + '%';
    },

    initLevel: function () {
        // Mise à jour de l'interface
        document.getElementById('level-title').innerText = `NIVEAU DE SÉCURITÉ ${this.level}/${this.maxLevels}`;
        this.updateProgress();

        // Génération du clavier (une seule fois ou refresh si besoin, ici simple refresh pour être sûr)
        const grid = document.getElementById('keypad');
        grid.innerHTML = '';
        for (let i = 1; i <= 9; i++) {
            let btn = document.createElement('div');
            btn.className = 'key-btn';
            btn.innerText = i;
            btn.dataset.id = i; // IDs de 1 à 9 pour l'affichage
            btn.onclick = (e) => this.handleInput(i, e.target);
            grid.appendChild(btn);
        }

        // Génération de la séquence
        // Niveau 1 = 4 chiffres, Niveau 2 = 5, Niveau 3 = 6
        const currentLength = this.baseSeqLength + this.level;
        this.sequence = [];
        for (let i = 0; i < currentLength; i++) {
            // Chiffres entre 1 et 9
            this.sequence.push(Math.floor(Math.random() * 9) + 1);
        }

        this.playerSequence = [];
        document.getElementById('mem-log').innerText = "CALCUL DE LA SÉQUENCE...";
        document.getElementById('mem-log').style.color = "#aaa";

        setTimeout(() => this.playSequence(), 1000);
    },

    playSequence: async function () {
        this.canClick = false;
        const buttons = document.querySelectorAll('.key-btn');

        // Petit délai avant de commencer
        await new Promise(r => setTimeout(r, 500));

        for (let i = 0; i < this.sequence.length; i++) {
            const num = this.sequence[i];
            // Trouver le bouton qui a ce chiffre
            // Note: querySelectorAll renvoie une NodeList, l'ordre est celui du DOM (1 à 9)
            // Donc index = num - 1
            const btn = buttons[num - 1];

            btn.classList.add('flash');
            // Son "bip" simulé visuellement

            await new Promise(r => setTimeout(r, 500)); // Durée allumage
            btn.classList.remove('flash');
            await new Promise(r => setTimeout(r, 200)); // Pause entre clignotements
        }

        this.canClick = true;
        document.getElementById('mem-log').innerText = "ENTREZ LE CODE";
        document.getElementById('mem-log').style.color = "var(--text-color)";
    },

    handleInput: function (number, btnEl) {
        if (!this.canClick) return;

        // Feedback visuel clic
        btnEl.classList.add('flash');
        setTimeout(() => btnEl.classList.remove('flash'), 150);

        this.playerSequence.push(number);

        // Vérification immédiate à chaque clic
        const currentIndex = this.playerSequence.length - 1;

        if (this.playerSequence[currentIndex] !== this.sequence[currentIndex]) {
            this.failLevel();
        } else {
            // Si la séquence est complète et correcte
            if (this.playerSequence.length === this.sequence.length) {
                this.completeLevel();
            }
        }
    },

    failLevel: function () {
        this.canClick = false;
        document.getElementById('mem-log').innerText = "ERREUR DE SYNCHRONISATION !";
        document.getElementById('mem-log').style.color = "var(--alert-color)";

        // Flash rouge sur tout le keypad
        const btns = document.querySelectorAll('.key-btn');
        btns.forEach(b => b.classList.add('error'));

        setTimeout(() => {
            btns.forEach(b => b.classList.remove('error'));
            document.getElementById('mem-log').innerText = "Réinitialisation du niveau...";
            document.getElementById('mem-log').style.color = "#aaa";
            this.playerSequence = [];
            // On relance la séquence après un délai
            setTimeout(() => this.playSequence(), 1500);
        }, 800);
    },

    completeLevel: function () {
        this.canClick = false;
        document.getElementById('mem-log').innerText = "CODE CORRECT.";
        document.getElementById('mem-log').style.color = "var(--text-color)";

        if (this.level < this.maxLevels) {
            // Passer au niveau suivant
            setTimeout(() => {
                this.level++;
                this.initLevel();
            }, 1500);
        } else {
            // Jeu terminé
            setTimeout(() => {
                document.getElementById('progress-fill').style.width = '100%';
                this.victory();
            }, 1000);
        }
    },

    victory: function () {
        document.getElementById('system-status').innerText = "EN LIGNE";
        document.getElementById('system-status').style.color = "var(--text-color)";
        document.getElementById('main-led').classList.remove('blink'); // Si on avait une classe blink
        document.getElementById('main-led').classList.add('online');
        this.showScreen('screen-success');
    }
};