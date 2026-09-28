
// initialze imgs to indicate evehicles and obstecles 
const GAME_IMAGES = Object.fromEntries(Object.entries({

    van: 'e-van.png',
    bakkie: 'e-bakkie.png',
    scooter: 'e-scooter.png',
    solar: 'solar.png',
    livestock: 'livestock.png',
    construction: 'construction.png'

}).map(([name, source]) => {
    const image = new Image();
    image.src = source;
    return [name, image];

}));

//define evs 
const VEHICLE_TYPES = {

    van: { name: 'e-Cargo Van', maxSpeed: 4.8, accel: 0.12, drag: 0.96, batteryCap: 100, drainRate: 0.035, width: 120, height: 170, color: '#f59e0b', image: 'van', imageRotation: -Math.PI / 2 },
    bakkie: { name: 'Solar Bakkie', maxSpeed: 4.0, accel: 0.10, drag: 0.95, batteryCap: 120, drainRate: 0.028, width: 145, height: 175, color: '#10b981', image: 'bakkie', imageRotation: 0 },
    scooter: { name: 'e-Scooter', maxSpeed: 5.6, accel: 0.18, drag: 0.97, batteryCap: 70, drainRate: 0.045, width: 140, height: 180, color: '#06b6d4', image: 'scooter', imageRotation: 0 }
};

// evs movements, battery + drawings
class Player {

    constructor(x, y, cfg) {

        this.x = x;
        this.y = y;
        this.angle = -Math.PI / 2;
        this.speed = 0;

        this.maxSpeed = cfg.maxSpeed;
        this.accel = cfg.accel;
        this.drag = cfg.drag;
        this.maxBattery = cfg.batteryCap;
        this.battery = cfg.batteryCap;
        this.drainRate = cfg.drainRate;

        this.width = cfg.width;
        this.height = cfg.height;
        this.color = cfg.color;
        this.image = GAME_IMAGES[cfg.image];
        this.imageRotation = cfg.imageRotation;

    }

    
    update(keys) {
        if (keys.left) this.angle -= 0.055;
        if (keys.right) this.angle += 0.055;

        if (keys.up) {
            this.speed = Math.min(this.maxSpeed, this.speed + this.accel);
            this.battery = Math.max(0, this.battery - this.drainRate);
        } else if (keys.down) {
            this.speed = Math.max(-this.maxSpeed * 0.4, this.speed - this.accel * 0.8);
            this.battery = Math.max(0, this.battery - this.drainRate * 0.5);
        } else {
            this.speed *= this.drag;
        }

        // trig+vect
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2 + this.imageRotation);
        if (this.image.complete && this.image.naturalWidth > 0) {
            const isLandscape = this.imageRotation !== 0;
            const drawWidth = isLandscape ? this.height : this.width;
            const drawHeight = isLandscape ? this.width : this.height;
            ctx.drawImage(this.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 6);
            ctx.fill();
        }

        ctx.restore();
    }
}

// locations of different places on map
class Hub {
    constructor(x, y, name, isMain) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.radius = 70;
        this.isMain = isMain;
    }

    draw(ctx, deliveryTarget) {
        const isTarget = deliveryTarget && deliveryTarget.hub === this;

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = isTarget ? 'rgba(245, 158, 11, 0.25)' : 'rgba(30, 41, 59, 0.4)';
        ctx.fill();
        ctx.strokeStyle = isTarget ? '#f59e0b' : '#64748b';
        ctx.lineWidth = isTarget ? 4 : 2;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('HUB', this.x, this.y + 4);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 14px Outfit';
        ctx.fillText(this.name, this.x, this.y - this.radius - 8);

        ctx.restore();
    }
}

// charge stations+grid
class ChargingStation {
    constructor(x, y, isSolar) {
        this.x = x;
        this.y = y;
        this.isSolar = isSolar;
        this.radius = 55;
    }

