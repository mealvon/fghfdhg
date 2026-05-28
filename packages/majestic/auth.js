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
    player.bank = record.bank || 0;
    player.adminLevel = record.adminLevel || 0;
    player.muteUntil = record.muteUntil || 0;
    player.hunger = record.hunger != null ? record.hunger : 100;
    player.thirst = record.thirst != null ? record.thirst : 100;
    player.playtime = record.playtime || 0;
    player.warns = record.warns || 0;
    player.name = record.login;
    player.dimension = 0;
    player.spawn(new mp.Vector3(config.spawnPos.x, config.spawnPos.y, config.spawnPos.z));
    player.heading = config.spawnHeading;
    player.armour = 0;
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
        bank: config.startBank,
        adminLevel: isFirstAdmin ? 7 : 0,
        muteUntil: 0,
        hunger: 100,
        thirst: 100,
        warns: 0,
        playtime: 0,
        createdAt: Date.now(),
        lastSeen: Date.now()
    };
    db.createPlayer(login, record);
    db.addLog({ type: 'register', login });
    player.authorized = true;
    attachState(player, record);
    sendAuthOk(player, record);
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
    db.updatePlayer(login, { lastSeen: Date.now() });
    db.addLog({ type: 'login', login });
    player.authorized = true;
    attachState(player, record);
    sendAuthOk(player, record);
});

function sendAuthOk(player, record) {
    player.call('majestic:auth:ok', [{
        login: record.login,
        money: record.money,
        bank: record.bank || 0,
        adminLevel: record.adminLevel || 0,
        hunger: record.hunger != null ? record.hunger : 100,
        thirst: record.thirst != null ? record.thirst : 100
    }]);
    mp.players.broadcast(`!{#d4af37}[Сервер] !{#fff}${record.login} присоединился к городу.`);
}

module.exports = { isValidLogin, isValidPassword, attachState };
