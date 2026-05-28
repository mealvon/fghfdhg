const db = require('./database');

// id -> { id, fromId, fromLogin, text, takenBy, at, status }
const reports = new Map();
let nextId = 1;

function listOpen() {
    return Array.from(reports.values()).filter(r => r.status !== 'closed');
}
function listAll() {
    return Array.from(reports.values());
}

function create(player, text) {
    const r = {
        id: nextId++,
        fromId: player.id,
        fromLogin: player.login,
        text: String(text).slice(0, 300),
        takenBy: null,
        status: 'open',
        at: Date.now()
    };
    reports.set(r.id, r);
    notifyAdmins(`!{#d4af37}[Репорт #${r.id}] !{#fff}${player.login}: ${r.text}`);
    db.addLog({ type: 'report:new', login: player.login, text: r.text, id: r.id });
    return r;
}

function take(admin, id) {
    const r = reports.get(parseInt(id, 10));
    if (!r || r.status === 'closed') return null;
    r.takenBy = admin.login;
    r.status = 'taken';
    notifyAdmins(`!{#74c0fc}[Репорт #${r.id}] взят ${admin.login}.`);
    return r;
}

function reply(admin, id, text) {
    const r = reports.get(parseInt(id, 10));
    if (!r) return null;
    const target = mp.players.toArray().find(p => p.id === r.fromId);
    if (target) target.outputChatBox(`!{#d4af37}[Админ ${admin.login}] !{#fff}${text}`);
    notifyAdmins(`!{#94a3b8}[Репорт #${r.id}] ${admin.login} → ${r.fromLogin}: ${text}`);
    return r;
}

function close(admin, id) {
    const r = reports.get(parseInt(id, 10));
    if (!r) return null;
    r.status = 'closed';
    r.closedBy = admin.login;
    r.closedAt = Date.now();
    notifyAdmins(`!{#51cf66}[Репорт #${r.id}] закрыт ${admin.login}.`);
    db.addLog({ type: 'report:close', by: admin.login, id: r.id });
    setTimeout(() => reports.delete(r.id), 60 * 1000);
    return r;
}

function notifyAdmins(text) {
    mp.players.forEach(p => {
        if (p.authorized && (p.adminLevel || 0) > 0) p.outputChatBox(text);
    });
}

module.exports = { create, take, reply, close, listOpen, listAll };
