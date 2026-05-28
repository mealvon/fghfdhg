module.exports = {
    serverName: 'MAJESTIC LOCAL ROLEPLAY',
    serverTag: 'majestic.rp',
    firstAdmin: 'admin',
    startMoney: 5000,
    startBank: 10000,
    spawnPos: { x: -1037.79, y: -2737.99, z: 20.17 },
    spawnHeading: 327.4,
    deathRespawnSec: 8,
    hungerThirstTickSec: 60,    // каждые 60с -1
    hungerThirstHpDamage: 3,    // если шкала на нуле — урон в секунду
    adminLevels: {
        0: 'Игрок',
        1: 'Помощник',
        2: 'Модератор',
        3: 'Главный модератор',
        4: 'Администратор',
        5: 'Главный администратор',
        6: 'Куратор',
        7: 'Владелец'
    },
    // Часто используемые телепорты (как у Majestic в админке)
    teleports: [
        { name: 'LSPD (Mission Row)',     pos: [428.05, -984.20, 29.34] },
        { name: 'Госпиталь Pillbox',      pos: [307.62, -595.45, 43.28] },
        { name: 'Аэропорт LS',            pos: [-1037.79, -2737.99, 20.17] },
        { name: 'Vinewood Sign',          pos: [712.11, 1198.62, 351.16] },
        { name: 'Mount Chiliad',          pos: [501.34, 5604.96, 797.91] },
        { name: 'Sandy Shores PD',        pos: [1853.35, 3690.18, 34.27] },
        { name: 'Paleto PD',              pos: [-447.32, 6012.92, 31.71] },
        { name: 'Тюрьма Bolingbroke',     pos: [1697.86, 2563.65, 45.56] },
        { name: 'Casino Diamond',         pos: [925.13, 46.31, 81.10] },
        { name: 'Maze Bank Arena',        pos: [-324.65, -1965.10, 27.85] }
    ]
};
