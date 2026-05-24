import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Space, Counter, FactionId, Layers, ContextMenuState, GameMode } from '../types';
import { FACTIONS, COUNTER_ICONS, TERRAIN_ICONS } from '../data';

const MAP_W = 850;
const MAP_H = 650;

const getFactionColor = (id?: FactionId) => {
  if (!id) return '#8b7a5e';
  return FACTIONS.find(f => f.id === id)?.color || '#8b7a5e';
};



// Land path definitions for the SVG map
const LAND_PATHS = {
  italy: `M 300,60 Q 320,42 350,40 Q 380,38 410,50 Q 430,62 440,88 Q 445,108 438,135 
           Q 430,155 420,170 Q 410,185 402,202 Q 395,220 388,238 Q 385,255 392,270 
           Q 400,285 412,302 Q 425,318 440,335 Q 455,345 472,350 Q 488,353 498,360 
           Q 502,368 492,374 Q 476,378 462,372 Q 448,364 436,355 Q 422,342 408,328 
           Q 395,312 382,298 Q 370,282 362,265 Q 356,248 360,232 Q 363,215 355,198 
           Q 350,180 345,163 Q 340,147 336,130 Q 332,113 325,95 Q 316,78 300,60 Z`,
  sicily: `M 428,388 Q 445,384 460,392 Q 475,400 472,418 Q 468,436 450,442 
           Q 430,445 410,436 Q 398,426 405,408 Q 410,394 428,388 Z`,
  sardinia: `M 185,212 Q 205,205 228,208 Q 242,213 240,248 Q 238,282 235,308 
             Q 228,320 208,316 Q 190,310 182,282 Q 175,255 185,212 Z`,
  corsica: `M 222,130 Q 238,126 250,130 Q 258,138 255,162 Q 252,180 242,186 
            Q 228,188 220,176 Q 215,160 222,130 Z`,
  northAfrica: `M 130,490 Q 210,483 290,486 Q 360,488 430,490 Q 440,496 435,506 
                Q 425,522 390,528 Q 290,533 190,530 Q 140,526 128,513 Q 125,503 130,490 Z`,
};

// Mountain positions (Apennines + Alps)
const MOUNTAINS = [
  { x: 355, y: 80 }, { x: 375, y: 75 }, { x: 395, y: 78 },
  { x: 365, y: 155 }, { x: 372, y: 195 }, { x: 380, y: 235 },
  { x: 390, y: 275 }, { x: 400, y: 310 }, { x: 415, y: 340 },
];

// Wave decorations for sea
const WAVES = [
  { x: 150, y: 350 }, { x: 300, y: 400 }, { x: 500, y: 200 },
  { x: 600, y: 350 }, { x: 160, y: 180 }, { x: 550, y: 450 },
  { x: 350, y: 450 }, { x: 480, y: 150 },
];

interface MapViewProps {
  spaces: Space[];
  counters: Counter[];
  selectedSpaceId: string | null;
  selectedCounterId: string | null;
  gameMode: GameMode;
  layers: Layers;
  onSelectSpace: (id: string | null) => void;
  onSelectCounter: (id: string | null) => void;
  onMoveCounter: (counterId: string, newSpaceId: string, oldSpaceId?: string) => void;
  onCounterDragStart?: (counterId: string) => void;
  onContextMenu: (menu: ContextMenuState) => void;
  onPanStart?: () => void;
}

