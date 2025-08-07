import { CONFIG } from './config.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.healthBar = document.getElementById('health-bar');
        this.healthValue = document.getElementById('health-value');
        this.waveDisplay = document.getElementById('wave-display');
        this.resourcesDisplay = document.getElementById('resources-display');
        this.startWaveBtn = document.getElementById('start-wave-btn');
        
        this.draggedItem = null;
        this.draggedItemGhost = null;
        this.lastGridPos = { x: -1, y: -1 };

        this.initShop();
        this.initModal();
        this.initListeners();
    }
    
    initShop() {
        const defensesPanel = document.getElementById('defenses-list');
        for (const type in CONFIG.TOWERS) {
            this.createShopItem(defensesPanel, type, CONFIG.TOWERS[type], true);
        }

        const powersPanel = document.getElementById('powers-list');
        for (const type in CONFIG.POWERS) {
            this.createShopItem(powersPanel, type, CONFIG.POWERS[type], false);
        }
    }

    createShopItem(panel, type, config, isDraggable) {
        const item = document.createElement('div');
        item.className = isDraggable ? 'shop-item draggable' : 'shop-item power';
        item.dataset.type = type;
        
        if (isDraggable) {
             item.innerHTML = `
                <span class="item-icon">${config.icon}</span>
                <div class="item-details">
                    <div class="name">${config.name}</div>
                    <div class="description">${config.description}</div>
                </div>
                <div class="item-info">
                    <div class="cost">💰 ${config.cost}</div>
                </div>
                <button class="info-button">i</button>`;
        } else {
             item.innerHTML = `
                <span class="item-icon">${config.icon}</span>
                <div class="name">${config.name}</div>
                <div class="cost">💰 ${config.cost}</div>`;
        }
        panel.appendChild(item);

        if (isDraggable) {
            item.addEventListener('mousedown', (e) => this.startDrag(e, type, config));
        } else {
            item.addEventListener('click', () => this.game.activatePower(type));
        }
        
        const infoButton = item.querySelector('.info-button');
        if(infoButton) {
            infoButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showModal(type, config);
            });
        }
    }

    updateStats() {
        this.waveDisplay.textContent = this.game.waveNumber;
        this.resourcesDisplay.textContent = `💰 ${this.game.player.resources}`;
        
        const healthPercentage = (this.game.player.lives / CONFIG.GAME.STARTING_LIVES) * 100;
        this.healthBar.style.width = `${healthPercentage}%`;
        this.healthValue.textContent = `${this.game.player.lives}/${CONFIG.GAME.STARTING_LIVES}`;
    }

    updateWaveButton(isWaveInProgress) {
        this.startWaveBtn.disabled = isWaveInProgress;
    }

    startDrag(e, type, config) {
        if (this.game.player.resources < config.cost) return;
        if (e.target.tagName === 'BUTTON') return;

        this.draggedItem = { type, config };
        this.draggedItemGhost = document.createElement('span');
        this.draggedItemGhost.className = 'dragging';
        this.draggedItemGhost.innerText = config.icon;
        document.body.appendChild(this.draggedItemGhost);

        this.moveDrag(e);
        
        this._onDragMove = (e) => this.moveDrag(e);
        this._onDragEnd = (e) => this.endDrag(e);
        document.addEventListener('mousemove', this._onDragMove);
        document.addEventListener('mouseup', this._onDragEnd, { once: true });
    }

    moveDrag(e) {
        if (!this.draggedItemGhost) return;
        this.draggedItemGhost.style.left = `${e.clientX - 24}px`;
        this.draggedItemGhost.style.top = `${e.clientY - 24}px`;
        
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const gridX = Math.floor(x / this.game.tileSize);
        const gridY = Math.floor(y / this.game.tileSize);
        
        if (gridX !== this.lastGridPos.x || gridY !== this.lastGridPos.y) {
            this.lastGridPos = { x: gridX, y: gridY };
        }
    }
    
    endDrag(e) {
        document.removeEventListener('mousemove', this._onDragMove);
        document.body.removeChild(this.draggedItemGhost);
        
        const gridX = this.lastGridPos.x;
        const gridY = this.lastGridPos.y;

        if (this.draggedItem && gridX >= 0 && gridY >= 0) {
           this.game.placeTower(gridX, gridY, this.draggedItem.type);
        }
        
        this.draggedItem = null;
        this.draggedItemGhost = null;
        this.lastGridPos = { x: -1, y: -1 };
    }
    
    drawPlacementGrid() {
        if (!this.draggedItem) return;
        
        const gridX = this.lastGridPos.x;
        const gridY = this.lastGridPos.y;
        
        if (gridX < 0 || gridY < 0 || gridY >= this.game.grid.length || gridX >= this.game.grid[0].length) return;

        const { ctx, tileSize } = this.game;
        const x = gridX * tileSize;
        const y = gridY * tileSize;
        
        ctx.globalAlpha = 0.4;
        const canPlace = !this.game.grid[gridY][gridX].isOccupied;
        ctx.fillStyle = canPlace ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(x, y, tileSize, tileSize);
        
        const range = this.draggedItem.config.stats.Alcance;
        ctx.beginPath();
        ctx.arc(x + tileSize / 2, y + tileSize / 2, range, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
    }

    initModal() { /* ... (código inalterado) ... */ }
    showModal(type, config) { /* ... (código inalterado) ... */ }

    showGameOverScreen() {
        document.getElementById('final-wave').textContent = this.game.waveNumber;
        document.getElementById('game-over-screen').classList.remove('modal-hidden');
    }
    
    initListeners() {
        this.startWaveBtn.addEventListener('click', () => this.game.startNextWave());
    }
}

// O código do Modal foi omitido por ser idêntico à versão anterior. 
// A implementação dele no arquivo ui.js deve ser mantida.