    draw(ctx, stage) {
        const isActive = this.isSolar || (stage < 4);

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? (this.isSolar ? 'rgba(16, 185, 129, 0.2)' : 'rgba(14, 165, 233, 0.2)') : 'rgba(239, 68, 68, 0.15)';
        ctx.fill();
        ctx.strokeStyle = isActive ? (this.isSolar ? '#10b981' : '#0ea5e9') : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        const solarImage = GAME_IMAGES.solar;
        if (this.isSolar && solarImage.complete && solarImage.naturalWidth > 0) {
            ctx.drawImage(solarImage, this.x - 28, this.y - 28, 56, 56);
        } else {
            ctx.fillStyle = isActive ? (this.isSolar ? '#10b981' : '#0ea5e9') : '#ef4444';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px Outfit';
        ctx.fillText(this.isSolar ? 'SOLAR MICROGRID' : (isActive ? 'GRID CHARGER' : 'OFFLINE (BLACKOUT)'), this.x, this.y + this.radius + 12);

        ctx.restore();
    }
}

// obstecles effects on evs
class Obstacle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = type === 'tree' ? 26 : (type === 'flood' ? 38 : 20);
    }

    onHit(player) {
        if (this.type === 'pothole') {
            player.speed *= 0.6;
            player.battery -= 0.1;
        } else if (this.type === 'tree') {
            player.speed = -player.speed * 0.5;
            player.battery -= 1.0;
        } else if (this.type === 'wildlife') {
            player.speed *= 0.3;
        } else if (this.type === 'flood') {
            player.speed *= 0.5;
            player.battery -= 0.2;
        } else if (this.type === 'construction') {
            player.speed *= 0.4;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        if (this.type === 'pothole') {
            ctx.fillStyle = '#1c1917';
            ctx.fill();
            ctx.strokeStyle = '#44403c';
            ctx.stroke();
        } else if (this.type === 'tree') {
            ctx.fillStyle = '#15803d';
            ctx.fill();
            ctx.strokeStyle = '#166534';
            ctx.stroke();
        } else if (this.type === 'wildlife') {
            const image = GAME_IMAGES.livestock;
            if (image.complete && image.naturalWidth > 0) {
                ctx.drawImage(image, this.x - 24, this.y - 24, 48, 48);
            } else {
                ctx.fillStyle = '#b45309';
                ctx.fill();
            }
        } else if (this.type === 'flood') {
            ctx.fillStyle = 'rgba(2, 132, 199, 0.4)';
            ctx.fill();
            ctx.strokeStyle = '#0284c7';
            ctx.stroke();
        } else if (this.type === 'construction') {
            const image = GAME_IMAGES.construction;
            if (image.complete && image.naturalWidth > 0) {
                ctx.drawImage(image, this.x - 32, this.y - 32, 64, 64);
            } else {
                ctx.fillStyle = '#d97706';
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

// to indicate that ev is charging animate
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.life = 1.0;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.04;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.restore();
    }
}

// canvas space setup bg+ all components
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.selectedVehicleType = 'van';
        this.isPaused = false;
        this.isRunning = false;

        this.worldWidth = 3200;
        this.worldHeight = 3200;
        this.terrainImage = new Image();
        this.terrainImage.src = 'background.jpg';

        this.camera = { x: 0, y: 0, width: 0, height: 0 };

        this.player = null;
        this.hubs = [];
        this.chargingStations = [];
        this.obstacles = [];
        this.particles = [];

        this.totalDistance = 0;
        this.deliveriesCompleted = 0;
        this.earnings = 0;
        this.highScore = parseInt(localStorage.getItem('ecodash_highscore') || '0');

        this.currentDeliveryTarget = null;
        this.hasCargo = false;

        this.keys = { up: false, down: false, left: false, right: false };

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupControls();
        this.initWorld();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.width = this.canvas.width;
        this.camera.height = this.canvas.height;
    }

    // controls (wasd as alt for arrow keys)
    setupControls() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                if (this.isRunning) togglePause();
            }
            if (!this.isRunning || this.isPaused) return;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = true;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = true;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
        });

        const bindTouch = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[key] = true; });
            el.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[key] = false; });
        };
        bindTouch('touchAccel', 'up');
        bindTouch('touchBrake', 'down');
        bindTouch('touchLeft', 'left');
        bindTouch('touchRight', 'right');
    }

    // reset for user choosing to restart + change task
    initWorld() {
        const cfg = VEHICLE_TYPES[this.selectedVehicleType];
        const horizontalScale = this.worldWidth / 3200;
        this.player = new Player(1600 * horizontalScale, 1600, cfg);

        this.hubs = [
            new Hub(1600 * horizontalScale, 1500, 'Joburg Central Hub', true),
            new Hub(600 * horizontalScale, 2600, 'Cape Town Logistics', false),
            new Hub(2700 * horizontalScale, 1800, 'Durban Harbor Hub', false),
            new Hub(1000 * horizontalScale, 800, 'Pretoria Solar Hub', false),
            new Hub(2200 * horizontalScale, 800, 'Polokwane Gateway', false)
        ];

        this.chargingStations = [
            new ChargingStation(1400 * horizontalScale, 1300, true),
            new ChargingStation(1800 * horizontalScale, 1700, false),
            new ChargingStation(800 * horizontalScale, 2400, true),
            new ChargingStation(2500 * horizontalScale, 1600, false),
            new ChargingStation(1200 * horizontalScale, 1000, true),
            new ChargingStation(2000 * horizontalScale, 900, false)
        ];

        this.obstacles = [];
        for (let i = 0; i < 90; i++) {
            const rx = 200 + Math.random() * (this.worldWidth - 400);
            const ry = 200 + Math.random() * (this.worldHeight - 400);

            if (Math.hypot(rx - this.player.x, ry - this.player.y) < 250) continue;

            const types = ['pothole', 'tree', 'wildlife', 'flood', 'construction'];
            const chosenType = types[Math.floor(Math.random() * types.length)];
            this.obstacles.push(new Obstacle(rx, ry, chosenType));
        }

        this.totalDistance = 0;
        this.deliveriesCompleted = 0;
        this.earnings = 0;
        this.assignNextCargo();
    }

    assignNextCargo() {
        if (!this.hasCargo) {
            const availableHubs = this.hubs;
            const hub = availableHubs[Math.floor(Math.random() * availableHubs.length)];
            this.currentDeliveryTarget = { type: 'pickup', hub: hub };
            document.getElementById('objectiveText').innerText = `Pickup Cargo at ${hub.name}`;
        } else {
            const possibleTargets = this.hubs.filter(h => h !== this.currentDeliveryTarget.hub);
            const hub = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
            this.currentDeliveryTarget = { type: 'dropoff', hub: hub };
            document.getElementById('objectiveText').innerText = `Deliver Package to ${hub.name}`;
        }
    }

    // movement,obstcles,charging+ deliveries.
    update() {
        if (!this.isRunning || this.isPaused || !this.player) return;

        const prevX = this.player.x;
        const prevY = this.player.y;

        this.player.update(this.keys);

        const distStep = Math.hypot(this.player.x - prevX, this.player.y - prevY) / 1000;
        this.totalDistance += distStep;

        this.player.x = Math.max(50, Math.min(this.worldWidth - 50, this.player.x));
        this.player.y = Math.max(50, Math.min(this.worldHeight - 50, this.player.y));

        this.camera.x = this.player.x - this.camera.width / 2;
        this.camera.y = this.player.y - this.camera.height / 2;

        if (this.player.battery <= 0) {
            this.gameOver("BATTERY EXHAUSTED", "Your EV ran out of charge.");
            return;
        }

        this.chargingStations.forEach(cs => {
            if (Math.hypot(this.player.x - cs.x, this.player.y - cs.y) < cs.radius) {
                if (this.player.battery < this.player.maxBattery) {
                    this.player.battery = Math.min(this.player.maxBattery, this.player.battery + 0.25);
                    this.particles.push(new Particle(cs.x + (Math.random() - 0.5) * 30, cs.y + (Math.random() - 0.5) * 30, '#10b981'));
                }
            }
        });

        this.obstacles.forEach(obs => {
            const dist = Math.hypot(this.player.x - obs.x, this.player.y - obs.y);
            if (dist < obs.radius + this.player.width / 2) {
                obs.onHit(this.player);
            }
        });

        if (this.currentDeliveryTarget) {
            const targetHub = this.currentDeliveryTarget.hub;
            const distToHub = Math.hypot(this.player.x - targetHub.x, this.player.y - targetHub.y);
            if (distToHub < targetHub.radius) {
                if (this.currentDeliveryTarget.type === 'pickup') {
                    this.hasCargo = true;
                    this.assignNextCargo();
                } else if (this.currentDeliveryTarget.type === 'dropoff') {
                    this.hasCargo = false;
                    this.deliveriesCompleted++;
                    const reward = Math.floor(250 + Math.random() * 150);
                    this.earnings += reward;
                    this.assignNextCargo();
                }
            }
        }

        this.particles.forEach((p, index) => {
            p.update();
            if (p.life <= 0) this.particles.splice(index, 1);
        });

        this.updateHUD();
    }

    // update hud
    updateHUD() {
        if (!this.player) return;
        const batPct = Math.max(0, Math.floor((this.player.battery / this.player.maxBattery) * 100));
        document.getElementById('batteryPctText').innerText = `${batPct}%`;

        const batBar = document.getElementById('batteryBar');
        batBar.style.setProperty('--battery-pct', `${batPct}%`);

        batBar.classList.remove('battery-low', 'battery-medium', 'battery-high');
        if (batPct < 25) {
            batBar.classList.add('battery-low');
        } else if (batPct < 50) {
            batBar.classList.add('battery-medium');
        } else {
            batBar.classList.add('battery-high');
        }

        const speedKm = Math.floor(this.player.speed * 20);
        document.getElementById('speedVal').innerHTML = `${speedKm} <span class="unit-text">km/h</span>`;
        document.getElementById('distVal').innerHTML = `${this.totalDistance.toFixed(1)} <span class="unit-text">km</span>`;
        document.getElementById('deliveriesVal').innerText = this.deliveriesCompleted;
        document.getElementById('earningsVal').innerText = `R ${this.earnings}`;

    }

    // Draw the visible world through the player-following camera.
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const maxCameraX = Math.max(0, this.worldWidth - this.canvas.width);
        const maxCameraY = Math.max(0, this.worldHeight - this.canvas.height);
        this.camera.x = this.player
            ? Math.max(0, Math.min(maxCameraX, this.player.x - this.canvas.width / 2))
            : 0;
        this.camera.y = this.player
            ? Math.max(0, Math.min(maxCameraY, this.player.y - this.canvas.height / 2))
            : 0;
        const offsetX = Math.max(0, (this.canvas.width - this.worldWidth) / 2);
        const offsetY = Math.max(0, (this.canvas.height - this.worldHeight) / 2);
        this.ctx.save();
        this.ctx.translate(offsetX - this.camera.x, offsetY - this.camera.y);

        this.drawTerrain();
        this.drawRoads();

        this.chargingStations.forEach(cs => cs.draw(this.ctx));
        this.hubs.forEach(hub => hub.draw(this.ctx, this.currentDeliveryTarget));
        this.obstacles.forEach(obs => obs.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));

        if (this.player) {
            this.player.draw(this.ctx);
        }

        this.ctx.restore();
    }

    // Tile the terrain image across the world map.
    drawTerrain() {
        const tileSize = 512;
        if (this.terrainImage.complete && this.terrainImage.naturalWidth > 0) {
            for (let x = 0; x < this.worldWidth; x += tileSize) {
                for (let y = 0; y < this.worldHeight; y += tileSize) {
                    this.ctx.drawImage(
                        this.terrainImage,
                        x,
                        y,
                        Math.min(tileSize, this.worldWidth - x),
                        Math.min(tileSize, this.worldHeight - y)
                    );
                }
            }
            return;
        }

        this.ctx.fillStyle = '#56733a';
        this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
    }

    // Draw the connected road network beneath map objects.
    drawRoads() {
        this.ctx.save();
        this.ctx.scale(this.worldWidth / 3200, 1);
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 70;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(1600, 1500);
        this.ctx.lineTo(600, 2600);
        this.ctx.lineTo(2700, 1800);
        this.ctx.lineTo(1600, 1500);
        this.ctx.lineTo(1000, 800);
        this.ctx.lineTo(2200, 800);
        this.ctx.stroke();

        this.ctx.restore();
    }

    // Save the best revenue and display the final results.
    gameOver(title, subtext) {
        this.isRunning = false;

        if (this.earnings > this.highScore) {
            this.highScore = this.earnings;
            localStorage.setItem('ecodash_highscore', this.highScore.toString());
        }

        document.getElementById('gameOverTitle').innerText = title;
        document.getElementById('gameOverSub').innerText = subtext;
        document.getElementById('goEarnings').innerText = `R ${this.earnings}`;
        document.getElementById('goDeliveries').innerText = this.deliveriesCompleted;
        document.getElementById('goDistance').innerText = `${this.totalDistance.toFixed(1)} km`;
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
}

