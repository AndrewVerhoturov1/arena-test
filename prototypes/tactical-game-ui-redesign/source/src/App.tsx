import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { cn } from "./utils/cn";
import {
  coverNodes,
  enemyContacts,
  groups,
  initialLayers,
  initialUnits,
  noiseSources,
  seedNotifications,
  tacticalPositions,
  type AssignedRoute,
  type CommState,
  type Group,
  type LayerKey,
  type MoveMode,
  type OrderType,
  type Point,
  type Posture,
  type RouteSegment,
  type Unit,
} from "./data/tacticalData";

type SelectionMode = "unit" | "group";

type Notification = {
  id: number;
  type: "info" | "success" | "warn" | "critical";
  title: string;
  text: string;
};

type PendingRoute = {
  scope: SelectionMode;
  ownerId: string;
  points: Point[];
  segments: RouteSegment[];
  label: string;
  destination: Point;
  orderType: OrderType;
};

type TooltipState = {
  title: string;
  text: string;
  x: number;
  y: number;
};

type SectionKey = "layers" | "intel" | "orders" | "help";

const postureMeta: Record<Posture, { label: string; short: string; hint: string }> = {
  stand: {
    label: "Стоя",
    short: "ST",
    hint: "Максимальный обзор и скорость, но самый заметный силуэт.",
  },
  crouch: {
    label: "Пригнувшись",
    short: "CR",
    hint: "Компромисс между обзором, стабильностью и заметностью.",
  },
  prone: {
    label: "Лёжа",
    short: "PR",
    hint: "Лучше всего снижает профиль и подавление, но режет темп манёвра.",
  },
};

const moveMeta: Record<MoveMode, { label: string; short: string; hint: string; speed: string; noise: string; fatigue: string }> = {
  cautious: {
    label: "Осторожно",
    short: "C",
    hint: "Медленно, но тихо. Лучше сохраняет наблюдение и скрытность.",
    speed: "низкая",
    noise: "низкий",
    fatigue: "низкая",
  },
  walk: {
    label: "Шаг",
    short: "W",
    hint: "Стандартный темп для контроля местности и коротких перемещений.",
    speed: "средняя",
    noise: "умеренный",
    fatigue: "средняя",
  },
  fast: {
    label: "Быстро",
    short: "F",
    hint: "Короткий рывок с заметным ростом шума и падением наблюдения.",
    speed: "высокая",
    noise: "повышенный",
    fatigue: "выше средней",
  },
  sprint: {
    label: "Бегом",
    short: "S",
    hint: "Максимальный темп, резкий рост заметности и утомления.",
    speed: "максимальная",
    noise: "высокий",
    fatigue: "высокая",
  },
};

const orderMeta: Record<OrderType, { label: string; short: string; accent: string; description: string; task: string; groupOrder: string }> = {
  observe: {
    label: "Наблюдать",
    short: "OBS",
    accent: "border-sky-400/40 bg-sky-500/12 text-sky-100",
    description: "Сохранить обзор, ограничить силуэт, отдавать приоритет обнаружению.",
    task: "Наблюдение сектора",
    groupOrder: "Наблюдение и контроль",
  },
  advance: {
    label: "Сдвиг",
    short: "ADV",
    accent: "border-cyan-400/40 bg-cyan-500/12 text-cyan-100",
    description: "Контролируемое выдвижение по маршруту без потери связи и наблюдения.",
    task: "Выдвижение к рубежу",
    groupOrder: "Контролируемое выдвижение",
  },
  assault: {
    label: "Штурм",
    short: "ASL",
    accent: "border-red-400/40 bg-red-500/12 text-red-100",
    description: "Агрессивный манёвр с приоритетом темпа и огневого давления.",
    task: "Штурмовой манёвр",
    groupOrder: "Штурмовой натиск",
  },
  hold: {
    label: "Удерживать",
    short: "HLD",
    accent: "border-emerald-400/40 bg-emerald-500/12 text-emerald-100",
    description: "Закрепиться на позиции, стабилизировать сектор и сократить риски.",
    task: "Удержание позиции",
    groupOrder: "Закрепление и удержание",
  },
  contact: {
    label: "По контакту",
    short: "CNT",
    accent: "border-amber-400/40 bg-amber-500/12 text-amber-100",
    description: "Гибкая реакция на угрозу: движение, укрытие и ответный огонь по обстановке.",
    task: "Реакция на контакт",
    groupOrder: "Гибкий режим по контакту",
  },
};

const layerMeta: Record<LayerKey, { label: string; color: string; description: string; legend: string }> = {
  danger: {
    label: "Опасность",
    color: "#f46a5d",
    description: "Вероятные и подтверждённые направления угрозы, зоны прострела и давления.",
    legend: "Красное и оранжевое — известная и предполагаемая угроза.",
  },
  stealth: {
    label: "Скрытность",
    color: "#4ad28c",
    description: "Зоны, где проще сохранять низкий профиль и выходить из видимости.",
    legend: "Зелёное — участки, выгодные для скрытного перемещения.",
  },
  visibility: {
    label: "Видимость",
    color: "#62b8ff",
    description: "Сектора обзора дружественных и угрожающих контактов относительно выбора.",
    legend: "Холодный синий — обзор своих, алый — кто может видеть вас.",
  },
  routeCost: {
    label: "Стоимость маршрута",
    color: "#a987ff",
    description: "Условная цена перемещения: открытое поле дороже, дорога и складки дешевле.",
    legend: "Фиолетовое — где маршрут потенциально дороже по времени и риску.",
  },
  cover: {
    label: "Укрытия",
    color: "#79d08c",
    description: "Точки жёсткого и мягкого укрытия, пригодные для короткой остановки.",
    legend: "Щиты отмечают укрытия; заполнение показывает их качество.",
  },
  positions: {
    label: "Тактические позиции",
    color: "#8bd5d5",
    description: "Выбранные позиции для наблюдения, обхода, поддержки и пролома.",
    legend: "Холодные маркеры — рекомендуемые тактические точки.",
  },
  noise: {
    label: "Шум",
    color: "#f3b96a",
    description: "Зоны слышимости и шумовые следы текущего огня и движения.",
    legend: "Янтарные кольца — источники шума и радиусы их слышимости.",
  },
};

const commMeta: Record<CommState, { label: string; tone: string }> = {
  online: { label: "Сеть стабильна", tone: "text-emerald-300" },
  weak: { label: "Сеть нестабильна", tone: "text-amber-300" },
  lost: { label: "Связь потеряна", tone: "text-red-300" },
};

const statusMeta: Record<Unit["status"], { label: string; tone: string }> = {
  ready: { label: "Готов", tone: "text-emerald-300" },
  moving: { label: "В движении", tone: "text-cyan-300" },
  engaging: { label: "Ведёт огонь", tone: "text-red-300" },
  suppressed: { label: "Подавлен", tone: "text-amber-300" },
  wounded: { label: "Ранен", tone: "text-rose-300" },
  outOfComms: { label: "Вне связи", tone: "text-red-300" },
};

const timeModes = [0, 0.5, 1, 2, 4] as const;
const mapBounds = { min: 4, max: 96 };
const tickMoveByMode: Record<MoveMode, number> = {
  cautious: 0.16,
  walk: 0.26,
  fast: 0.38,
  sprint: 0.54,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const percent = (value: number) => `${clamp(value, 0, 100)}%`;

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function averagePoint(points: Point[]) {
  const total = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function routeLengths(points: Point[]) {
  return points.slice(1).map((point, index) => distance(points[index], point));
}

function routeTotal(points: Point[]) {
  return routeLengths(points).reduce((sum, value) => sum + value, 0);
}

function pointAtDistance(points: Point[], travelled: number) {
  const lengths = routeLengths(points);
  let remaining = travelled;

  for (let index = 0; index < lengths.length; index += 1) {
    const segment = lengths[index];
    const start = points[index];
    const end = points[index + 1];

    if (remaining <= segment) {
      const ratio = segment === 0 ? 0 : remaining / segment;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }

    remaining -= segment;
  }

  return points[points.length - 1];
}

function segmentIndexAtDistance(points: Point[], travelled: number) {
  const lengths = routeLengths(points);
  let remaining = travelled;

  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index]) return index;
    remaining -= lengths[index];
  }

  return Math.max(0, lengths.length - 1);
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function sectorPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function locationLabel(point: Point) {
  if (point.x > 68 && point.y < 38) return "ферме справа";
  if (point.x > 64 && point.y > 60) return "мешкам у сарая";
  if (point.x < 30 && point.y > 70) return "южному дому";
  if (point.y < 24) return "северной кромке леса";
  if (point.x > 38 && point.x < 62 && point.y > 44 && point.y < 62) return "гребню 101";
  return "новому рубежу";
}

function buildRoutePlan(origin: Point, destination: Point, moveMode: MoveMode, posture: Posture, orderType: OrderType) {
  const safeDestination = {
    x: clamp(destination.x, mapBounds.min, mapBounds.max),
    y: clamp(destination.y, mapBounds.min, mapBounds.max),
  };

  const dx = safeDestination.x - origin.x;
  const dy = safeDestination.y - origin.y;
  const bendX = clamp(-dy * 0.12, -7, 7);
  const bendY = clamp(dx * 0.09, -5, 5);
  const mid1 = {
    x: clamp(origin.x + dx * 0.34 + bendX, mapBounds.min, mapBounds.max),
    y: clamp(origin.y + dy * 0.26 + bendY, mapBounds.min, mapBounds.max),
  };
  const mid2 = {
    x: clamp(origin.x + dx * 0.72 - bendX * 0.45, mapBounds.min, mapBounds.max),
    y: clamp(origin.y + dy * 0.7 + bendY * 0.35, mapBounds.min, mapBounds.max),
  };

  const crossingMode = moveMode === "sprint" ? "fast" : moveMode === "fast" ? "walk" : moveMode;
  const crossingPosture = posture === "stand" ? "crouch" : posture;
  const segments: RouteSegment[] = [
    {
      mode: orderType === "assault" ? "fast" : moveMode,
      posture,
      note: orderType === "assault" ? "резкий выход с позиции" : "срыв с текущего укрытия",
    },
    {
      mode: orderType === "observe" ? "cautious" : crossingMode,
      posture: orderType === "observe" ? "crouch" : crossingPosture,
      note: "пересечение открытого участка",
    },
    {
      mode: orderType === "hold" ? "cautious" : moveMode,
      posture: orderType === "assault" ? "crouch" : posture,
      note: "занять конечный сектор",
    },
  ];

  return {
    points: [origin, mid1, mid2, safeDestination],
    segments,
    label: locationLabel(safeDestination),
    destination: safeDestination,
    orderType,
  };
}

function formationOffset(index: number) {
  const row = Math.floor(index / 2);
  const column = index % 2;
  return {
    x: (column === 0 ? -1 : 1) * 2.2,
    y: row * 2.2 - 1.2,
  };
}

