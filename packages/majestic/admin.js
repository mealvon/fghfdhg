const db = require('./database');
const config = require('./config');
const economy = require('./economy');
const reports = require('./reports');

function requireAdmin(player, level) {
    if (!player.authorized) return false;
    if ((player.adminLevel || 0) < level) {
        player.outputChatBox(`!{#ef4444}[Админ] Недостаточно прав (нужен уровень ${level}).`);
        return false;
    }
    return true;
}

function findPlayer(id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return null;
    return mp.players.at(numId) || null;
}

function findByLoginOrId(token) {
    if (token == null) return null;
    const s = String(token);
    const n = parseInt(s, 10);
    if (!isNaN(n) && s === String(n)) {
        const p = mp.players.at(n);
        if (p) return p;
    }
    for (const p of mp.players.toArray()) {
        if (p.authorized && p.login.toLowerCase() === s.toLowerCase()) return p;
    }
    return null;
}

function broadcastAdmin(text) {
    mp.players.forEach(p => {
        if (p.authorized && p.adminLevel > 0) p.outputChatBox(`!{#d4af37}[A] ${text}`);
    });
}

function logPunishment(type, target, by, reason, extra) {
    db.addPunishment({ type, target: target.login || target, by: by.login || by, reason: reason || '', extra: extra || null });
    db.addLog({ type: 'punish:' + type, target: target.login || target, by: by.login || by, reason });
}

function kick(player, target, reason) {
    if (!requireAdmin(player, 2)) return;
    if (!target || !target.authorized) return;
    logPunishment('kick', target, player, reason);
    mp.players.broadcast(`!{#ef4444}[Кик] !{#fff}${target.login} — ${reason || 'без причины'} (${player.login}).`);
    target.kick(reason || 'Kicked by admin');
}

function ban(player, target, reason) {
    if (!requireAdmin(player, 3)) return;
    if (!target || !target.authorized) return;
    db.addBan(target.login, reason || 'без причины', player.login);
    logPunishment('ban', target, player, reason);
    mp.players.broadcast(`!{#ef4444}[Бан] !{#fff}${target.login} — ${reason || 'без причины'} (${player.login}).`);
    target.kick('Banned: ' + (reason || 'без причины'));
}

function unban(player, login) {
    if (!requireAdmin(player, 4)) return false;
    if (!db.isBanned(login)) {
        player.outputChatBox('!{#ef4444}Этот логин не забанен.');
        return false;
    }
    db.removeBan(login);
    db.addLog({ type: 'unban', target: login, by: player.login });
    player.outputChatBox(`!{#22c55e}Логин ${login} разбанен.`);
    return true;
}

function mute(player, target, minutes) {
    if (!requireAdmin(player, 1)) return;
    if (!target || !target.authorized) return;
    const m = Math.max(1, parseInt(minutes, 10) || 5);
    target.muteUntil = Date.now() + m * 60 * 1000;
    db.updatePlayer(target.login, { muteUntil: target.muteUntil });
    logPunishment('mute', target, player, `${m} мин.`);
    target.outputChatBox(`!{#d4af37}[Админ] Вам выдан мут на ${m} мин. (${player.login}).`);
    target.call('majestic:notify', ['warn', `Мут на ${m} мин.`, player.login]);
    player.outputChatBox(`!{#d4af37}[Админ] ${target.login} получил мут на ${m} мин.`);
}

function warn(player, target, reason) {
    if (!requireAdmin(player, 1)) return;
    if (!target || !target.authorized) return;
    target.warns = (target.warns || 0) + 1;
    db.updatePlayer(target.login, { warns: target.warns });
    logPunishment('warn', target, player, reason);
    target.outputChatBox(`!{#d4af37}[Админ] Вам выдано предупреждение: ${reason || 'без причины'}.`);
    target.call('majestic:notify', ['warn', `Предупреждение (${target.warns}/3)`, reason || '—']);
    if (target.warns >= 3) {
        ban(player, target, 'Автобан: 3 предупреждения');
    }
}

function teleportTo(player, target) {
    if (!requireAdmin(player, 1)) return;
    if (!target || !target.authorized) return;
    player.position = target.position;
    player.dimension = target.dimension;
    player.outputChatBox(`!{#d4af37}[Админ] Телепорт к ${target.login}.`);
}

function bringTo(player, target) {
    if (!requireAdmin(player, 2)) return;
    if (!target || !target.authorized) return;
    target.position = player.position;
    target.dimension = player.dimension;
    target.outputChatBox(`!{#d4af37}[Админ] Вас телепортировал ${player.login}.`);
}

function teleportXYZ(player, x, y, z) {
    if (!requireAdmin(player, 1)) return;
    player.position = new mp.Vector3(x, y, z);
}

function giveMoneyTo(player, target, amount) {
    if (!requireAdmin(player, 4)) return;
    if (!target || !target.authorized) return;
    const n = parseInt(amount, 10);
    if (isNaN(n) || n === 0) return;
    economy.giveMoney(target, n);
    logPunishment('giveMoney', target, player, `$${n}`);
    target.outputChatBox(`!{#22c55e}[Админ] Вам выдано $${n} (${player.login}).`);
    player.outputChatBox(`!{#22c55e}[Админ] Выдано $${n} игроку ${target.login}.`);
}

