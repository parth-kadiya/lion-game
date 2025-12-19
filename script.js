// --- Game Configuration ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const UI = {
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    scoreEl: document.getElementById('scoreEl'),
    healthBar: document.getElementById('healthBar'),
    roarBar: document.getElementById('roarBar'),
    roarMsg: document.getElementById('roar-ready-msg'),
    finalScore: document.getElementById('finalScore'),
    startBtn: document.getElementById('startBtn'),
    restartBtn: document.getElementById('restartBtn')
};

// --- Images Loading ---
// Make sure lion.png and shredder.png are in the same folder
const lionImg = new Image();
lionImg.src = 'lion.png';

// 6 Alag-alag enemies images load karna
const enemyImages = {};
const directions = [
    'bottom-left', 'bottom-center', 'bottom-right', 
    'top-left', 'top-center', 'top-right'
];

directions.forEach(dir => {
    enemyImages[dir] = new Image();
    // Dhyan de: Folder ka naam 'Enimies' aapke screenshot ke hisab se hai
    enemyImages[dir].src = `Enimies/${dir}.png`; 
});

// Game State
let gameRunning = false;
let score = 0;
let animationId;
let frames = 0;
let difficultyMultiplier = 1;

// Dimensions
canvas.width = innerWidth;
canvas.height = innerHeight;

// Entities Arrays
let enemies = [];
let particles = [];