function applyRouteToUnit(unit: Unit, route: Omit<AssignedRoute, "travelled">) {
  const firstSegment = route.segments[0];
  return {
    ...unit,
    moveMode: firstSegment.mode,
    posture: firstSegment.posture,
    requestedPosture: firstSegment.posture,
    status: "moving" as const,
    task: `${orderMeta[route.orderType].task} · ${route.label}`,
    orderLabel: orderMeta[route.orderType].label,
    orderType: route.orderType,
    route: {
      ...route,
      travelled: 0,
    },
  };
}

function advanceUnit(unit: Unit, multiplier: number): Unit {
  if (!unit.route) return unit;

  const route = unit.route;
  const lengths = routeLengths(route.points);
  const total = lengths.reduce((sum, value) => sum + value, 0);
  const index = segmentIndexAtDistance(route.points, route.travelled);
  const segment = route.segments[Math.min(index, route.segments.length - 1)];
  const delta = tickMoveByMode[segment.mode] * Math.max(multiplier, 0.25);
  const travelled = route.travelled + delta;

  if (travelled >= total) {
    const destination = route.points[route.points.length - 1];
    return {
      ...unit,
      x: destination.x,
      y: destination.y,
      route: null,
      task: `На позиции: ${route.label}`,
      orderLabel: orderMeta[route.orderType].label,
      orderType: route.orderType,
      status: (unit.underFire ? "engaging" : "ready") as Unit["status"],
      actionProgress: 100,
    };
  }

  const nextPosition = pointAtDistance(route.points, travelled);
  const nextIndex = segmentIndexAtDistance(route.points, travelled);
  const nextSegment = route.segments[Math.min(nextIndex, route.segments.length - 1)];

  return {
    ...unit,
    x: nextPosition.x,
    y: nextPosition.y,
    posture: nextSegment.posture,
    requestedPosture: nextSegment.posture,
    moveMode: nextSegment.mode,
    actionProgress: clamp(20 + (travelled / total) * 70, 0, 100),
    route: {
      ...route,
      travelled,
    },
  };
}

function availabilityReason(unit: Unit, type: "posture" | "move", value: Posture | MoveMode) {
  if (type === "posture") {
    const posture = value as Posture;
    if (posture === "stand" && (unit.suppression > 58 || unit.underFire)) {
      return "Стоять слишком рискованно: боец под угрозой и заметно увеличит силуэт.";
    }
    return null;
  }

  const mode = value as MoveMode;
  if (mode === "sprint" && (unit.wounded || unit.suppression > 45 || unit.posture === "prone")) {
    return "Бегом недоступно: текущее ранение, подавление или положение не позволяют безопасный рывок.";
  }
  if (mode === "fast" && unit.comms === "lost") {
    return "Быстрое перемещение заблокировано: боец вне связи и должен восстановить сеть.";
  }

  return null;
}

function formatTime(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor(normalized % 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((normalized % 1) * 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function statTone(value: number, inverse = false) {
  if (inverse) {
    if (value > 66) return "from-red-400 to-orange-300";
    if (value > 33) return "from-amber-400 to-yellow-200";
    return "from-emerald-400 to-lime-200";
  }

  if (value > 66) return "from-emerald-400 to-lime-200";
  if (value > 33) return "from-amber-400 to-yellow-200";
  return "from-rose-400 to-red-300";
}

function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={cn("h-5 w-5", className)}>
      {children}
    </svg>
  );
}

function PostureIcon({ posture }: { posture: Posture }) {
  if (posture === "stand") {
    return (
      <IconBase>
        <circle cx="12" cy="5" r="2.4" />
        <path d="M12 7.8v6.6" />
        <path d="M8.7 11.2 12 9.5l3.3 1.7" />
        <path d="M9.5 19.3 12 14.4l2.5 4.9" />
      </IconBase>
    );
  }

  if (posture === "crouch") {
    return (
      <IconBase>
        <circle cx="11.3" cy="5.2" r="2.2" />
        <path d="M11.3 7.4v4.3l3.4 2.5" />
        <path d="M7.8 18.6h5.6" />
        <path d="M11.3 11.2 8.4 15.1" />
        <path d="M14.7 14.1 12 18.6" />
      </IconBase>
    );
  }

  return (
    <IconBase>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M10 8h5l2 2.4" />
      <path d="M8.1 10.2 12.4 12l4.8 1.9" />
      <path d="M4.3 13.3h7.6" />
    </IconBase>
  );
}

function MoveIcon({ mode }: { mode: MoveMode }) {
  if (mode === "cautious") {
    return (
      <IconBase>
        <path d="M5 12h14" />
        <path d="m13 8 4 4-4 4" />
        <path d="M5 7h5" />
      </IconBase>
    );
  }

  if (mode === "walk") {
    return (
      <IconBase>
        <path d="M4 12h15" />
        <path d="m12 7 7 5-7 5" />
      </IconBase>
    );
  }

  if (mode === "fast") {
    return (
      <IconBase>
        <path d="M4 8h10" />
        <path d="M4 16h14" />
        <path d="m12 5 7 7-7 7" />
      </IconBase>
    );
  }

  return (
    <IconBase>
      <path d="M4 7h11" />
      <path d="M4 12h15" />
      <path d="M4 17h11" />
      <path d="m12 4 8 8-8 8" />
    </IconBase>
  );
}

function LayerIcon({ layer }: { layer: LayerKey }) {
  if (layer === "danger") {
    return (
      <IconBase>
        <path d="M12 3 3.5 19h17L12 3Z" />
        <path d="M12 9v4.8" />
        <path d="M12 17.2h.01" />
      </IconBase>
    );
  }
  if (layer === "stealth") {
    return (
      <IconBase>
        <path d="M3 12s3.4-5.5 9-5.5S21 12 21 12s-3.4 5.5-9 5.5S3 12 3 12Z" />
        <path d="m4 4 16 16" />
      </IconBase>
    );
  }
  if (layer === "visibility") {
    return (
      <IconBase>
        <path d="M3 12s3.4-5.5 9-5.5S21 12 21 12s-3.4 5.5-9 5.5S3 12 3 12Z" />
        <circle cx="12" cy="12" r="2.8" />
      </IconBase>
    );
  }
  if (layer === "routeCost") {
    return (
      <IconBase>
        <path d="M5 18 10 6l4 5 5-7" />
        <path d="M18 4h1.8v1.8" />
      </IconBase>
    );
  }
  if (layer === "cover") {
    return (
      <IconBase>
        <path d="M12 4 6 6.4v5.1c0 3.6 2.1 6.8 6 8.5 3.9-1.7 6-4.9 6-8.5V6.4L12 4Z" />
      </IconBase>
    );
  }
  if (layer === "positions") {
    return (
      <IconBase>
        <path d="M12 4v16" />
        <path d="M8 8h8l-2.8 3.2L16 14H8l2.8-3.2L8 8Z" />
      </IconBase>
    );
  }
  return (
    <IconBase>
      <path d="M3 12c2.4-3.4 4.8-5 7.2-5 3.8 0 5.5 3.2 6.6 4.6.8 1 2.4 1.4 4.2 1.4" />
      <path d="M3 16c2.4-3.4 4.8-5 7.2-5 3.8 0 5.5 3.2 6.6 4.6.8 1 2.4 1.4 4.2 1.4" />
    </IconBase>
  );
}

function TimeIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 8v4.5l3 2" />
    </IconBase>
  );
}

function PauseIcon() {
  return (
    <IconBase>
      <path d="M9 6v12" />
      <path d="M15 6v12" />
    </IconBase>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <IconBase className={cn("transition-transform", open ? "rotate-90" : "rotate-0")}>
      <path d="m9 6 6 6-6 6" />
    </IconBase>
  );
}