function setAdminLevel(player, target, level) {
    if (!requireAdmin(player, 7)) return;
    if (!target || !target.authorized) return;
    const lvl = Math.max(0, Math.min(7, parseInt(level, 10) || 0));
    target.adminLevel = lvl;
    db.updatePlayer(target.login, { adminLevel: lvl });
    logPunishment('setAdmin', target, player, `lvl ${lvl}`);
    target.outputChatBox(`!{#d4af37}[Админ] Ваш уровень установлен на ${lvl} (${config.adminLevels[lvl] || 'Игрок'}).`);
    target.call('majestic:hud:update', [{ adminLevel: lvl }]);
}

function spawnVeh(player, model) {
    if (!requireAdmin(player, 2)) return;
    const hash = mp.joaat(String(model || 'sultanrs'));
    const pos = player.position;
    const veh = mp.vehicles.new(hash, new mp.Vector3(pos.x + 3, pos.y, pos.z), {
        heading: player.heading,
        dimension: player.dimension,
        numberPlate: 'MAJSTC'
    });
    player.outputChatBox(`!{#d4af37}[Админ] Спавн: ${model}.`);
    db.addLog({ type: 'veh:spawn', by: player.login, model });
    return veh;
}

function heal(player, target) {
    if (!requireAdmin(player, 1)) return;
    const t = target || player;
    t.health = 100;
    t.hunger = 100;
    t.thirst = 100;
    t.call('majestic:hud:update', [{ hunger: 100, thirst: 100 }]);
    t.outputChatBox('!{#22c55e}[Админ] Здоровье восстановлено.');
}

function armor(player, target) {
    if (!requireAdmin(player, 1)) return;
    const t = target || player;
    t.armour = 100;
    t.outputChatBox('!{#22c55e}[Админ] Броня выдана.');
}

function spectate(player, target) {
    if (!requireAdmin(player, 2)) return;
    if (!target || !target.authorized) return;
    player.call('majestic:admin:spectate', [target.id]);
}

// =================== события CEF ===================

mp.events.add('majestic:admin:open', (player) => {
    if (!player.authorized || (player.adminLevel || 0) < 1) return;
    sendFullData(player);
});

function sendFullData(player) {
    const list = [];
    mp.players.forEach(p => {
        if (!p.authorized) return;
        list.push({
            id: p.id,
            login: p.login,
            money: p.money,
            bank: p.bank,
            adminLevel: p.adminLevel || 0,
            health: Math.floor(p.health),
            armor: Math.floor(p.armour),
            ping: p.ping,
            warns: p.warns || 0,
            pos: { x: +p.position.x.toFixed(1), y: +p.position.y.toFixed(1), z: +p.position.z.toFixed(1) }
        });
    });
    const bansArr = Object.entries(db.allBans()).map(([login, b]) => ({ login, ...b }));
    player.call('majestic:admin:data', [{
        self: { login: player.login, level: player.adminLevel },
        players: list,
        reports: reports.listAll(),
        punishments: db.allPunishments().slice(0, 100),
        logs: db.allLogs().slice(0, 100),
        bans: bansArr,
        teleports: config.teleports
    }]);
}

mp.events.add('majestic:admin:action', (player, action, targetId, arg) => {
    if (!player.authorized || (player.adminLevel || 0) < 1) return;
    const target = findByLoginOrId(targetId);
    switch (action) {
        case 'kick': kick(player, target, arg); break;
        case 'ban': ban(player, target, arg); break;
        case 'unban': unban(player, targetId); break;
        case 'mute': mute(player, target, arg); break;
        case 'warn': warn(player, target, arg); break;
        case 'tp': teleportTo(player, target); break;
        case 'bring': bringTo(player, target); break;
        case 'giveMoney': giveMoneyTo(player, target, arg); break;
        case 'setAdmin': setAdminLevel(player, target, arg); break;
        case 'heal': heal(player, target); break;
        case 'armor': armor(player, target); break;
        case 'spectate': spectate(player, target); break;
        case 'spawnVeh': spawnVeh(player, arg); break;
        case 'tpXYZ': {
            const [x, y, z] = String(arg || '').split(',').map(parseFloat);
            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) teleportXYZ(player, x, y, z);
            break;
        }
        case 'report:take': reports.take(player, targetId); break;
        case 'report:reply': reports.reply(player, targetId, arg); break;
        case 'report:close': reports.close(player, targetId); break;
    }
    setTimeout(() => sendFullData(player), 200);
});

module.exports = {
    requireAdmin, findPlayer, findByLoginOrId, broadcastAdmin,
    kick, ban, unban, mute, warn, teleportTo, bringTo, giveMoneyTo, setAdminLevel,
    spawnVeh, heal, armor, spectate, logPunishment
};
