export type Point = {
  x: number;
  y: number;
};

export type LayerKey =
  | "danger"
  | "stealth"
  | "visibility"
  | "routeCost"
  | "cover"
  | "positions"
  | "noise";

export type Posture = "stand" | "crouch" | "prone";
export type MoveMode = "cautious" | "walk" | "fast" | "sprint";
export type OrderType = "observe" | "advance" | "assault" | "hold" | "contact";
export type CommState = "online" | "weak" | "lost";
export type UnitStatus = "ready" | "moving" | "engaging" | "suppressed" | "wounded" | "outOfComms";

export type RouteSegment = {
  mode: MoveMode;
  posture: Posture;
  note: string;
};

export type AssignedRoute = {
  points: Point[];
  segments: RouteSegment[];
  travelled: number;
  label: string;
  orderType: OrderType;
};

export type Unit = {
  id: string;
  callsign: string;
  role: string;
  groupId: string;
  x: number;
  y: number;
  facing: number;
  health: number;
  morale: number;
  stamina: number;
  suppression: number;
  ammo: number;
  magazine: number;
  posture: Posture;
  requestedPosture: Posture;
  moveMode: MoveMode;
  weapon: string;
  task: string;
  orderLabel: string;
  orderType: OrderType;
  status: UnitStatus;
  warnings: string[];
  visibleTargets: string[];
  threatFrom: string[];
  comms: CommState;
  cover: number;
  stealth: number;
  noise: number;
  actionProgress: number;
  spotted: boolean;
  underFire: boolean;
  suppressed: boolean;
  wounded: boolean;
  firing: boolean;
  route?: AssignedRoute | null;
};

export type EnemyContact = {
  id: string;
  label: string;
  x: number;
  y: number;
  facing: number;
  contact: "confirmed" | "suspected" | "firing";
  strength: string;
  lastKnown: string;
  threat: number;
  confidence: number;
  seeing: string[];
  note: string;
};

export type Group = {
  id: string;
  name: string;
  callsign: string;
  commander: string;
  unitIds: string[];
  objective: string;
  orderLabel: string;
  orderType: OrderType;
  cohesion: number;
  formation: string;
};

export type CoverNode = {
  id: string;
  x: number;
  y: number;
  rating: "hard" | "soft";
  label: string;
};

export type TacticalPosition = {
  id: string;
  x: number;
  y: number;
  type: "overwatch" | "flank" | "support" | "breach";
  label: string;
};

export type NoiseSource = {
  id: string;
  x: number;
  y: number;
  radius: number;
  level: "low" | "medium" | "high";
  label: string;
};

export type SeedNotification = {
  type: "info" | "success" | "warn" | "critical";
  title: string;
  text: string;
};

export const initialLayers: Record<LayerKey, boolean> = {
  danger: true,
  stealth: false,
  visibility: true,
  routeCost: false,
  cover: true,
  positions: true,
  noise: false,
};

export const groups: Group[] = [
  {
    id: "alpha",
    name: "Штурмовая группа Альфа",
    callsign: "Альфа",
    commander: "Волк-1",
    unitIds: ["alpha-1", "alpha-2", "alpha-3", "alpha-4"],
    objective: "Удержать восточный склон высоты и подавить сарай у фермы.",
    orderLabel: "Наблюдение и короткие перебежки",
    orderType: "advance",
    cohesion: 82,
    formation: "рассредоточенная линия",
  },
  {
    id: "bravo",
    name: "Группа прикрытия Браво",
    callsign: "Браво",
    commander: "Гранит-1",
    unitIds: ["bravo-1", "bravo-2"],
    objective: "Прикрывать склон и держать южную усадьбу под огнём.",
    orderLabel: "Огневое прикрытие",
    orderType: "hold",
    cohesion: 61,
    formation: "двойки по укрытиям",
  },
];

