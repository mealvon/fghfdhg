const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const BANS_FILE = path.join(DATA_DIR, 'bans.json');

function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON(file, fallback) {
    ensureDir();
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
        return fallback;
    }
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.error(`[DB] не удалось прочитать ${file}:`, e.message);
        return fallback;
    }
}

function saveJSON(file, data) {
    ensureDir();
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let players = loadJSON(PLAYERS_FILE, {});
let bans = loadJSON(BANS_FILE, {});

let saveTimer = null;
function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveJSON(PLAYERS_FILE, players);
        saveJSON(BANS_FILE, bans);
        saveTimer = null;
    }, 2000);
}

module.exports = {
    getPlayer(login) {
        return players[login.toLowerCase()] || null;
    },
    createPlayer(login, record) {
        players[login.toLowerCase()] = record;
        scheduleSave();
    },
    updatePlayer(login, patch) {
        const key = login.toLowerCase();
        if (!players[key]) return false;
        Object.assign(players[key], patch);
        scheduleSave();
        return true;
    },
    allPlayers() {
        return players;
    },
    addBan(login, reason, by) {
        bans[login.toLowerCase()] = { reason, by, at: Date.now() };
        scheduleSave();
    },
    removeBan(login) {
        delete bans[login.toLowerCase()];
        scheduleSave();
    },
    isBanned(login) {
        return Boolean(bans[login.toLowerCase()]);
    },
    getBan(login) {
        return bans[login.toLowerCase()] || null;
    },
    flush() {
        saveJSON(PLAYERS_FILE, players);
        saveJSON(BANS_FILE, bans);
    }
};