// game creation + link to index actions to btns and ev options
let game = new Game();

function selectVehicle(type) {
    game.selectedVehicleType = type;
    ['btnVan', 'btnBakkie', 'btnScooter'].forEach(id => {
        const el = document.getElementById(id);
        el.className = 'vehicle-option';
    });
    const activeId = type === 'van' ? 'btnVan' : (type === 'bakkie' ? 'btnBakkie' : 'btnScooter');
    document.getElementById(activeId).className = 'vehicle-option selected';
}

function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    game.initWorld();
    game.isRunning = true;
    game.isPaused = false;
}

function togglePause() {
    game.isPaused = !game.isPaused;
    if (game.isPaused) {
        document.getElementById('pauseScreen').classList.remove('hidden');
    } else {
        document.getElementById('pauseScreen').classList.add('hidden');
    }
}

function restartGame() {
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    game.initWorld();
    game.isRunning = true;
    game.isPaused = false;
}

function goToIndex() {
    game.isRunning = false;
    game.isPaused = false;
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('highScoreText').innerText = `R ${game.highScore}`;
}

// update 
function gameLoop() {
    game.update();
    game.render();
    requestAnimationFrame(gameLoop);
}

document.getElementById('highScoreText').innerText = `R ${game.highScore}`;

window.onload = () => {
    gameLoop();
};
