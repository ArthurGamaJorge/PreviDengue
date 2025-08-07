import { CONFIG } from './config.js';

class GameObject {
    constructor(x, y) { this.x = x; this.y = y; }
}

export class Tower extends GameObject {
    constructor(gridX, gridY, type, game) {
        const { TILE_SIZE } = CONFIG.GAME;
        super(gridX * TILE_SIZE + TILE_SIZE / 2, gridY * TILE_SIZE + TILE_SIZE / 2);
        
        this.type = type;
        this.config = CONFIG.TOWERS[type];
        this.stats = { ...this.config.stats };
        this.game = game;

        this.fireCooldown = 0;
        this.target = null;
    }

    findTarget(enemies) {
        this.target = null;
        let minDistance = this.stats.Alcance;
        enemies.forEach(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                minDistance = distance;
                this.target = enemy;
            }
        });
    }

    shoot() {
        this.fireCooldown = this.stats.Cadência;
        const projectile = new Projectile(this, this.target, this.game);
        this.game.addProjectile(projectile);
    }

    update(enemies) {
        if (this.fireCooldown > 0) this.fireCooldown--;
        this.findTarget(enemies);
        if (this.target && this.fireCooldown <= 0) {
            this.shoot();
        }
    }

    draw(ctx) {
        ctx.font = `${CONFIG.GAME.TILE_SIZE * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.icon, this.x, this.y);
    }
}

export class Enemy extends GameObject {
    constructor(config, game) {
        const startNode = game.path[0];
        const TILE_SIZE = CONFIG.GAME.TILE_SIZE;
        super(startNode.x * TILE_SIZE + TILE_SIZE / 2, startNode.y * TILE_SIZE + TILE_SIZE / 2);

        this.game = game;
        this.path = game.path;
        this.pathIndex = 0;
        
        this.health = config.health;
        this.maxHealth = config.health;
        this.speed = config.speed;
        this.icon = config.icon || '🦟';
        this.size = (config.size || 1) * 24; // 24px base size
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.game.player.resources += CONFIG.GAME.KILL_REWARD;
            this.game.uiManager.updateStats();
            this.game.removeEnemy(this);
        }
    }

    update() {
        if (this.pathIndex >= this.path.length - 1) {
            this.game.enemyReachedEnd(this);
            return;
        }

        const targetNode = this.path[this.pathIndex + 1];
        const TILE_SIZE = CONFIG.GAME.TILE_SIZE;
        const targetX = targetNode.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = targetNode.y * TILE_SIZE + TILE_SIZE / 2;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.pathIndex++;
            this.x = targetX;
            this.y = targetY;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    draw(ctx) {
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y);

        const healthBarWidth = this.size;
        const healthBarHeight = 5;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size / 2 - healthBarHeight, healthBarWidth, healthBarHeight);
        ctx.fillStyle = '#F44336';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size / 2 - healthBarHeight, healthBarWidth * (this.health / this.maxHealth), healthBarHeight);
    }
}

export class Projectile extends GameObject {
    constructor(source, target, game) {
        super(source.x, source.y);
        this.source = source;
        this.target = target;
        this.game = game;
        this.config = source.config.projectile;
        this.stats = source.stats;
    }

    update() {
        if (this.target.health <= 0) {
            this.game.removeProjectile(this);
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.config.speed) {
            this.target.takeDamage(this.stats.Dano);
            // Lógica de lentidão ou AoE pode ser adicionada aqui
            this.game.removeProjectile(this);
        } else {
            this.x += (dx / distance) * this.config.speed;
            this.y += (dy / distance) * this.config.speed;
        }
    }

    draw(ctx) {
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.emoji, this.x, this.y);
    }
}