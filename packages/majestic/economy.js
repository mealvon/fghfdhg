const db = require('./database');

function setMoney(player, amount) {
    player.money = Math.max(0, Math.floor(amount));
    db.updatePlayer(player.login, { money: player.money });
    player.call('majestic:hud:update', [{ money: player.money }]);
}

function setBank(player, amount) {
    player.bank = Math.max(0, Math.floor(amount));
    db.updatePlayer(player.login, { bank: player.bank });
    player.call('majestic:hud:update', [{ bank: player.bank }]);
}

function giveMoney(player, amount) {
    setMoney(player, (player.money || 0) + amount);
}

function takeMoney(player, amount) {
    if ((player.money || 0) < amount) return false;
    setMoney(player, player.money - amount);
    return true;
}

module.exports = { setMoney, setBank, giveMoney, takeMoney };
