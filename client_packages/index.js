// ───────── Majestic-like Client ─────────
let authBrowser = null;
let hudBrowser = null;
let adminBrowser = null;
let deathBrowser = null;
let notifyBrowser = null;
let isAuthorized = false;
let myAdminLevel = 0;
let spectatingId = null;

function destroy(b) {
    if (b && b.destroy) try { b.destroy(); } catch (e) {}
}

// ─── Авторизация ───
mp.events.add('majestic:auth:show', () => {
    if (authBrowser) return;
    mp.gui.cursor.show(true, true);
    mp.gui.chat.show(false);
    mp.players.local.freezePosition(true);
    mp.game.cam.doScreenFadeOut(0);
    authBrowser = mp.browsers.new('package://auth/index.html');
});

mp.events.add('majestic:auth:ok', (data) => {
    isAuthorized = true;
    myAdminLevel = data.adminLevel || 0;
    destroy(authBrowser); authBrowser = null;
    mp.gui.cursor.show(false, false);
    mp.gui.chat.show(true);
    mp.players.local.freezePosition(false);
    mp.game.cam.doScreenFadeIn(1500);

    if (!hudBrowser) hudBrowser = mp.browsers.new('package://hud/index.html');
    if (!notifyBrowser) notifyBrowser = mp.browsers.new('package://notify/index.html');

    setTimeout(() => {
        if (hudBrowser) hudBrowser.execute(`window.initHUD(${JSON.stringify(data)})`);
        notify('success', 'Добро пожаловать!', data.login);
    }, 400);
});

mp.events.add('majestic:auth:error', (msg) => {
    if (authBrowser) authBrowser.execute(`window.showError(${JSON.stringify(msg)})`);
});

// ─── HUD ───
mp.events.add('majestic:hud:update', (patch) => {
    if (hudBrowser) hudBrowser.execute(`window.patchHUD(${JSON.stringify(patch)})`);
});

// Обновление HUD из натива — HP/броня/скорость/координаты — рендер-тик
mp.events.add('render', () => {
    // скрыть стандартные HUD-элементы
    mp.game.ui.hideHudComponentThisFrame(1);   // wanted stars
    mp.game.ui.hideHudComponentThisFrame(2);   // weapon icon
    mp.game.ui.hideHudComponentThisFrame(3);   // cash
    mp.game.ui.hideHudComponentThisFrame(4);   // mp cash
    mp.game.ui.hideHudComponentThisFrame(6);   // vehicle name
    mp.game.ui.hideHudComponentThisFrame(7);   // area name
    mp.game.ui.hideHudComponentThisFrame(8);   // vehicle class
    mp.game.ui.hideHudComponentThisFrame(9);   // street name
    mp.game.ui.hideHudComponentThisFrame(13);  // cash change
});

// 5 раз в секунду обновляем динамические значения
setInterval(() => {
    if (!isAuthorized || !hudBrowser) return;
    const local = mp.players.local;
    const veh = local.vehicle;
    let speed = 0;
    if (veh) {
        const v = veh.getVelocity();
        speed = Math.round(Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) * 3.6); // м/с → км/ч
    }
    const data = {
        health: Math.max(0, Math.floor(local.getHealth() - 100)),
        armor: Math.floor(local.getArmour()),
        inVehicle: !!veh,
        speed,
        fuel: veh ? 100 : 0,
        engine: veh ? !!veh.getIsEngineRunning : false
    };
    hudBrowser.execute(`window.tickHUD(${JSON.stringify(data)})`);
}, 200);

// ─── Уведомления ───
function notify(type, title, text) {
    if (notifyBrowser) {
        notifyBrowser.execute(`window.pushNotify(${JSON.stringify({ type, title, text })})`);
    }
}
mp.events.add('majestic:notify', (type, title, text) => notify(type, title, text));

// ─── Экран смерти ───
mp.events.add('majestic:death:show', (sec) => {
    if (deathBrowser) destroy(deathBrowser);
    deathBrowser = mp.browsers.new('package://death/index.html');
    setTimeout(() => deathBrowser && deathBrowser.execute(`window.startCountdown(${sec})`), 300);
});
mp.events.add('majestic:death:hide', () => {
    destroy(deathBrowser); deathBrowser = null;
});

// ─── Спектейт ───
mp.events.add('majestic:admin:spectate', (targetId) => {
    if (spectatingId === targetId) {
        spectatingId = null;
        mp.players.local.freezePosition(false);
        notify('info', 'Спектейт', 'Выключен');
        return;
    }
    spectatingId = targetId;
    const target = mp.players.atRemoteId(targetId);
    if (target) {
        mp.players.local.position = target.position;
        notify('info', 'Спектейт', 'Включен');
    }
});

// ─── Админка (F2) ───
mp.keys.bind(0x71, false, () => {
    if (!isAuthorized) return;
    if (myAdminLevel < 1) {
        notify('error', 'Доступ запрещён', 'Админ-панель только для админов');
        return;
    }
    if (adminBrowser) { closeAdmin(); return; }
    openAdmin();
});

function openAdmin() {
    adminBrowser = mp.browsers.new('package://admin/index.html');
    mp.gui.cursor.show(true, true);
    mp.events.callRemote('majestic:admin:open');
}
function closeAdmin() {
    destroy(adminBrowser); adminBrowser = null;
    mp.gui.cursor.show(false, false);
}

mp.events.add('majestic:admin:data', (payload) => {
    if (!adminBrowser) return;
    setTimeout(() => adminBrowser.execute(`window.renderAdmin(${JSON.stringify(payload)})`), 150);
});

// ─── CEF → клиент ───
mp.events.add('majestic:cef:auth:register', (l, p) => mp.events.callRemote('majestic:auth:register', l, p));
mp.events.add('majestic:cef:auth:login', (l, p) => mp.events.callRemote('majestic:auth:login', l, p));
mp.events.add('majestic:cef:admin:close', () => closeAdmin());
mp.events.add('majestic:cef:admin:refresh', () => mp.events.callRemote('majestic:admin:open'));
mp.events.add('majestic:cef:admin:action', (action, target, arg) => {
    mp.events.callRemote('majestic:admin:action', action, target, arg || '');
});

// ─── Меню (M) ───
mp.keys.bind(0x4D, false, () => {
    if (!isAuthorized) return;
    notify('info', 'Меню персонажа', 'Открытие меню (заготовка)');
});
