const config = require('./config');
const db = require('./database');
require('./auth');
require('./admin');
require('./commands');

console.log(`\n=== ${config.serverName} ===`);
console.log(`Первый админ (логин): ${config.firstAdmin}`);
console.log(`Спавн: ${config.spawnPos.x.toFixed(1)}, ${config.spawnPos.y.toFixed(1)}, ${config.spawnPos.z.toFixed(1)}`);

mp.events.add('playerJoin', (player) => {
    player.authorized = false;
    player.name = `Player_${player.id}`;
    player.dimension = 1000 + player.id; // изоляция до авторизации
    setTimeout(() => {
        player.call('majestic:auth:show');
    }, 500);
});

mp.events.add('playerQuit', (player) => {
    if (player.authorized) {
        db.updatePlayer(player.login, {
            money: player.money,
            adminLevel: player.adminLevel,
            muteUntil: player.muteUntil
        });
    }
});

mp.events.add('playerChat', (player, text) => {
    if (!player.authorized) return;
    if (player.muteUntil && player.muteUntil > Date.now()) {
        const left = Math.ceil((player.muteUntil - Date.now()) / 1000);
        player.outputChatBox(`!{#ff6b6b}Вы в муте ещё ${left} сек.`);
        return;
    }
    mp.players.broadcast(`!{#fff}${player.login}: ${text}`);
});

mp.events.add('playerDeath', (player) => {
    setTimeout(() => {
        if (!player || !mp.players.exists(player)) return;
        player.spawn(new mp.Vector3(config.spawnPos.x, config.spawnPos.y, config.spawnPos.z));
    }, 3000);
});

// Периодическое сохранение состояния онлайн-игроков
setInterval(() => {
    mp.players.forEach(p => {
        if (p.authorized) {
            db.updatePlayer(p.login, {
                money: p.money,
                adminLevel: p.adminLevel,
                muteUntil: p.muteUntil
            });
        }
    });
}, 60 * 1000);

process.on('SIGINT', () => {
    db.flush();
    process.exit(0);
});

console.log('Majestic-like RP сервер загружен.\n');