function StatBar({ label, value, inverse = false, suffix = "%" }: { label: string; value: number; inverse?: boolean; suffix?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-zinc-400">
        <span>{label}</span>
        <span className="text-zinc-200">
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/6">
        <div
          className={cn("h-2 rounded-full bg-gradient-to-r transition-all duration-300", statTone(value, inverse))}
          style={{ width: `${clamp(value, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function SmallPill({ tone, children }: { tone?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.18em] uppercase", tone ?? "border-white/10 bg-white/5 text-zinc-200")}>
      {children}
    </span>
  );
}

function App() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const notificationId = useRef(seedNotifications.length + 1);
  const eventClock = useRef(0);
  const eventIndex = useRef(0);

  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [groupState, setGroupState] = useState<Group[]>(groups);
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnits[0]?.id ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("unit");
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    layers: true,
    intel: true,
    orders: true,
    help: false,
  });
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(initialLayers);
  const [layerOpacity, setLayerOpacity] = useState(58);
  const [timeSpeed, setTimeSpeed] = useState<(typeof timeModes)[number]>(1);
  const [simMinutes, setSimMinutes] = useState(6 * 60 + 42.2);
  const [pendingRoute, setPendingRoute] = useState<PendingRoute | null>(null);
  const [segmentFocus, setSegmentFocus] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    seedNotifications.map((entry, index) => ({ id: index + 1, ...entry })).reverse()
  );

  const selectedUnit = useMemo(() => units.find((unit) => unit.id === selectedUnitId) ?? units[0], [units, selectedUnitId]);
  const selectedGroup = useMemo(
    () => groupState.find((group) => group.id === selectedGroupId) ?? groupState[0],
    [groupState, selectedGroupId]
  );
  const selectedGroupUnits = useMemo(
    () => units.filter((unit) => unit.groupId === selectedGroupId),
    [units, selectedGroupId]
  );
  const activeRoutes = useMemo(() => units.filter((unit) => unit.route), [units]);
  const selectedUnits = selectionMode === "group" ? selectedGroupUnits : selectedUnit ? [selectedUnit] : [];
  const activeLayerCount = useMemo(() => Object.values(layers).filter(Boolean).length, [layers]);
  const selectedContactIds = useMemo(() => {
    if (selectionMode === "group") {
      return new Set(selectedGroupUnits.flatMap((unit) => unit.visibleTargets.concat(unit.threatFrom)));
    }
    return new Set((selectedUnit?.visibleTargets ?? []).concat(selectedUnit?.threatFrom ?? []));
  }, [selectedGroupUnits, selectedUnit, selectionMode]);
  const focusedContacts = enemyContacts.filter((contact) => selectedContactIds.has(contact.id));
  const pendingSegment = pendingRoute?.segments[segmentFocus] ?? null;
  const selectionOrigin = useMemo(() => {
    if (selectionMode === "group") {
      return averagePoint(selectedGroupUnits.map((unit) => ({ x: unit.x, y: unit.y })));
    }
    return selectedUnit ? { x: selectedUnit.x, y: selectedUnit.y } : { x: 50, y: 50 };
  }, [selectedGroupUnits, selectedUnit, selectionMode]);

  const pushNotification = useCallback((type: Notification["type"], title: string, text: string) => {
    const id = notificationId.current;
    notificationId.current += 1;
    setNotifications((previous) => [{ id, type, title, text }, ...previous].slice(0, 6));
    window.setTimeout(() => {
      setNotifications((previous) => previous.filter((entry) => entry.id !== id));
    }, 10000);
  }, []);

  const bindTooltip = useCallback(
    (title: string, text: string) => ({
      onMouseEnter: (event: ReactMouseEvent<HTMLElement>) =>
        setTooltip({ title, text, x: event.clientX + 18, y: event.clientY + 18 }),
      onMouseMove: (event: ReactMouseEvent<HTMLElement>) =>
        setTooltip({ title, text, x: event.clientX + 18, y: event.clientY + 18 }),
      onMouseLeave: () => setTooltip(null),
    }),
    []
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (timeSpeed === 0) return;
      setSimMinutes((value) => value + timeSpeed * 0.45);
      setUnits((previous) => previous.map((unit) => advanceUnit(unit, timeSpeed)));
      eventClock.current += timeSpeed;

      if (eventClock.current >= 7) {
        eventClock.current = 0;
        const scriptedEvents: Array<() => Notification> = [
          () => ({
            id: 0,
            type: "info",
            title: "Обновление наблюдения",
            text: "Волк-2 периодически видит сектор R-2 через просвет леса. Достоверность контакта стабильна.",
          }),
          () => ({
            id: 0,
            type: "warn",
            title: "Подавление сохраняется",
            text: "Волк-3 всё ещё прижат огнём у западной кромки. Рекомендуется сменить позу или путь.",
          }),
          () => ({
            id: 0,
            type: "critical",
            title: "Огонь из сарая",
            text: "Источник B-4 продолжает перекрывать восточный склон. Риск для командира отделения повышен.",
          }),
          () => ({
            id: 0,
            type: "success",
            title: "Маршрут выполняется",
            text: "Движущиеся бойцы сохраняют строй; сетка приказов и контроль участков остаются стабильными.",
          }),
        ];

        const nextEvent = scriptedEvents[eventIndex.current % scriptedEvents.length]();
        eventIndex.current += 1;
        pushNotification(nextEvent.type, nextEvent.title, nextEvent.text);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [pushNotification, timeSpeed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key === " ") {
        event.preventDefault();
        setTimeSpeed((value) => (value === 0 ? 1 : 0));
      }
      if (event.key === "Tab") {
        event.preventDefault();
        setRightCollapsed((value) => !value);
      }
      if (event.key.toLowerCase() === "l") {
        setLayers({
          danger: false,
          stealth: false,
          visibility: false,
          routeCost: false,
          cover: false,
          positions: false,
          noise: false,
        });
        pushNotification("info", "Слои отключены", "Все информационные слои на карте скрыты одной командой.");
      }
      if (event.key === "Escape") {
        setPendingRoute(null);
      }
      if (event.key === "Enter" && pendingRoute) {
        event.preventDefault();
        confirmPendingRoute();
      }

      const unitShortcutIndex = Number(event.key) - 1;
      if (Number.isInteger(unitShortcutIndex) && unitShortcutIndex >= 0 && unitShortcutIndex < 4) {
        const candidate = selectedGroupUnits[unitShortcutIndex];
        if (candidate) selectUnit(candidate.id);
      }

      const key = event.key.toLowerCase();
      if (key === "q") updatePosture("stand");
      if (key === "w") updatePosture("crouch");
      if (key === "e") updatePosture("prone");
      if (key === "z") updateMove("cautious");
      if (key === "x") updateMove("walk");
      if (key === "c") updateMove("fast");
      if (key === "v") updateMove("sprint");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingRoute, pushNotification, rightCollapsed, selectedGroupUnits, selectedUnit, selectionMode]);

  useEffect(() => {
    if (!pendingRoute) {
      setSegmentFocus(0);
      return;
    }
    if (segmentFocus >= pendingRoute.segments.length) {
      setSegmentFocus(0);
    }
  }, [pendingRoute, segmentFocus]);

  function selectUnit(id: string) {
    const unit = units.find((entry) => entry.id === id);
    if (!unit) return;
    setSelectedUnitId(id);
    setSelectedGroupId(unit.groupId);
    setSelectionMode("unit");
    setPendingRoute(null);
  }

  function selectGroup(id: string) {
    const group = groupState.find((entry) => entry.id === id);
    if (!group) return;
    setSelectedGroupId(id);
    setSelectionMode("group");
    setPendingRoute(null);
    const firstVisibleUnit = units.find((unit) => unit.groupId === id);
    if (firstVisibleUnit) setSelectedUnitId(firstVisibleUnit.id);
  }

  function updatePosture(next: Posture) {
    if (!selectedUnits.length) return;

    if (pendingRoute) {
      setPendingRoute((current) => {
        if (!current) return current;
        const segments = current.segments.map((segment, index) =>
          index === segmentFocus ? { ...segment, posture: next } : segment
        );
        return { ...current, segments };
      });
      pushNotification(
        "info",
        "Участок маршрута обновлён",
        `Для участка ${segmentFocus + 1} задана поза: ${postureMeta[next].label.toLowerCase()}.`
      );
      return;
    }

    const blocker = selectedUnits.find((unit) => availabilityReason(unit, "posture", next));
    if (blocker) {
      pushNotification("warn", "Действие ограничено", availabilityReason(blocker, "posture", next) ?? "Команда недоступна.");
      return;
    }

    const ids = new Set(selectedUnits.map((unit) => unit.id));
    setUnits((previous) =>
      previous.map((unit) =>
        ids.has(unit.id)
          ? {
              ...unit,
              requestedPosture: next,
            }
          : unit
      )
    );

    window.setTimeout(() => {
      setUnits((previous) =>
        previous.map((unit) =>
          ids.has(unit.id)
            ? {
                ...unit,
                posture: next,
                requestedPosture: next,
                suppression: clamp(unit.suppression + (next === "prone" ? -8 : next === "crouch" ? -2 : 4), 0, 100),
              }
            : unit
        )
      );
    }, 560);

    pushNotification(
      "success",
      selectionMode === "group" ? "Группа меняет позу" : "Поза принята",
      selectionMode === "group"
        ? `Группа ${selectedGroup.callsign} переходит в режим: ${postureMeta[next].label.toLowerCase()}.`
        : `${selectedUnit.callsign} меняет позу на ${postureMeta[next].label.toLowerCase()}.`
    );
  }

  function updateMove(next: MoveMode) {
    if (!selectedUnits.length) return;

    if (pendingRoute) {
      setPendingRoute((current) => {
        if (!current) return current;
        const segments = current.segments.map((segment, index) =>
          index === segmentFocus ? { ...segment, mode: next } : segment
        );
        return { ...current, segments };
      });
      pushNotification(
        "info",
        "Темп участка обновлён",
        `Для участка ${segmentFocus + 1} задан режим: ${moveMeta[next].label.toLowerCase()}.`
      );
      return;
    }

    const blocker = selectedUnits.find((unit) => availabilityReason(unit, "move", next));
    if (blocker) {
      pushNotification("warn", "Режим недоступен", availabilityReason(blocker, "move", next) ?? "Команда недоступна.");
      return;
    }

    const ids = new Set(selectedUnits.map((unit) => unit.id));
    setUnits((previous) =>
      previous.map((unit) =>
        ids.has(unit.id)
          ? {
              ...unit,
              moveMode: next,
            }
          : unit
      )
    );

    pushNotification(
      "success",
      "Темп перемещения обновлён",
      selectionMode === "group"
        ? `Группа ${selectedGroup.callsign} теперь движется в режиме: ${moveMeta[next].label.toLowerCase()}.`
        : `${selectedUnit.callsign} переходит в режим: ${moveMeta[next].label.toLowerCase()}.`
    );
  }

  function updateOrder(next: OrderType) {
    if (pendingRoute) {
      setPendingRoute((current) => (current ? { ...current, orderType: next } : current));
      pushNotification("info", "Тип приказа обновлён", `Планируемый приказ изменён на: ${orderMeta[next].label}.`);
      return;
    }

    if (selectionMode === "group") {
      setGroupState((previous) =>
        previous.map((group) =>
          group.id === selectedGroup.id
            ? {
                ...group,
                orderType: next,
                orderLabel: orderMeta[next].groupOrder,
              }
            : group
        )
      );
      pushNotification("success", "Групповой приказ обновлён", `${selectedGroup.name}: ${orderMeta[next].groupOrder}.`);
      return;
    }

    setUnits((previous) =>
      previous.map((unit) =>
        unit.id === selectedUnit.id
          ? {
              ...unit,
              orderType: next,
              orderLabel: orderMeta[next].label,
              task: orderMeta[next].task,
            }
          : unit
      )
    );
    pushNotification("success", "Приказ обновлён", `${selectedUnit.callsign}: ${orderMeta[next].label}.`);
  }

  function handleMapClick(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-no-map-click='true']")) return;
    if (!mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const baseRoute = buildRoutePlan(
      selectionOrigin,
      { x, y },
      selectionMode === "group" ? selectedGroupUnits[0]?.moveMode ?? "walk" : selectedUnit?.moveMode ?? "walk",
      selectionMode === "group" ? selectedGroupUnits[0]?.posture ?? "crouch" : selectedUnit?.posture ?? "crouch",
      selectionMode === "group" ? selectedGroup.orderType : selectedUnit?.orderType ?? "advance"
    );

    setPendingRoute({
      ...baseRoute,
      scope: selectionMode,
      ownerId: selectionMode === "group" ? selectedGroup.id : selectedUnit.id,
    });
    setSegmentFocus(0);
    pushNotification(
      "info",
      "Маршрут построен",
      selectionMode === "group"
        ? `Группе ${selectedGroup.callsign} намечен путь к ${baseRoute.label}. Отредактируйте участки и подтвердите приказ.`
        : `${selectedUnit.callsign} получил демонстрационный маршрут к ${baseRoute.label}.`
    );
  }

  function confirmPendingRoute() {
    if (!pendingRoute) {
      pushNotification("warn", "Нет приказа", "Сначала поставьте маршрут на карте или выберите контекстное действие.");
      return;
    }

    if (pendingRoute.scope === "unit") {
      setUnits((previous) =>
        previous.map((unit) =>
          unit.id === pendingRoute.ownerId
            ? applyRouteToUnit(unit, {
                points: pendingRoute.points,
                segments: pendingRoute.segments,
                label: pendingRoute.label,
                orderType: pendingRoute.orderType,
              })
            : unit
        )
      );
      pushNotification(
        "success",
        "Приказ принят",
        `${selectedUnit.callsign} выдвигается к ${pendingRoute.label} по обновлённому плану.`
      );
      setPendingRoute(null);
      return;
    }

    const groupUnits = units.filter((unit) => unit.groupId === pendingRoute.ownerId);
    const offlineUnits = groupUnits.filter((unit) => unit.comms === "lost");

    setUnits((previous) =>
      previous.map((unit) => {
        if (unit.groupId !== pendingRoute.ownerId) return unit;
        if (unit.comms === "lost") return unit;

        const index = groupUnits.findIndex((entry) => entry.id === unit.id);
        const offset = formationOffset(index);
        const routedPoints = pendingRoute.points.map((point, pointIndex) =>
          pointIndex === 0
            ? { x: unit.x, y: unit.y }
            : {
                x: clamp(point.x + offset.x * (pointIndex === pendingRoute.points.length - 1 ? 1 : 0.55), mapBounds.min, mapBounds.max),
                y: clamp(point.y + offset.y * (pointIndex === pendingRoute.points.length - 1 ? 1 : 0.55), mapBounds.min, mapBounds.max),
              }
        );

        return applyRouteToUnit(unit, {
          points: routedPoints,
          segments: pendingRoute.segments,
          label: pendingRoute.label,
          orderType: pendingRoute.orderType,
        });
      })
    );

    setGroupState((previous) =>
      previous.map((group) =>
        group.id === pendingRoute.ownerId
          ? {
              ...group,
              orderType: pendingRoute.orderType,
              orderLabel: orderMeta[pendingRoute.orderType].groupOrder,
            }
          : group
      )
    );

    pushNotification(
      offlineUnits.length ? "warn" : "success",
      offlineUnits.length ? "Приказ отправлен не всем" : "Групповой приказ подтверждён",
      offlineUnits.length
        ? `Группа ${selectedGroup.callsign} начала манёвр к ${pendingRoute.label}, но ${offlineUnits.map((unit) => unit.callsign).join(", ")} вне связи.`
        : `Группа ${selectedGroup.callsign} смещается к ${pendingRoute.label} строем ${selectedGroup.formation}.`
    );
    setPendingRoute(null);
  }

  function cancelPendingRoute() {
    setPendingRoute(null);
    pushNotification("info", "План отменён", "Черновик маршрута и правки участков сброшены.");
  }

  function runQuickAction(action: "hold" | "smoke" | "sector" | "recover") {
    if (!selectedUnit) return;

    if (action === "hold") {
      updateOrder("hold");
      return;
    }

    if (action === "smoke") {
      pushNotification("warn", "Дымовой запрос", `Для ${selectionMode === "group" ? selectedGroup.callsign : selectedUnit.callsign} запрошено дымовое прикрытие.`);
      return;
    }

    if (action === "sector") {
      pushNotification("info", "Сектор обновлён", `Фокус наблюдения перенесён на ${focusedContacts[0]?.label ?? "ближайшую угрозу"}.`);
      return;
    }

    setUnits((previous) =>
      previous.map((unit) =>
        selectedUnits.some((entry) => entry.id === unit.id)
          ? {
              ...unit,
              suppression: clamp(unit.suppression - 10, 0, 100),
              morale: clamp(unit.morale + 4, 0, 100),
            }
          : unit
      )
    );
    pushNotification("success", "Стабилизация", "Подразделение сократило подавление и восстановило порядок выполнения приказа.");
  }

  const summaryWarnings = selectionMode === "group"
    ? Array.from(new Set(selectedGroupUnits.flatMap((unit) => unit.warnings))).slice(0, 4)
    : selectedUnit?.warnings ?? [];

  const groupStats = useMemo(() => {
    const total = selectedGroupUnits.length || 1;
    return {
      health: selectedGroupUnits.reduce((sum, unit) => sum + unit.health, 0) / total,
      morale: selectedGroupUnits.reduce((sum, unit) => sum + unit.morale, 0) / total,
      stamina: selectedGroupUnits.reduce((sum, unit) => sum + unit.stamina, 0) / total,
      suppression: selectedGroupUnits.reduce((sum, unit) => sum + unit.suppression, 0) / total,
      inContact: selectedGroupUnits.filter((unit) => unit.underFire || unit.spotted || unit.firing).length,
    };
  }, [selectedGroupUnits]);

  const overlayStyle = { opacity: layerOpacity / 100 };

  return (
    <div className="min-h-screen bg-[#090d10] text-zinc-100">
      <div className="grid h-screen grid-rows-[76px_minmax(0,1fr)_238px] gap-3 p-3">
        <header className="panel-notch flex items-center justify-between gap-4 overflow-hidden border border-white/10 bg-[#0d1317]/95 px-5 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-3">
              <SmallPill tone="border-emerald-400/25 bg-emerald-500/10 text-emerald-200">ОПЕРАЦИЯ ТИХИЙ РУБЕЖ</SmallPill>
              <SmallPill tone="border-white/10 bg-white/5 text-zinc-300">Высота 101 · рассвет · 1920×1080</SmallPill>
            </div>
            <div>
              <h1 className="truncate text-[22px] font-semibold tracking-[0.08em] text-zinc-50">Тактический прототип управления отделением</h1>
              <p className="truncate text-sm text-zinc-400">Карта остаётся главным элементом; управление, разведданные и приказы вынесены в компактные контекстные панели.</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2.5">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-400">
                {timeSpeed === 0 ? <PauseIcon /> : <TimeIcon />}
                <span>Симуляция</span>
              </div>
              <div className="mt-1 flex items-end gap-3">
                <div>
                  <div className="text-[28px] font-semibold tracking-[0.06em] text-zinc-50">{formatTime(simMinutes)}</div>
                  <div className="text-xs text-zinc-500">{timeSpeed === 0 ? "Пауза" : `Скорость ×${timeSpeed}`}</div>
                </div>
                <div className="flex items-center gap-1.5 pb-1">
                  {timeModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTimeSpeed(mode)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-medium tracking-[0.16em] uppercase transition",
                        timeSpeed === mode
                          ? mode === 0
                            ? "border-amber-400/45 bg-amber-500/12 text-amber-100"
                            : "border-cyan-400/45 bg-cyan-500/15 text-cyan-50"
                          : "border-white/8 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:text-zinc-200"
                      )}
                      {...bindTooltip(
                        mode === 0 ? "Пауза" : `Скорость ×${mode}`,
                        mode === 0
                          ? "Останавливает симуляцию и движение по маршрутам. Горячая клавиша: Space."
                          : `Изменяет темп хода времени и выполнения подтверждённых маршрутов. Текущая скорость: ×${mode}.`
                      )}
                    >
                      {mode === 0 ? "II" : `×${mode}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <SmallPill tone="border-red-400/20 bg-red-500/8 text-red-200">Угрозы: {enemyContacts.length}</SmallPill>
                <SmallPill tone="border-cyan-400/20 bg-cyan-500/10 text-cyan-100">Слоёв: {activeLayerCount}</SmallPill>
                <SmallPill tone="border-white/10 bg-white/5 text-zinc-200">Выбор: {selectionMode === "group" ? selectedGroup.callsign : selectedUnit.callsign}</SmallPill>
              </div>
              <div className="max-w-[34rem] text-right text-xs leading-relaxed text-zinc-400">Цели сцены: сохранить ясность выбора, приказа, маршрута, состояния подавления и направлений угроз без перегрузки карты служебной информацией.</div>
            </div>
          </div>
        </header>

        <div
          className="grid min-h-0 gap-3"
          style={{
            gridTemplateColumns: `${leftCollapsed ? 82 : 296}px minmax(0, 1fr) ${rightCollapsed ? 78 : 382}px`,
          }}
        >
          <aside className="panel-notch min-h-0 overflow-hidden border border-white/10 bg-[#0c1115]/92 backdrop-blur-xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                <div className={cn("space-y-0.5", leftCollapsed && "sr-only")}>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Состав и управление</div>
                  <div className="text-sm font-semibold tracking-[0.08em] text-zinc-100">Подразделения</div>
                </div>
                <button
                  type="button"
                  onClick={() => setLeftCollapsed((value) => !value)}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-zinc-300 transition hover:border-white/15 hover:text-white"
                  {...bindTooltip(
                    leftCollapsed ? "Развернуть состав" : "Свернуть состав",
                    "Слева остаются только компактные идентификаторы групп и счётчики контакта."
                  )}
                >
                  <ChevronIcon open={!leftCollapsed} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <div className="space-y-3">
                  {groupState.map((group) => {
                    const unitsInGroup = units.filter((unit) => unit.groupId === group.id);
                    const inContact = unitsInGroup.filter((unit) => unit.underFire || unit.spotted || unit.firing).length;
                    const suppressed = unitsInGroup.filter((unit) => unit.suppressed).length;
                    const isSelected = selectionMode === "group" && selectedGroupId === group.id;
                    return (
                      <div key={group.id} className={cn("rounded-2xl border p-3 transition", isSelected ? "border-cyan-400/35 bg-cyan-500/10" : "border-white/8 bg-white/[0.03]") }>
                        <button type="button" onClick={() => selectGroup(group.id)} className="flex w-full items-start gap-3 text-left">
                          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#121a20] text-[11px] font-semibold tracking-[0.22em] text-zinc-100">
                            {group.callsign}
                          </div>
                          {!leftCollapsed && (
                            <div className="min-w-0 flex-1 space-y-2">
                              <div>
                                <div className="truncate text-sm font-semibold tracking-[0.06em] text-zinc-50">{group.name}</div>
                                <div className="truncate text-xs text-zinc-400">{group.orderLabel}</div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <SmallPill tone="border-white/8 bg-white/[0.04] text-zinc-300">{unitsInGroup.length} бойцов</SmallPill>
                                <SmallPill tone="border-red-400/20 bg-red-500/10 text-red-200">контакт {inContact}</SmallPill>
                                {suppressed > 0 && <SmallPill tone="border-amber-400/20 bg-amber-500/10 text-amber-100">подавление {suppressed}</SmallPill>}
                              </div>
                            </div>
                          )}
                        </button>

                        {!leftCollapsed && selectedGroupId === group.id && (
                          <div className="mt-3 space-y-2 border-t border-white/8 pt-3">
                            {unitsInGroup.map((unit, index) => {
                              const isActiveUnit = selectionMode === "unit" && selectedUnitId === unit.id;
                              return (
                                <button
                                  key={unit.id}
                                  type="button"
                                  onClick={() => selectUnit(unit.id)}
                                  className={cn(
                                    "w-full rounded-2xl border px-3 py-2.5 text-left transition",
                                    isActiveUnit
                                      ? "border-sky-400/40 bg-sky-500/12"
                                      : "border-white/8 bg-black/20 hover:border-white/15 hover:bg-white/[0.04]"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="text-sm font-medium tracking-[0.04em] text-zinc-100">
                                        {index + 1}. {unit.callsign}
                                      </div>
                                      <div className="text-xs text-zinc-400">{unit.role}</div>
                                    </div>
                                    <div className={cn("text-[11px] uppercase tracking-[0.2em]", statusMeta[unit.status].tone)}>{statusMeta[unit.status].label}</div>
                                  </div>
                                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-zinc-400">
                                    <div>Поза: <span className="text-zinc-200">{postureMeta[unit.posture].label}</span></div>
                                    <div>Ход: <span className="text-zinc-200">{moveMeta[unit.moveMode].label}</span></div>
                                    <div>Подавл.: <span className="text-zinc-200">{unit.suppression}</span></div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <main className="panel-notch relative min-h-0 overflow-hidden border border-white/10 bg-[#0b1115]/85 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
            <div
              ref={mapRef}
              className="tactical-map relative h-full w-full overflow-hidden"
              onClick={handleMapClick}
            >
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="groundGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6e6d4f" />
                    <stop offset="55%" stopColor="#62654b" />
                    <stop offset="100%" stopColor="#565940" />
                  </linearGradient>
                  <radialGradient id="hillGradient" cx="50%" cy="55%" r="42%">
                    <stop offset="0%" stopColor="#c9af72" />
                    <stop offset="48%" stopColor="#b4955b" />
                    <stop offset="100%" stopColor="#8d7850" stopOpacity="0" />
                  </radialGradient>
                  <pattern id="fieldSpeckle" width="10" height="10" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="3" r="0.5" fill="#aba170" opacity="0.22" />
                    <circle cx="7" cy="7" r="0.55" fill="#928953" opacity="0.18" />
                    <circle cx="5" cy="1.5" r="0.4" fill="#d1c58a" opacity="0.12" />
                  </pattern>
                  <pattern id="forestPattern" width="7" height="7" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.4" fill="#18372c" opacity="0.85" />
                    <circle cx="5.2" cy="4.5" r="1.2" fill="#274838" opacity="0.75" />
                    <circle cx="4" cy="1.3" r="0.6" fill="#5a7455" opacity="0.5" />
                  </pattern>
                  <pattern id="roofPattern" width="4" height="4" patternUnits="userSpaceOnUse">
                    <path d="M0 0 H4" stroke="#704c31" strokeWidth="0.6" opacity="0.45" />
                    <path d="M0 2 H4" stroke="#c78957" strokeWidth="0.4" opacity="0.35" />
                  </pattern>
                  <radialGradient id="dangerPulse" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff725e" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#ff725e" stopOpacity="0" />
                  </radialGradient>
                  <marker id="routeArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L6,3 L0,6 z" fill="#8fd9ff" />
                  </marker>
                  <marker id="threatArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L6,3 L0,6 z" fill="#ff7c6f" />
                  </marker>
                </defs>

                <rect width="100" height="100" fill="url(#groundGradient)" />
                <rect width="100" height="100" fill="url(#fieldSpeckle)" opacity="0.5" />

                <path d="M28 0 L28 100" stroke="#d8d3c0" strokeWidth="0.65" opacity="0.85" />
                <path d="M28 0 L28 100" stroke="#474742" strokeWidth="0.18" opacity="0.85" strokeDasharray="1 1.1" />
                <path d="M18 18 C34 18, 42 26, 54 22 S78 14, 88 18" stroke="#84734f" strokeWidth="0.9" fill="none" opacity="0.32" />
                <path d="M64 66 C72 72, 82 79, 92 88" stroke="#826a44" strokeWidth="0.75" fill="none" opacity="0.25" />

                <ellipse cx="49" cy="56" rx="18" ry="12" fill="url(#hillGradient)" opacity="0.95" />
                <ellipse cx="49" cy="56" rx="22" ry="15.4" fill="#877553" opacity="0.2" />
                <ellipse cx="49" cy="56" rx="15" ry="10" fill="#cfb071" opacity="0.52" />
                {[26, 22, 18, 13, 9].map((radius, index) => (
                  <ellipse key={radius} cx="49" cy="56" rx={radius} ry={radius * 0.67} fill="none" stroke="#705f3c" strokeWidth="0.22" opacity={0.3 + index * 0.05} />
                ))}

                <path d="M9 9 C15 7, 26 8, 34 12 L42 20 44 31 40 38 26 38 12 34 7 22 Z" fill="url(#forestPattern)" stroke="#304b3d" strokeWidth="0.3" opacity="0.92" />
                <path d="M35 13 C44 11, 57 11, 67 16 L72 22 70 29 58 33 45 31 38 24 Z" fill="url(#forestPattern)" stroke="#314b3c" strokeWidth="0.3" opacity="0.88" />
                <path d="M44 77 C52 79, 62 82, 70 88 L69 100 44 100 38 92 Z" fill="url(#forestPattern)" stroke="#314b3c" strokeWidth="0.3" opacity="0.94" />
                <path d="M10 88 C18 86, 28 86, 38 92 L37 100 8 100 6 92 Z" fill="url(#forestPattern)" stroke="#314b3c" strokeWidth="0.3" opacity="0.78" />

                <g opacity="0.95">
                  <rect x="78" y="18" width="14" height="17" rx="0.8" fill="#65452f" />
                  <rect x="78.7" y="18.7" width="12.6" height="15.6" rx="0.6" fill="url(#roofPattern)" opacity="0.92" />
                  <rect x="5" y="82" width="16" height="14" rx="0.8" fill="#69442c" />
                  <rect x="5.8" y="82.8" width="14.4" height="12.4" rx="0.6" fill="url(#roofPattern)" opacity="0.92" />
                  <rect x="66" y="88" width="12" height="10" rx="0.8" fill="#6e553a" />
                  <rect x="66.7" y="88.7" width="10.6" height="8.7" rx="0.5" fill="#8a7551" opacity="0.82" />
                  <rect x="20.3" y="85.1" width="1.6" height="3.6" fill="#4e351f" opacity="0.9" />
                  <rect x="85.1" y="32.5" width="1.8" height="3.8" fill="#4e351f" opacity="0.9" />
                </g>

                <g opacity="0.75">
                  <rect x="69.5" y="68.8" width="4.5" height="1.4" rx="0.3" fill="#c5b188" />
                  <rect x="74.2" y="68.8" width="4.5" height="1.4" rx="0.3" fill="#c5b188" />
                  <rect x="71.8" y="70.5" width="4.8" height="1.4" rx="0.3" fill="#c5b188" />
                </g>

                <g opacity="0.55">
                  <rect x="16.8" y="79.7" width="1.5" height="2.2" fill="#4c4839" />
                  <rect x="15.2" y="30.6" width="1.2" height="1.5" fill="#3c4237" />
                  <rect x="53" y="60" width="1.2" height="1.1" fill="#4f4f46" />
                  <rect x="58.5" y="44" width="0.9" height="1" fill="#48463f" />
                </g>

                {layers.stealth && (
                  <g style={overlayStyle}>
                    <path d="M8 10 C16 9, 27 9, 34 13 L40 18 39 29 31 34 18 35 10 31 8 20 Z" fill="#3dbb6a" opacity="0.24" />
                    <path d="M35 14 C44 13, 57 14, 66 18 L69 23 67 28 55 31 44 29 38 24 Z" fill="#4ad28c" opacity="0.18" />
                    <path d="M43 77 C53 79, 61 82, 69 89 L69 100 43 100 39 92 Z" fill="#4ad28c" opacity="0.22" />
                    <path d="M73 18 C78 20, 83 22, 88 26 L88 36 80 34 75 26 Z" fill="#3dbb6a" opacity="0.14" />
                  </g>
                )}

                {layers.routeCost && (
                  <g style={overlayStyle}>
                    <ellipse cx="49" cy="56" rx="17" ry="11" fill="#c981f3" opacity="0.14" />
                    <path d="M30 0 L30 100 L26 100 L26 0 Z" fill="#6ba5ff" opacity="0.16" />
                    <path d="M60 10 C72 8, 90 20, 96 34 L96 56 80 54 67 36 53 28 Z" fill="#9e7cff" opacity="0.16" />
                    <path d="M0 72 C11 69, 19 71, 28 75 L28 100 0 100 Z" fill="#8867f6" opacity="0.18" />
                  </g>
                )}

                {layers.danger && (
                  <g style={overlayStyle}>
                    <ellipse cx="72" cy="68" rx="18" ry="12" fill="url(#dangerPulse)" opacity="0.35" />
                    <ellipse cx="77" cy="26" rx="16" ry="11" fill="#ff6e5a" opacity="0.18" />
                    <ellipse cx="56" cy="17" rx="9" ry="7" fill="#ffb15a" opacity="0.16" />
                    <path d={sectorPath(72, 68, 26, 180, 230)} fill="#ff604f" opacity="0.16" />
                    <path d={sectorPath(77, 26, 24, 194, 250)} fill="#ff8c5d" opacity="0.1" />
                    <path d={sectorPath(56, 17, 16, 120, 180)} fill="#ffb256" opacity="0.1" />
                  </g>
                )}

                {layers.visibility && selectedUnit && (
                  <g style={overlayStyle}>
                    <path d={sectorPath(selectedUnit.x, selectedUnit.y, 22, selectedUnit.facing - 36, selectedUnit.facing + 34)} fill="#62b8ff" opacity="0.14" />
                    {selectedUnit.threatFrom.map((contactId) => {
                      const contact = enemyContacts.find((entry) => entry.id === contactId);
                      if (!contact) return null;
                      return <path key={contactId} d={sectorPath(contact.x, contact.y, 22, contact.facing - 24, contact.facing + 26)} fill="#ff6d62" opacity="0.12" />;
                    })}
                  </g>
                )}

                {layers.noise && (
                  <g style={overlayStyle}>
                    {noiseSources.map((source) => (
                      <g key={source.id}>
                        <circle cx={source.x} cy={source.y} r={source.radius} fill="none" stroke="#f4bb71" strokeWidth="0.4" opacity="0.4" />
                        <circle cx={source.x} cy={source.y} r={source.radius * 0.65} fill="none" stroke="#f4bb71" strokeWidth="0.34" opacity="0.28" />
                      </g>
                    ))}
                  </g>
                )}

                {layers.cover && (
                  <g style={overlayStyle}>
                    {coverNodes.map((cover) => (
                      <g key={cover.id} transform={`translate(${cover.x} ${cover.y})`}>
                        <path d="M0 -1.8 -1.8 -1.1 -1.8 0.5c0 1.3.8 2.4 1.8 3 1-.6 1.8-1.7 1.8-3v-1.6L0-1.8Z" fill={cover.rating === "hard" ? "#9df1b7" : "#6fd49e"} opacity="0.9" />
                      </g>
                    ))}
                  </g>
                )}

                {layers.positions && (
                  <g style={overlayStyle}>
                    {tacticalPositions.map((position) => (
                      <g key={position.id} transform={`translate(${position.x} ${position.y})`}>
                        <circle cx="0" cy="0" r="1.8" fill="#09232b" stroke="#8bd5d5" strokeWidth="0.45" />
                        <path d="M0 -2.7v5.4" stroke="#8bd5d5" strokeWidth="0.4" />
                        <path d="M0 -1.6 2.4 -0.8 0 0.2Z" fill="#8bd5d5" opacity="0.9" />
                      </g>
                    ))}
                  </g>
                )}

                {activeRoutes.map((unit) =>
                  unit.route ? (
                    <polyline
                      key={unit.id}
                      points={unit.route.points.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="none"
                      stroke={selectedUnitId === unit.id ? "#b5e8ff" : "#5f8fb0"}
                      strokeWidth={selectedUnitId === unit.id ? 0.65 : 0.4}
                      strokeOpacity={selectedUnitId === unit.id ? 0.8 : 0.36}
                      strokeDasharray={selectedUnitId === unit.id ? "1.5 1.3" : "1.2 1.6"}
                    />
                  ) : null
                )}

                {pendingRoute &&
                  pendingRoute.segments.map((segment, index) => {
                    const a = pendingRoute.points[index];
                    const b = pendingRoute.points[index + 1];
                    const isActive = index === segmentFocus;
                    const color = segment.mode === "sprint" ? "#ffd073" : segment.mode === "fast" ? "#a4d6ff" : segment.mode === "cautious" ? "#8ef0bd" : "#d4e7f5";
                    return (
                      <g key={`pending-${index}`}>
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke={color}
                          strokeWidth={isActive ? 0.95 : 0.65}
                          strokeOpacity={0.95}
                          strokeDasharray={isActive ? "1.5 1.05" : "1.2 1.2"}
                          markerEnd="url(#routeArrow)"
                        />
                        <circle cx={b.x} cy={b.y} r={isActive ? 1.2 : 0.9} fill={isActive ? "#f5f7fb" : "#a9d5ff"} opacity="0.96" />
                      </g>
                    );
                  })}

                {selectedUnit &&
                  selectedUnit.visibleTargets.map((contactId) => {
                    const contact = enemyContacts.find((entry) => entry.id === contactId);
                    if (!contact) return null;
                    return (
                      <line
                        key={`sight-${contactId}`}
                        x1={selectedUnit.x}
                        y1={selectedUnit.y}
                        x2={contact.x}
                        y2={contact.y}
                        stroke="#77c7ff"
                        strokeWidth="0.38"
                        strokeOpacity="0.75"
                        strokeDasharray="1.1 1.3"
                        markerEnd="url(#routeArrow)"
                      />
                    );
                  })}

                {selectedUnit &&
                  selectedUnit.threatFrom.map((contactId) => {
                    const contact = enemyContacts.find((entry) => entry.id === contactId);
                    if (!contact) return null;
                    return (
                      <line
                        key={`threat-${contactId}`}
                        x1={contact.x}
                        y1={contact.y}
                        x2={selectedUnit.x}
                        y2={selectedUnit.y}
                        stroke="#ff7b72"
                        strokeWidth="0.45"
                        strokeOpacity="0.78"
                        strokeDasharray="1.6 1.2"
                        markerEnd="url(#threatArrow)"
                      />
                    );
                  })}
              </svg>

              <div className="pointer-events-none absolute inset-0 terrain-vignette" />
              <div className="pointer-events-none absolute inset-0 grid-fade" />

              <div className="absolute left-4 top-4 flex flex-col gap-3" data-no-map-click="true">
                <div className="rounded-2xl border border-white/10 bg-[#0d1317]/82 px-4 py-3 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Масштаб</div>
                  <div className="mt-1 text-2xl font-semibold tracking-[0.05em] text-zinc-50">10 м</div>
                  <div className="mt-2 h-px w-20 bg-white/20" />
                </div>

                <div className="w-[22rem] space-y-2">
                  {notifications.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        "fade-up rounded-2xl border px-4 py-3 shadow-[0_10px_22px_rgba(0,0,0,0.28)] backdrop-blur-xl",
                        entry.type === "critical"
                          ? "border-red-400/25 bg-red-500/14"
                          : entry.type === "warn"
                            ? "border-amber-400/25 bg-amber-500/14"
                            : entry.type === "success"
                              ? "border-emerald-400/25 bg-emerald-500/12"
                              : "border-white/10 bg-[#0d1317]/80"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-100">{entry.title}</div>
                          <div className="mt-1 text-sm leading-relaxed text-zinc-300">{entry.text}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNotifications((previous) => previous.filter((current) => current.id !== entry.id))}
                          className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition hover:text-zinc-200"
                        >
                          скрыть
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute right-4 top-4 w-[18.5rem] space-y-3" data-no-map-click="true">
                <div className="rounded-2xl border border-white/10 bg-[#0d1317]/82 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Текущий фокус</div>
                      <div className="mt-1 text-lg font-semibold tracking-[0.05em] text-zinc-50">{selectionMode === "group" ? selectedGroup.name : selectedUnit.callsign}</div>
                      <div className="mt-1 text-sm text-zinc-400">{selectionMode === "group" ? selectedGroup.orderLabel : selectedUnit.task}</div>
                    </div>
                    <SmallPill tone={selectionMode === "group" ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-100" : "border-sky-400/25 bg-sky-500/12 text-sky-100"}>
                      {selectionMode === "group" ? "группа" : "боец"}
                    </SmallPill>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-300">
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Видит</div>
                      <div className="mt-1 font-medium text-zinc-100">{selectionMode === "group" ? selectedGroupUnits.reduce((sum, unit) => sum + unit.visibleTargets.length, 0) : selectedUnit.visibleTargets.length}</div>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Под угрозой</div>
                      <div className="mt-1 font-medium text-zinc-100">{selectionMode === "group" ? selectedGroupUnits.reduce((sum, unit) => sum + unit.threatFrom.length, 0) : selectedUnit.threatFrom.length}</div>
                    </div>
                  </div>
                </div>

                {pendingRoute && (
                  <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200">Приказ ждёт подтверждения</div>
                    <div className="mt-1 text-sm leading-relaxed text-cyan-50">{pendingRoute.scope === "group" ? selectedGroup.callsign : selectedUnit.callsign} → {pendingRoute.label}</div>
                    <div className="mt-2 text-xs text-cyan-100/80">Участок {segmentFocus + 1}: {pendingSegment?.note}</div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-4 max-w-[28rem]" data-no-map-click="true">
                <div className="rounded-2xl border border-white/10 bg-[#0d1317]/82 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Активные слои</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(layers)
                          .filter(([, enabled]) => enabled)
                          .map(([key]) => {
                            const layerKey = key as LayerKey;
                            return (
                              <SmallPill key={layerKey} tone="border-white/10 bg-white/[0.04] text-zinc-200">
                                {layerMeta[layerKey].label}
                              </SmallPill>
                            );
                          })}
                        {activeLayerCount === 0 && <span className="text-sm text-zinc-400">Слои скрыты. Нажмите L для быстрого сброса.</span>}
                      </div>
                    </div>
                    <div className="hidden text-right text-xs leading-relaxed text-zinc-400 lg:block">
                      ЛКМ по карте — новый маршрут.<br />
                      Enter — подтвердить · Esc — отменить.
                    </div>
                  </div>
                </div>
              </div>

              {units.map((unit) => {
                const isSelected = selectionMode === "unit" && unit.id === selectedUnitId;
                const inSelectedGroup = selectedGroupId === unit.groupId;
                const isHovered = hoveredUnitId === unit.id;
                const availability = unit.route ? routeTotal(unit.route.points) : 0;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      selectUnit(unit.id);
                    }}
                    onMouseEnter={(event) => {
                      setHoveredUnitId(unit.id);
                      setTooltip({
                        title: `${unit.callsign} · ${unit.role}`,
                        text: `${statusMeta[unit.status].label}. ${unit.task}. ${unit.warnings[0] ?? "Без срочных предупреждений."}`,
                        x: event.clientX + 18,
                        y: event.clientY + 18,
                      });
                    }}
                    onMouseMove={(event) => {
                      setTooltip({
                        title: `${unit.callsign} · ${unit.role}`,
                        text: `${statusMeta[unit.status].label}. ${unit.task}. ${unit.warnings[0] ?? "Без срочных предупреждений."}`,
                        x: event.clientX + 18,
                        y: event.clientY + 18,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredUnitId((current) => (current === unit.id ? null : current));
                      setTooltip(null);
                    }}
                    className="absolute"
                    style={{ left: percent(unit.x), top: percent(unit.y), transform: "translate(-50%, -50%)" }}
                  >
                    {(isSelected || (selectionMode === "group" && inSelectedGroup)) && (
                      <span className={cn("pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border", isSelected ? "animate-pulse border-cyan-300/45" : "border-sky-300/20")} />
                    )}
                    <span className={cn("unit-marker relative flex h-9 w-9 items-center justify-center rounded-full border text-[10px] font-semibold tracking-[0.2em] transition-all", isSelected ? "border-sky-200 bg-[#13324a] text-sky-50 shadow-[0_0_0_1px_rgba(122,198,255,0.16),0_8px_20px_rgba(20,67,102,0.4)]" : isHovered ? "border-sky-300/70 bg-[#102838] text-sky-50" : "border-sky-400/30 bg-[#0c1a24] text-sky-100", unit.underFire && "border-red-300/55", unit.suppressed && "border-amber-300/55", unit.comms === "lost" && "border-zinc-400/40 opacity-70")}>
                      <span className="absolute left-1/2 top-1/2 h-5 w-[2px] origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-sky-100/90" style={{ transform: `translate(-50%, -100%) rotate(${unit.facing}deg)` }} />
                      <span className="relative z-10">{unit.callsign.split("-")[1]}</span>
                      {unit.suppressed && <span className="absolute -top-1 left-1/2 flex -translate-x-1/2 gap-[2px]"><span className="h-1 w-1 rounded-full bg-amber-300" /><span className="h-1 w-1 rounded-full bg-amber-300" /><span className="h-1 w-1 rounded-full bg-amber-300" /></span>}
                      {unit.wounded && <span className="absolute -right-1 -bottom-1 rounded bg-rose-400 px-1 text-[8px] font-bold text-rose-950">+</span>}
                      {unit.firing && <span className="absolute -right-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-red-400/90 shadow-[0_0_10px_rgba(248,113,113,0.65)]" />}
                      {unit.comms === "lost" && <span className="absolute inset-0 rounded-full border border-zinc-300/35" />}
                    </span>
                    {(isSelected || isHovered) && (
                      <span className="pointer-events-none absolute left-1/2 top-11 min-w-max -translate-x-1/2 rounded-xl border border-white/10 bg-[#0d1317]/88 px-2.5 py-1.5 text-left shadow-[0_10px_20px_rgba(0,0,0,0.35)] backdrop-blur-lg">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-100">{unit.callsign}</span>
                        <span className="mt-1 block text-[11px] text-zinc-400">{statusMeta[unit.status].label} · {unit.route ? `${availability.toFixed(1)}м маршр.` : unit.orderLabel}</span>
                      </span>
                    )}
                  </button>
                );
              })}

              {enemyContacts.map((contact) => {
                const focused = selectedContactIds.has(contact.id);
                return (
                  <div
                    key={contact.id}
                    className="absolute"
                    style={{ left: percent(contact.x), top: percent(contact.y), transform: "translate(-50%, -50%)" }}
                    data-no-map-click="true"
                    {...bindTooltip(
                      `${contact.label} · ${contact.contact === "suspected" ? "подозрение" : contact.contact === "firing" ? "источник огня" : "подтверждён"}`,
                      `${contact.lastKnown}. Угроза ${contact.threat}/100. ${contact.note}`
                    )}
                  >
                    <div className={cn("relative flex h-8 w-8 items-center justify-center rotate-45 rounded-[0.8rem] border shadow-[0_10px_20px_rgba(0,0,0,0.25)]", contact.contact === "suspected" ? "border-amber-300/60 bg-amber-500/10" : "border-red-300/55 bg-red-500/12", focused ? "scale-110" : "opacity-85")}>
                      <div className={cn("h-2.5 w-2.5 -rotate-45 rounded-sm", contact.contact === "suspected" ? "bg-amber-300" : "bg-red-300")} />
                    </div>
                    <div className="pointer-events-none absolute left-1/2 top-9 min-w-max -translate-x-1/2 rounded-xl border border-black/25 bg-black/55 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-100 backdrop-blur-lg">{contact.label}</div>
                  </div>
                );
              })}
            </div>
          </main>

          <aside className="panel-notch min-h-0 overflow-hidden border border-white/10 bg-[#0c1115]/92 backdrop-blur-xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                {!rightCollapsed && (
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Контекст и анализ</div>
                    <div className="text-sm font-semibold tracking-[0.08em] text-zinc-100">Правая панель</div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setRightCollapsed((value) => !value)}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-zinc-300 transition hover:border-white/15 hover:text-white"
                  {...bindTooltip(
                    rightCollapsed ? "Развернуть анализ" : "Свернуть анализ",
                    "Панель содержит слои карты, разведданные, очередь приказов и памятку по управлению."
                  )}
                >
                  <ChevronIcon open={!rightCollapsed} />
                </button>
              </div>

              {rightCollapsed ? (
                <div className="flex flex-1 flex-col items-center gap-3 px-3 py-4">
                  {(["layers", "intel", "orders", "help"] as SectionKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setRightCollapsed(false);
                        setOpenSections((previous) => ({ ...previous, [key]: true }));
                      }}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-white/15 hover:text-zinc-100"
                    >
                      {key === "layers" ? <LayerIcon layer="visibility" /> : key === "intel" ? <TimeIcon /> : key === "orders" ? <MoveIcon mode="walk" /> : <PostureIcon posture="crouch" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  <div className="space-y-3">
                    {([
                      {
                        key: "layers",
                        title: "Слои карты",
                        subtitle: `Активно ${activeLayerCount} · прозрачность ${layerOpacity}%`,
                        content: (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                              {(Object.keys(layers) as LayerKey[]).map((layerKey) => (
                                <button
                                  key={layerKey}
                                  type="button"
                                  onClick={() => setLayers((previous) => ({ ...previous, [layerKey]: !previous[layerKey] }))}
                                  className={cn(
                                    "rounded-2xl border p-3 text-left transition",
                                    layers[layerKey]
                                      ? "border-cyan-400/35 bg-cyan-500/10"
                                      : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                                  )}
                                  {...bindTooltip(layerMeta[layerKey].label, `${layerMeta[layerKey].description} ${layerMeta[layerKey].legend}`)}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-zinc-100">
                                      <LayerIcon layer={layerKey} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium tracking-[0.04em] text-zinc-100">{layerMeta[layerKey].label}</div>
                                      <div className="mt-1 text-xs leading-relaxed text-zinc-400">{layerMeta[layerKey].description}</div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Прозрачность слоёв</div>
                                  <div className="mt-1 text-sm text-zinc-300">Снижает визуальное смешивание цветов и помогает сохранять читаемость карты.</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLayers({
                                      danger: false,
                                      stealth: false,
                                      visibility: false,
                                      routeCost: false,
                                      cover: false,
                                      positions: false,
                                      noise: false,
                                    })
                                  }
                                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/15 hover:text-white"
                                >
                                  Выкл. всё
                                </button>
                              </div>
                              <input
                                value={layerOpacity}
                                onChange={(event) => setLayerOpacity(Number(event.target.value))}
                                type="range"
                                min={20}
                                max={90}
                                className="mt-3 w-full accent-cyan-400"
                              />
                            </div>
                          </div>
                        ),
                      },
                      {
                        key: "intel",
                        title: selectionMode === "group" ? "Состояние группы" : "Картина выбранного бойца",
                        subtitle:
                          selectionMode === "group"
                            ? `${selectedGroup.objective}`
                            : `${selectedUnit.role} · ${selectedUnit.weapon}`,
                        content: (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                                <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Кого видит</div>
                                <div className="mt-2 space-y-2 text-sm text-zinc-200">
                                  {(selectionMode === "group"
                                    ? enemyContacts.filter((contact) => selectedGroupUnits.some((unit) => unit.visibleTargets.includes(contact.id)))
                                    : enemyContacts.filter((contact) => selectedUnit.visibleTargets.includes(contact.id))
                                  ).map((contact) => (
                                    <div key={contact.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                                      <div className="font-medium">{contact.label}</div>
                                      <div className="mt-1 text-xs text-zinc-400">{contact.strength} · {contact.lastKnown}</div>
                                    </div>
                                  ))}
                                  {(selectionMode === "group"
                                    ? !selectedGroupUnits.some((unit) => unit.visibleTargets.length)
                                    : selectedUnit.visibleTargets.length === 0) && <div className="text-zinc-500">Нет подтверждённых целей в текущем секторе.</div>}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                                <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Кто видит его</div>
                                <div className="mt-2 space-y-2 text-sm text-zinc-200">
                                  {(selectionMode === "group"
                                    ? enemyContacts.filter((contact) => selectedGroupUnits.some((unit) => unit.threatFrom.includes(contact.id)))
                                    : enemyContacts.filter((contact) => selectedUnit.threatFrom.includes(contact.id))
                                  ).map((contact) => (
                                    <div key={contact.id} className="rounded-xl border border-red-400/15 bg-red-500/6 px-3 py-2">
                                      <div className="font-medium">{contact.label}</div>
                                      <div className="mt-1 text-xs text-zinc-400">Угроза {contact.threat}/100 · {contact.note}</div>
                                    </div>
                                  ))}
                                  {(selectionMode === "group"
                                    ? !selectedGroupUnits.some((unit) => unit.threatFrom.length)
                                    : selectedUnit.threatFrom.length === 0) && <div className="text-zinc-500">Нет актуального подтверждённого наблюдения противником.</div>}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                                <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Текущее действие</div>
                                <div className="mt-2 font-medium text-zinc-100">{selectionMode === "group" ? selectedGroup.orderLabel : selectedUnit.task}</div>
                                <div className="mt-1 text-zinc-400">{selectionMode === "group" ? `Строй: ${selectedGroup.formation}` : `Поза: ${postureMeta[selectedUnit.posture].label} · Ход: ${moveMeta[selectedUnit.moveMode].label}`}</div>
                              </div>
                              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                                <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Связь и укрытие</div>
                                <div className="mt-2 font-medium text-zinc-100">{selectionMode === "group" ? `${selectedGroup.cohesion}% cohesion` : commMeta[selectedUnit.comms].label}</div>
                                <div className="mt-1 text-zinc-400">{selectionMode === "group" ? `Связанных бойцов: ${selectedGroupUnits.filter((unit) => unit.comms !== "lost").length}/${selectedGroupUnits.length}` : `Укрытие ${selectedUnit.cover}/100 · скрытность ${selectedUnit.stealth}/100`}</div>
                              </div>
                            </div>
                          </div>
                        ),
                      },
                      {
                        key: "orders",
                        title: "Очередь приказов",
                        subtitle: activeRoutes.length ? `${activeRoutes.length} маршрутов выполняются` : "Нет подтверждённых перемещений",
                        content: (
                          <div className="space-y-3">
                            {activeRoutes.length === 0 && (
                              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-5 text-sm leading-relaxed text-zinc-400">
                                Подтверждённые маршруты появятся здесь с прогрессом, типом приказа и конечным рубежом.
                              </div>
                            )}
                            {activeRoutes.map((unit) => {
                              const route = unit.route!;
                              const total = routeTotal(route.points);
                              const progress = clamp((route.travelled / total) * 100, 0, 100);
                              return (
                                <div key={unit.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-sm font-medium tracking-[0.04em] text-zinc-100">{unit.callsign}</div>
                                      <div className="mt-1 text-xs text-zinc-400">{orderMeta[route.orderType].label} → {route.label}</div>
                                    </div>
                                    <SmallPill tone="border-white/10 bg-black/20 text-zinc-200">{moveMeta[unit.moveMode].label}</SmallPill>
                                  </div>
                                  <div className="mt-3 h-2 rounded-full bg-white/6">
                                    <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-sky-200" style={{ width: `${progress}%` }} />
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                    <span>{route.segments[segmentIndexAtDistance(route.points, route.travelled)]?.note ?? "выполнение"}</span>
                                    <span>{progress.toFixed(0)}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ),
                      },
                      {
                        key: "help",
                        title: "Памятка по управлению",
                        subtitle: "Короткие горячие клавиши и логика интерфейса",
                        content: (
                          <div className="space-y-3 text-sm text-zinc-300">
                            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Основное</div>
                              <ul className="mt-2 space-y-2 text-zinc-300">
                                <li><span className="font-medium text-zinc-100">ЛКМ по бойцу</span> — выбор бойца.</li>
                                <li><span className="font-medium text-zinc-100">ЛКМ по группе слева</span> — режим группы.</li>
                                <li><span className="font-medium text-zinc-100">ЛКМ по карте</span> — построить маршрут для текущего выбора.</li>
                                <li><span className="font-medium text-zinc-100">Enter / Esc</span> — подтвердить / отменить черновик приказа.</li>
                              </ul>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Горячие клавиши</div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-zinc-300">
                                <div><span className="font-medium text-zinc-100">Q / W / E</span> — поза</div>
                                <div><span className="font-medium text-zinc-100">Z / X / C / V</span> — темп</div>
                                <div><span className="font-medium text-zinc-100">Space</span> — пауза</div>
                                <div><span className="font-medium text-zinc-100">Tab</span> — панель анализа</div>
                                <div><span className="font-medium text-zinc-100">1–4</span> — бойцы группы</div>
                                <div><span className="font-medium text-zinc-100">L</span> — скрыть все слои</div>
                              </div>
                            </div>
                          </div>
                        ),
                      },
                    ] as const).map((section) => (
                      <div key={section.key} className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
                        <button
                          type="button"
                          onClick={() => setOpenSections((previous) => ({ ...previous, [section.key]: !previous[section.key] }))}
                          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-white/[0.03]"
                        >
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{section.title}</div>
                            <div className="mt-1 text-sm leading-relaxed text-zinc-300">{section.subtitle}</div>
                          </div>
                          <ChevronIcon open={openSections[section.key]} />
                        </button>
                        {openSections[section.key] && <div className="border-t border-white/8 px-4 py-4">{section.content}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        <footer className="panel-notch overflow-hidden border border-white/10 bg-[#0c1115]/95 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="grid h-full grid-cols-[minmax(280px,1.02fr)_minmax(420px,1.35fr)_minmax(300px,0.98fr)] gap-3 p-3">
            <section className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              {selectionMode === "group" ? (
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Выбрана группа</div>
                      <h2 className="mt-1 text-[22px] font-semibold tracking-[0.06em] text-zinc-50">{selectedGroup.name}</h2>
                      <div className="mt-1 text-sm text-zinc-400">Командир: {selectedGroup.commander} · {selectedGroup.formation}</div>
                    </div>
                    <SmallPill tone="border-cyan-400/25 bg-cyan-500/10 text-cyan-100">{selectedGroup.callsign}</SmallPill>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatBar label="Состояние" value={groupStats.health} />
                    <StatBar label="Дух" value={groupStats.morale} />
                    <StatBar label="Выносливость" value={groupStats.stamina} />
                    <StatBar label="Подавление" value={groupStats.suppression} inverse />
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-sm leading-relaxed text-zinc-300">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Задача</div>
                    <div className="mt-1 text-zinc-100">{selectedGroup.objective}</div>
                    <div className="mt-2 text-zinc-400">В контакте: {groupStats.inContact}/{selectedGroupUnits.length} · В сети: {selectedGroupUnits.filter((unit) => unit.comms !== "lost").length}/{selectedGroupUnits.length}</div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Выбранный боец</div>
                      <h2 className="mt-1 text-[22px] font-semibold tracking-[0.06em] text-zinc-50">{selectedUnit.callsign}</h2>
                      <div className="mt-1 text-sm text-zinc-400">{selectedUnit.role} · {selectedGroup.name}</div>
                    </div>
                    <div className="space-y-2 text-right">
                      <SmallPill tone={cn("justify-end", orderMeta[selectedUnit.orderType].accent)}>{orderMeta[selectedUnit.orderType].short}</SmallPill>
                      <div className={cn("text-xs uppercase tracking-[0.2em]", statusMeta[selectedUnit.status].tone)}>{statusMeta[selectedUnit.status].label}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatBar label="Здоровье" value={selectedUnit.health} />
                    <StatBar label="Дух" value={selectedUnit.morale} />
                    <StatBar label="Выносливость" value={selectedUnit.stamina} />
                    <StatBar label="Подавление" value={selectedUnit.suppression} inverse />
                    <StatBar label="Патроны" value={clamp((selectedUnit.ammo / 180) * 100, 0, 100)} suffix="" />
                    <StatBar label="Укрытие" value={selectedUnit.cover} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Текущая задача</div>
                      <div className="mt-1 text-zinc-100">{selectedUnit.task}</div>
                      <div className="mt-1 text-zinc-400">{selectedUnit.orderLabel}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Оружие и связь</div>
                      <div className="mt-1 text-zinc-100">{selectedUnit.weapon}</div>
                      <div className={cn("mt-1", commMeta[selectedUnit.comms].tone)}>{commMeta[selectedUnit.comms].label}</div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Управление позой и темпом</div>
                    <div className="mt-1 text-sm text-zinc-300">Поза и скорость могут задаваться для текущего бойца, всей группы или отдельного участка чернового маршрута.</div>
                  </div>
                  {pendingRoute && (
                    <SmallPill tone="border-cyan-400/25 bg-cyan-500/12 text-cyan-100">Участок {segmentFocus + 1}</SmallPill>
                  )}
                </div>

                {pendingRoute && (
                  <div className="flex flex-wrap gap-2">
                    {pendingRoute.segments.map((segment, index) => (
                      <button
                        key={`${segment.note}-${index}`}
                        type="button"
                        onClick={() => setSegmentFocus(index)}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-left transition",
                          index === segmentFocus
                            ? "border-cyan-400/35 bg-cyan-500/12"
                            : "border-white/8 bg-black/20 hover:border-white/15"
                        )}
                      >
                        <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Участок {index + 1}</div>
                        <div className="mt-1 text-sm text-zinc-100">{segment.note}</div>
                        <div className="mt-1 text-xs text-zinc-400">{postureMeta[segment.posture].label} · {moveMeta[segment.mode].label}</div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">Поза</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(postureMeta) as Posture[]).map((posture) => {
                        const blocker = selectionMode === "unit" && !pendingRoute ? availabilityReason(selectedUnit, "posture", posture) : null;
                        const active = pendingRoute ? pendingSegment?.posture === posture : selectionMode === "group" ? selectedGroupUnits.every((unit) => unit.requestedPosture === posture) : selectedUnit.requestedPosture === posture;
                        return (
                          <button
                            key={posture}
                            type="button"
                            disabled={Boolean(blocker)}
                            onClick={() => updatePosture(posture)}
                            className={cn(
                              "rounded-2xl border p-3 text-left transition",
                              blocker ? "cursor-not-allowed border-white/6 bg-white/[0.02] text-zinc-500" : active ? "border-cyan-400/35 bg-cyan-500/12 text-zinc-50" : "border-white/8 bg-black/20 text-zinc-300 hover:border-white/15 hover:text-zinc-100"
                            )}
                            {...bindTooltip(postureMeta[posture].label, blocker ?? postureMeta[posture].hint)}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <PostureIcon posture={posture} />
                              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{postureMeta[posture].short}</span>
                            </div>
                            <div className="text-sm font-medium">{postureMeta[posture].label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">Темп движения</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(moveMeta) as MoveMode[]).map((mode) => {
                        const blocker = selectionMode === "unit" && !pendingRoute ? availabilityReason(selectedUnit, "move", mode) : null;
                        const active = pendingRoute ? pendingSegment?.mode === mode : selectionMode === "group" ? selectedGroupUnits.every((unit) => unit.moveMode === mode) : selectedUnit.moveMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            disabled={Boolean(blocker)}
                            onClick={() => updateMove(mode)}
                            className={cn(
                              "rounded-2xl border p-3 text-left transition",
                              blocker ? "cursor-not-allowed border-white/6 bg-white/[0.02] text-zinc-500" : active ? "border-cyan-400/35 bg-cyan-500/12 text-zinc-50" : "border-white/8 bg-black/20 text-zinc-300 hover:border-white/15 hover:text-zinc-100"
                            )}
                            {...bindTooltip(modeMetaTitle(mode), blocker ?? `${moveMeta[mode].hint} Скорость: ${moveMeta[mode].speed}; шум: ${moveMeta[mode].noise}; утомление: ${moveMeta[mode].fatigue}.`)}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <MoveIcon mode={mode} />
                              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{moveMeta[mode].short}</span>
                            </div>
                            <div className="text-sm font-medium">{moveMeta[mode].label}</div>
                            <div className="mt-1 text-xs text-zinc-500">шум {moveMeta[mode].noise}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">Приказ</div>
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(orderMeta) as OrderType[]).map((order) => {
                      const active = pendingRoute ? pendingRoute.orderType === order : selectionMode === "group" ? selectedGroup.orderType === order : selectedUnit.orderType === order;
                      return (
                        <button
                          key={order}
                          type="button"
                          onClick={() => updateOrder(order)}
                          className={cn(
                            "rounded-2xl border px-3 py-3 text-left transition",
                            active
                              ? cn("border-white/10", orderMeta[order].accent)
                              : "border-white/8 bg-black/20 text-zinc-300 hover:border-white/15 hover:text-zinc-100"
                          )}
                          {...bindTooltip(orderMeta[order].label, orderMeta[order].description)}
                        >
                          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{orderMeta[order].short}</div>
                          <div className="mt-1 text-sm font-medium">{orderMeta[order].label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex h-full flex-col gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Предупреждения и быстрые действия</div>
                  <div className="mt-1 text-sm text-zinc-300">Основные риски остаются видимыми здесь, а не размазываются по множеству мелких полей.</div>
                </div>

                <div className="space-y-2">
                  {summaryWarnings.map((warning) => (
                    <div key={warning} className="rounded-2xl border border-amber-400/18 bg-amber-500/8 px-3 py-2.5 text-sm leading-relaxed text-amber-100">{warning}</div>
                  ))}
                  {summaryWarnings.length === 0 && (
                    <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5 text-sm text-zinc-400">Критических предупреждений нет.</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => runQuickAction("hold")} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-left transition hover:border-white/15 hover:text-zinc-100" {...bindTooltip("Удерживать", "Закрепляет текущий приоритет: занять укрытие, стабилизировать сектор и не ломать строй.") }>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Быстро</div>
                    <div className="mt-1 text-sm font-medium text-zinc-100">Удерживать</div>
                  </button>
                  <button type="button" onClick={() => runQuickAction("smoke")} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-left transition hover:border-white/15 hover:text-zinc-100" {...bindTooltip("Дым", "Демонстрационный запрос дымового прикрытия для опасного сектора.") }>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Быстро</div>
                    <div className="mt-1 text-sm font-medium text-zinc-100">Дым</div>
                  </button>
                  <button type="button" onClick={() => runQuickAction("sector")} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-left transition hover:border-white/15 hover:text-zinc-100" {...bindTooltip("Сектор", "Переносит фокус наблюдения на наиболее значимый контакт для текущего выбора.") }>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Быстро</div>
                    <div className="mt-1 text-sm font-medium text-zinc-100">Сектор</div>
                  </button>
                  <button type="button" onClick={() => runQuickAction("recover")} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-left transition hover:border-white/15 hover:text-zinc-100" {...bindTooltip("Стабилизация", "Снижает подавление и слегка восстанавливает управляемость подразделения.") }>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Быстро</div>
                    <div className="mt-1 text-sm font-medium text-zinc-100">Стабилизация</div>
                  </button>
                </div>

                <div className="mt-auto rounded-2xl border border-white/8 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Маршрут и подтверждение</div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {pendingRoute
                          ? `${pendingRoute.scope === "group" ? selectedGroup.callsign : selectedUnit.callsign} → ${pendingRoute.label}`
                          : selectedUnit.route
                            ? `${selectedUnit.callsign} выполняет маршрут к ${selectedUnit.route.label}`
                            : "Маршрут не задан. Щёлкните по карте для создания демонстрационного приказа."}
                      </div>
                    </div>
                    {pendingRoute && <SmallPill tone={cn("border-white/10", orderMeta[pendingRoute.orderType].accent)}>{orderMeta[pendingRoute.orderType].short}</SmallPill>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={confirmPendingRoute}
                      className={cn(
                        "flex-1 rounded-2xl border px-4 py-3 text-sm font-medium tracking-[0.04em] transition",
                        pendingRoute
                          ? "border-cyan-400/35 bg-cyan-500/14 text-cyan-50 hover:bg-cyan-500/18"
                          : "cursor-not-allowed border-white/6 bg-white/[0.02] text-zinc-500"
                      )}
                      disabled={!pendingRoute}
                    >
                      Подтвердить приказ
                    </button>
                    <button
                      type="button"
                      onClick={cancelPendingRoute}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm font-medium tracking-[0.04em] transition",
                        pendingRoute
                          ? "border-white/10 bg-black/20 text-zinc-200 hover:border-white/15 hover:text-white"
                          : "cursor-not-allowed border-white/6 bg-white/[0.02] text-zinc-500"
                      )}
                      disabled={!pendingRoute}
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </footer>
      </div>

      {tooltip && (
        <div className="pointer-events-none fixed z-50 max-w-xs rounded-2xl border border-white/10 bg-[#0d1317]/96 px-3 py-2.5 shadow-[0_16px_34px_rgba(0,0,0,0.35)] backdrop-blur-xl" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Подсказка</div>
          <div className="mt-1 text-sm font-medium text-zinc-50">{tooltip.title}</div>
          <div className="mt-1 text-sm leading-relaxed text-zinc-300">{tooltip.text}</div>
        </div>
      )}
    </div>
  );
}

function modeMetaTitle(mode: MoveMode) {
  return moveMeta[mode].label;
}

export default App;