const MapView: React.FC<MapViewProps> = ({
  spaces, counters, selectedSpaceId, selectedCounterId,
  gameMode, layers, onSelectSpace, onSelectCounter,
  onMoveCounter, onContextMenu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const [dragging, setDragging] = useState<{ counterId: string; offsetX: number; offsetY: number; startX: number; startY: number } | null>(null);
  const [dragWorldPos, setDragWorldPos] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [snapHighlight, setSnapHighlight] = useState<string | null>(null);

  // Center map on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleX = rect.width / MAP_W;
    const scaleY = rect.height / MAP_H;
    const scale = Math.min(scaleX, scaleY) * 0.92;
    const tx = (rect.width - MAP_W * scale) / 2;
    const ty = (rect.height - MAP_H * scale) / 2;
    setTransform({ x: tx, y: ty, scale });
  }, []);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - transform.x) / transform.scale,
      y: (screenY - rect.top - transform.y) / transform.scale,
    };
  }, [transform]);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, transform.scale * delta));
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = (mx - transform.x) / transform.scale;
    const worldY = (my - transform.y) / transform.scale;
    const newTx = mx - worldX * newScale;
    const newTy = my - worldY * newScale;
    setTransform({ x: newTx, y: newTy, scale: newScale });
  }, [transform]);

  // Pan handler
  const handleMapMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.shiftKey || e.altKey))) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    }
  }, [transform]);

  useEffect(() => {
    if (!isPanning) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setTransform(t => ({ ...t, x: panStartRef.current.tx + dx, y: panStartRef.current.ty + dy }));
    };
    const handleUp = () => setIsPanning(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isPanning]);

  // Counter drag
  const handleCounterMouseDown = useCallback((e: React.MouseEvent, counter: Counter) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const cx = counter.spaceId
      ? (spaces.find(s => s.id === counter.spaceId)?.x || 0)
      : (counter.x || 0);
    const cy = counter.spaceId
      ? (spaces.find(s => s.id === counter.spaceId)?.y || 0)
      : (counter.y || 0);

    setDragging({
      counterId: counter.id,
      offsetX: worldPos.x - cx,
      offsetY: worldPos.y - cy,
      startX: cx,
      startY: cy,
    });
    setDragWorldPos({ x: cx, y: cy });
    setHasDragged(false);
    onSelectCounter(counter.id);
  }, [screenToWorld, spaces, onSelectCounter]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const newX = worldPos.x - dragging.offsetX;
      const newY = worldPos.y - dragging.offsetY;
      setDragWorldPos({ x: newX, y: newY });
      if (Math.abs(newX - dragging.startX) > 3 || Math.abs(newY - dragging.startY) > 3) {
        setHasDragged(true);
      }
      // Find nearest space for snap highlight
      let nearest: Space | null = null;
      let nearestDist = Infinity;
      for (const s of spaces) {
        const d = Math.sqrt((s.x - newX) ** 2 + (s.y - newY) ** 2);
        if (d < nearestDist) { nearestDist = d; nearest = s; }
      }
      setSnapHighlight(nearest && nearestDist < 55 ? nearest.id : null);
    };
    const handleUp = () => {
      if (hasDragged) {
        // Find nearest space
        let nearest: Space | null = null;
        let nearestDist = Infinity;
        for (const s of spaces) {
          const d = Math.sqrt((s.x - dragWorldPos.x) ** 2 + (s.y - dragWorldPos.y) ** 2);
          if (d < nearestDist) { nearestDist = d; nearest = s; }
        }
        if (nearest && nearestDist < 55) {
          const counter = counters.find(c => c.id === dragging.counterId);
          onMoveCounter(dragging.counterId, nearest.id, counter?.spaceId);
        }
      }
      setDragging(null);
      setHasDragged(false);
      setSnapHighlight(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, hasDragged, dragWorldPos, spaces, counters, screenToWorld, onMoveCounter]);

  // Space click
  const handleSpaceClick = useCallback((e: React.MouseEvent, spaceId: string) => {
    e.stopPropagation();
    onSelectSpace(spaceId);
    onSelectCounter(null);
  }, [onSelectSpace, onSelectCounter]);

  // Context menus
  const handleMapContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    // Check if clicking on a counter
    for (const c of counters) {
      const cx = c.spaceId ? (spaces.find(s => s.id === c.spaceId)?.x || 0) : (c.x || 0);
      const cy = c.spaceId ? (spaces.find(s => s.id === c.spaceId)?.y || 0) : (c.y || 0);
      const dist = Math.sqrt((worldPos.x - cx) ** 2 + (worldPos.y - cy) ** 2);
      if (dist < 18) {
        onContextMenu({
          x: e.clientX, y: e.clientY,
          type: 'counter', targetId: c.id,
          items: [
            { label: 'Перевернуть', action: 'flip', icon: '🔄' },
            { label: 'Истощить', action: 'exhaust', icon: '💤' },
            { label: 'В резерв', action: 'reserve', icon: '📦' },
            { label: 'Осмотреть', action: 'inspect', icon: '🔍' },
            { label: 'Удалить', action: 'delete', icon: '✕' },
          ],
        });
        return;
      }
    }
    // Check if clicking on a space
    for (const s of spaces) {
      const dist = Math.sqrt((worldPos.x - s.x) ** 2 + (worldPos.y - s.y) ** 2);
      if (dist < 20) {
        onContextMenu({
          x: e.clientX, y: e.clientY,
          type: 'space', targetId: s.id,
          items: [
            { label: 'Добавить счётчик', action: 'addCounter', icon: '➕' },
            { label: 'Изменить контроль', action: 'changeControl', icon: '🏴' },
            { label: 'Редактировать', action: 'editSpace', icon: '✏️' },
            { label: 'Добавить маркер', action: 'addMarker', icon: '📌' },
          ],
        });
        return;
      }
    }
    // Empty area context menu
    onContextMenu({
      x: e.clientX, y: e.clientY,
      type: 'map',
      items: [
        { label: 'Центрировать карту', action: 'center', icon: '◎' },
        { label: 'Сбросить масштаб', action: 'resetZoom', icon: '🔎' },
      ],
    });
  }, [screenToWorld, spaces, counters, onContextMenu]);

  // Group counters by space
  const countersBySpace = useMemo(() => {
    const map = new Map<string, Counter[]>();
    for (const c of counters) {
      if (c.spaceId) {
        if (!map.has(c.spaceId)) map.set(c.spaceId, []);
        map.get(c.spaceId)!.push(c);
      }
    }
    return map;
  }, [counters]);

  // Calculate fan offsets for stacked counters
  const getFanOffset = (index: number, total: number) => {
    if (total <= 1) return { x: 0, y: 0 };
    const angle = (index / total) * Math.PI - Math.PI / 2;
    const spread = Math.min(total * 4, 16);
    return {
      x: Math.cos(angle) * spread,
      y: Math.sin(angle) * spread * 0.5 - 4,
    };
  };

  // Find nearest space to snap highlight
  const snapSpace = snapHighlight ? spaces.find(s => s.id === snapHighlight) : null;

  return (
    <div
      ref={containerRef}
      className="map-container"
      onWheel={handleWheel}
      onMouseDown={handleMapMouseDown}
      onContextMenu={handleMapContextMenu}
      onClick={() => { onSelectSpace(null); onSelectCounter(null); }}
    >
      <div
        className="map-world"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {/* Parchment map background */}
        <div className="parchment-map">
          <div className="map-vignette" />
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            width={MAP_W}
            height={MAP_H}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <defs>
              <filter id="landShadow">
                <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#8b7a5e" floodOpacity="0.3" />
              </filter>
              <filter id="glowGold">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="seaGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5b7f8b" />
                <stop offset="50%" stopColor="#4a6a78" />
                <stop offset="100%" stopColor="#3d5d6b" />
              </linearGradient>
              <linearGradient id="landGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e8d5a3" />
                <stop offset="50%" stopColor="#f0e0b8" />
                <stop offset="100%" stopColor="#e0c890" />
              </linearGradient>
              <pattern id="parchmentNoise" width="4" height="4" patternUnits="userSpaceOnUse">
                <rect width="4" height="4" fill="#f0e0b8" />
                <circle cx="1" cy="1" r="0.5" fill="#d4c088" opacity="0.3" />
                <circle cx="3" cy="3" r="0.3" fill="#c9a84c" opacity="0.15" />
              </pattern>
            </defs>

            {/* Sea background */}
            <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#seaGrad)" rx="2" />

            {/* Sea texture overlay */}
            <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#parchmentNoise)" opacity="0.15" rx="2" />

            {/* Wave decorations */}
            {layers.terrain && WAVES.map((w, i) => (
              <g key={`wave-${i}`} opacity="0.25">
                <path d={`M ${w.x},${w.y} Q ${w.x + 10},${w.y - 4} ${w.x + 20},${w.y} Q ${w.x + 30},${w.y + 4} ${w.x + 40},${w.y}`}
                  fill="none" stroke="#7ba3b0" strokeWidth="1" />
              </g>
            ))}

            {/* Land masses */}
            <g filter="url(#landShadow)">
              <path d={LAND_PATHS.italy} fill="url(#landGrad)" stroke="#8b7a5e" strokeWidth="1.5" />
              <path d={LAND_PATHS.sicily} fill="url(#landGrad)" stroke="#8b7a5e" strokeWidth="1.5" />
              <path d={LAND_PATHS.sardinia} fill="url(#landGrad)" stroke="#8b7a5e" strokeWidth="1.5" />
              <path d={LAND_PATHS.corsica} fill="url(#landGrad)" stroke="#8b7a5e" strokeWidth="1.5" />
              <path d={LAND_PATHS.northAfrica} fill="url(#landGrad)" stroke="#8b7a5e" strokeWidth="1.5" />
            </g>

            {/* Land parchment texture overlay */}
            <path d={LAND_PATHS.italy} fill="url(#parchmentNoise)" opacity="0.2" />
            <path d={LAND_PATHS.sicily} fill="url(#parchmentNoise)" opacity="0.2" />
            <path d={LAND_PATHS.sardinia} fill="url(#parchmentNoise)" opacity="0.2" />
            <path d={LAND_PATHS.corsica} fill="url(#parchmentNoise)" opacity="0.2" />
            <path d={LAND_PATHS.northAfrica} fill="url(#parchmentNoise)" opacity="0.2" />

            {/* Mountains */}
            {layers.terrain && MOUNTAINS.map((m, i) => (
              <g key={`mt-${i}`} opacity="0.5">
                <polygon points={`${m.x},${m.y - 6} ${m.x - 5},${m.y + 3} ${m.x + 5},${m.y + 3}`}
                  fill="#8b7a5e" stroke="#6b5a3e" strokeWidth="0.5" />
              </g>
            ))}

            {/* Connections */}
            {layers.connections && spaces.flatMap(space =>
              space.connections
                .filter(connId => {
                  const connSpace = spaces.find(s => s.id === connId);
                  if (!connSpace) return false;
                  // Only draw each connection once (by comparing IDs)
                  return space.id < connId;
                })
                .map(connId => {
                  const connSpace = spaces.find(s => s.id === connId)!;
                  return (
                    <line
                      key={`${space.id}-${connId}`}
                      x1={space.x} y1={space.y}
                      x2={connSpace.x} y2={connSpace.y}
                      stroke="#6b5a3e"
                      strokeWidth="1.5"
                      strokeDasharray="4,3"
                      opacity="0.6"
                    />
                  );
                })
            )}

            {/* Snap highlight ring */}
            {snapSpace && (
              <circle cx={snapSpace.x} cy={snapSpace.y} r="22"
                fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.7"
                className="glow-pulse" />
            )}

            {/* Space nodes */}
            {spaces.map(space => {
              const isSelected = selectedSpaceId === space.id;
              const homeColor = getFactionColor(space.homeFaction);
              const controlColor = getFactionColor(space.controlFaction);
              const terrainIcon = TERRAIN_ICONS[space.terrain] || '';

              return (
                <g
                  key={space.id}
                  className={`space-node ${isSelected ? 'space-selected' : ''}`}
                  onClick={(e) => handleSpaceClick(e as unknown as React.MouseEvent, space.id)}
                >
                  {/* Home faction ring */}
                  {layers.homeRings && space.homeFaction && (
                    <circle cx={space.x} cy={space.y} r="16"
                      fill="none" stroke={homeColor} strokeWidth="3" opacity="0.7" />
                  )}

                  {/* Base circle */}
                  <circle cx={space.x} cy={space.y} r="12"
                    fill="#f4e8c1" stroke="#6b5a3e" strokeWidth="1.5" />

                  {/* Control marker */}
                  {layers.control && space.controlFaction && (
                    <circle cx={space.x} cy={space.y} r="5"
                      fill={controlColor} stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                  )}

                  {/* Terrain icon */}
                  {layers.terrain && terrainIcon && (
                    <text x={space.x} y={space.y - 20}
                      textAnchor="middle" fontSize="10" opacity="0.7">
                      {terrainIcon}
                    </text>
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <circle cx={space.x} cy={space.y} r="18"
                      fill="none" stroke="#c9a84c" strokeWidth="2"
                      className="glow-pulse" />
                  )}

                  {/* Space name */}
                  {layers.names && (
                    <text x={space.x} y={space.y + 26}
                      textAnchor="middle"
                      fontFamily="Cinzel, serif"
                      fontSize="9"
                      fill="#3d2b1a"
                      fontWeight="600"
                      letterSpacing="0.3">
                      {space.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Compass Rose */}
            <g transform="translate(760, 80)" opacity="0.6">
              <circle cx="0" cy="0" r="28" fill="none" stroke="#6b5a3e" strokeWidth="1" />
              <circle cx="0" cy="0" r="22" fill="none" stroke="#6b5a3e" strokeWidth="0.5" />
              {/* N */}
              <polygon points="0,-24 -4,-12 0,-16 4,-12" fill="#8B1A1A" stroke="#6b5a3e" strokeWidth="0.5" />
              {/* S */}
              <polygon points="0,24 -4,12 0,16 4,12" fill="#6b5a3e" stroke="#6b5a3e" strokeWidth="0.5" />
              {/* E */}
              <polygon points="24,0 12,-4 16,0 12,4" fill="#6b5a3e" stroke="#6b5a3e" strokeWidth="0.5" />
              {/* W */}
              <polygon points="-24,0 -12,-4 -16,0 -12,4" fill="#6b5a3e" stroke="#6b5a3e" strokeWidth="0.5" />
              <text x="0" y="-30" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="10" fill="#3d2b1a" fontWeight="700">С</text>
              <text x="0" y="38" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="8" fill="#6b5a3e">Ю</text>
              <text x="32" y="4" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="8" fill="#6b5a3e">В</text>
              <text x="-32" y="4" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="8" fill="#6b5a3e">З</text>
              <circle cx="0" cy="0" r="3" fill="#c9a84c" />
            </g>

            {/* Map Title Cartouche */}
            <g transform="translate(425, 560)">
              <rect x="-120" y="-18" width="240" height="36" rx="4"
                fill="#f4e8c1" stroke="#8b7a5e" strokeWidth="1.5" opacity="0.9" />
              <rect x="-116" y="-14" width="232" height="28" rx="2"
                fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.5" />
              <text x="0" y="5" textAnchor="middle"
                fontFamily="Cinzel, serif" fontSize="14" fill="#3d2b1a" fontWeight="700"
                letterSpacing="2">
                ITALIA ET MARE NOSTRUM
              </text>
            </g>

            {/* Decorative corner ornaments */}
            {[
              { x: 15, y: 15 }, { x: MAP_W - 15, y: 15 },
              { x: 15, y: MAP_H - 15 }, { x: MAP_W - 15, y: MAP_H - 15 },
            ].map((corner, i) => (
              <g key={`corner-${i}`} transform={`translate(${corner.x}, ${corner.y})`}>
                <circle cx="0" cy="0" r="6" fill="none" stroke="#8b7a5e" strokeWidth="1" />
                <circle cx="0" cy="0" r="2" fill="#c9a84c" />
              </g>
            ))}

            {/* Map border inner */}
            <rect x="8" y="8" width={MAP_W - 16} height={MAP_H - 16}
              fill="none" stroke="#8b7a5e" strokeWidth="0.5" rx="2" opacity="0.4" />

            {/* Sea monsters / ship decorations */}
            <g opacity="0.2" className="map-decoration">
              {/* Ship near Sardinia */}
              <g transform="translate(155, 340)">
                <path d="M 0,0 Q 8,-4 16,0 Q 8,3 0,0 Z" fill="#6b5a3e" />
                <line x1="8" y1="-2" x2="8" y2="-12" stroke="#6b5a3e" strokeWidth="0.8" />
                <path d="M 8,-12 L 14,-8 L 8,-6 Z" fill="#8b7a5e" />
              </g>
              {/* Sea creature near North Africa */}
              <g transform="translate(350, 460)">
                <path d="M 0,0 Q 5,-6 10,0 Q 15,-6 20,0" fill="none" stroke="#6b5a3e" strokeWidth="1" />
                <circle cx="3" cy="-2" r="1" fill="#6b5a3e" />
              </g>
              {/* Another ship */}
              <g transform="translate(530, 280)">
                <path d="M 0,0 Q 8,-4 16,0 Q 8,3 0,0 Z" fill="#6b5a3e" />
                <line x1="8" y1="-2" x2="8" y2="-12" stroke="#6b5a3e" strokeWidth="0.8" />
                <path d="M 8,-12 L 14,-8 L 8,-6 Z" fill="#8b7a5e" />
              </g>
            </g>

            {/* Scale bar */}
            <g transform="translate(40, 610)" opacity="0.4">
              <line x1="0" y1="0" x2="80" y2="0" stroke="#6b5a3e" strokeWidth="1" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#6b5a3e" strokeWidth="1" />
              <line x1="40" y1="-2" x2="40" y2="2" stroke="#6b5a3e" strokeWidth="0.5" />
              <line x1="80" y1="-3" x2="80" y2="3" stroke="#6b5a3e" strokeWidth="1" />
              <text x="40" y="12" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="7" fill="#6b5a3e">
                ~100 m.p.
              </text>
            </g>

            {/* Legend */}
            <g transform="translate(660, 530)" opacity="0.5">
              <rect x="-5" y="-12" width="120" height="85" rx="3"
                fill="#f4e8c1" stroke="#8b7a5e" strokeWidth="0.8" opacity="0.85" />
              <text x="55" y="-1" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="8" fill="#3d2b1a" fontWeight="600">
                УСЛОВНЫЕ ЗНАКИ
              </text>
              <circle cx="5" cy="12" r="4" fill="#f4e8c1" stroke="#6b5a3e" strokeWidth="1" />
              <text x="14" y="15" fontFamily="EB Garamond, serif" fontSize="8" fill="#3d2b1a">Поселение</text>
              <circle cx="5" cy="26" r="4" fill="#f4e8c1" stroke="#8B1A1A" strokeWidth="2" />
              <text x="14" y="29" fontFamily="EB Garamond, serif" fontSize="8" fill="#3d2b1a">Родной город</text>
              <circle cx="5" cy="40" r="3" fill="#8B1A1A" />
              <text x="14" y="43" fontFamily="EB Garamond, serif" fontSize="8" fill="#3d2b1a">Контроль</text>
              <line x1="0" y1="54" x2="10" y2="54" stroke="#6b5a3e" strokeWidth="1.5" strokeDasharray="3,2" />
              <text x="14" y="57" fontFamily="EB Garamond, serif" fontSize="8" fill="#3d2b1a">Дорога</text>
            </g>
          </svg>

          {/* Counters rendered as HTML elements on top of SVG */}
          {counters.map(counter => {
            if (dragging?.counterId === counter.id) {
              // Render a ghost at the original position
              const space = counter.spaceId ? spaces.find(s => s.id === counter.spaceId) : null;
              const baseX = space?.x ?? counter.x ?? 0;
              const baseY = space?.y ?? counter.y ?? 0;
              const stack = counter.spaceId ? (countersBySpace.get(counter.spaceId) || []) : [];
              const stackIndex = stack.findIndex(c => c.id === counter.id);
              const offset = getFanOffset(stackIndex, stack.length);
              const faction = FACTIONS.find(f => f.id === counter.faction);
              return (
                <div
                  key={`${counter.id}-ghost`}
                  className="counter"
                  style={{
                    left: baseX + offset.x - 16,
                    top: baseY + offset.y - 16,
                    background: `radial-gradient(circle at 40% 35%, ${faction?.lightColor || '#888'}, ${faction?.color || '#555'})`,
                    borderColor: faction?.darkColor || '#333',
                    opacity: 0.3,
                    pointerEvents: 'none',
                  }}
                >
                  <span className="counter-icon">{COUNTER_ICONS[counter.type] || '?'}</span>
                </div>
              );
            }

            const space = counter.spaceId ? spaces.find(s => s.id === counter.spaceId) : null;
            if (!space && !counter.x) return null;

            const baseX = space?.x ?? counter.x ?? 0;
            const baseY = space?.y ?? counter.y ?? 0;

            const stack = counter.spaceId ? (countersBySpace.get(counter.spaceId) || []) : [];
            const stackIndex = stack.findIndex(c => c.id === counter.id);
            const offset = getFanOffset(stackIndex, stack.length);

            const cx = baseX + offset.x - 16;
            const cy = baseY + offset.y - 16;

            const faction = FACTIONS.find(f => f.id === counter.faction);
            const icon = COUNTER_ICONS[counter.type] || '?';
            const isSelected = selectedCounterId === counter.id;

            return (
              <div
                key={counter.id}
                className={`counter ${counter.flipped ? 'flipped' : ''} ${counter.exhausted ? 'exhausted' : ''} ${isSelected ? 'selected' : ''}`}
                style={{
                  left: cx,
                  top: cy,
                  background: `radial-gradient(circle at 40% 35%, ${faction?.lightColor || '#888'}, ${faction?.color || '#555'})`,
                  borderColor: faction?.darkColor || '#333',
                }}
                onMouseDown={(e) => handleCounterMouseDown(e, counter)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu({
                    x: e.clientX, y: e.clientY,
                    type: 'counter', targetId: counter.id,
                    items: [
                      { label: 'Перевернуть', action: 'flip', icon: '🔄' },
                      { label: 'Истощить', action: 'exhaust', icon: '💤' },
                      { label: 'В резерв', action: 'reserve', icon: '📦' },
                      { label: 'Осмотреть', action: 'inspect', icon: '🔍' },
                      { label: 'Удалить', action: 'delete', icon: '✕' },
                    ],
                  });
                }}
                title={`${counter.name} (${faction?.name}) — Сила: ${counter.strength}`}
              >
                <span className="counter-icon">{icon}</span>
                <span className="counter-strength">{counter.strength}</span>
                {stack.length > 1 && stackIndex === stack.length - 1 && (
                  <div className="stack-indicator">{stack.length}</div>
                )}
              </div>
            );
          })}

          {/* Dragging counter (follows cursor) */}
          {dragging && (() => {
            const counter = counters.find(c => c.id === dragging.counterId);
            if (!counter) return null;
            const faction = FACTIONS.find(f => f.id === counter.faction);
            const icon = COUNTER_ICONS[counter.type] || '?';
            return (
              <div
                className="counter dragging"
                style={{
                  left: dragWorldPos.x - 16,
                  top: dragWorldPos.y - 16,
                  background: `radial-gradient(circle at 40% 35%, ${faction?.lightColor || '#888'}, ${faction?.color || '#555'})`,
                  borderColor: faction?.darkColor || '#333',
                  pointerEvents: 'none',
                }}
              >
                <span className="counter-icon">{icon}</span>
                <span className="counter-strength">{counter.strength}</span>
              </div>
            );
          })()}

          {/* Drag path line (SVG overlay) */}
          {dragging && hasDragged && (() => {
            const counter = counters.find(c => c.id === dragging.counterId);
            if (!counter) return null;
            return (
              <svg
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                width={MAP_W}
                height={MAP_H}
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
              >
                <line
                  x1={dragging.startX} y1={dragging.startY}
                  x2={dragWorldPos.x} y2={dragWorldPos.y}
                  stroke="#c9a84c" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6"
                />
                <circle cx={dragging.startX} cy={dragging.startY} r="4"
                  fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.4" />
              </svg>
            );
          })()}
        </div>
      </div>

      {/* Zoom controls overlay */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 4, zIndex: 50,
      }}>
        <button
          onClick={() => setTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.2) }))}
          style={{
            width: 32, height: 32, background: 'rgba(42,31,20,0.85)', color: '#c9a84c',
            border: '1px solid #6b5a3e', borderRadius: 3, cursor: 'pointer',
            fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
          }}
        >+</button>
        <button
          onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.3, t.scale * 0.8) }))}
          style={{
            width: 32, height: 32, background: 'rgba(42,31,20,0.85)', color: '#c9a84c',
            border: '1px solid #6b5a3e', borderRadius: 3, cursor: 'pointer',
            fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
          }}
        >−</button>
        <button
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const scaleX = rect.width / MAP_W;
            const scaleY = rect.height / MAP_H;
            const scale = Math.min(scaleX, scaleY) * 0.92;
            const tx = (rect.width - MAP_W * scale) / 2;
            const ty = (rect.height - MAP_H * scale) / 2;
            setTransform({ x: tx, y: ty, scale });
          }}
          style={{
            width: 32, height: 32, background: 'rgba(42,31,20,0.85)', color: '#c9a84c',
            border: '1px solid #6b5a3e', borderRadius: 3, cursor: 'pointer',
            fontFamily: 'Cinzel, serif', fontSize: 12,
          }}
          title="Сбросить вид"
        >◎</button>
      </div>

      {/* Zoom level indicator */}
      <div style={{
        position: 'absolute', bottom: 14, left: 116, zIndex: 50,
        fontFamily: 'Cinzel, serif', fontSize: 10, color: '#8b7a5e',
        background: 'rgba(42,31,20,0.7)', padding: '4px 8px', borderRadius: 3,
        border: '1px solid rgba(107,90,62,0.5)',
      }}>
        {Math.round(transform.scale * 100)}%
      </div>

      {/* Mode indicator overlay */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 50,
        fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 1,
        padding: '4px 10px', borderRadius: 3,
        background: gameMode === 'designer'
          ? 'rgba(201,168,76,0.2)'
          : 'rgba(139,26,26,0.3)',
        color: gameMode === 'designer' ? '#c9a84c' : '#e8a0a0',
        border: `1px solid ${gameMode === 'designer' ? '#c9a84c' : '#8B1A1A'}`,
      }}>
        {gameMode === 'designer' ? '⚙ КОНСТРУКТОР' : '⚔ ИГРА'}
      </div>

      {/* Instructions overlay */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 50,
        fontFamily: 'EB Garamond, serif', fontSize: 10, color: '#6b5a3e',
        background: 'rgba(42,31,20,0.7)', padding: '6px 10px', borderRadius: 3,
        border: '1px solid rgba(107,90,62,0.3)', lineHeight: 1.5,
        textAlign: 'right',
      }}>
        Колёсико — масштаб<br />
        Shift+перетаскивание — прокрутка<br />
        ПКМ — контекстное меню
      </div>
    </div>
  );
};

export default MapView;
