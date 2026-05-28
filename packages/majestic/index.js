const config = require('./config');
const db = require('./database');
require('./auth');
require('./admin');
require('./commands');

console.log('\n╔════════════════════════════════════════╗');
console.log(`║  ${config.serverName.padEnd(36)} ║`);
console.log('╚════════════════════════════════════════╝');
console.log(`Первый админ (логин при регистрации): ${config.firstAdmin}`);
console.log(`Спавн: ${config.spawnPos.x.toFixed(1)}, ${config.spawnPos.y.toFixed(1)}, ${config.spawnPos.z.toFixed(1)}\n`);

mp.events.add('playerJoin', (player) => {
    player.authorized = false;
    player.name = `Player_${player.id}`;
    player.dimension = 1000 + player.id;
    setTimeout(() => player.call('majestic:auth:show'), 600);
});

mp.events.add('playerQuit', (player) => {
    if (!player.authorized) return;
    db.updatePlayer(player.login, {
        money: player.money,
        bank: player.bank,
        adminLevel: player.adminLevel,
        muteUntil: player.muteUntil,
        hunger: player.hunger,
        thirst: player.thirst,
        warns: player.warns,
        lastSeen: Date.now()
    });
    db.addLog({ type: 'quit', login: player.login });
});

mp.events.add('playerChat', (player, text) => {
    if (!player.authorized) return;
    if (player.muteUntil && player.muteUntil > Date.now()) {
        const left = Math.ceil((player.muteUntil - Date.now()) / 1000);
        player.outputChatBox(`!{#ef4444}Вы в муте ещё ${left} сек.`);
        return;
    }
    mp.players.broadcast(`!{#fff}${player.login}: ${text}`);
});

mp.events.add('playerDeath', (player, reason, killer) => {
    if (!player.authorized) return;
    db.addLog({
        type: 'death',
        login: player.login,
        killer: killer && killer.login ? killer.login : 'unknown'
    });
    player.call('majestic:death:show', [config.deathRespawnSec]);
    setTimeout(() => {
        if (!player || !mp.players.exists(player)) return;
        player.spawn(new mp.Vector3(config.spawnPos.x, config.spawnPos.y, config.spawnPos.z));
        player.heading = config.spawnHeading;
        player.health = 100;
        player.call('majestic:death:hide');
    }, config.deathRespawnSec * 1000);
});

// Голод / жажда — медленно убывают
setInterval(() => {
    mp.players.forEach(p => {
        if (!p.authorized) return;
        p.hunger = Math.max(0, (p.hunger != null ? p.hunger : 100) - 1);
        p.thirst = Math.max(0, (p.thirst != null ? p.thirst : 100) - 1);
        if (p.hunger === 0 || p.thirst === 0) {
            p.health = Math.max(1, p.health - config.hungerThirstHpDamage);
        }
        p.call('majestic:hud:update', [{ hunger: p.hunger, thirst: p.thirst, health: Math.floor(p.health) }]);
    });
}, config.hungerThirstTickSec * 1000);

// Сейв состояния каждые 60с
setInterval(() => {
    mp.players.forEach(p => {
        if (!p.authorized) return;
        db.updatePlayer(p.login, {
            money: p.money,
            bank: p.bank,
            adminLevel: p.adminLevel,
            muteUntil: p.muteUntil,
            hunger: p.hunger,
            thirst: p.thirst,
            warns: p.warns,
            playtime: (p.playtime || 0) + 60
        });
    });
}, 60 * 1000);

process.on('SIGINT', () => { db.flush(); process.exit(0); });

console.log('✓ Сервер инициализирован.\n');
