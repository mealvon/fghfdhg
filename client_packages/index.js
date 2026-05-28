// Точка входа клиентской части RAGE:MP

let authBrowser = null;
let hudBrowser = null;
let adminBrowser = null;
let isAuthorized = false;
let myAdminLevel = 0;

function destroy(b) {
    if (b && b.destroy) try { b.destroy(); } catch (e) {}
}

// ---------- Авторизация ----------
mp.events.add('majestic:auth:show', () => {
    if (authBrowser) return;
    mp.gui.cursor.show(true, true);
    mp.gui.chat.show(false);
    authBrowser = mp.browsers.new('package://auth/index.html');
});

mp.events.add('majestic:auth:ok', (data) => {
    isAuthorized = true;
    myAdminLevel = data.adminLevel || 0;
    destroy(authBrowser); authBrowser = null;
    mp.gui.cursor.show(false, false);
    mp.gui.chat.show(true);
    // HUD
    if (!hudBrowser) hudBrowser = mp.browsers.new('package://hud/index.html');
    setTimeout(() => {
        if (hudBrowser) hudBrowser.execute(`window.updateHUD(${JSON.stringify(data)})`);
    }, 300);
});

mp.events.add('majestic:auth:error', (msg) => {
    if (authBrowser) authBrowser.execute(`window.showError(${JSON.stringify(msg)})`);
});

mp.events.add('majestic:hud:money', (money) => {
    if (hudBrowser) hudBrowser.execute(`window.setMoney(${money})`);
});

// ---------- Админка ----------
mp.keys.bind(0x71, false, () => { // F2
    if (!isAuthorized) return;
    if (myAdminLevel < 1) {
        mp.gui.chat.push('!{#ff6b6b}Нет прав на админку.');
        return;
    }
    if (adminBrowser) {
        closeAdmin();
        return;
    }
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

mp.events.add('majestic:admin:data', (data) => {
    if (!adminBrowser) return;
    setTimeout(() => {
        adminBrowser.execute(`window.renderAdmin(${JSON.stringify(data)})`);
    }, 200);
});

// Запросы из CEF
mp.events.add('majestic:cef:auth:register', (login, password) => {
    mp.events.callRemote('majestic:auth:register', login, password);
});
mp.events.add('majestic:cef:auth:login', (login, password) => {
    mp.events.callRemote('majestic:auth:login', login, password);
});
mp.events.add('majestic:cef:admin:close', () => closeAdmin());
mp.events.add('majestic:cef:admin:refresh', () => mp.events.callRemote('majestic:admin:open'));
mp.events.add('majestic:cef:admin:action', (action, targetId, arg) => {
    mp.events.callRemote('majestic:admin:action', action, parseInt(targetId, 10), arg || '');
});

// Скрыть стандартные элементы интерфейса GTA
mp.events.add('render', () => {
    mp.game.ui.hideHudComponentThisFrame(1);  // wanted stars
    mp.game.ui.hideHudComponentThisFrame(2);  // weapon icon
    mp.game.ui.hideHudComponentThisFrame(3);  // cash
    mp.game.ui.hideHudComponentThisFrame(4);  // mp cash
    mp.game.ui.hideHudComponentThisFrame(13); // area name
});
