import React, { useEffect, useMemo, useRef, useState } from "react";

const WORK_W = 6000;
const WORK_H = 4000;
const GRID = 28;
const HISTORY_LIMIT = 10;

const backgrounds = [
  ["felt", "Сукно", "linear-gradient(135deg,#164737,#061713), repeating-linear-gradient(45deg,rgba(255,255,255,.025) 0 2px,transparent 2px 7px)"],
  ["dark", "Тёмный", "radial-gradient(circle at 25% 20%,rgba(96,165,250,.10),transparent 30%),linear-gradient(180deg,#151a22,#090c11)"],
  ["sea", "Море", "radial-gradient(circle at 28% 20%,rgba(125,211,252,.18),transparent 28%),repeating-linear-gradient(170deg,rgba(147,197,253,.12) 0 2px,transparent 2px 18px),linear-gradient(180deg,#0f3f5f,#07111f 78%)"],
  ["wood", "Дерево", "repeating-linear-gradient(90deg,rgba(255,255,255,.045) 0 2px,transparent 2px 32px),linear-gradient(90deg,#5a351c,#2c180d 55%,#6a3d1f)"],
  ["stone", "Камень", "linear-gradient(135deg,rgba(255,255,255,.04) 25%,transparent 25%),linear-gradient(180deg,#1d2532,#0e121a)"],
  ["parchment", "Пергамент", "radial-gradient(circle at 24% 26%,rgba(255,255,255,.18),transparent 24%),linear-gradient(135deg,#9b7a47,#4b341b)"],
  ["sand", "Песок", "radial-gradient(circle at 20% 20%,rgba(255,255,255,.12),transparent 18%),linear-gradient(135deg,#92723e,#3c2b18)"],
  ["tactical", "Тактика", "linear-gradient(rgba(59,130,246,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.14) 1px,transparent 1px),linear-gradient(180deg,#0c1828,#050913)"],
];

const spaceKinds = [["normal", "Обычная"], ["city", "Город"], ["port", "Порт"], ["area", "Область"], ["special", "Специальная"]];
const spaceShapes = [["circle", "Круг"], ["square", "Квадрат"], ["hex", "Гекс"]];
const labelPositions = [["right", "Справа"], ["left", "Слева"], ["top", "Сверху"], ["bottom", "Снизу"], ["manual", "Ручное смещение"]];
const labelFonts = [
  ["serif", "Римский serif", "Georgia, 'Times New Roman', Times, serif"],
  ["times", "Классический", "'Times New Roman', Times, serif"],
  ["palatino", "Палатино", "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif"],
  ["cambria", "Камбрия", "Cambria, Georgia, 'Times New Roman', serif"],
  ["system", "Современный", "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"],
  ["trebuchet", "Чёткий", "'Trebuchet MS', Arial, sans-serif"],
];
const connectionKinds = [["normal", "Обычная"], ["road", "Дорога"], ["sea", "Море"], ["special", "Специальная"]];
const connectionLineStyles = [["solid", "Сплошная"], ["dashed", "Прерывистая"], ["short-dash", "Штрихованная"], ["dotted", "Точки"], ["dash-dot", "Точка-тире"]];
const zoneKinds = [["reserve", "Резерв"], ["removed", "Удалённые фишки"], ["deck", "Колода"], ["discard", "Сброс"], ["reference", "Справочная зона"], ["other", "Другое"]];

const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
function uniqueId(base, existingIds) {
  const used = new Set(existingIds);
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(n)) ? Number(n) : min));
const round = (n) => Math.round(n * 100) / 100;
const snap = (n, on) => on ? Math.round(n / GRID) * GRID : round(n);
const slug = (s) => String(s || "item").toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-").replace(/^-|-$/g, "") || "item";
const angleDeg = (cx, cy, x, y) => Math.atan2(y - cy, x - cx) * 180 / Math.PI;

const DEFAULT_SPACE_STYLE = {
  fillColor: "#facc15",
  borderColor: "#111827",
  opacity: 100,
  shadowEnabled: true,
  shadowX: 0,
  shadowY: 3,
  shadowBlur: 12,
  shadowOpacity: 45,
};

const DEFAULT_CONNECTION_STYLE = {
  color: "#f8fafc",
  width: 5,
  opacity: 100,
  shadowEnabled: true,
  shadowX: 0,
  shadowY: 2,
  shadowBlur: 3,
  shadowOpacity: 55,
};

function cssShadow(o, defX = 0, defY = 3, defBlur = 12, defOpacity = 45) {
  if (o?.shadowEnabled === false) return "none";
  const x = Number(o?.shadowX ?? defX);
  const y = Number(o?.shadowY ?? defY);
  const blur = clamp(o?.shadowBlur ?? defBlur, 0, 100);
  const opacity = clamp(o?.shadowOpacity ?? defOpacity, 0, 100) / 100;
  return `${x}px ${y}px ${blur}px rgba(0,0,0,${opacity})`;
}

function svgShadow(o, defX = 0, defY = 2, defBlur = 3, defOpacity = 55) {
  if (o?.shadowEnabled === false) return "none";
  const x = Number(o?.shadowX ?? defX);
  const y = Number(o?.shadowY ?? defY);
  const blur = clamp(o?.shadowBlur ?? defBlur, 0, 100);
  const opacity = clamp(o?.shadowOpacity ?? defOpacity, 0, 100) / 100;
  return `drop-shadow(${x}px ${y}px ${blur}px rgba(0,0,0,${opacity}))`;
}

