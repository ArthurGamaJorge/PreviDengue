import { CONFIG } from './config.js';
import { UIManager } from './ui.js';
import { Tower, Enemy, Projectile } from './game_objects.js';

class Game {
    constructor() {
        this.canvasContainer = document.getElementById('game-canvas-container');
        this.canvas = document.createElement('canvas');
        this.canvasContainer.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.tileSize = CONFIG.GAME.TILE_SIZE;
        this.canvas.width = 18 * this.tileSize;
        this.canvas.height = 12 * this.tileSize;

        this.player = { lives: CONFIG.GAME.STARTING_LIVES, resources: CONFIG.GAME.STARTING_RESOURCES };
        this.path = CONFIG.PATH;
        this.grid = this.createGrid();
        
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.effects = [];

        this.waveNumber = 0;
        this.waveInProgress = false;
        this.isGameOver = false;
        
        this.uiManager = new UIManager(this);
        this.uiManager.updateStats();

        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        this.gameLoop = this.gameLoop.bind(this);
    }

    createGrid() {
        return Array.from({ length: this.canvas.height / this.tileSize }, () => 
            Array.from({ length: this.canvas.width / this.tileSize }, (v, i) => ({ isOccupied: this.isPathTile(i, v) }))
        );
    }

    isPathTile(gridX, gridY) {
        return this.path.some(p => p.x === gridX && p.y === gridY);
    }
    
    start() {
        this.gameLoop();
    }

    startNextWave() {
        if (this.waveInProgress) return;
        this.waveInProgress = true;
        this.waveNumber++;
        this.uiManager.updateWaveButton(true);

        const waveConfig = CONFIG.WAVES[Math.min(this.waveNumber - 1, CONFIG.WAVES.length - 1)];
        for (let i = 0; i < waveConfig.count; i++) {
            setTimeout(() => {
                if (this.isGameOver) return;
                const enemy = new Enemy(waveConfig, this);
                this.enemies.push(enemy);
            }, i * CONFIG.GAME.ENEMY_SPAWN_INTERVAL);
        }
        
        this.uiManager.updateStats();
    }

    placeTower(gridX, gridY, type) {
        if (gridY < 0 || gridY >= this.grid.length || gridX < 0 || gridX >= this.grid[0].length) return false;
        if (this.grid[gridY][gridX].isOccupied) return false;

        const towerConfig = CONFIG.TOWERS[type];
        if (this.player.resources >= towerConfig.cost) {
            this.player.resources -= towerConfig.cost;
            this.towers.push(new Tower(gridX, gridY, type, this));
            this.grid[gridY][gridX].isOccupied = true;
            this.uiManager.updateStats();
            return true;
        }
        return false;
    }

    activatePower(type) {
        const powerConfig = CONFIG.POWERS[type];
        if (this.player.resources >= powerConfig.cost) {
            this.player.resources -= powerConfig.cost;
            powerConfig.action(this);
            this.uiManager.updateStats();
        }
    }

    enemyReachedEnd(enemy) {
        this.player.lives--;
        this.uiManager.updateStats();
        this.removeEnemy(enemy);
        if (this.player.lives <= 0 && !this.isGameOver) {
            this.gameOver();
        }
    }

    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) this.enemies.splice(index, 1);
    }
    
    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }
    
    removeProjectile(projectile) {
        const index = this.projectiles.indexOf(projectile);
        if (index > -1) this.projectiles.splice(index, 1);
    }

    gameOver() {
        this.isGameOver = true;
        this.uiManager.showGameOverScreen();
    }

    checkWaveEnd() {
        if (this.waveInProgress && this.enemies.length === 0) {
            this.waveInProgress = false;
            this.player.resources += CONFIG.GAME.WAVE_BONUS_BASE + this.waveNumber * CONFIG.GAME.WAVE_BONUS_INCREMENT;
            this.uiManager.updateWaveButton(false);
            this.uiManager.updateStats();
        }
    }
    
    handleResize() {
        const containerWidth = this.canvasContainer.offsetWidth;
        const containerHeight = this.canvasContainer.offsetHeight;
        const canvasAspectRatio = this.canvas.width / this.canvas.height;
        
        let newWidth = containerWidth;
        let newHeight = containerWidth / canvasAspectRatio;

        if (newHeight > containerHeight) {
            newHeight = containerHeight;
            newWidth = containerHeight * canvasAspectRatio;
        }

        this.canvas.style.width = `${newWidth}px`;
        this.canvas.style.height = `${newHeight}px`;
    }

    gameLoop() {
        if (this.isGameOver) return;
        
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }

    update() {
        this.towers.forEach(t => t.update(this.enemies));
        this.enemies.forEach(e => e.update());
        this.projectiles.forEach(p => p.update());
        this.checkWaveEnd();
    }

    draw() {
        this.ctx.fillStyle = '#181818';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#282828';
        this.path.forEach(p => this.ctx.fillRect(p.x * this.tileSize, p.y * this.tileSize, this.tileSize, this.tileSize));

        this.towers.forEach(t => t.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));
        
        this.uiManager.drawPlacementGrid();
    }
}

window.addEventListener('load', () => {
    const game = new Game();
    game.start();
});