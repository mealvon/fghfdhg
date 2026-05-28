const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const BANS_FILE = path.join(DATA_DIR, 'bans.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const PUNISH_FILE = path.join(DATA_DIR, 'punishments.json');

function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON(file, fallback) {
    ensureDir();
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
        return fallback;
    }
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) {
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
let logs = loadJSON(LOGS_FILE, []);
let punishments = loadJSON(PUNISH_FILE, []);

const dirty = new Set();
let saveTimer = null;
function scheduleSave(...keys) {
    keys.forEach(k => dirty.add(k));
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        if (dirty.has('players')) saveJSON(PLAYERS_FILE, players);
        if (dirty.has('bans')) saveJSON(BANS_FILE, bans);
        if (dirty.has('logs')) saveJSON(LOGS_FILE, logs);
        if (dirty.has('punishments')) saveJSON(PUNISH_FILE, punishments);
        dirty.clear();
        saveTimer = null;
    }, 1500);
}

module.exports = {
    getPlayer(login) { return players[login.toLowerCase()] || null; },
    createPlayer(login, record) { players[login.toLowerCase()] = record; scheduleSave('players'); },
    updatePlayer(login, patch) {
        const key = login.toLowerCase();
        if (!players[key]) return false;
        Object.assign(players[key], patch);
        scheduleSave('players');
        return true;
    },
    allPlayers() { return players; },

    addBan(login, reason, by) {
        bans[login.toLowerCase()] = { reason, by, at: Date.now() };
        scheduleSave('bans');
    },
    removeBan(login) { delete bans[login.toLowerCase()]; scheduleSave('bans'); },
    isBanned(login) { return Boolean(bans[login.toLowerCase()]); },
    getBan(login) { return bans[login.toLowerCase()] || null; },
    allBans() { return bans; },

    addLog(entry) {
        const e = Object.assign({ at: Date.now() }, entry);
        logs.unshift(e);
        if (logs.length > 500) logs.length = 500;
        scheduleSave('logs');
    },
    allLogs() { return logs; },

    addPunishment(p) {
        const entry = Object.assign({ id: Date.now() + Math.random(), at: Date.now() }, p);
        punishments.unshift(entry);
        if (punishments.length > 500) punishments.length = 500;
        scheduleSave('punishments');
    },
    allPunishments() { return punishments; },

    flush() {
        saveJSON(PLAYERS_FILE, players);
        saveJSON(BANS_FILE, bans);
        saveJSON(LOGS_FILE, logs);
        saveJSON(PUNISH_FILE, punishments);
    }
};