function ordered(list) {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function moveOrderedItem(list, idKey, dragId, targetId) {
  const visual = ordered(list);
  const from = visual.findIndex(x => x[idKey] === dragId);
  const to = visual.findIndex(x => x[idKey] === targetId);
  if (from === -1 || to === -1) return list;
  const [item] = visual.splice(from, 1);
  visual.splice(to, 0, item);
  return visual.map((x, i) => ({ ...x, order: i + 1 }));
}

function labelFontFamily(id) {
  return (labelFonts.find(font => font[0] === id) || labelFonts[0])[2];
}

function spaceLabelStyle(space, size) {
  const position = space.labelPosition || "right";
  const offsetX = Number(space.labelOffsetX ?? 0);
  const offsetY = Number(space.labelOffsetY ?? 0);
  const transparentBg = space.labelBgTransparent === true;
  const base = {
    fontSize: `${space.labelSize ?? 13}px`,
    fontFamily: labelFontFamily(space.labelFont || "serif"),
    color: space.labelColor || "#e5e7eb",
    background: transparentBg ? "transparent" : (space.labelBg || "rgba(10,12,18,.72)"),
    borderColor: transparentBg ? "transparent" : "rgba(255,255,255,.12)",
  };

  if (position === "left") return { ...base, left: `${size / 2 - 8 + offsetX}px`, top: `calc(50% + ${offsetY}px)`, transform: "translate(-100%, -50%)" };
  if (position === "top") return { ...base, left: `calc(50% + ${offsetX}px)`, top: `${-8 + offsetY}px`, transform: "translate(-50%, -100%)" };
  if (position === "bottom") return { ...base, left: `calc(50% + ${offsetX}px)`, top: `${size + 8 + offsetY}px`, transform: "translate(-50%, 0)" };
  if (position === "manual") return { ...base, left: `calc(50% + ${offsetX}px)`, top: `calc(50% + ${offsetY}px)`, transform: "translate(-50%, -50%)" };
  return { ...base, left: `${size / 2 + 8 + offsetX}px`, top: `calc(50% + ${offsetY}px)`, transform: "translateY(-50%)" };
}

function connectionDash(style) {
  if (style === "dashed") return "18 12";
  if (style === "short-dash") return "8 8";
  if (style === "dotted") return "2 10";
  if (style === "dash-dot") return "18 9 3 9";
  return "";
}

function smoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${round(c1.x)} ${round(c1.y)}, ${round(c2.x)} ${round(c2.y)}, ${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
}

function connectionPoints(connection, spacesById) {
  const a = spacesById[connection.fromSpaceId];
  const b = spacesById[connection.toSpaceId];
  if (!a || !b) return [];
  return [a, ...(connection.points || []), b].map(p => ({ x: p.x, y: p.y }));
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return Math.hypot(point.x - x, point.y - y);
}

function curveInsertIndex(points, point) {
  if (points.length < 2) return 0;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distanceToSegment(point, points[i], points[i + 1]);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function layerCenter(layer) {
  return { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 };
}

function rotatePoint(point, center, angle) {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

function worldToLayerLocal(point, layer) {
  const c = layerCenter(layer);
  const unrotated = rotatePoint(point, c, -Number(layer.rotation || 0));
  return {
    rx: (unrotated.x - layer.x) / Math.max(1, layer.width),
    ry: (unrotated.y - layer.y) / Math.max(1, layer.height),
  };
}

function layerLocalToWorld(local, layer) {
  const raw = {
    x: layer.x + local.rx * layer.width,
    y: layer.y + local.ry * layer.height,
  };
  return rotatePoint(raw, layerCenter(layer), Number(layer.rotation || 0));
}

function transformBoundPoint(point, oldLayer, newLayer) {
  return layerLocalToWorld(worldToLayerLocal(point, oldLayer), newLayer);
}

function transformRect(rect, oldLayer, newLayer) {
  const p1 = transformBoundPoint({ x: rect.x, y: rect.y }, oldLayer, newLayer);
  const p2 = transformBoundPoint({ x: rect.x + rect.width, y: rect.y + rect.height }, oldLayer, newLayer);
  return {
    x: Math.min(p1.x, p2.x),
    y: Math.min(p1.y, p2.y),
    width: Math.max(20, Math.abs(p2.x - p1.x)),
    height: Math.max(20, Math.abs(p2.y - p1.y)),
  };
}

function defaultLayer(i = 1) {
  return { id: `layer-test-map-${i}`, kind: "test", name: `Тестовая карта ${i}`, src: null, x: 260 + i * 20, y: 180 + i * 18, width: 720, height: 460, rotation: -2, opacity: 94, visible: true, locked: false, zIndex: i, shadowEnabled: true, shadowX: 0, shadowY: 24, shadowBlur: 46, shadowSpread: 0, shadowOpacity: 36 };
}

function boxShadow(o) {
  if (o?.shadowEnabled === false) return "inset 0 1px 0 rgba(255,255,255,.14)";
  const x = Number(o?.shadowX ?? 0);
  const y = Number(o?.shadowY ?? 24);
  const blur = clamp(o?.shadowBlur ?? 46, 0, 500);
  const spread = clamp(o?.shadowSpread ?? 0, -300, 500);
  const opacity = clamp(o?.shadowOpacity ?? 36, 0, 100) / 100;
  return `${x}px ${y}px ${blur}px ${spread}px rgba(0,0,0,${opacity}), inset 0 1px 0 rgba(255,255,255,.14)`;
}

function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [leftTab, setLeftTab] = useState("layers");
  const [tool, setTool] = useState("select");
  const [layers, setLayers] = useState([defaultLayer(1)]);
  const [spaces, setSpaces] = useState([]);
  const [connections, setConnections] = useState([]);
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState({ type: "layer", id: "layer-test-map-1" });
  const [view, setView] = useState({ zoom: 0.72, panX: 0, panY: 0 });
  const [bg, setBg] = useState("felt");
  const [grid, setGrid] = useState(true);
  const [snapOn, setSnapOn] = useState(false);
  const [message, setMessage] = useState("Готово");
  const [linkStart, setLinkStart] = useState(null);
  const [validation, setValidation] = useState(null);
  const [mapMeta, setMapMeta] = useState({ schemaVersion: "0.1", mapId: "test-map", moduleId: "test-module", version: "0.1", name: "Тестовая карта" });
  const [history, setHistory] = useState({ past: [], future: [] });
  const [dragLayerId, setDragLayerId] = useState(null);
  const [mapDrag, setMapDrag] = useState(null);
  const [bindMapToLayer, setBindMapToLayer] = useState(true);
  const [boundLayerId, setBoundLayerId] = useState("layer-test-map-1");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [keepLayerRatio, setKeepLayerRatio] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);

  const fileRef = useRef(null);
  const tableRef = useRef(null);
  const dragRef = useRef(null);
  const continuousRef = useRef(null);

  const spacesById = useMemo(() => Object.fromEntries(spaces.map(s => [s.spaceId, s])), [spaces]);
  const bgData = backgrounds.find(b => b[0] === bg) || backgrounds[0];
  const selectedObj = selected.type === "layer" ? layers.find(x => x.id === selected.id) : selected.type === "space" ? spaces.find(x => x.spaceId === selected.id) : selected.type === "connection" ? connections.find(x => x.connectionId === selected.id) : selected.type === "zone" ? zones.find(x => x.zoneId === selected.id) : null;

  const snapshot = () => ({ layers: structuredClone(layers), spaces: structuredClone(spaces), connections: structuredClone(connections), zones: structuredClone(zones), selected: { ...selected }, bg, grid, snapOn, bindMapToLayer, boundLayerId, keepLayerRatio, mapMeta: { ...mapMeta } });
  const restore = (s) => { setLayers(s.layers); setSpaces(s.spaces); setConnections(s.connections); setZones(s.zones); setSelected(s.selected); setBg(s.bg); setGrid(s.grid); setSnapOn(s.snapOn); setBindMapToLayer(s.bindMapToLayer ?? true); setBoundLayerId(s.boundLayerId || s.layers?.[0]?.id || "layer-test-map-1"); setKeepLayerRatio(s.keepLayerRatio ?? true); setMapMeta(s.mapMeta); };
  const pushHistory = () => setHistory(h => ({ past: [...h.past, snapshot()].slice(-HISTORY_LIMIT), future: [] }));
  const undo = () => setHistory(h => { if (!h.past.length) return h; const current = snapshot(); const prev = h.past[h.past.length - 1]; restore(prev); setMessage("Действие отменено"); return { past: h.past.slice(0, -1), future: [current, ...h.future].slice(0, HISTORY_LIMIT) }; });
  const redo = () => setHistory(h => { if (!h.future.length) return h; const current = snapshot(); const next = h.future[0]; restore(next); setMessage("Действие повторено"); return { past: [...h.past, current].slice(-HISTORY_LIMIT), future: h.future.slice(1) }; });

  const worldPoint = (e) => {
    const r = tableRef.current.getBoundingClientRect();
    return { x: round((e.clientX - r.left) / view.zoom), y: round((e.clientY - r.top) / view.zoom) };
  };

  const applyBoundMapTransform = (oldLayer, newLayer, sourceSpaces = spaces, sourceConnections = connections, sourceZones = zones) => {
    if (!oldLayer || !newLayer || !bindMapToLayer || oldLayer.id !== boundLayerId) return;

    setSpaces(sourceSpaces.map(s => {
      const p = transformBoundPoint({ x: s.x, y: s.y }, oldLayer, newLayer);
      return { ...s, x: round(p.x), y: round(p.y) };
    }));

    setConnections(sourceConnections.map(c => ({
      ...c,
      points: (c.points || []).map(pt => {
        const p = transformBoundPoint(pt, oldLayer, newLayer);
        return { x: round(p.x), y: round(p.y) };
      }),
    })));

    setZones(sourceZones.map(z => {
      const r = transformRect(z, oldLayer, newLayer);
      return { ...z, x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
    }));
  };

  const updateLayer = (id, patch, record = true) => {
    const affectsGeometry = ["x", "y", "width", "height", "rotation"].some(key => Object.prototype.hasOwnProperty.call(patch, key));
    const oldLayer = layers.find(layer => layer.id === id);
    if (record) pushHistory();
    if (record && affectsGeometry && oldLayer && bindMapToLayer && id === boundLayerId) {
      applyBoundMapTransform(oldLayer, { ...oldLayer, ...patch }, spaces, connections, zones);
    }
    setLayers(a => a.map(x => x.id === id ? { ...x, ...patch } : x));
  };
  const updateSpace = (id, patch, record = true) => { if (record) pushHistory(); setSpaces(a => a.map(x => x.spaceId === id ? { ...x, ...patch } : x)); if (patch.spaceId) setConnections(a => a.map(c => ({ ...c, fromSpaceId: c.fromSpaceId === id ? patch.spaceId : c.fromSpaceId, toSpaceId: c.toSpaceId === id ? patch.spaceId : c.toSpaceId }))); if (patch.spaceId && selected.id === id) setSelected({ type: "space", id: patch.spaceId }); };
  const updateConnection = (id, patch, record = true) => { if (record) pushHistory(); setConnections(a => a.map(x => x.connectionId === id ? { ...x, ...patch } : x)); if (patch.connectionId && selected.id === id) setSelected({ type: "connection", id: patch.connectionId }); };
  const updateZone = (id, patch, record = true) => { if (record) pushHistory(); setZones(a => a.map(x => x.zoneId === id ? { ...x, ...patch } : x)); if (patch.zoneId && selected.id === id) setSelected({ type: "zone", id: patch.zoneId }); };

  const addLayer = () => { const n = layers.length + 1; const layer = { ...defaultLayer(n), id: uniqueId(`layer-test-map-${n}`, layers.map(l => l.id)) }; pushHistory(); setLayers([...layers, layer]); setSelected({ type: "layer", id: layer.id }); setLeftTab("layers"); setMessage("Тестовая карта добавлена"); };
  const addSpaceAt = (p) => { const n = spaces.length + 1; const spaceId = uniqueId(`space-${n}`, spaces.map(s => s.spaceId)); const name = `Точка ${n}`; const space = { spaceId, name, labelText: name, labelVisible: true, labelPosition: "right", labelOffsetX: 0, labelOffsetY: 0, labelSize: 13, labelFont: "serif", labelColor: "#e5e7eb", labelBg: "rgba(10,12,18,.72)", labelBgTransparent: false, x: snap(p.x, snapOn), y: snap(p.y, snapOn), kind: "normal", shape: "circle", size: 22, order: n, visible: true, locked: false, notes: "", ...DEFAULT_SPACE_STYLE }; pushHistory(); setSpaces([...spaces, space]); setSelected({ type: "space", id: space.spaceId }); setLeftTab("map"); setMessage("Точка добавлена"); };
  const beginZoneAt = (p) => { const n = zones.length + 1; const zoneId = uniqueId(`zone-${n}`, zones.map(z => z.zoneId)); const zone = { zoneId, name: `Зона ${n}`, kind: "reserve", x: snap(p.x, snapOn), y: snap(p.y, snapOn), width: 1, height: 1, order: n, visible: true, locked: false }; pushHistory(); setZones([...zones, zone]); setSelected({ type: "zone", id: zone.zoneId }); dragRef.current = { type: "drawZone", id: zone.zoneId, sx: zone.x, sy: zone.y }; setLeftTab("map"); setMessage("Зона добавлена"); };

  const deleteSelected = () => {
    if (!selected.id) return;
    pushHistory();
    if (selected.type === "layer") setLayers(a => a.filter(x => x.id !== selected.id));
    if (selected.type === "space") {
      const count = connections.filter(c => c.fromSpaceId === selected.id || c.toSpaceId === selected.id).length;
      if (count && !confirm(`Удалить точку и связанные связи (${count})?`)) return;
      setSpaces(a => a.filter(x => x.spaceId !== selected.id));
      setConnections(a => a.filter(c => c.fromSpaceId !== selected.id && c.toSpaceId !== selected.id));
    }
    if (selected.type === "connection") setConnections(a => a.filter(x => x.connectionId !== selected.id));
    if (selected.type === "zone") setZones(a => a.filter(x => x.zoneId !== selected.id));
    setSelected({ type: null, id: null });
    setMessage("Объект удалён");
  };

  const reorderLayers = (dragId, targetId) => {
    if (!dragId || !targetId || dragId === targetId) return;
    pushHistory();
    const visual = [...layers].sort((a, b) => b.zIndex - a.zIndex);
    const from = visual.findIndex(x => x.id === dragId);
    const to = visual.findIndex(x => x.id === targetId);
    const [item] = visual.splice(from, 1);
    visual.splice(to, 0, item);
    setLayers(visual.map((x, i) => ({ ...x, zIndex: visual.length - i })));
    setSelected({ type: "layer", id: dragId });
    setMessage("Порядок слоёв изменён");
  };

  const reorderMapItems = (type, dragId, targetId) => {
    if (!dragId || !targetId || dragId === targetId) return;
    pushHistory();
    if (type === "space") setSpaces(list => moveOrderedItem(list, "spaceId", dragId, targetId));
    if (type === "connection") setConnections(list => moveOrderedItem(list, "connectionId", dragId, targetId));
    if (type === "zone") setZones(list => moveOrderedItem(list, "zoneId", dragId, targetId));
    setSelected({ type, id: dragId });
    setMessage("Порядок объектов карты изменён");
  };

  const connectSpace = (spaceId) => {
    if (tool !== "connection") return false;
    if (!linkStart) { setLinkStart(spaceId); setSelected({ type: "space", id: spaceId }); setMessage("Выберите вторую точку"); return true; }
    if (linkStart === spaceId) { setMessage("Нельзя связать точку саму с собой"); return true; }
    const from = spacesById[linkStart]; const to = spacesById[spaceId];
    const baseConnectionId = `connection-${slug(from?.name || linkStart)}-${slug(to?.name || spaceId)}`;
    const c = { connectionId: uniqueId(baseConnectionId, connections.map(x => x.connectionId)), name: `${from?.name || linkStart} — ${to?.name || spaceId}`, fromSpaceId: linkStart, toSpaceId: spaceId, kind: "road", lineStyle: "solid", points: [], order: connections.length + 1, visible: true, locked: false, ...DEFAULT_CONNECTION_STYLE };
    pushHistory(); setConnections([...connections, c]); setSelected({ type: "connection", id: c.connectionId }); setLinkStart(null); setLeftTab("map"); setMessage("Связь добавлена"); return true;
  };

  const addConnectionPointAt = (connectionId, point) => {
    const connection = connections.find(c => c.connectionId === connectionId);
    if (!connection || connection.locked) return;
    const fullPoints = connectionPoints(connection, spacesById);
    const insertAt = curveInsertIndex(fullPoints, point);
    const current = connection.points || [];
    const nextPoint = { x: snap(point.x, snapOn), y: snap(point.y, snapOn) };
    pushHistory();
    setConnections(list => list.map(c => c.connectionId === connectionId ? { ...c, points: [...current.slice(0, insertAt), nextPoint, ...current.slice(insertAt)] } : c));
    setSelected({ type: "connection", id: connectionId });
    setMessage("Точка кривой добавлена");
  };

  const handleWorkspaceDown = (e) => {
    if (e.button === 1 || tool === "pan") { e.preventDefault(); setContextMenu(null); dragRef.current = { type: "pan", sx: e.clientX, sy: e.clientY, px: view.panX, py: view.panY }; return; }
    const p = worldPoint(e);
    if (tool === "space") return addSpaceAt(p);
    if (tool === "zone") return beginZoneAt(p);
    setSelected({ type: null, id: null });
  };

  const startDrag = (e, type, id, extra = {}) => {
    e.stopPropagation();
    pushHistory();
    const p = worldPoint(e);
    const layer = layers.find(l => l.id === id);
    const shouldBind = bindMapToLayer && id === boundLayerId && type.startsWith("layer");
    dragRef.current = {
      type,
      id,
      sx: p.x,
      sy: p.y,
      ...extra,
      bindSnapshot: shouldBind && layer ? {
        layer: structuredClone(layer),
        spaces: structuredClone(spaces),
        connections: structuredClone(connections),
        zones: structuredClone(zones),
      } : null,
    };
  };

  useEffect(() => {
    const move = (e) => {
      const d = dragRef.current; if (!d) return;
      if (d.type === "pan") return setView(v => ({ ...v, panX: d.px + (e.clientX - d.sx), panY: d.py + (e.clientY - d.sy) }));
      const p = worldPoint(e); const dx = p.x - d.sx; const dy = p.y - d.sy;
      if (d.type === "layerMove") {
        const patch = { x: snap(d.x + dx, snapOn), y: snap(d.y + dy, snapOn) };
        updateLayer(d.id, patch, false);
        if (d.bindSnapshot?.layer) applyBoundMapTransform(d.bindSnapshot.layer, { ...d.bindSnapshot.layer, ...patch }, d.bindSnapshot.spaces, d.bindSnapshot.connections, d.bindSnapshot.zones);
      }
      if (d.type === "layerResize") {
        let nextW = d.w;
        let nextH = d.h;
        if (d.handle.includes("e")) nextW = d.w + dx;
        if (d.handle.includes("w")) nextW = d.w - dx;
        if (d.handle.includes("s")) nextH = d.h + dy;
        if (d.handle.includes("n")) nextH = d.h - dy;

        if (keepLayerRatio || e.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) nextH = nextW / d.ratio;
          else nextW = nextH * d.ratio;
        }

        nextW = Math.max(20, nextW);
        nextH = Math.max(20, nextH);
        const nextX = d.handle.includes("w") ? d.x + (d.w - nextW) : d.x;
        const nextY = d.handle.includes("n") ? d.y + (d.h - nextH) : d.y;
        const patch = { x: snap(nextX, snapOn), y: snap(nextY, snapOn), width: snap(nextW, snapOn), height: snap(nextH, snapOn) };
        updateLayer(d.id, patch, false);
        if (d.bindSnapshot?.layer) applyBoundMapTransform(d.bindSnapshot.layer, { ...d.bindSnapshot.layer, ...patch }, d.bindSnapshot.spaces, d.bindSnapshot.connections, d.bindSnapshot.zones);
      }
      if (d.type === "layerRotate") {
        const start = angleDeg(d.cx, d.cy, d.sx, d.sy);
        const now = angleDeg(d.cx, d.cy, p.x, p.y);
        let rotation = d.rotation + (now - start);
        if (e.shiftKey) rotation = Math.round(rotation / 15) * 15;
        const patch = { rotation: round(rotation) };
        updateLayer(d.id, patch, false);
        if (d.bindSnapshot?.layer) applyBoundMapTransform(d.bindSnapshot.layer, { ...d.bindSnapshot.layer, ...patch }, d.bindSnapshot.spaces, d.bindSnapshot.connections, d.bindSnapshot.zones);
      }
      if (d.type === "connectionPointMove") {
        setConnections(a => a.map(c => c.connectionId === d.id ? { ...c, points: (c.points || []).map((pt, i) => i === d.index ? { x: snap(d.x + dx, snapOn), y: snap(d.y + dy, snapOn) } : pt) } : c));
      }
      if (d.type === "spaceMove") updateSpace(d.id, { x: snap(d.x + dx, snapOn), y: snap(d.y + dy, snapOn) }, false);
      if (d.type === "zoneMove") updateZone(d.id, { x: snap(d.x + dx, snapOn), y: snap(d.y + dy, snapOn) }, false);
      if (d.type === "zoneResize") updateZone(d.id, { width: Math.max(20, snap(d.w + dx, snapOn)), height: Math.max(20, snap(d.h + dy, snapOn)) }, false);
      if (d.type === "drawZone") updateZone(d.id, { x: Math.min(d.sx, snap(p.x, snapOn)), y: Math.min(d.sy, snap(p.y, snapOn)), width: Math.max(20, Math.abs(snap(p.x, snapOn) - d.sx)), height: Math.max(20, Math.abs(snap(p.y, snapOn) - d.sy)) }, false);
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [view, snapOn, layers, spaces, connections, zones, bindMapToLayer, boundLayerId, keepLayerRatio]);

  useEffect(() => {
    const key = (e) => { const mod = e.ctrlKey || e.metaKey; if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); } if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); } };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [layers, spaces, connections, zones, selected, bg, grid, snapOn, mapMeta, history]);

  const handleWheel = (e) => {
    e.preventDefault(); const old = view.zoom; const next = clamp(round(old * (e.deltaY > 0 ? 0.92 : 1.08)), 0.15, 3.5); const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2 + view.panX, cy = r.top + r.height / 2 + view.panY;
    const lx = (e.clientX - cx) / old, ly = (e.clientY - cy) / old;
    setView({ zoom: next, panX: e.clientX - r.left - r.width / 2 - lx * next, panY: e.clientY - r.top - r.height / 2 - ly * next });
  };

  const fileLoad = (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => { const n = layers.length + 1; const layer = { ...defaultLayer(n), id: uid("layer-image"), kind: "image", name: f.name.replace(/\.[^.]+$/, ""), src: String(reader.result), width: img.naturalWidth, height: img.naturalHeight, rotation: 0, opacity: 100, zIndex: n }; pushHistory(); setLayers([...layers, layer]); setSelected({ type: "layer", id: layer.id }); setMessage(`Карта загружена: ${layer.width}×${layer.height}px`); }; img.src = String(reader.result); }; reader.readAsDataURL(f);
  };

  const validateMap = () => {
    const errors = [], warnings = [];
    const ids = (arr, key, label) => { const seen = new Set(); arr.forEach(x => { if (!x[key]) errors.push(`${label}: пустой id.`); if (seen.has(x[key])) errors.push(`${label}: повторяется id ${x[key]}.`); seen.add(x[key]); }); };
    ids(spaces, "spaceId", "Точка"); ids(connections, "connectionId", "Связь"); ids(zones, "zoneId", "Зона");
    if (!mapMeta.mapId.trim()) errors.push("mapId пустой.");
    spaces.forEach(s => { if (!s.name.trim()) errors.push(`У точки ${s.spaceId} нет названия.`); if (s.x < 0 || s.y < 0 || s.x > WORK_W || s.y > WORK_H) warnings.push(`Точка ${s.name || s.spaceId} вне разумных пределов рабочей области.`); });
    zones.forEach(z => { if (!z.name.trim()) errors.push(`У зоны ${z.zoneId} нет названия.`); });
    const pairSet = new Set();
    connections.forEach(c => { if (!spacesById[c.fromSpaceId]) errors.push(`Связь ${c.connectionId} ссылается на несуществующую точку: ${c.fromSpaceId}.`); if (!spacesById[c.toSpaceId]) errors.push(`Связь ${c.connectionId} ссылается на несуществующую точку: ${c.toSpaceId}.`); if (c.fromSpaceId === c.toSpaceId) errors.push(`Связь ${c.connectionId} соединяет точку саму с собой.`); const pair = [c.fromSpaceId, c.toSpaceId].sort().join("|"); if (pairSet.has(pair)) warnings.push(`Найдена повторная связь между ${c.fromSpaceId} и ${c.toSpaceId}.`); pairSet.add(pair); });
    setValidation({ errors, warnings }); setMessage(errors.length ? "Проверка: есть ошибки" : "Проверка пройдена");
  };

  const mapJson = () => ({ schemaVersion: "0.1", mapId: mapMeta.mapId, moduleId: mapMeta.moduleId, version: mapMeta.version, name: mapMeta.name, coordinateSystem: { type: "pixel", width: WORK_W, height: WORK_H }, background: { type: "layerRef", layerId: layers[0]?.id || null }, spaces: ordered(spaces).map(({ spaceId, name, labelText, labelVisible, labelPosition, labelOffsetX, labelOffsetY, labelSize, labelFont, labelColor, labelBg, labelBgTransparent, x, y, kind, shape, size, fillColor, borderColor, opacity, shadowEnabled, shadowX, shadowY, shadowBlur, shadowOpacity, order }) => ({ spaceId, name, x, y, kind, shape: shape || "circle", size: size || 22, order, label: { text: labelText || name, visible: labelVisible !== false, position: labelPosition || "right", offsetX: labelOffsetX ?? 0, offsetY: labelOffsetY ?? 0, size: labelSize ?? 13, font: labelFont || "serif", color: labelColor || "#e5e7eb", background: labelBgTransparent ? "transparent" : (labelBg || "rgba(10,12,18,.72)"), backgroundTransparent: labelBgTransparent === true }, style: { fillColor: fillColor || DEFAULT_SPACE_STYLE.fillColor, borderColor: borderColor || DEFAULT_SPACE_STYLE.borderColor, opacity: opacity ?? DEFAULT_SPACE_STYLE.opacity, shadowEnabled: shadowEnabled ?? true, shadowX: shadowX ?? DEFAULT_SPACE_STYLE.shadowX, shadowY: shadowY ?? DEFAULT_SPACE_STYLE.shadowY, shadowBlur: shadowBlur ?? DEFAULT_SPACE_STYLE.shadowBlur, shadowOpacity: shadowOpacity ?? DEFAULT_SPACE_STYLE.shadowOpacity } })), connections: ordered(connections).map(({ connectionId, fromSpaceId, toSpaceId, kind, name, lineStyle, points, color, width, opacity, shadowEnabled, shadowX, shadowY, shadowBlur, shadowOpacity, order }) => ({ connectionId, fromSpaceId, toSpaceId, kind, lineStyle: lineStyle || "solid", points: points || [], order, style: { color: color || DEFAULT_CONNECTION_STYLE.color, width: width ?? DEFAULT_CONNECTION_STYLE.width, opacity: opacity ?? DEFAULT_CONNECTION_STYLE.opacity, shadowEnabled: shadowEnabled ?? true, shadowX: shadowX ?? DEFAULT_CONNECTION_STYLE.shadowX, shadowY: shadowY ?? DEFAULT_CONNECTION_STYLE.shadowY, shadowBlur: shadowBlur ?? DEFAULT_CONNECTION_STYLE.shadowBlur, shadowOpacity: shadowOpacity ?? DEFAULT_CONNECTION_STYLE.shadowOpacity }, ...(name ? { name } : {}) })), zones: ordered(zones).map(({ zoneId, name, kind, x, y, width, height, order }) => ({ zoneId, name, kind, x, y, width, height, order })) });
  const projectJson = () => ({ version: "table-sandbox-0.1", mapMeta, view, bg, grid, snapOn, bindMapToLayer, boundLayerId, keepLayerRatio, layers, spaces, connections, zones, selected });
  const saveLocal = () => { localStorage.setItem("table-sandbox-preview", JSON.stringify(projectJson())); setMessage("Проект сохранён локально"); };
  const loadLocal = () => { const raw = localStorage.getItem("table-sandbox-preview"); if (!raw) return setMessage("Сохранённый проект не найден"); const p = JSON.parse(raw); setLayers(p.layers || []); setSpaces(p.spaces || []); setConnections(p.connections || []); setZones(p.zones || []); setMapMeta(p.mapMeta || mapMeta); setBg(p.bg || "felt"); setGrid(Boolean(p.grid)); setSnapOn(Boolean(p.snapOn)); setBindMapToLayer(p.bindMapToLayer ?? true); setBoundLayerId(p.boundLayerId || p.layers?.[0]?.id || "layer-test-map-1"); setKeepLayerRatio(p.keepLayerRatio ?? true); setView(p.view || view); setSelected(p.selected || { type: null, id: null }); setMessage("Проект загружен локально"); };

  const rangeHandlers = (key) => ({ onPointerDown: () => { if (continuousRef.current !== key) { continuousRef.current = key; pushHistory(); } }, onPointerUp: () => { continuousRef.current = null; }, onBlur: () => { continuousRef.current = null; }, onKeyDown: e => { e.stopPropagation(); if (continuousRef.current !== key) { continuousRef.current = key; pushHistory(); } }, onKeyUp: e => { e.stopPropagation(); continuousRef.current = null; } });

  const openContextMenu = (e, type, id, point = null) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected({ type, id });
    setContextMenu({ x: e.clientX, y: e.clientY, type, id, point });
  };

  const closeContextMenu = () => setContextMenu(null);

  const patchContextTarget = (patch) => {
    if (!contextMenu) return;
    if (contextMenu.type === "layer") updateLayer(contextMenu.id, patch);
    if (contextMenu.type === "space") updateSpace(contextMenu.id, patch);
    if (contextMenu.type === "connection") updateConnection(contextMenu.id, patch);
    if (contextMenu.type === "zone") updateZone(contextMenu.id, patch);
    closeContextMenu();
  };

  return (
    <div className="editor-root">
      <style>{css}</style>
      <input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={fileLoad} />
      <header className="topbar">
        <button className="icon" onClick={() => setLeftTab(leftTab === "closed" ? "layers" : "closed")} title="Показать / скрыть левую панель">{leftTab === "closed" ? "☰" : "×"}</button>

        <div className="menu-wrap">
          <button className="btn" onClick={() => { setLayerMenuOpen(v => !v); setToolMenuOpen(false); setProjectMenuOpen(false); }}>Слой ▾</button>
          {layerMenuOpen && <div className="menu-panel align-left wide-menu">
            <button onClick={() => { fileRef.current?.click(); setLayerMenuOpen(false); }}>Добавить изображение</button>
            <button onClick={() => { addLayer(); setLayerMenuOpen(false); }}>Добавить тестовую карту</button>
            <div className="menu-separator" />
            <button disabled={selected.type !== "layer"} onClick={() => { setTool("layer-move"); setLayerMenuOpen(false); }}>Инструмент: перемещать слой</button>
            <button disabled={selected.type !== "layer"} onClick={() => { setTool("layer-scale"); setLayerMenuOpen(false); }}>Инструмент: масштабировать слой</button>
            <button disabled={selected.type !== "layer"} onClick={() => { setTool("layer-rotate"); setLayerMenuOpen(false); }}>Инструмент: поворачивать слой</button>
            <button disabled={selected.type !== "layer"} onClick={() => { if (selectedObj && selected.type === "layer") updateLayer(selected.id, { rotation: 0 }); setLayerMenuOpen(false); }}>Сбросить поворот слоя</button>
          </div>}
        </div>

        <div className="menu-wrap">
          <button className={`btn ${["select","pan","space","connection","zone","layer-move","layer-scale","layer-rotate"].includes(tool) ? "active" : ""}`} onClick={() => { setToolMenuOpen(v => !v); setLayerMenuOpen(false); setProjectMenuOpen(false); }}>{toolName(tool)} ▾</button>
          {toolMenuOpen && <div className="menu-panel align-left wide-menu">
            <button onClick={() => { setTool("select"); setToolMenuOpen(false); }}>Выбрать / редактировать</button>
            <button onClick={() => { setTool("pan"); setToolMenuOpen(false); }}>Двигать вид</button>
            <div className="menu-separator" />
            <button onClick={() => { setTool("layer-move"); setToolMenuOpen(false); }}>Слой: перемещать</button>
            <button onClick={() => { setTool("layer-scale"); setToolMenuOpen(false); }}>Слой: масштабировать</button>
            <button onClick={() => { setTool("layer-rotate"); setToolMenuOpen(false); }}>Слой: поворачивать</button>
            <div className="menu-separator" />
            <button onClick={() => { setTool("space"); setToolMenuOpen(false); }}>Добавить точку</button>
            <button onClick={() => { setTool("connection"); setToolMenuOpen(false); }}>Добавить связь</button>
            <button onClick={() => { setTool("zone"); setToolMenuOpen(false); }}>Добавить зону</button>
          </div>}
        </div>

        <button className={`btn compact-tool ${tool === "select" ? "active" : ""}`} onClick={() => setTool("select")}>Выбрать</button>
        <button className={`btn compact-tool ${tool === "space" ? "active" : ""}`} onClick={() => setTool("space")}>+ Точка</button>
        <button className={`btn compact-tool ${tool === "connection" ? "active" : ""}`} onClick={() => setTool("connection")}>+ Связь</button>
        <button className={`btn compact-tool ${tool === "zone" ? "active" : ""}`} onClick={() => setTool("zone")}>+ Зона</button>
        <div className="sep" />
        <button className={`btn compact-tool ${tool === "pan" ? "active" : ""}`} onClick={() => setTool("pan")} title="Двигать холст мышью">✋ Холст</button>
        <button className={`btn compact-tool ${tool === "layer-move" ? "active" : ""}`} disabled={selected.type !== "layer"} onClick={() => setTool("layer-move")} title="Перемещать выбранную карту">↔ Карта</button>
        <button className={`btn compact-tool ${tool === "layer-scale" ? "active" : ""}`} disabled={selected.type !== "layer"} onClick={() => setTool("layer-scale")} title="Масштабировать выбранную карту">□ Масштаб</button>
        <button className={`btn compact-tool ${tool === "layer-rotate" ? "active" : ""}`} disabled={selected.type !== "layer"} onClick={() => setTool("layer-rotate")} title="Поворачивать выбранную карту">↻ Поворот</button>
        <button className={`btn compact-tool ${keepLayerRatio ? "active" : ""}`} disabled={selected.type !== "layer"} onClick={() => { pushHistory(); setKeepLayerRatio(v => !v); }} title="Сохранять соотношение сторон карты">🔗 Пропорции</button>

        <div className="sep" />
        <button className="icon" disabled={!history.past.length} onClick={undo} title="Отменить">↶</button>
        <button className="icon" disabled={!history.future.length} onClick={redo} title="Повторить">↷</button>

        <div className="toolbar-spacer" />

        <div className="menu-wrap">
          <button className="btn" onClick={() => { setProjectMenuOpen(v => !v); setToolMenuOpen(false); setLayerMenuOpen(false); }}>Файл ▾</button>
          {projectMenuOpen && <div className="menu-panel">
            <button onClick={() => { validateMap(); setProjectMenuOpen(false); }}>Проверить карту</button>
            <button onClick={() => { downloadJson("map.json", mapJson()); setProjectMenuOpen(false); }}>Экспорт map.json</button>
            <button onClick={() => { downloadJson("project.json", projectJson()); setProjectMenuOpen(false); }}>Экспорт проекта</button>
            <div className="menu-separator" />
            <button onClick={() => { saveLocal(); setProjectMenuOpen(false); }}>Сохранить локально</button>
            <button onClick={() => { loadLocal(); setProjectMenuOpen(false); }}>Загрузить локально</button>
            <button onClick={() => { setView({ zoom: 0.72, panX: 0, panY: 0 }); setMessage("Вид сброшен"); setProjectMenuOpen(false); }}>Сбросить вид</button>
          </div>}
        </div>
      </header>
      <div className="layout">
        {leftTab !== "closed" && <aside className="left">
          <div className="tabs"><button className={leftTab === "layers" ? "active" : ""} onClick={() => setLeftTab("layers")}>Слои</button><button className={leftTab === "map" ? "active" : ""} onClick={() => setLeftTab("map")}>Карта</button></div>
          {leftTab === "layers" ? <LayersPanel layers={layers} selected={selected} setSelected={setSelected} updateLayer={updateLayer} dragLayerId={dragLayerId} setDragLayerId={setDragLayerId} reorderLayers={reorderLayers} /> : <MapPanel spaces={spaces} connections={connections} zones={zones} selected={selected} setSelected={setSelected} updateSpace={updateSpace} updateConnection={updateConnection} updateZone={updateZone} spacesById={spacesById} mapDrag={mapDrag} setMapDrag={setMapDrag} reorderMapItems={reorderMapItems} />}
          <div className="table-settings"><b>Стол</b><select className="input" value={bg} onChange={e => { pushHistory(); setBg(e.target.value); }} >{backgrounds.map(b => <option key={b[0]} value={b[0]}>{b[1]}</option>)}</select><label><input type="checkbox" checked={grid} onChange={e => { pushHistory(); setGrid(e.target.checked); }} /> Сетка</label><label><input type="checkbox" checked={snapOn} onChange={e => { pushHistory(); setSnapOn(e.target.checked); }} /> Привязка</label><label><input type="checkbox" checked={bindMapToLayer} onChange={e => { pushHistory(); setBindMapToLayer(e.target.checked); }} /> Объекты карты следуют за подложкой</label><select className="input" value={boundLayerId} onChange={e => { pushHistory(); setBoundLayerId(e.target.value); }}>{layers.map(layer => <option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></div>
        </aside>}
        <main className={`stage ${tool === "pan" ? "stage-pan" : ""}`} onWheel={handleWheel} onPointerDown={handleWorkspaceDown} onClick={closeContextMenu} onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: "canvas", id: null, point: worldPoint(e) }); }} style={{ backgroundImage: grid ? `linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),${bgData[2]}` : bgData[2], backgroundSize: grid ? `${GRID}px ${GRID}px,${GRID}px ${GRID}px,auto` : "auto" }}>
          <div className="hud">Инструмент: <b>{toolName(tool)}</b><br />Масштаб: <b>{Math.round(view.zoom * 100)}%</b> · Точек: <b>{spaces.length}</b> · Связей: <b>{connections.length}</b> · Зон: <b>{zones.length}</b></div>
          <div className="message">{message}</div>
          <div ref={tableRef} className="workspace" style={{ width: WORK_W, height: WORK_H, transform: `translate(calc(-50% + ${view.panX}px), calc(-50% + ${view.panY}px)) scale(${view.zoom})` }}>
            {layers.filter(l => l.visible).sort((a,b)=>a.zIndex-b.zIndex).map(layer => <LayerView key={layer.id} layer={layer} tool={tool} selected={selected.type === "layer" && selected.id === layer.id} setSelected={setSelected} startDrag={startDrag} updateLayer={updateLayer} openContextMenu={openContextMenu} />)}
            <svg className="connections" width={WORK_W} height={WORK_H}>{ordered(connections).filter(c => c.visible).map(c => {
              const pts = connectionPoints(c, spacesById);
              if (pts.length < 2) return null;
              const isSelected = selected.type === 'connection' && selected.id === c.connectionId;
              return <g key={c.connectionId}>
                <path d={smoothPath(pts)} className={`conn ${isSelected?'sel':''}`} strokeDasharray={connectionDash(c.lineStyle)} style={{ stroke: c.color || DEFAULT_CONNECTION_STYLE.color, strokeWidth: isSelected ? Number(c.width ?? DEFAULT_CONNECTION_STYLE.width) + 3 : Number(c.width ?? DEFAULT_CONNECTION_STYLE.width), opacity: (c.opacity ?? DEFAULT_CONNECTION_STYLE.opacity) / 100, filter: svgShadow(c, 0, 2, 3, 55) }} onPointerDown={e=>{e.stopPropagation(); setSelected({type:'connection',id:c.connectionId});}} onContextMenu={e=>openContextMenu(e,'connection',c.connectionId,worldPoint(e))} onDoubleClick={e=>{e.stopPropagation(); addConnectionPointAt(c.connectionId, worldPoint(e));}} />
                {isSelected && (c.points || []).map((pt, i) => <g key={`${c.connectionId}-point-${i}`} className={`curve-point ${c.locked ? 'locked' : ''}`} transform={`translate(${pt.x} ${pt.y})`} onPointerDown={e=>{ if(!c.locked) startDrag(e,'connectionPointMove',c.connectionId,{index:i,x:pt.x,y:pt.y}); }}>
                  <circle r="9" />
                  <text y="4">{i+1}</text>
                </g>)}
              </g>;
            })}</svg>
            {ordered(zones).filter(z => z.visible).map(z => <ZoneView key={z.zoneId} zone={z} selected={selected.type==='zone'&&selected.id===z.zoneId} setSelected={setSelected} startDrag={startDrag} openContextMenu={openContextMenu} />)}
            {ordered(spaces).filter(s => s.visible).map(s => <SpaceView key={s.spaceId} space={s} selected={selected.type==='space'&&selected.id===s.spaceId} setSelected={setSelected} startDrag={startDrag} connectSpace={connectSpace} linkStart={linkStart} openContextMenu={openContextMenu} />)}
          </div>
          {validation && <ValidationPanel result={validation} onClose={() => setValidation(null)} />}
          {contextMenu && <ContextMenu menu={contextMenu} selectedObj={selectedObj} close={closeContextMenu} setTool={setTool} setBoundLayerId={setBoundLayerId} addSpaceAt={addSpaceAt} beginZoneAt={beginZoneAt} addConnectionPointAt={addConnectionPointAt} patchTarget={patchContextTarget} />}
        </main>
        <aside className="right"><Inspector selected={selected} obj={selectedObj} layers={layers} spaces={spaces} spacesById={spacesById} connections={connections} zones={zones} mapMeta={mapMeta} setMapMeta={(p)=>{pushHistory();setMapMeta({...mapMeta,...p});}} updateLayer={updateLayer} updateSpace={updateSpace} updateConnection={updateConnection} updateZone={updateZone} deleteSelected={deleteSelected} rangeHandlers={rangeHandlers} reorder={(id,dir)=>{ const visual=[...layers].sort((a,b)=>b.zIndex-a.zIndex); const i=visual.findIndex(x=>x.id===id); const target=dir==='up'?i-1:i+1; if(target>=0&&target<visual.length) reorderLayers(id,visual[target].id); }} duplicate={() => { if(selected.type==='layer'&&selectedObj){ pushHistory(); const copy={...selectedObj,id:uid('layer-copy'),name:selectedObj.name+' копия',x:selectedObj.x+30,y:selectedObj.y+30,zIndex:layers.length+1}; setLayers([...layers,copy]); setSelected({type:'layer',id:copy.id}); } }} /></aside>
      </div>
    </div>
  );
}

