const admin = require('./admin');
const economy = require('./economy');
const reports = require('./reports');
const db = require('./database');

const HELP = [
    '!{#d4af37}═══ Команды Majestic RP ═══',
    '!{#fff}/help /me /do /b /try /pay /stats',
    '/report <текст> — обращение к админу',
    '/cash, /bank — баланс',
    '!{#d4af37}── Админ ──',
    '/a /kick /ban /unban /mute /warn /tp /bring /tpc',
    '/giveMoney /setAdmin /veh /heal /armor /spec'
];

mp.events.addCommand('help', (player) => HELP.forEach(l => player.outputChatBox(l)));

mp.events.addCommand('stats', (player) => {
    if (!player.authorized) return;
    player.outputChatBox(`!{#d4af37}═ Профиль ═`);
    player.outputChatBox(`!{#94a3b8}Логин: !{#fff}${player.login}`);
    player.outputChatBox(`!{#94a3b8}Наличные: !{#22c55e}$${player.money}`);
    player.outputChatBox(`!{#94a3b8}Банк: !{#22c55e}$${player.bank || 0}`);
    player.outputChatBox(`!{#94a3b8}Уровень админа: !{#fff}${player.adminLevel || 0}`);
    player.outputChatBox(`!{#94a3b8}Предупреждений: !{#fff}${player.warns || 0}/3`);
});

mp.events.addCommand('cash', (p) => { if (p.authorized) p.outputChatBox(`!{#22c55e}Наличные: $${p.money}`); });
mp.events.addCommand('bank', (p) => { if (p.authorized) p.outputChatBox(`!{#22c55e}Банк: $${p.bank || 0}`); });

mp.events.addCommand('me', (player, action) => {
    if (!player.authorized || !action) return;
    mp.players.broadcast(`!{#c084fc}* ${player.login} ${action}`);
});

mp.events.addCommand('do', (player, desc) => {
    if (!player.authorized || !desc) return;
    mp.players.broadcast(`!{#c084fc}* ${desc} (( ${player.login} ))`);
});

mp.events.addCommand('try', (player, action) => {
    if (!player.authorized || !action) return;
    const success = Math.random() < 0.5;
    mp.players.broadcast(`!{#c084fc}* ${player.login} пытается ${action} — ${success ? '!{#22c55e}успешно' : '!{#ef4444}неудачно'}`);
});

mp.events.addCommand('b', (player, text) => {
    if (!player.authorized || !text) return;
    mp.players.broadcast(`!{#94a3b8}((${player.login}: ${text}))`);
});

mp.events.addCommand('pay', (player, _, targetId, amount) => {
    if (!player.authorized) return;
    const t = admin.findByLoginOrId(targetId);
    const n = parseInt(amount, 10);
    if (!t || !t.authorized || isNaN(n) || n <= 0) {
        player.outputChatBox('!{#ef4444}/pay <id|login> <сумма>');
        return;
    }
    if (t.id === player.id) return;
    if (!economy.takeMoney(player, n)) {
        player.outputChatBox('!{#ef4444}Недостаточно наличных.');
        return;
    }
    economy.giveMoney(t, n);
    player.outputChatBox(`!{#22c55e}Вы передали $${n} → ${t.login}.`);
    t.outputChatBox(`!{#22c55e}Вам передал $${n} ← ${player.login}.`);
});

mp.events.addCommand('report', (player, text) => {
    if (!player.authorized || !text) {
        player.outputChatBox('!{#ef4444}/report <текст обращения>');
        return;
    }
    const r = reports.create(player, text);
    player.outputChatBox(`!{#d4af37}Репорт #${r.id} отправлен. Дождитесь ответа.`);
});

// --- Админские ---

mp.events.addCommand('a', (player, text) => {
    if (!admin.requireAdmin(player, 1) || !text) return;
    admin.broadcastAdmin(`${player.login}: ${text}`);
});

mp.events.addCommand('kick', (player, _full, id, ...r) => {
    admin.kick(player, admin.findByLoginOrId(id), r.join(' '));
});
mp.events.addCommand('ban', (player, _full, id, ...r) => {
    admin.ban(player, admin.findByLoginOrId(id), r.join(' '));
});
mp.events.addCommand('unban', (player, _full, login) => {
    if (admin.requireAdmin(player, 4)) admin.unban(player, login);
});
mp.events.addCommand('mute', (player, _full, id, minutes) => {
    admin.mute(player, admin.findByLoginOrId(id), minutes);
});
mp.events.addCommand('warn', (player, _full, id, ...r) => {
    admin.warn(player, admin.findByLoginOrId(id), r.join(' '));
});
mp.events.addCommand('tp', (player, _full, id) => admin.teleportTo(player, admin.findByLoginOrId(id)));
mp.events.addCommand('bring', (player, _full, id) => admin.bringTo(player, admin.findByLoginOrId(id)));
mp.events.addCommand('tpc', (player, _full, x, y, z) => {
    const xn = parseFloat(x), yn = parseFloat(y), zn = parseFloat(z);
    if (isNaN(xn) || isNaN(yn) || isNaN(zn)) return;
    if (admin.requireAdmin(player, 1)) player.position = new mp.Vector3(xn, yn, zn);
});
mp.events.addCommand('giveMoney', (player, _full, id, amount) => {
    admin.giveMoneyTo(player, admin.findByLoginOrId(id), amount);
});
mp.events.addCommand('setAdmin', (player, _full, id, level) => {
    admin.setAdminLevel(player, admin.findByLoginOrId(id), level);
});
mp.events.addCommand('veh', (player, _full, model) => admin.spawnVeh(player, model));
mp.events.addCommand('heal', (player, _full, id) => admin.heal(player, id ? admin.findByLoginOrId(id) : player));
mp.events.addCommand('armor', (player, _full, id) => admin.armor(player, id ? admin.findByLoginOrId(id) : player));
mp.events.addCommand('spec', (player, _full, id) => admin.spectate(player, admin.findByLoginOrId(id)));
