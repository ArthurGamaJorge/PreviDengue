export const CONFIG = {
    GAME: {
        STARTING_LIVES: 20,
        STARTING_RESOURCES: 150,
        TILE_SIZE: 48,
        ENEMY_SPAWN_INTERVAL: 400,
        WAVE_BONUS_BASE: 50,
        WAVE_BONUS_INCREMENT: 10,
        KILL_REWARD: 5,
    },
    PATH: [
        { x: -1, y: 5 }, { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 },
        { x: 2, y: 4 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, 
        { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 }, { x: 4, y: 7 },
        { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 7 },
        { x: 8, y: 6 }, { x: 8, y: 5 }, { x: 8, y: 4 }, { x: 8, y: 3 },
        { x: 9, y: 3 }, { x: 10, y: 3 }, { x: 11, y: 3 }, { x: 12, y: 3 },
        { x: 12, y: 4 }, { x: 12, y: 5 }, { x: 12, y: 6 }, { x: 13, y: 6 },
        { x: 14, y: 6 }, { x: 15, y: 6 }, { x: 16, y: 6 }, { x: 17, y: 6 }, { x: 18, y: 6 }
    ],
    TOWERS: {
        TELA: {
            name: 'Tela de Proteção',
            icon: '🖼️',
            cost: 30,
            description: 'Dano baixo, mas desacelera inimigos.',
            stats: { Dano: 1, Alcance: 100, Cadência: 60, Lentidão: 0.5 },
            projectile: { emoji: '🕸️', speed: 5 }
        },
        AGENTE: {
            name: 'Agente de Saúde',
            icon: '👨‍⚕️',
            cost: 65,
            description: 'Dano alto e focado em um único alvo.',
            stats: { Dano: 4, Alcance: 160, Cadência: 90 },
            projectile: { emoji: '🧼', speed: 6 }
        },
        LARVICIDA: {
            name: 'Larvicida Biológico',
            icon: '💧',
            cost: 80,
            description: 'Atinge múltiplos alvos em área.',
            stats: { Dano: 0.75, Alcance: 90, Cadência: 20, 'Área de Efeito': 40 },
            projectile: { emoji: '💦', speed: 4 }
        }
    },
    POWERS: {
        DEDETIZACAO: {
            name: 'Dedetização',
            icon: '💨',
            cost: 200,
            description: 'Dano em massa a todos os mosquitos.',
            action: (game) => game.enemies.forEach(enemy => enemy.takeDamage(50))
        },
        BLOQUEIO: {
            name: 'Bloqueio',
            icon: '🚧',
            cost: 120,
            description: 'Atordoa inimigos perto da base.',
            action: (game) => {
                const position = game.path[game.path.length - 5];
                game.addTemporaryEffect({
                    type: 'stun_damage',
                    x: position.x * game.tileSize + game.tileSize / 2,
                    y: position.y * game.tileSize + game.tileSize / 2,
                    radius: game.tileSize * 1.5,
                    duration: 300,
                    damagePerFrame: 0.1,
                });
            }
        }
    },
    WAVES: [
        { count: 10, health: 10, speed: 1.0 }, { count: 15, health: 12, speed: 1.1 },
        { count: 20, health: 15, speed: 1.1 }, { count: 15, health: 30, speed: 0.8 },
        { count: 30, health: 10, speed: 1.5 }, { count: 25, health: 25, speed: 1.2 },
        { count: 20, health: 40, speed: 1.0 }, { count: 40, health: 20, speed: 1.6 },
        { count: 50, health: 30, speed: 1.2 }, { count: 1, health: 1000, speed: 0.5, size: 2, icon: '🦟' }, // BOSS
    ]
};