function toolName(t){return {select:'Выбрать',pan:'Двигать вид',space:'Добавить точку',connection:'Добавить связь',zone:'Добавить зону','layer-move':'Слой: перемещать','layer-scale':'Слой: масштабировать','layer-rotate':'Слой: поворачивать'}[t]||t}
function Tool({id,tool,setTool,children}){return <button className={`btn ${tool===id?'active':''}`} onClick={()=>setTool(id)}>{children}</button>}
function LayersPanel({layers,selected,setSelected,updateLayer,dragLayerId,setDragLayerId,reorderLayers}){return <div className="list">{[...layers].sort((a,b)=>b.zIndex-a.zIndex).map(l=><div key={l.id} draggable className={`row ${selected.type==='layer'&&selected.id===l.id?'active':''} ${dragLayerId===l.id?'dragging':''}`} onDragStart={e=>{setDragLayerId(l.id);e.dataTransfer.setData('text/plain',l.id)}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();reorderLayers(e.dataTransfer.getData('text/plain')||dragLayerId,l.id);setDragLayerId(null)}} onDragEnd={()=>setDragLayerId(null)} onClick={()=>setSelected({type:'layer',id:l.id})}><span className="grip">⋮⋮</span><button className="mini" onClick={e=>{e.stopPropagation();updateLayer(l.id,{visible:!l.visible})}}>{l.visible?'👁':'🚫'}</button><button className="mini" onClick={e=>{e.stopPropagation();updateLayer(l.id,{locked:!l.locked})}}>{l.locked?'🔒':'🔓'}</button><div><b>{l.name}</b><small>#{l.zIndex} · слой</small></div></div>)}</div>}
function MapPanel({spaces,connections,zones,selected,setSelected,updateSpace,updateConnection,updateZone,spacesById,mapDrag,setMapDrag,reorderMapItems}){return <div className="map-tree"><Tree title="Точки" count={spaces.length}>{ordered(spaces).map(s=><TreeItem key={s.spaceId} type="space" id={s.spaceId} drag={mapDrag} setDrag={setMapDrag} reorder={reorderMapItems} active={selected.type==='space'&&selected.id===s.spaceId} name={s.name} meta={`${s.kind} · ${s.shape || 'circle'}`} visible={s.visible} onClick={()=>setSelected({type:'space',id:s.spaceId})} onToggle={()=>updateSpace(s.spaceId,{visible:!s.visible})}/>)}</Tree><Tree title="Связи" count={connections.length}>{ordered(connections).map(c=><TreeItem key={c.connectionId} type="connection" id={c.connectionId} drag={mapDrag} setDrag={setMapDrag} reorder={reorderMapItems} active={selected.type==='connection'&&selected.id===c.connectionId} name={c.name||`${spacesById[c.fromSpaceId]?.name||c.fromSpaceId} — ${spacesById[c.toSpaceId]?.name||c.toSpaceId}`} meta={`${c.kind} · ${c.lineStyle || 'solid'}`} visible={c.visible} onClick={()=>setSelected({type:'connection',id:c.connectionId})} onToggle={()=>updateConnection(c.connectionId,{visible:!c.visible})}/>)}</Tree><Tree title="Зоны" count={zones.length}>{ordered(zones).map(z=><TreeItem key={z.zoneId} type="zone" id={z.zoneId} drag={mapDrag} setDrag={setMapDrag} reorder={reorderMapItems} active={selected.type==='zone'&&selected.id===z.zoneId} name={z.name} meta={z.kind} visible={z.visible} onClick={()=>setSelected({type:'zone',id:z.zoneId})} onToggle={()=>updateZone(z.zoneId,{visible:!z.visible})}/>)}</Tree></div>}
function Tree({title,count,children}){return <section className="tree"><h4>{title}<span>{count}</span></h4>{children}</section>}
function TreeItem({active,name,meta,visible,onClick,onToggle,type,id,drag,setDrag,reorder}){return <div className={`tree-item ${active?'active':''} ${drag?.type===type&&drag?.id===id?'dragging':''}`} draggable onDragStart={e=>{setDrag({type,id});e.dataTransfer.setData('text/plain',id)}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();reorder(type,e.dataTransfer.getData('text/plain')||drag?.id,id);setDrag(null)}} onDragEnd={()=>setDrag(null)} onClick={onClick}><span className="grip">⋮⋮</span><button className="mini" onClick={e=>{e.stopPropagation();onToggle()}}>{visible?'👁':'🚫'}</button><div><b>{name}</b><small>{meta}</small></div></div>}
function LayerView({layer,tool,selected,setSelected,startDrag,openContextMenu}){
  const canSelectLayer = ["select", "layer-move", "layer-scale", "layer-rotate"].includes(tool);
  const canMove = ["select", "layer-move"].includes(tool);
  const showScale = ["select", "layer-scale"].includes(tool);
  const showRotate = ["select", "layer-rotate"].includes(tool);
  const resize = (e, handle) => startDrag(e, 'layerResize', layer.id, { handle, x: layer.x, y: layer.y, w: layer.width, h: layer.height, ratio: layer.width / Math.max(1, layer.height) });
  const rotate = (e) => startDrag(e, 'layerRotate', layer.id, { cx: layer.x + layer.width / 2, cy: layer.y + layer.height / 2, rotation: layer.rotation });
  return <div className="layer" style={{left:layer.x,top:layer.y,width:layer.width,height:layer.height,opacity:layer.opacity/100,transform:`rotate(${layer.rotation}deg)`,zIndex:layer.zIndex,cursor:layer.locked?'default':canMove?'move':'default'}} onPointerDown={e=>{ if(canMove && !layer.locked) startDrag(e,'layerMove',layer.id,{x:layer.x,y:layer.y}); }} onClick={e=>{ if(canSelectLayer){ e.stopPropagation(); setSelected({type:'layer',id:layer.id}); } }} onContextMenu={e=>openContextMenu(e,'layer',layer.id)}>
    {layer.kind==='image'?<div className="map-card image" style={{boxShadow:boxShadow(layer)}}><img src={layer.src} draggable={false}/></div>:<div className="map-card" style={{boxShadow:boxShadow(layer)}}><div className="fake-map"><b>Тестовая карта</b><span>подложка редактора</span></div></div>}
    {selected&&<div className="select-box"><span>{layer.locked?'🔒':''}</span>{!layer.locked&&<>
      <em className="layer-mode-badge">{toolName(tool)}</em>
      {showScale&&<>
        <button className="layer-handle nw" onPointerDown={e=>resize(e,'nw')} title="Изменить размер" />
        <button className="layer-handle ne" onPointerDown={e=>resize(e,'ne')} title="Изменить размер" />
        <button className="layer-handle sw" onPointerDown={e=>resize(e,'sw')} title="Изменить размер" />
        <button className="layer-handle se" onPointerDown={e=>resize(e,'se')} title="Изменить размер" />
      </>}
      {showRotate&&<>
        <i className="rotate-line" />
        <button className="rotate-layer" onPointerDown={rotate} title="Повернуть слой">↻</button>
      </>}
    </>}</div>}
  </div>
}
function SpaceView({space,selected,setSelected,startDrag,connectSpace,linkStart,openContextMenu}){
  const size = clamp(space.size || 22, 8, 96);
  const shape = space.shape || 'circle';
  return <div
    className={`space ${selected?'sel':''} ${linkStart===space.spaceId?'link-start':''}`}
    style={{left:space.x,top:space.y,width:size,height:size}}
    onPointerDown={e=>{if(connectSpace(space.spaceId)){e.stopPropagation();return} if(!space.locked) startDrag(e,'spaceMove',space.spaceId,{x:space.x,y:space.y})}}
    onClick={e=>{e.stopPropagation();setSelected({type:'space',id:space.spaceId})}}
    onContextMenu={e=>openContextMenu(e,'space',space.spaceId)}
  >
    <span className={`space-marker ${shape}`} style={{width:size,height:size,background:space.fillColor || DEFAULT_SPACE_STYLE.fillColor,borderColor:space.borderColor || DEFAULT_SPACE_STYLE.borderColor,opacity:(space.opacity ?? DEFAULT_SPACE_STYLE.opacity)/100,boxShadow:cssShadow(space,0,3,12,45)}} />
    {space.labelVisible !== false && <b className="space-label" style={spaceLabelStyle(space, size)}>{space.labelText || space.name}</b>}
  </div>
}
function ZoneView({zone,selected,setSelected,startDrag,openContextMenu}){return <div className={`zone ${selected?'sel':''}`} style={{left:zone.x,top:zone.y,width:zone.width,height:zone.height}} onPointerDown={e=>!zone.locked&&startDrag(e,'zoneMove',zone.zoneId,{x:zone.x,y:zone.y})} onClick={e=>{e.stopPropagation();setSelected({type:'zone',id:zone.zoneId})}} onContextMenu={e=>openContextMenu(e,'zone',zone.zoneId)}><b>{zone.name}</b>{selected&&!zone.locked&&<button className="zone-resize" onPointerDown={e=>startDrag(e,'zoneResize',zone.zoneId,{w:zone.width,h:zone.height})}>◢</button>}</div>}
function ContextMenu({menu, selectedObj, close, setTool, setBoundLayerId, addSpaceAt, beginZoneAt, addConnectionPointAt, patchTarget}){
  const isCanvas = menu.type === 'canvas';
  const visible = selectedObj?.visible !== false;
  const locked = selectedObj?.locked === true;
  return <div className="context-menu" style={{left:menu.x,top:menu.y}} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
    {isCanvas && <>
      <button onClick={()=>{addSpaceAt(menu.point); close();}}>Добавить точку здесь</button>
      <button onClick={()=>{beginZoneAt(menu.point); close();}}>Добавить зону здесь</button>
      <button onClick={()=>{setTool('pan'); close();}}>Режим движения холста</button>
    </>}
    {menu.type === 'layer' && <>
      <button onClick={()=>{setTool('layer-move'); close();}}>Перемещать карту</button>
      <button onClick={()=>{setTool('layer-scale'); close();}}>Масштабировать карту</button>
      <button onClick={()=>{setTool('layer-rotate'); close();}}>Поворачивать карту</button>
      <button onClick={()=>{setBoundLayerId(menu.id); close();}}>Привязать объекты к этому слою</button>
      <div className="context-sep" />
    </>}
    {menu.type === 'connection' && <>
      <button onClick={()=>{addConnectionPointAt(menu.id, menu.point); close();}}>Добавить точку кривой здесь</button>
      <div className="context-sep" />
    </>}
    {!isCanvas && <>
      <button onClick={()=>patchTarget({visible:!visible})}>{visible ? 'Скрыть' : 'Показать'}</button>
      <button onClick={()=>patchTarget({locked:!locked})}>{locked ? 'Снять закрепление' : 'Закрепить'}</button>
    </>}
  </div>
}

function ValidationPanel({result,onClose}){return <div className="validation"><button onClick={onClose}>×</button><h3>{result.errors.length?'Проверка карты: есть ошибки':'Проверка карты пройдена'}</h3>{!result.errors.length&&!result.warnings.length&&<p>Ошибок и предупреждений нет.</p>}{!!result.errors.length&&<><h4>Ошибки</h4><ul>{result.errors.map((x,i)=><li key={i}>{x}</li>)}</ul></>}{!!result.warnings.length&&<><h4>Предупреждения</h4><ul>{result.warnings.map((x,i)=><li key={i}>{x}</li>)}</ul></>}</div>}
function Inspector(p){const {selected,obj}=p;if(!selected.id)return <div className="inspect"><Section title="Карта"><Field label="mapId"><input className="input" value={p.mapMeta.mapId} onChange={e=>p.setMapMeta({mapId:e.target.value})}/></Field><Field label="Название"><input className="input" value={p.mapMeta.name} onChange={e=>p.setMapMeta({name:e.target.value})}/></Field><Field label="moduleId"><input className="input" value={p.mapMeta.moduleId} onChange={e=>p.setMapMeta({moduleId:e.target.value})}/></Field></Section><p className="empty">Выберите слой, точку, связь или зону.</p></div>; if(!obj)return <div className="inspect"><p className="empty">Выбранный объект не найден. Выберите другой объект в списке слева.</p></div>; if(selected.type==='layer')return <LayerInspector {...p} layer={obj}/>; if(selected.type==='space')return <SpaceInspector {...p} space={obj}/>; if(selected.type==='connection')return <ConnectionInspector {...p} connection={obj}/>; if(selected.type==='zone')return <ZoneInspector {...p} zone={obj}/>; return <div className="inspect"><p className="empty">Неизвестный тип объекта.</p></div>;}
function Section({title,children}){return <section className="card"><h4>{title}</h4>{children}</section>}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
function Num({label,value,onChange,step='1'}){return <Field label={label}><input className="input" type="number" step={step} value={Number.isFinite(Number(value))?value:0} onChange={e=>onChange(Number(e.target.value))}/></Field>}
function Sel({label,value,onChange,options}){return <Field label={label}><select className="input" value={value} onChange={e=>onChange(e.target.value)}>{options.map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></Field>}
function Pill({active,onClick,children}){return <button className={`pill ${active?'active':''}`} onClick={onClick}>{children}</button>}
function LayerInspector({layer,layers,updateLayer,deleteSelected,duplicate,reorder,rangeHandlers}){if(!layer)return <div className="inspect"><p className="empty">Слой не найден.</p></div>; return <div className="inspect"><Section title="Визуальный слой"><Field label="Название"><input className="input" value={layer.name} onChange={e=>updateLayer(layer.id,{name:e.target.value})}/></Field><div className="tw"><Pill active={layer.visible} onClick={()=>updateLayer(layer.id,{visible:!layer.visible})}>{layer.visible?'Видима':'Скрыта'}</Pill><Pill active={layer.locked} onClick={()=>updateLayer(layer.id,{locked:!layer.locked})}>{layer.locked?'Закреплена':'Свободна'}</Pill></div></Section><Section title="Геометрия"><div className="grid2"><Num label="X" value={layer.x} step="0.1" onChange={v=>updateLayer(layer.id,{x:v})}/><Num label="Y" value={layer.y} step="0.1" onChange={v=>updateLayer(layer.id,{y:v})}/><Num label="Ширина" value={layer.width} step="0.5" onChange={v=>updateLayer(layer.id,{width:Math.max(1,v)})}/><Num label="Высота" value={layer.height} step="0.5" onChange={v=>updateLayer(layer.id,{height:Math.max(1,v)})}/><Num label="Поворот" value={layer.rotation} step="0.1" onChange={v=>updateLayer(layer.id,{rotation:v})}/><Num label="Слой" value={layer.zIndex} onChange={v=>updateLayer(layer.id,{zIndex:clamp(v,1,layers.length)})}/></div><Field label={`Прозрачность: ${layer.opacity}%`}><input type="range" className="range" min="0" max="100" value={layer.opacity} {...rangeHandlers(`${layer.id}:opacity`)} onChange={e=>updateLayer(layer.id,{opacity:Number(e.target.value)},false)}/></Field></Section><details className="details" open><summary>Тень <small>{layer.shadowEnabled?`${layer.shadowBlur}px · ${layer.shadowOpacity}%`:'выкл.'}</small></summary><div className="details-body"><label className="check"><input type="checkbox" checked={layer.shadowEnabled} onChange={e=>updateLayer(layer.id,{shadowEnabled:e.target.checked})}/> Включить тень</label><div className="grid2"><Num label="X" value={layer.shadowX} onChange={v=>updateLayer(layer.id,{shadowX:v})}/><Num label="Y" value={layer.shadowY} onChange={v=>updateLayer(layer.id,{shadowY:v})}/><Num label="Размытие" value={layer.shadowBlur} onChange={v=>updateLayer(layer.id,{shadowBlur:clamp(v,0,500)})}/><Num label="Растяжение" value={layer.shadowSpread} onChange={v=>updateLayer(layer.id,{shadowSpread:clamp(v,-300,500)})}/></div><Field label={`Непрозрачность: ${layer.shadowOpacity}%`}><input type="range" className="range" min="0" max="100" value={layer.shadowOpacity} {...rangeHandlers(`${layer.id}:shadowOpacity`)} onChange={e=>updateLayer(layer.id,{shadowOpacity:Number(e.target.value)},false)}/></Field></div></details><Section title="Действия"><div className="grid2"><button className="action" onClick={duplicate}>Дублировать</button><button className="action danger" onClick={deleteSelected}>Удалить</button><button className="action" disabled={layer.zIndex>=layers.length} onClick={()=>reorder(layer.id,'up')}>Выше</button><button className="action" disabled={layer.zIndex<=1} onClick={()=>reorder(layer.id,'down')}>Ниже</button></div></Section></div>}
function SpaceInspector({space,updateSpace,deleteSelected,rangeHandlers}){if(!space)return <div className="inspect"><p className="empty">Точка не найдена.</p></div>; return <div className="inspect"><Section title="Точка"><Field label="Идентификатор"><input className="input" value={space.spaceId} onChange={e=>updateSpace(space.spaceId,{spaceId:e.target.value})}/></Field><Field label="Название"><input className="input" value={space.name} onChange={e=>updateSpace(space.spaceId,{name:e.target.value})}/></Field><div className="grid2"><Sel label="Тип" value={space.kind} onChange={v=>updateSpace(space.spaceId,{kind:v})} options={spaceKinds}/><Sel label="Форма" value={space.shape || 'circle'} onChange={v=>updateSpace(space.spaceId,{shape:v})} options={spaceShapes}/></div><div className="grid2"><Num label="X центра" value={space.x} step="0.1" onChange={v=>updateSpace(space.spaceId,{x:v})}/><Num label="Y центра" value={space.y} step="0.1" onChange={v=>updateSpace(space.spaceId,{y:v})}/><Num label="Размер" value={space.size || 22} step="1" onChange={v=>updateSpace(space.spaceId,{size:clamp(v,8,96)})}/><Num label="Порядок" value={space.order || 1} step="1" onChange={v=>updateSpace(space.spaceId,{order:v})}/></div><Field label={`Размер маркера: ${space.size || 22}px`}><input type="range" className="range" min="8" max="96" value={space.size || 22} {...rangeHandlers(`${space.spaceId}:size`)} onChange={e=>updateSpace(space.spaceId,{size:Number(e.target.value)},false)}/></Field><div className="tw"><Pill active={space.visible} onClick={()=>updateSpace(space.spaceId,{visible:!space.visible})}>{space.visible?'Видима':'Скрыта'}</Pill><Pill active={space.locked} onClick={()=>updateSpace(space.spaceId,{locked:!space.locked})}>{space.locked?'Закреплена':'Свободна'}</Pill></div></Section><Section title="Надпись точки"><Field label="Текст надписи"><input className="input" value={space.labelText ?? space.name} onChange={e=>updateSpace(space.spaceId,{labelText:e.target.value})}/></Field><div className="grid2"><Sel label="Положение" value={space.labelPosition || 'right'} onChange={v=>updateSpace(space.spaceId,{labelPosition:v})} options={labelPositions}/><Sel label="Шрифт" value={space.labelFont || 'serif'} onChange={v=>updateSpace(space.spaceId,{labelFont:v})} options={labelFonts.map(([id,name])=>[id,name])}/><Num label="Размер текста" value={space.labelSize ?? 13} step="1" onChange={v=>updateSpace(space.spaceId,{labelSize:clamp(v,8,40)})}/><Num label="Смещение X" value={space.labelOffsetX ?? 0} step="1" onChange={v=>updateSpace(space.spaceId,{labelOffsetX:v})}/><Num label="Смещение Y" value={space.labelOffsetY ?? 0} step="1" onChange={v=>updateSpace(space.spaceId,{labelOffsetY:v})}/></div><div className="grid2"><Field label="Цвет текста"><input className="input color-input" type="color" value={space.labelColor || '#e5e7eb'} onChange={e=>updateSpace(space.spaceId,{labelColor:e.target.value})}/></Field><Field label="Фон надписи"><input className="input color-input" type="color" disabled={space.labelBgTransparent === true} value={space.labelBg && space.labelBg.startsWith('#') ? space.labelBg : '#0a0c12'} onChange={e=>updateSpace(space.spaceId,{labelBg:e.target.value,labelBgTransparent:false})}/></Field></div><div className="tw"><Pill active={space.labelVisible !== false} onClick={()=>updateSpace(space.spaceId,{labelVisible:space.labelVisible === false})}>{space.labelVisible === false ? 'Надпись скрыта' : 'Надпись видима'}</Pill><Pill active={space.labelBgTransparent === true} onClick={()=>updateSpace(space.spaceId,{labelBgTransparent:space.labelBgTransparent !== true})}>{space.labelBgTransparent === true ? 'Фон прозрачный' : 'Фон с заливкой'}</Pill></div></Section><Section title="Оформление точки"><div className="grid2"><Field label="Цвет точки"><input className="input color-input" type="color" value={space.fillColor || DEFAULT_SPACE_STYLE.fillColor} onChange={e=>updateSpace(space.spaceId,{fillColor:e.target.value})}/></Field><Field label="Цвет рамки"><input className="input color-input" type="color" value={space.borderColor || DEFAULT_SPACE_STYLE.borderColor} onChange={e=>updateSpace(space.spaceId,{borderColor:e.target.value})}/></Field></div><Field label={`Прозрачность: ${space.opacity ?? DEFAULT_SPACE_STYLE.opacity}%`}><input type="range" className="range" min="0" max="100" value={space.opacity ?? DEFAULT_SPACE_STYLE.opacity} {...rangeHandlers(`${space.spaceId}:opacity`)} onChange={e=>updateSpace(space.spaceId,{opacity:Number(e.target.value)},false)}/></Field></Section><details className="details" open><summary>Тень точки <small>{space.shadowEnabled === false ? 'выкл.' : `${space.shadowBlur ?? DEFAULT_SPACE_STYLE.shadowBlur}px · ${space.shadowOpacity ?? DEFAULT_SPACE_STYLE.shadowOpacity}%`}</small></summary><div className="details-body"><label className="check"><input type="checkbox" checked={space.shadowEnabled !== false} onChange={e=>updateSpace(space.spaceId,{shadowEnabled:e.target.checked})}/> Включить тень</label><div className="grid2"><Num label="X" value={space.shadowX ?? DEFAULT_SPACE_STYLE.shadowX} onChange={v=>updateSpace(space.spaceId,{shadowX:v})}/><Num label="Y" value={space.shadowY ?? DEFAULT_SPACE_STYLE.shadowY} onChange={v=>updateSpace(space.spaceId,{shadowY:v})}/><Num label="Размытие" value={space.shadowBlur ?? DEFAULT_SPACE_STYLE.shadowBlur} onChange={v=>updateSpace(space.spaceId,{shadowBlur:clamp(v,0,100)})}/><Num label="Непрозрачность" value={space.shadowOpacity ?? DEFAULT_SPACE_STYLE.shadowOpacity} onChange={v=>updateSpace(space.spaceId,{shadowOpacity:clamp(v,0,100)})}/></div></div></details><Section title="Дополнительно"><Field label="Заметки"><textarea className="input textarea" value={space.notes || ''} onChange={e=>updateSpace(space.spaceId,{notes:e.target.value})}/></Field><button className="action danger" onClick={deleteSelected}>Удалить точку</button></Section></div>}
function ConnectionInspector({connection,spaces,spacesById,updateConnection,deleteSelected,rangeHandlers}){
  if(!connection)return <div className="inspect"><p className="empty">Связь не найдена.</p></div>;
  const opts=spaces.map(s=>[s.spaceId,s.name||s.spaceId]);
  const pts = connectionPoints(connection, spacesById || Object.fromEntries(spaces.map(s=>[s.spaceId,s])));
  const addPoint = () => {
    if (pts.length < 2) return;
    const midIndex = Math.floor((pts.length - 1) / 2);
    const a = pts[midIndex];
    const b = pts[midIndex + 1];
    const nextPoint = { x: round((a.x + b.x) / 2), y: round((a.y + b.y) / 2) };
    const current = connection.points || [];
    updateConnection(connection.connectionId,{points:[...current,nextPoint]});
  };
  const clearPoints = () => updateConnection(connection.connectionId,{points:[]});
  const removeLastPoint = () => updateConnection(connection.connectionId,{points:(connection.points || []).slice(0,-1)});
  return <div className="inspect"><Section title="Связь"><Field label="Идентификатор"><input className="input" value={connection.connectionId} onChange={e=>updateConnection(connection.connectionId,{connectionId:e.target.value})}/></Field><Field label="Название"><input className="input" value={connection.name||''} onChange={e=>updateConnection(connection.connectionId,{name:e.target.value})}/></Field><Sel label="Откуда" value={connection.fromSpaceId} onChange={v=>updateConnection(connection.connectionId,{fromSpaceId:v})} options={opts}/><Sel label="Куда" value={connection.toSpaceId} onChange={v=>updateConnection(connection.connectionId,{toSpaceId:v})} options={opts}/><div className="grid2"><Sel label="Тип связи" value={connection.kind} onChange={v=>updateConnection(connection.connectionId,{kind:v})} options={connectionKinds}/><Sel label="Вид линии" value={connection.lineStyle || 'solid'} onChange={v=>updateConnection(connection.connectionId,{lineStyle:v})} options={connectionLineStyles}/></div><div className="grid2"><Num label="Толщина" value={connection.width ?? DEFAULT_CONNECTION_STYLE.width} step="1" onChange={v=>updateConnection(connection.connectionId,{width:clamp(v,1,40)})}/><Num label="Порядок" value={connection.order || 1} step="1" onChange={v=>updateConnection(connection.connectionId,{order:v})}/></div><div className="tw"><Pill active={connection.visible} onClick={()=>updateConnection(connection.connectionId,{visible:!connection.visible})}>{connection.visible?'Видима':'Скрыта'}</Pill><Pill active={connection.locked} onClick={()=>updateConnection(connection.connectionId,{locked:!connection.locked})}>{connection.locked?'Закреплена':'Свободна'}</Pill></div></Section><Section title="Оформление связи"><Field label="Цвет линии"><input className="input color-input" type="color" value={connection.color || DEFAULT_CONNECTION_STYLE.color} onChange={e=>updateConnection(connection.connectionId,{color:e.target.value})}/></Field><Field label={`Прозрачность: ${connection.opacity ?? DEFAULT_CONNECTION_STYLE.opacity}%`}><input type="range" className="range" min="0" max="100" value={connection.opacity ?? DEFAULT_CONNECTION_STYLE.opacity} {...rangeHandlers(`${connection.connectionId}:opacity`)} onChange={e=>updateConnection(connection.connectionId,{opacity:Number(e.target.value)},false)}/></Field></Section><details className="details" open><summary>Тень связи <small>{connection.shadowEnabled === false ? 'выкл.' : `${connection.shadowBlur ?? DEFAULT_CONNECTION_STYLE.shadowBlur}px · ${connection.shadowOpacity ?? DEFAULT_CONNECTION_STYLE.shadowOpacity}%`}</small></summary><div className="details-body"><label className="check"><input type="checkbox" checked={connection.shadowEnabled !== false} onChange={e=>updateConnection(connection.connectionId,{shadowEnabled:e.target.checked})}/> Включить тень</label><div className="grid2"><Num label="X" value={connection.shadowX ?? DEFAULT_CONNECTION_STYLE.shadowX} onChange={v=>updateConnection(connection.connectionId,{shadowX:v})}/><Num label="Y" value={connection.shadowY ?? DEFAULT_CONNECTION_STYLE.shadowY} onChange={v=>updateConnection(connection.connectionId,{shadowY:v})}/><Num label="Размытие" value={connection.shadowBlur ?? DEFAULT_CONNECTION_STYLE.shadowBlur} onChange={v=>updateConnection(connection.connectionId,{shadowBlur:clamp(v,0,100)})}/><Num label="Непрозрачность" value={connection.shadowOpacity ?? DEFAULT_CONNECTION_STYLE.shadowOpacity} onChange={v=>updateConnection(connection.connectionId,{shadowOpacity:clamp(v,0,100)})}/></div></div></details><Section title="Кривая Безье"><p className="hint">Промежуточные точки кривой появляются на линии. Их можно перетаскивать мышью прямо на карте. Двойной клик по выбранной связи добавляет точку кривой в месте клика.</p><div className="grid2"><button className="action" onClick={addPoint}>Добавить точку кривой</button><button className="action" disabled={!(connection.points||[]).length} onClick={removeLastPoint}>Убрать последнюю</button><button className="action" disabled={!(connection.points||[]).length} onClick={clearPoints}>Сделать прямой</button><button className="action danger" onClick={deleteSelected}>Удалить связь</button></div></Section></div>
}
function ZoneInspector({zone,updateZone,deleteSelected}){if(!zone)return <div className="inspect"><p className="empty">Зона не найдена.</p></div>; return <div className="inspect"><Section title="Зона"><Field label="Идентификатор"><input className="input" value={zone.zoneId} onChange={e=>updateZone(zone.zoneId,{zoneId:e.target.value})}/></Field><Field label="Название"><input className="input" value={zone.name} onChange={e=>updateZone(zone.zoneId,{name:e.target.value})}/></Field><Sel label="Тип зоны" value={zone.kind} onChange={v=>updateZone(zone.zoneId,{kind:v})} options={zoneKinds}/><div className="grid2"><Num label="X" value={zone.x} step="0.1" onChange={v=>updateZone(zone.zoneId,{x:v})}/><Num label="Y" value={zone.y} step="0.1" onChange={v=>updateZone(zone.zoneId,{y:v})}/><Num label="Ширина" value={zone.width} step="0.5" onChange={v=>updateZone(zone.zoneId,{width:Math.max(1,v)})}/><Num label="Высота" value={zone.height} step="0.5" onChange={v=>updateZone(zone.zoneId,{height:Math.max(1,v)})}/></div><div className="tw"><Pill active={zone.visible} onClick={()=>updateZone(zone.zoneId,{visible:!zone.visible})}>{zone.visible?'Видима':'Скрыта'}</Pill><Pill active={zone.locked} onClick={()=>updateZone(zone.zoneId,{locked:!zone.locked})}>{zone.locked?'Закреплена':'Свободна'}</Pill></div><button className="action danger" onClick={deleteSelected}>Удалить зону</button></Section></div>}

const css = `
*{box-sizing:border-box} body{margin:0;overflow:hidden}.editor-root{height:100vh;background:#090b10;color:#e5e7eb;font-family:Inter,ui-sans-serif,system-ui,Segoe UI,sans-serif}.hidden{display:none}.topbar{height:44px;display:flex;align-items:center;gap:6px;padding:0 9px;background:rgba(15,18,24,.97);border-bottom:1px solid rgba(255,255,255,.08)}.btn,.icon,.mini,.action,.pill{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.055);color:#e5e7eb;border-radius:9px;cursor:pointer;white-space:nowrap}.btn:hover,.icon:hover,.mini:hover,.action:hover,.pill:hover{background:rgba(255,255,255,.10)}.btn{height:29px;padding:0 9px;font-size:12px}.btn.active{background:rgba(37,99,235,.28);border-color:rgba(96,165,250,.7)}.icon{width:29px;height:29px}.icon:disabled,.action:disabled{opacity:.4;cursor:not-allowed}.sep{width:1px;height:22px;background:rgba(255,255,255,.1)}.toolbar-spacer{flex:1}.menu-separator{height:1px;background:rgba(255,255,255,.09);margin:5px 4px}.menu-panel.align-left{left:0;right:auto}.menu-panel.wide-menu{width:220px}.menu-panel button:disabled{opacity:.42;cursor:not-allowed}.menu-panel button:disabled:hover{background:transparent}.menu-wrap{position:relative}.menu-panel{position:absolute;right:0;top:34px;z-index:200;width:190px;padding:6px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(15,18,24,.97);box-shadow:0 18px 44px rgba(0,0,0,.38);backdrop-filter:blur(12px)}.menu-panel button{width:100%;height:30px;border:0;border-radius:8px;background:transparent;color:#e5e7eb;text-align:left;padding:0 9px;font-size:12px;cursor:pointer}.menu-panel button:hover{background:rgba(255,255,255,.08)}.layout{height:calc(100vh - 44px);display:flex}.left{width:260px;background:#10151d;border-right:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column}.right{width:318px;background:#10151d;border-left:1px solid rgba(255,255,255,.08);overflow:auto}.tabs{display:grid;grid-template-columns:1fr 1fr;padding:8px;gap:6px}.tabs button{height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#cbd5e1;cursor:pointer}.tabs .active{background:rgba(37,99,235,.20);border-color:rgba(96,165,250,.55);color:white}.list,.map-tree{padding:0 8px 8px;overflow:auto}.row,.tree-item{min-height:38px;margin-bottom:6px;display:flex;align-items:center;gap:6px;padding:6px 7px;border:1px solid rgba(255,255,255,.075);border-radius:10px;background:rgba(255,255,255,.04);cursor:pointer}.row{cursor:grab}.row.active,.tree-item.active{border-color:rgba(96,165,250,.72);background:rgba(37,99,235,.16)}.row.dragging,.tree-item.dragging{opacity:.45;outline:1px dashed #60a5fa}.grip{color:#64748b}.mini{width:25px;height:25px;border-radius:8px}.row b,.tree-item b{display:block;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row small,.tree-item small{display:block;font-size:10.5px;color:#94a3b8}.tree h4{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin:12px 4px 6px;display:flex;justify-content:space-between}.table-settings{margin-top:auto;border-top:1px solid rgba(255,255,255,.06);padding:9px;display:flex;flex-direction:column;gap:7px;font-size:12px;color:#cbd5e1}.table-settings b{font-size:11px;color:#94a3b8;text-transform:uppercase}.stage{position:relative;flex:1;overflow:hidden;background-color:#081b16}.stage-pan{cursor:grab}.stage-pan:active{cursor:grabbing}.workspace{position:absolute;left:50%;top:50%;transform-origin:center center}.hud,.message{position:absolute;z-index:80;border:1px solid rgba(255,255,255,.09);background:rgba(8,11,16,.72);backdrop-filter:blur(12px);border-radius:12px;padding:8px 10px;font-size:12px;color:#cbd5e1}.hud{left:12px;top:12px}.message{right:12px;bottom:12px}.layer{position:absolute;transform-origin:center center;user-select:none}.map-card{width:100%;height:100%;position:relative;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,#c3a166,#e7cc93 52%,#b88e54);border:1px solid rgba(104,67,24,.30)}.map-card.image{background:#05070b;border-color:rgba(255,255,255,.16)}.map-card img{width:100%;height:100%;object-fit:fill;pointer-events:none}.fake-map{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 20% 15%,rgba(255,255,255,.36),transparent 22%),radial-gradient(circle at 75% 35%,rgba(107,64,30,.22),transparent 26%)}.fake-map b{font-size:30px;color:rgba(70,42,17,.94)}.fake-map span{font-size:13px;color:rgba(70,42,17,.76)}.select-box{position:absolute;inset:0;border:1.5px solid #60a5fa;border-radius:16px;box-shadow:0 0 0 1px rgba(255,255,255,.32),0 0 0 6px rgba(59,130,246,.08);pointer-events:none}.layer-handle,.rotate-layer{position:absolute;pointer-events:auto;border:2px solid white;background:#60a5fa;box-shadow:0 6px 16px rgba(0,0,0,.28)}.layer-handle{width:14px;height:14px;border-radius:4px}.layer-handle.nw{left:-7px;top:-7px;cursor:nwse-resize}.layer-handle.ne{right:-7px;top:-7px;cursor:nesw-resize}.layer-handle.sw{left:-7px;bottom:-7px;cursor:nesw-resize}.layer-handle.se{right:-7px;bottom:-7px;cursor:nwse-resize}.rotate-line{position:absolute;left:50%;top:-32px;width:1.5px;height:32px;transform:translateX(-50%);background:#60a5fa}.rotate-layer{left:50%;top:-48px;width:28px;height:28px;transform:translateX(-50%);border-radius:999px;color:white;display:grid;place-items:center;cursor:grab}.layer-mode-badge{position:absolute;left:8px;top:-30px;padding:4px 7px;border-radius:8px;background:rgba(8,11,16,.78);border:1px solid rgba(255,255,255,.12);color:#dbeafe;font-size:11px;font-style:normal;white-space:nowrap;box-shadow:0 8px 18px rgba(0,0,0,.28)}.connections{position:absolute;inset:0;overflow:visible;z-index:800;pointer-events:none}.conn{fill:none;stroke:#f8fafc;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 2px 3px rgba(0,0,0,.55));pointer-events:stroke;cursor:pointer}.conn:hover{stroke:#bfdbfe}.conn.sel{stroke:#60a5fa;stroke-width:8}.curve-point{pointer-events:all;cursor:grab}.curve-point circle{fill:#38bdf8;stroke:white;stroke-width:3;filter:drop-shadow(0 5px 10px rgba(0,0,0,.45))}.curve-point text{fill:#06111f;font-size:10px;font-weight:800;text-anchor:middle;pointer-events:none}.curve-point.locked{opacity:.5;cursor:not-allowed}.hint{margin:0 0 8px;color:#94a3b8;font-size:12px;line-height:1.45}.space{position:absolute;z-index:900;transform:translate(-50%,-50%);cursor:grab}.space-marker{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#facc15;border:3px solid #111827;box-shadow:0 3px 12px rgba(0,0,0,.45);display:block}.space-marker.circle{border-radius:50%}.space-marker.square{border-radius:5px}.space-marker.hex{clip-path:polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%);border-radius:0}.space-label{position:absolute;top:50%;transform:translateY(-50%);font-size:13px;background:rgba(10,12,18,.72);border:1px solid rgba(255,255,255,.12);padding:3px 7px;border-radius:8px;white-space:nowrap;pointer-events:none}.space.sel .space-marker,.space.link-start .space-marker{outline:3px solid #60a5fa}.zone{position:absolute;z-index:700;border:2px solid rgba(56,189,248,.8);background:rgba(56,189,248,.14);border-radius:12px;cursor:move}.zone.sel{box-shadow:0 0 0 4px rgba(59,130,246,.16)}.zone b{position:absolute;left:8px;top:6px;font-size:12px;color:#dff7ff;background:rgba(0,0,0,.35);padding:2px 6px;border-radius:7px}.zone-resize{position:absolute;right:-9px;bottom:-9px;width:22px;height:22px;border-radius:8px;border:2px solid white;background:#60a5fa;color:white;cursor:nwse-resize}.inspect{padding:9px;display:flex;flex-direction:column;gap:8px}.card,.details{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.035);border-radius:12px;padding:9px}.card h4,.details summary{margin:0 0 8px;font-size:11px;font-weight:800;color:#cbd5e1;text-transform:uppercase;letter-spacing:.045em}.details{padding:0}.details summary{height:38px;margin:0;padding:0 10px;display:flex;align-items:center;justify-content:space-between;cursor:pointer}.details summary small{font-size:11px;color:#94a3b8;text-transform:none;letter-spacing:0}.details-body{padding:0 9px 9px;display:flex;flex-direction:column;gap:8px}.field{display:flex;flex-direction:column;gap:4px;margin-bottom:7px}.field span{font-size:10.5px;color:#94a3b8}.input{width:100%;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.095);background:rgba(255,255,255,.055);color:#f8fafc;padding:0 8px;outline:0;font-size:12px}.textarea{height:58px;padding-top:7px;resize:vertical}.input option{background:#111827}.color-input{padding:2px 4px;min-height:30px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px}.tw{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pill,.action{min-height:31px;font-size:12px;padding:0 8px}.pill.active{border-color:rgba(96,165,250,.68);background:rgba(37,99,235,.18)}.action.danger{border-color:rgba(248,113,113,.25);background:rgba(239,68,68,.12);color:#fecaca}.range{width:100%;accent-color:#60a5fa}.check{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#cbd5e1;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.055);border-radius:9px;padding:6px 8px}.empty{color:#94a3b8;font-size:13px}.context-menu{position:fixed;z-index:300;width:210px;padding:6px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(15,18,24,.98);box-shadow:0 18px 44px rgba(0,0,0,.42);backdrop-filter:blur(12px)}.context-menu button{width:100%;height:30px;border:0;border-radius:8px;background:transparent;color:#e5e7eb;text-align:left;padding:0 9px;font-size:12px;cursor:pointer}.context-menu button:hover{background:rgba(255,255,255,.08)}.context-sep{height:1px;background:rgba(255,255,255,.09);margin:5px 4px}.validation{position:absolute;right:14px;top:58px;z-index:120;width:360px;max-height:60vh;overflow:auto;border:1px solid rgba(255,255,255,.12);background:rgba(12,15,20,.94);backdrop-filter:blur(14px);border-radius:14px;padding:14px;box-shadow:0 18px 48px rgba(0,0,0,.35)}.validation button{float:right;background:transparent;border:0;color:white;font-size:22px;cursor:pointer}.validation h3{margin:0 0 10px;font-size:15px}.validation h4{margin:10px 0 5px;font-size:12px;color:#cbd5e1}.validation li{font-size:12px;margin-bottom:4px;color:#e5e7eb}@media(max-width:1200px){.btn{max-width:80px;overflow:hidden;text-overflow:ellipsis}.right{width:300px}.left{width:245px}}
`;
