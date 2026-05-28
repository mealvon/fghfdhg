const db = require('./database');
const config = require('./config');
const economy = require('./economy');

function requireAdmin(player, level) {
    if (!player.authorized) return false;
    if ((player.adminLevel || 0) < level) {
        player.outputChatBox(`!{#ff6b6b}[Админ] Недостаточно прав (нужен уровень ${level}).`);
        return false;
    }
    return true;
}

function findPlayer(id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return null;
    return mp.players.at(numId) || null;
}

function broadcastAdmin(text) {
    mp.players.forEach(p => {
        if (p.authorized && p.adminLevel > 0) {
            p.outputChatBox(`!{#ffd43b}[A] ${text}`);
        }
    });
}

function kick(player, target, reason) {
    if (!requireAdmin(player, 2)) return;
    if (!target || !target.authorized) return;
    mp.players.broadcast(`!{#ff6b6b}[Кик] !{#fff}${target.login} был кикнут (${reason || 'без причины'}) администратором ${player.login}.`);
    target.kick(reason || 'Kicked by admin');
}

function ban(player, target, reason) {
    if (!requireAdmin(player, 3)) return;
    if (!target || !target.authorized) return;
    db.addBan(target.login, reason || 'без причины', player.login);
    mp.players.broadcast(`!{#ff6b6b}[Бан] !{#fff}${target.login} забанен (${reason || 'без причины'}) администратором ${player.login}.`);
    target.kick('Banned: ' + (reason || 'без причины'));
}

function mute(player, target, minutes) {
    if (!requireAdmin(player, 1)) return;
    if (!target || !target.authorized) return;
    const m = Math.max(1, parseInt(minutes, 10) || 5);
    target.muteUntil = Date.now() + m * 60 * 1000;
    db.updatePlayer(target.login, { muteUntil: target.muteUntil });
    target.outputChatBox(`!{#ffd43b}[Админ] Вам выдан мут на ${m} мин. (${player.login}).`);
    player.outputChatBox(`!{#ffd43b}[Админ] Игрок ${target.login} получил мут на ${m} мин.`);
}

function teleportTo(player, target) {
    if (!requireAdmin(player, 1)) return;
    if (!target || !target.authorized) return;
    player.position = target.position;
    player.outputChatBox(`!{#ffd43b}[Админ] Телепорт к ${target.login}.`);
}

function bringTo(player, target) {
    if (!requireAdmin(player, 2)) return;
    if (!target || !target.authorized) return;
    target.position = player.position;
    target.outputChatBox(`!{#ffd43b}[Админ] Вас телепортировал ${player.login}.`);
}

function giveMoneyTo(player, target, amount) {
    if (!requireAdmin(player, 4)) return;
    if (!target || !target.authorized) return;
    const n = parseInt(amount, 10);
    if (isNaN(n) || n <= 0) return;
    economy.giveMoney(target, n);
    target.outputChatBox(`!{#74c0fc}[Админ] Вам выдано $${n} (${player.login}).`);
    player.outputChatBox(`!{#74c0fc}[Админ] Выдано $${n} игроку ${target.login}.`);
}

function setAdminLevel(player, target, level) {
    if (!requireAdmin(player, 7)) return;
    if (!target || !target.authorized) return;
    const lvl = Math.max(0, Math.min(7, parseInt(level, 10) || 0));
    target.adminLevel = lvl;
    db.updatePlayer(target.login, { adminLevel: lvl });
    target.outputChatBox(`!{#ffd43b}[Админ] Ваш уровень админа установлен на ${lvl} (${config.adminLevels[lvl] || 'Игрок'}).`);
    player.outputChatBox(`!{#ffd43b}[Админ] ${target.login} → уровень ${lvl}.`);
}

function spawnVeh(player, model) {
    if (!requireAdmin(player, 2)) return;
    const hash = mp.joaat(String(model || 'sultanrs'));
    const pos = player.position;
    const veh = mp.vehicles.new(hash, new mp.Vector3(pos.x + 3, pos.y, pos.z), {
        heading: player.heading,
        dimension: player.dimension
    });
    player.outputChatBox(`!{#ffd43b}[Админ] Спавн транспорта: ${model}.`);
    return veh;
}

function heal(player, target) {
    if (!requireAdmin(player, 1)) return;
    const t = target || player;
    t.health = 100;
    t.outputChatBox('!{#51cf66}[Админ] Здоровье восстановлено.');
}

function armor(player, target) {
    if (!requireAdmin(player, 1)) return;
    const t = target || player;
    t.armour = 100;
    t.outputChatBox('!{#51cf66}[Админ] Броня выдана.');
}

// Игровая админ-панель (F2 → CEF)
mp.events.add('majestic:admin:open', (player) => {
    if (!player.authorized || (player.adminLevel || 0) < 1) return;
    const list = [];
    mp.players.forEach(p => {
        if (!p.authorized) return;
        list.push({
            id: p.id,
            login: p.login,
            money: p.money,
            adminLevel: p.adminLevel || 0,
            health: Math.floor(p.health),
            ping: p.ping
        });
    });
    player.call('majestic:admin:data', [{ self: { login: player.login, level: player.adminLevel }, players: list }]);
});

mp.events.add('majestic:admin:action', (player, action, targetId, arg) => {
    if (!player.authorized || (player.adminLevel || 0) < 1) return;
    const target = findPlayer(targetId);
    if (!target && action !== 'spawnVeh') return;
    switch (action) {
        case 'kick': kick(player, target, arg); break;
        case 'ban': ban(player, target, arg); break;
        case 'mute': mute(player, target, arg); break;
        case 'tp': teleportTo(player, target); break;
        case 'bring': bringTo(player, target); break;
        case 'giveMoney': giveMoneyTo(player, target, arg); break;
        case 'setAdmin': setAdminLevel(player, target, arg); break;
        case 'heal': heal(player, target); break;
        case 'armor': armor(player, target); break;
        case 'spawnVeh': spawnVeh(player, arg); break;
    }
});

module.exports = {
    requireAdmin, findPlayer, broadcastAdmin,
    kick, ban, mute, teleportTo, bringTo, giveMoneyTo, setAdminLevel,
    spawnVeh, heal, armor
};
