
        // --- CONFIGURATION ---
       const WIN_SCORE = 5;
        const GRAVITY = 0.15;       // Gravité très légère pour planer
        const FLAP_STRENGTH = -2.5; // Saut petit et doux (moins haut)
        const HORIZONTAL_SPEED = 0.7; // Vitesse initiale un peu plus rapide (était 0.25)
        const SPEED_INCREASE_FACTOR = 1.1; // Accélération de 10% à chaque rebond
        const BIRD_SIZE_PERCENT = 4;  // Approx taille oiseau en % largeur écran pour collisions

        // --- ETAT DU JEU ---
        let isPlaying = false;
        
        // Configuration Piques Murales
        const WALL_SPIKES_COUNT = 2; // Toujours peu d'obstacles

        const state = {
            y: 50, // % hauteur
            vy: 0,
            x: 50, // % largeur
            vx: HORIZONTAL_SPEED,
            score: 0,
            dead: false,
            element: document.getElementById('bird'),
            spikesContainer: document.getElementById('wall-spikes'),
            scoreEl: document.getElementById('score-bg'),
            walls: [] // {side: 'left'|'right', top: %, height: %}
        };

        // --- GENERATION DES MURS ---
        function generateWallSpikes() {
            state.walls = [];
            state.spikesContainer.innerHTML = '';
            
            // On crée des obstacles sur les murs gauche et droite
            ['left', 'right'].forEach(side => {
                for(let i=0; i<WALL_SPIKES_COUNT; i++) {
                    // Position aléatoire verticale (évite le tout début et toute fin)
                    const topPos = 15 + (Math.random() * 65); 
                    const height = 5 + (Math.random() * 5); // Hauteur très réduite (5-10%) pour plus d'espace libre
                    
                    const spike = document.createElement('div');
                    spike.className = 'spike';
                    spike.style.top = topPos + '%';
                    spike.style.height = height + '%';
                    spike.style.width = '15px'; 
                    
                    if(side === 'left') {
                        spike.style.left = '0';
                    } else {
                        spike.style.right = '0';
                    }

                    state.spikesContainer.appendChild(spike);
                    
                    state.walls.push({
                        side: side,
                        top: topPos,
                        bottom: topPos + height
                    });
                }
            });
        }

        // --- MOTEUR PHYSIQUE ---
        function updateGame() {
            if (!isPlaying || state.dead) return;

            // Gravité
            state.vy += GRAVITY;
            state.y += state.vy;

            // Mouvement Horizontal
            state.x += state.vx;

            // --- COLLISIONS SOL / PLAFOND ---
            // On calcule le % de hauteur de l'oiseau (30px) et des piques du sol (30px)
            const birdH = (30 / window.innerHeight) * 100;
            const floorH = (30 / window.innerHeight) * 100;
            
            // Sol: La position 100% est le bas. 
            // Si state.y (haut de l'oiseau) + birdH (hauteur oiseau) dépasse 100 - floorH
            if (state.y + birdH > 100 - floorH || state.y < 0) {
                die();
                return;
            }

            // --- COLLISIONS MURS & REBONDS ---
            // Mur Gauche
            if (state.x <= 0) {
                checkWallCollision('left');
            } 
            // Mur Droit (100% - largeur oiseau en %)
            else if (state.x >= 100 - BIRD_SIZE_PERCENT) { 
                checkWallCollision('right');
            }

            // Mise à jour visuelle
            state.element.style.top = state.y + '%';
            state.element.style.left = state.x + '%';

            requestAnimationFrame(updateGame);
        }

        function checkWallCollision(side) {
            // --- CORRECTION DE LA LOGIQUE DE COLLISION ---
            // On calcule la "Box" de l'oiseau en hauteur (%) pour être précis
            const birdHeightPx = 30;
            const birdHeightPercent = (birdHeightPx / window.innerHeight) * 100;
            
            const birdTop = state.y;
            const birdBottom = state.y + birdHeightPercent;

            let hitSpike = false;
            
            state.walls.forEach(wall => {
                if (wall.side === side) {
                    // Vérifie si la boîte de l'oiseau chevauche la boîte de la pique
                    // Logique d'intersection: (A.start < B.end) && (A.end > B.start)
                    if (birdTop < wall.bottom && birdBottom > wall.top) {
                        hitSpike = true;
                    }
                }
            });

            if (hitSpike) {
                die();
            } else {
                // Rebond réussi !
                // Inverse la direction ET augmente la vitesse
                state.vx = -state.vx * SPEED_INCREASE_FACTOR;
                
                // Pousse légèrement hors du mur pour éviter double collision
                if(side === 'left') state.x = 0.5;
                else state.x = 99 - BIRD_SIZE_PERCENT;

                // Score
                state.score++;
                state.scoreEl.innerText = state.score;

                // NOUVEAU : Changement de position des piques !
                generateWallSpikes();
                
                // Effet visuel
                state.element.style.boxShadow = "0 0 30px #fff"; 
                setTimeout(() => state.element.style.boxShadow = "", 150);

                // Check Victoire
                if (state.score >= WIN_SCORE) {
                    endGame(true);
                }
            }
        }

        function jump() {
            if (!isPlaying || state.dead) return;
            state.vy = FLAP_STRENGTH;
        }

        function die() {
            if(state.dead) return; // Évite double-mort
            state.dead = true;
            state.element.style.backgroundColor = 'var(--wire-red)';
            state.element.classList.add('node-pop');
            endGame(false);
        }

        function endGame(isVictory) {
            isPlaying = false;
            const ui = document.getElementById('ui-layer');
            const endMsg = document.getElementById('end-message');
            
            ui.classList.remove('hidden');
            // Reset animation
            ui.classList.remove('node-pop');
            void ui.offsetWidth; 
            ui.classList.add('node-pop');

            if (isVictory) {
                endMsg.innerText = "MISSION ACCOMPLIE !";
                endMsg.classList.remove('text-neon-red');
                endMsg.classList.add('text-neon-green');
            } else {
                endMsg.innerText = "SIGNAL PERDU...";
                endMsg.classList.remove('text-neon-green');
                endMsg.classList.add('text-neon-red');
            }
            endMsg.classList.remove('hidden');
        }

        function startGame() {
            // Reset State
            state.score = 0;
            state.scoreEl.innerText = "0";
            state.y = 50;
            state.vy = 0;
            state.x = 50;
            // Direction aléatoire au départ avec la vitesse initiale
            state.vx = (Math.random() > 0.5 ? 1 : -1) * HORIZONTAL_SPEED; 
            state.dead = false;
            state.element.style.backgroundColor = 'var(--neon-green)';
            state.element.classList.remove('node-pop'); // Reset pop class
            
            generateWallSpikes();

            document.getElementById('ui-layer').classList.add('hidden');
            isPlaying = true;
            requestAnimationFrame(updateGame);
        }

        // --- CONTROLES ---
        
        // Bouton Start
        const startBtn = document.getElementById('start-btn');
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche le clic de se propager au document (qui fait sauter)
            startGame();
        });
        
        // Tap n'importe où pour voler
        document.body.addEventListener('touchstart', (e) => {
            // Si on clique sur le bouton start, on ignore ici (géré par le listener bouton)
            if(e.target === startBtn) return;
            
            e.preventDefault(); // Stop zoom/scroll
            if(isPlaying) jump();
        }, {passive: false});

        document.body.addEventListener('mousedown', (e) => {
            if(e.target === startBtn) return;
            if(isPlaying) jump();
        });

        // Touche Espace pour PC
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if(isPlaying) jump();
                else if(!document.getElementById('ui-layer').classList.contains('hidden')) startGame();
            }
        });
