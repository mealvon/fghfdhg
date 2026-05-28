const db = require('./database');

function setMoney(player, amount) {
    player.money = Math.max(0, Math.floor(amount));
    db.updatePlayer(player.login, { money: player.money });
    player.call('majestic:hud:money', [player.money]);
}

function giveMoney(player, amount) {
    setMoney(player, (player.money || 0) + amount);
}

function takeMoney(player, amount) {
    if ((player.money || 0) < amount) return false;
    setMoney(player, player.money - amount);
    return true;
}

module.exports = { setMoney, giveMoney, takeMoney };
