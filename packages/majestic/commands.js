const admin = require('./admin');
const economy = require('./economy');

const HELP = [
    '!{#ffd43b}=== Команды ===',
    '/help, /me, /do, /b, /pay',
    '/stats — статистика',
    '!{#ffd43b}--- Админ ---',
    '/a <текст>, /kick, /ban, /mute, /tp, /bring',
    '/giveMoney, /setAdmin, /veh, /heal, /armor'
];

mp.events.addCommand('help', (player) => {
    HELP.forEach(line => player.outputChatBox(line));
});

mp.events.addCommand('stats', (player) => {
    if (!player.authorized) return;
    player.outputChatBox(`!{#74c0fc}Логин: !{#fff}${player.login}`);
    player.outputChatBox(`!{#74c0fc}Деньги: !{#fff}$${player.money}`);
    player.outputChatBox(`!{#74c0fc}Уровень админа: !{#fff}${player.adminLevel || 0}`);
});

mp.events.addCommand('me', (player, action) => {
    if (!player.authorized || !action) return;
    mp.players.broadcast(`!{#c084fc}* ${player.login} ${action}`);
});

mp.events.addCommand('do', (player, desc) => {
    if (!player.authorized || !desc) return;
    mp.players.broadcast(`!{#c084fc}* ${desc} (( ${player.login} ))`);
});

mp.events.addCommand('b', (player, text) => {
    if (!player.authorized || !text) return;
    mp.players.broadcast(`!{#94a3b8}((${player.login}: ${text}))`);
});

mp.events.addCommand('pay', (player, fullText, targetId, amount) => {
    if (!player.authorized) return;
    const t = admin.findPlayer(targetId);
    const n = parseInt(amount, 10);
    if (!t || !t.authorized || isNaN(n) || n <= 0) {
        player.outputChatBox('!{#ff6b6b}Использование: /pay <id> <сумма>');
        return;
    }
    if (t.id === player.id) return;
    if (!economy.takeMoney(player, n)) {
        player.outputChatBox('!{#ff6b6b}Недостаточно денег.');
        return;
    }
    economy.giveMoney(t, n);
    player.outputChatBox(`!{#51cf66}Вы передали $${n} игроку ${t.login}.`);
    t.outputChatBox(`!{#51cf66}Вам передал $${n} игрок ${player.login}.`);
});

// --- Админские ---

mp.events.addCommand('a', (player, text) => {
    if (!admin.requireAdmin(player, 1) || !text) return;
    admin.broadcastAdmin(`${player.login}: ${text}`);
});

mp.events.addCommand('kick', (player, _full, id, ...reasonParts) => {
    const t = admin.findPlayer(id);
    admin.kick(player, t, reasonParts.join(' '));
});

mp.events.addCommand('ban', (player, _full, id, ...reasonParts) => {
    const t = admin.findPlayer(id);
    admin.ban(player, t, reasonParts.join(' '));
});

mp.events.addCommand('mute', (player, _full, id, minutes) => {
    const t = admin.findPlayer(id);
    admin.mute(player, t, minutes);
});

mp.events.addCommand('tp', (player, _full, id) => {
    const t = admin.findPlayer(id);
    admin.teleportTo(player, t);
});

mp.events.addCommand('bring', (player, _full, id) => {
    const t = admin.findPlayer(id);
    admin.bringTo(player, t);
});

mp.events.addCommand('giveMoney', (player, _full, id, amount) => {
    const t = admin.findPlayer(id);
    admin.giveMoneyTo(player, t, amount);
});

mp.events.addCommand('setAdmin', (player, _full, id, level) => {
    const t = admin.findPlayer(id);
    admin.setAdminLevel(player, t, level);
});

mp.events.addCommand('veh', (player, _full, model) => {
    admin.spawnVeh(player, model);
});

mp.events.addCommand('heal', (player, _full, id) => {
    const t = id ? admin.findPlayer(id) : player;
    admin.heal(player, t);
});

mp.events.addCommand('armor', (player, _full, id) => {
    const t = id ? admin.findPlayer(id) : player;
    admin.armor(player, t);
});
