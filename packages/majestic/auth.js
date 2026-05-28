const bcrypt = require('bcryptjs');
const db = require('./database');
const config = require('./config');

function isValidLogin(login) {
    return typeof login === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(login);
}

function isValidPassword(pw) {
    return typeof pw === 'string' && pw.length >= 4 && pw.length <= 64;
}

function attachState(player, record) {
    player.login = record.login;
    player.money = record.money;
    player.adminLevel = record.adminLevel || 0;
    player.muteUntil = record.muteUntil || 0;
    player.name = record.login;
    player.spawn(config.spawnPos);
    player.heading = config.spawnHeading;
}

mp.events.add('majestic:auth:register', (player, login, password) => {
    if (player.authorized) return;
    if (!isValidLogin(login) || !isValidPassword(password)) {
        player.call('majestic:auth:error', ['Логин 3–20 симв. (a-Z 0-9 _), пароль 4–64 симв.']);
        return;
    }
    if (db.getPlayer(login)) {
        player.call('majestic:auth:error', ['Логин уже занят.']);
        return;
    }
    const hash = bcrypt.hashSync(password, 8);
    const isFirstAdmin = login.toLowerCase() === config.firstAdmin.toLowerCase();
    const record = {
        login,
        password: hash,
        money: config.startMoney,
        adminLevel: isFirstAdmin ? 7 : 0,
        muteUntil: 0,
        createdAt: Date.now()
    };
    db.createPlayer(login, record);
    player.authorized = true;
    attachState(player, record);
    player.call('majestic:auth:ok', [{ login: record.login, money: record.money, adminLevel: record.adminLevel }]);
    mp.players.broadcast(`!{#74c0fc}[Сервер] !{#fff}${login} присоединился к игре.`);
});

mp.events.add('majestic:auth:login', (player, login, password) => {
    if (player.authorized) return;
    if (!isValidLogin(login) || !isValidPassword(password)) {
        player.call('majestic:auth:error', ['Некорректный логин или пароль.']);
        return;
    }
    if (db.isBanned(login)) {
        const ban = db.getBan(login);
        player.call('majestic:auth:error', [`Аккаунт заблокирован: ${ban.reason || 'без причины'}.`]);
        return;
    }
    const record = db.getPlayer(login);
    if (!record || !bcrypt.compareSync(password, record.password)) {
        player.call('majestic:auth:error', ['Неверный логин или пароль.']);
        return;
    }
    player.authorized = true;
    attachState(player, record);
    player.call('majestic:auth:ok', [{ login: record.login, money: record.money, adminLevel: record.adminLevel }]);
    mp.players.broadcast(`!{#74c0fc}[Сервер] !{#fff}${login} присоединился к игре.`);
});

module.exports = { isValidLogin, isValidPassword, attachState };