export const initialUnits: Unit[] = [
  {
    id: "alpha-1",
    callsign: "Волк-1",
    role: "Командир отделения",
    groupId: "alpha",
    x: 44,
    y: 58,
    facing: 12,
    health: 92,
    morale: 84,
    stamina: 71,
    suppression: 18,
    ammo: 146,
    magazine: 24,
    posture: "crouch",
    requestedPosture: "crouch",
    moveMode: "walk",
    weapon: "АК-12 + ГП-25",
    task: "Контроль фермы и восточного фланга",
    orderLabel: "Удерживать гребень",
    orderType: "observe",
    status: "ready",
    warnings: ["Открыт правый фланг", "Видим сарай, но без надёжного укрытия"],
    visibleTargets: ["enemy-barn", "enemy-woods"],
    threatFrom: ["enemy-barn"],
    comms: "online",
    cover: 63,
    stealth: 42,
    noise: 31,
    actionProgress: 76,
    spotted: true,
    underFire: true,
    suppressed: false,
    wounded: false,
    firing: false,
    route: null,
  },
  {
    id: "alpha-2",
    callsign: "Волк-2",
    role: "Марксман",
    groupId: "alpha",
    x: 35,
    y: 27,
    facing: 48,
    health: 100,
    morale: 78,
    stamina: 68,
    suppression: 11,
    ammo: 42,
    magazine: 8,
    posture: "prone",
    requestedPosture: "prone",
    moveMode: "cautious",
    weapon: "СВД-М",
    task: "Перебежка к северной кромке леса",
    orderLabel: "Смена позиции",
    orderType: "advance",
    status: "moving",
    warnings: ["Видит сектор фермы", "Требует прикрытие при выходе из леса"],
    visibleTargets: ["enemy-ridge"],
    threatFrom: ["enemy-ridge"],
    comms: "online",
    cover: 74,
    stealth: 81,
    noise: 18,
    actionProgress: 54,
    spotted: false,
    underFire: false,
    suppressed: false,
    wounded: false,
    firing: false,
    route: {
      points: [
        { x: 35, y: 27 },
        { x: 39, y: 24 },
        { x: 43, y: 22 },
        { x: 49, y: 20 },
      ],
      segments: [
        { mode: "cautious", posture: "prone", note: "ползком вдоль кромки леса" },
        { mode: "walk", posture: "crouch", note: "перебежка между пятнами укрытия" },
        { mode: "cautious", posture: "prone", note: "развёртывание на позиции" },
      ],
      travelled: 2.8,
      label: "Северный наблюдательный рубеж",
      orderType: "advance",
    },
  },
  {
    id: "alpha-3",
    callsign: "Волк-3",
    role: "Гранатомётчик",
    groupId: "alpha",
    x: 18,
    y: 29,
    facing: 4,
    health: 96,
    morale: 61,
    stamina: 52,
    suppression: 63,
    ammo: 88,
    magazine: 27,
    posture: "crouch",
    requestedPosture: "prone",
    moveMode: "fast",
    weapon: "АК-12 + РПГ-26",
    task: "Ищет окно для выстрела по сараю",
    orderLabel: "Прижаться и ждать приказ",
    orderType: "hold",
    status: "suppressed",
    warnings: ["Подавлен огнём из сарая", "Бег временно недоступен"],
    visibleTargets: ["enemy-barn"],
    threatFrom: ["enemy-barn", "enemy-ridge"],
    comms: "weak",
    cover: 47,
    stealth: 38,
    noise: 45,
    actionProgress: 29,
    spotted: true,
    underFire: true,
    suppressed: true,
    wounded: false,
    firing: false,
    route: null,
  },
  {
    id: "alpha-4",
    callsign: "Волк-4",
    role: "Санитар",
    groupId: "alpha",
    x: 60,
    y: 71,
    facing: -28,
    health: 74,
    morale: 72,
    stamina: 57,
    suppression: 24,
    ammo: 120,
    magazine: 21,
    posture: "crouch",
    requestedPosture: "crouch",
    moveMode: "walk",
    weapon: "АКС-74У",
    task: "Подтягивается к мешкам и держит медикаменты наготове",
    orderLabel: "Поддержка и эвакуация",
    orderType: "contact",
    status: "wounded",
    warnings: ["Лёгкое ранение левого плеча", "Боекомплект снижен"],
    visibleTargets: [],
    threatFrom: ["enemy-barn"],
    comms: "online",
    cover: 69,
    stealth: 44,
    noise: 26,
    actionProgress: 48,
    spotted: false,
    underFire: false,
    suppressed: false,
    wounded: true,
    firing: false,
    route: null,
  },
  {
    id: "bravo-1",
    callsign: "Гранит-1",
    role: "Пулемётчик",
    groupId: "bravo",
    x: 24,
    y: 75,
    facing: -10,
    health: 89,
    morale: 67,
    stamina: 43,
    suppression: 36,
    ammo: 320,
    magazine: 86,
    posture: "prone",
    requestedPosture: "prone",
    moveMode: "cautious",
    weapon: "ПКП Печенег",
    task: "Подавляет восточный склон короткими очередями",
    orderLabel: "Огневое прикрытие",
    orderType: "hold",
    status: "engaging",
    warnings: ["Связь нестабильна", "Сектор простреливается, но без манёвра"],
    visibleTargets: ["enemy-barn"],
    threatFrom: ["enemy-ridge"],
    comms: "weak",
    cover: 71,
    stealth: 24,
    noise: 78,
    actionProgress: 64,
    spotted: true,
    underFire: true,
    suppressed: false,
    wounded: false,
    firing: true,
    route: null,
  },
  {
    id: "bravo-2",
    callsign: "Гранит-2",
    role: "Связист",
    groupId: "bravo",
    x: 29,
    y: 83,
    facing: -18,
    health: 100,
    morale: 58,
    stamina: 49,
    suppression: 14,
    ammo: 90,
    magazine: 28,
    posture: "crouch",
    requestedPosture: "crouch",
    moveMode: "walk",
    weapon: "АК-12",
    task: "Ищет точку для восстановления сети",
    orderLabel: "Связь и резерв",
    orderType: "advance",
    status: "outOfComms",
    warnings: ["Радиосеть потеряна", "Не может принять групповой приказ"],
    visibleTargets: [],
    threatFrom: [],
    comms: "lost",
    cover: 58,
    stealth: 51,
    noise: 21,
    actionProgress: 37,
    spotted: false,
    underFire: false,
    suppressed: false,
    wounded: false,
    firing: false,
    route: {
      points: [
        { x: 29, y: 83 },
        { x: 33, y: 79 },
        { x: 36, y: 76 },
        { x: 40, y: 73 },
      ],
      segments: [
        { mode: "walk", posture: "crouch", note: "движение к сараю южнее" },
        { mode: "cautious", posture: "crouch", note: "скрытный подход вдоль стены" },
        { mode: "cautious", posture: "prone", note: "развёртывание антенны" },
      ],
      travelled: 0.6,
      label: "Промежуточная радиоточка",
      orderType: "advance",
    },
  },
];