// --- Classes ---

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = 40; // Hitbox radius
        this.health = 100;
        this.roarPower = 0;
        this.maxRoar = 100;
    }

    draw() {
        // Draw Roar Aura if ready (Visual Effect behind the lion)
        if (this.roarPower >= this.maxRoar) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 25, 0, Math.PI * 2, false);
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(frames * 0.1) * 0.3})`;
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // Draw LION Image
        // Logic: Draw image centered on x,y. 
        // Size is slightly larger than hitbox (radius * 2.5) for better visual
        const size = this.radius * 4; 
        
        // If image is loaded, draw it. Otherwise fallback to circle just in case.
        if (lionImg.complete) {
            ctx.drawImage(lionImg, this.x - size/2, this.y - size/2, size, size);
        } else {
            // Fallback shape if image not found
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            ctx.fillStyle = '#f1c40f';
            ctx.fill();
        }
    }

    takeDamage() {
        this.health -= 15;
        UI.healthBar.style.width = Math.max(0, this.health) + '%';
        // Flash red
        canvas.style.backgroundColor = '#e74c3c';
        setTimeout(() => canvas.style.backgroundColor = '', 50);
        
        if (this.health <= 0) endGame();
    }

    chargeRoar(amount) {
        if (this.roarPower < this.maxRoar) {
            this.roarPower = Math.min(this.maxRoar, this.roarPower + amount);
            UI.roarBar.style.width = this.roarPower + '%';
            
            if (this.roarPower >= this.maxRoar) {
                UI.roarMsg.style.opacity = 1;
            }
        }
    }

    activateRoar() {
        if (this.roarPower >= this.maxRoar) {
            // Visual Wave
            particles.push(new Shockwave(this.x, this.y));
            
            // Kill all enemies within a large radius
            enemies.forEach((enemy, index) => {
                const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                if (dist < 400) { // Roar Radius
                    createExplosion(enemy.x, enemy.y, '#555'); // Explosion color
                    setTimeout(() => {
                        enemies.splice(index, 1);
                    }, 0);
                    score += 10;
                }
            });
            UI.scoreEl.innerText = score;

            // Reset Meter
            this.roarPower = 0;
            UI.roarBar.style.width = '0%';
            UI.roarMsg.style.opacity = 0;
        }
    }
}

class Enemy {
    constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 20; 
    
    // --- NAYA LOGIC: Sahi Image select karna ---
    let vPos = (this.y < canvas.height / 2) ? 'top' : 'bottom'; // Upar hai ya niche?
    let hPos = 'center'; // Default center maan lete hain

    // Screen ko 3 hisso me baant diya (Left, Center, Right)
    const oneThird = canvas.width / 3;

    if (this.x < oneThird) {
        hPos = 'left';
    } else if (this.x > oneThird * 2) {
        hPos = 'right';
    }

    // Image key set karna (e.g., 'top-left' ya 'bottom-center')
    this.imageKey = `${vPos}-${hPos}`;
    // -------------------------------------------

    this.velocity = { x: 0, y: 0 };
    
    // Baki velocity calculation same rahega...
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const speed = (1 + Math.random()) * difficultyMultiplier; 
    this.velocity.x = Math.cos(angle) * speed;
    this.velocity.y = Math.sin(angle) * speed;
}

    draw() {
    const size = this.radius * 3.5; // Image size thoda bada
    
    // Jo image key humne constructor me select ki thi, wo image nikalo
    const img = enemyImages[this.imageKey];

    if (img && img.complete) {
        ctx.drawImage(img, this.x - size/2, this.y - size/2, size, size);
    } else {
        // Agar image load nahi hui to purana circle dikhana (Backup)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = '#34495e';
        ctx.fill();
        
        // Eyes (Shadow look)
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 2, 3, 0, Math.PI*2);
        ctx.arc(this.x + 5, this.y - 2, 3, 0, Math.PI*2);
        ctx.fill();
    }
}

    update() {
        this.draw();
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}

class Particle {
    constructor(x, y, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 3 + 2;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.draw();
        this.velocity.x *= 0.98; // friction
        this.velocity.y *= 0.98;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.02;
    }
}

class Shockwave {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.alpha = 1;
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.strokeStyle = `rgba(241, 196, 15, ${this.alpha})`;
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.restore();
    }

    update() {
        this.radius += 15; // Expansion speed
        this.alpha -= 0.03;
        this.draw();
    }
}

// --- Initialization ---

let player = new Player();

function init() {
    score = 0;
    frames = 0;
    difficultyMultiplier = 1;
    player = new Player();
    enemies = [];
    particles = [];
    UI.scoreEl.innerText = score;
    UI.healthBar.style.width = '100%';
    UI.roarBar.style.width = '0%';
    UI.roarMsg.style.opacity = 0;
}

function spawnEnemies() {
    // Spawn rate increases over time
    const spawnRate = Math.max(30, 100 - Math.floor(score / 50)); 

    if (frames % spawnRate === 0) {
        const radius = 20;
        let x, y;
        
        // Randomly choose a side: 0=top, 1=right, 2=bottom, 3=left
        const side = Math.floor(Math.random() * 4);
        
        switch(side) {
            case 0: // Top
                x = Math.random() * canvas.width;
                y = 0 - radius;
                break;
            case 1: // Right
                x = canvas.width + radius;
                y = Math.random() * canvas.height;
                break;
            case 2: // Bottom
                x = Math.random() * canvas.width;
                y = canvas.height + radius;
                break;
            case 3: // Left
                x = 0 - radius;
                y = Math.random() * canvas.height;
                break;
        }
        
        enemies.push(new Enemy(x, y));
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(x, y, color, {
            x: (Math.random() - 0.5) * 6,
            y: (Math.random() - 0.5) * 6
        }));
    }
}

// --- Game Loop ---

function animate() {
    if (!gameRunning) return;
    
    animationId = requestAnimationFrame(animate);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Player
    player.draw();

    // Update Particles
    particles.forEach((particle, index) => {
        if (particle.alpha <= 0) {
            particles.splice(index, 1);
        } else {
            particle.update();
        }
    });

    // Update Enemies
    enemies.forEach((enemy, index) => {
        enemy.update();

        // Collision: Enemy hits Player
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        
        // Hitbox detection (Player radius + Enemy radius)
        if (dist - enemy.radius - player.radius < 1) {
            player.takeDamage();
            createExplosion(enemy.x, enemy.y, '#e74c3c'); // Blood/Damage color
            enemies.splice(index, 1);
        }
    });

    spawnEnemies();
    
    // Increase difficulty slowly
    if (frames % 500 === 0) {
        difficultyMultiplier += 0.1;
    }
    
    frames++;
}

// --- Interaction Handling ---

function handleInput(clientX, clientY) {
    if (!gameRunning) return;

    let hitEnemy = false;

    // Check click on Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const dist = Math.hypot(clientX - enemy.x, clientY - enemy.y);

        // Click radius slightly larger than enemy visual radius
        if (dist < enemy.radius + 20) {
            // Kill Enemy
            createExplosion(enemy.x, enemy.y, '#f1c40f'); // Gold spark
            enemies.splice(i, 1);
            
            score += 10;
            UI.scoreEl.innerText = score;
            
            // Charge Roar
            player.chargeRoar(10);
            
            hitEnemy = true;
            break; 
        }
    }

    // Check click on Player (To trigger Roar)
    if (!hitEnemy) {
        const distToPlayer = Math.hypot(clientX - player.x, clientY - player.y);
        if (distToPlayer < player.radius + 10) {
            player.activateRoar();
        }
    }
}

window.addEventListener('mousedown', (e) => {
    handleInput(e.clientX, e.clientY);
});

window.addEventListener('touchstart', (e) => {
    // e.preventDefault();
    const touch = e.touches[0];
    handleInput(touch.clientX, touch.clientY);
});

// --- Window Resize Handling ---
window.addEventListener('resize', () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    if(player) {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
    }
});

// --- Game Flow Control ---

function startGame() {
    init();
    gameRunning = true;
    UI.startScreen.classList.remove('active');
    UI.gameOverScreen.classList.remove('active');
    animate();
}

function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    UI.finalScore.innerText = "Score: " + score;
    UI.gameOverScreen.classList.add('active');
}

// Button Listeners
UI.startBtn.addEventListener('click', startGame);
UI.restartBtn.addEventListener('click', startGame);