export const enemyContacts: EnemyContact[] = [
  {
    id: "enemy-ridge",
    label: "Сектор R-2",
    x: 77,
    y: 26,
    facing: 210,
    contact: "confirmed",
    strength: "2 бойца",
    lastKnown: "У западной стены фермы",
    threat: 82,
    confidence: 89,
    seeing: ["alpha-2", "alpha-3", "bravo-1"],
    note: "Маркер подтверждён наблюдением марксмана.",
  },
  {
    id: "enemy-woods",
    label: "Сектор W-1",
    x: 56,
    y: 17,
    facing: 145,
    contact: "suspected",
    strength: "неясно",
    lastKnown: "Северная кромка леса",
    threat: 46,
    confidence: 51,
    seeing: ["alpha-1"],
    note: "Шум и краткая вспышка в деревьях; контакт не подтверждён.",
  },
  {
    id: "enemy-barn",
    label: "Сектор B-4",
    x: 72,
    y: 68,
    facing: 196,
    contact: "firing",
    strength: "ПКМ + 1 стрелок",
    lastKnown: "Песчаные мешки у сарая",
    threat: 94,
    confidence: 97,
    seeing: ["alpha-1", "alpha-3", "alpha-4"],
    note: "Источник подавляющего огня по восточному склону.",
  },
];

export const coverNodes: CoverNode[] = [
  { id: "cover-1", x: 63, y: 70, rating: "hard", label: "мешки" },
  { id: "cover-2", x: 46, y: 55, rating: "soft", label: "гряда" },
  { id: "cover-3", x: 17, y: 32, rating: "soft", label: "лесная кромка" },
  { id: "cover-4", x: 79, y: 24, rating: "hard", label: "угол фермы" },
  { id: "cover-5", x: 31, y: 77, rating: "hard", label: "южный дом" },
];

export const tacticalPositions: TacticalPosition[] = [
  { id: "pos-1", x: 49, y: 53, type: "overwatch", label: "Гребень 101" },
  { id: "pos-2", x: 42, y: 22, type: "support", label: "Северный дозор" },
  { id: "pos-3", x: 66, y: 72, type: "breach", label: "Подход к мешкам" },
  { id: "pos-4", x: 26, y: 74, type: "flank", label: "Южный обход" },
];

export const noiseSources: NoiseSource[] = [
  { id: "noise-1", x: 72, y: 68, radius: 12, level: "high", label: "ПКМ противника" },
  { id: "noise-2", x: 24, y: 75, radius: 8, level: "medium", label: "Пулемёт Браво" },
  { id: "noise-3", x: 56, y: 17, radius: 6, level: "low", label: "Подозрительный шум" },
];

export const seedNotifications: SeedNotification[] = [
  {
    type: "warn",
    title: "Контакт у сарая",
    text: "Волк-3 получил подавление от сектора B-4. Рекомендуется сменить силуэт и сократить экспозицию.",
  },
  {
    type: "info",
    title: "Сеть частично потеряна",
    text: "Гранит-2 временно выпал из радиосети. Групповой приказ не гарантированно дойдёт до узла поддержки.",
  },
  {
    type: "success",
    title: "Маркер позиции подтверждён",
    text: "Северный наблюдательный рубеж даёт хороший обзор на двор фермы и восточную стену.",
  },
];
