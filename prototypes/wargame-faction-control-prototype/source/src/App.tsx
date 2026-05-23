import React, { useState, useRef, useCallback } from 'react';
import { SPACES, CONNECTIONS, FACTION_CONFIG, Space, Faction } from './data/gameData';
import SpaceNode from './components/SpaceNode';
import Legend from './components/Legend';
import InfoPanel from './components/InfoPanel';

// ─── Toggle Switch ────────────────────────────────────────────────────────────
const Toggle: React.FC<{ label: string; sublabel: string; checked: boolean; onChange: () => void; color: string }> = ({
  label,
  sublabel,
  checked,
  onChange,
  color,
}) => (
  <label className="flex items-center gap-3 cursor-pointer group select-none">
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <div
        className={`w-12 h-6 rounded-full transition-colors duration-200 ${checked ? '' : 'bg-amber-200'}`}
        style={{ backgroundColor: checked ? color : undefined }}
      />
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </div>
    <div>
      <div className="text-amber-900 font-bold text-sm font-serif leading-tight">{label}</div>
      <div className="text-amber-600 text-xs">{sublabel}</div>
    </div>
  </label>
);

// ─── Stats Bar ────────────────────────────────────────────────────────────────
const FACTIONS: Faction[] = ['rome', 'greek', 'gaul', 'samnite', 'carthage'];

const StatsBar: React.FC = () => {
  const total = SPACES.length;
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 shadow-inner">
      <h3 className="text-amber-900 font-bold text-xs uppercase tracking-widest mb-2 font-serif">
        Контроль территорий
      </h3>
      <div className="space-y-1.5">
        {FACTIONS.map((f) => {
          const cfg = FACTION_CONFIG[f];
          const count = SPACES.filter((s) => s.currentControl === f).length;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={f} className="flex items-center gap-2">
              <span className="text-xs w-16 text-amber-800 font-medium truncate font-serif">{cfg.label}</span>
              <div className="flex-1 bg-amber-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                />
              </div>
              <span className="text-xs text-amber-700 w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [showHomeRing, setShowHomeRing] = useState(true);
  const [showControl, setShowControl] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [gameSpaces, setGameSpaces] = useState<Space[]>(SPACES);

  // Pan & zoom state
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 820 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return;
    const dx = ((e.clientX - lastMouse.current.x) / (svgRef.current?.clientWidth ?? 1)) * viewBox.w;
    const dy = ((e.clientY - lastMouse.current.y) / (svgRef.current?.clientHeight ?? 1)) * viewBox.h;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setViewBox((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((v) => {
      const nw = Math.min(1400, Math.max(300, v.w * scale));
      const nh = Math.min(1150, Math.max(250, v.h * scale));
      const nx = v.x + (v.w - nw) / 2;
      const ny = v.y + (v.h - nh) / 2;
      return { x: nx, y: ny, w: nw, h: nh };
    });
  };

  const handleSpaceClick = useCallback(
    (space: Space) => {
      if (selectedSpace?.id === space.id) {
        setSelectedSpace(null);
      } else {
        setSelectedSpace(space);
      }
    },
    [selectedSpace],
  );

  // Change control of selected space (cycle through factions)
  const cycleControl = () => {
    if (!selectedSpace) return;
    const order: Faction[] = ['rome', 'greek', 'gaul', 'samnite', 'carthage', 'neutral'];
    const idx = order.indexOf(selectedSpace.currentControl);
    const next = order[(idx + 1) % order.length];
    const updated = gameSpaces.map((s) =>
      s.id === selectedSpace.id ? { ...s, currentControl: next } : s,
    );
    setGameSpaces(updated);
    setSelectedSpace({ ...selectedSpace, currentControl: next });
  };

  const resetGame = () => {
    setGameSpaces(SPACES);
    setSelectedSpace(null);
  };

  // Compute connection endpoints from % coords on a 1000x820 canvas
  const W = 1000;
  const H = 820;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #2C1A00 0%, #4B2E00 40%, #3A2200 100%)',
        fontFamily: 'Georgia, serif',
      }}
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-amber-800 bg-black/30 backdrop-blur-sm z-20 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🦅</span>
          <div>
            <h1 className="text-amber-200 font-bold text-xl tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
              ROMA AETERNA
            </h1>
            <p className="text-amber-500 text-xs tracking-widest">Варгейм · Римская Республика</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-amber-400 text-xs hidden md:block">
            🖱 Колесо — масштаб · Перетащите — перемещение · Клик — выбор
          </span>
          <button
            onClick={resetGame}
            className="text-xs bg-amber-800 hover:bg-amber-700 text-amber-100 px-3 py-1.5 rounded-lg transition-colors border border-amber-600"
          >
            ↺ Сбросить
          </button>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar ── */}
        <aside className="w-64 shrink-0 flex flex-col gap-3 p-3 bg-black/20 border-r border-amber-800 overflow-y-auto z-10">
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-inner">
            <h3 className="text-amber-900 font-bold text-xs uppercase tracking-widest mb-3 font-serif">
              Параметры отображения
            </h3>
            <div className="space-y-4">
              <Toggle
                label="Фракция территории"
                sublabel="Цветное кольцо принадлежности"
                checked={showHomeRing}
                onChange={() => setShowHomeRing((v) => !v)}
                color="#B45309"
              />
              <Toggle
                label="Текущий контроль"
                sublabel="Флажок управляющей фракции"
                checked={showControl}
                onChange={() => setShowControl((v) => !v)}
                color="#0F766E"
              />
            </div>
          </div>

          <Legend showHomeRing={showHomeRing} showControl={showControl} />
          <StatsBar />
        </aside>

        {/* ── Map Area ── */}
        <main className="flex-1 relative overflow-hidden">
          {/* Parchment texture overlay */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `url('/images/map-bg.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.55,
            }}
          />
          {/* Dark vignette */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(30,15,0,0.55) 100%)',
            }}
          />

          <svg
            ref={svgRef}
            className="w-full h-full relative z-10"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
              </filter>
              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#8B6914" fillOpacity="0.4" />
              </marker>
            </defs>

            {/* ── Background parchment rect ── */}
            <rect
              x={viewBox.x}
              y={viewBox.y}
              width={viewBox.w}
              height={viewBox.h}
              fill="transparent"
            />

            {/* ── Compass rose (decorative) ── */}
            <g transform="translate(940, 760)" opacity={0.35}>
              <circle cx={0} cy={0} r={22} fill="none" stroke="#8B6914" strokeWidth={1} />
              <text x={0} y={-26} textAnchor="middle" fontSize="10" fill="#8B6914" fontFamily="Georgia">С</text>
              <text x={0} y={34} textAnchor="middle" fontSize="10" fill="#8B6914" fontFamily="Georgia">Ю</text>
              <text x={-30} y={4} textAnchor="middle" fontSize="10" fill="#8B6914" fontFamily="Georgia">З</text>
              <text x={30} y={4} textAnchor="middle" fontSize="10" fill="#8B6914" fontFamily="Georgia">В</text>
              <polygon points="0,-20 3,-5 0,-8 -3,-5" fill="#C41E3A" />
              <polygon points="0,20 3,5 0,8 -3,5" fill="#8B6914" />
              <polygon points="-20,0 -5,-3 -8,0 -5,3" fill="#8B6914" />
              <polygon points="20,0 5,-3 8,0 5,3" fill="#8B6914" />
            </g>

            {/* ── Connection lines ── */}
            {CONNECTIONS.map((conn, i) => {
              const from = gameSpaces.find((s) => s.id === conn.from);
              const to = gameSpaces.find((s) => s.id === conn.to);
              if (!from || !to) return null;
              const x1 = (from.x / 100) * W;
              const y1 = (from.y / 100) * H;
              const x2 = (to.x / 100) * W;
              const y2 = (to.y / 100) * H;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#8B6914"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  strokeDasharray="6 3"
                />
              );
            })}

            {/* ── Space nodes ── */}
            {gameSpaces.map((space) => {
              const cx = (space.x / 100) * W;
              const cy = (space.y / 100) * H;
              return (
                <g key={space.id} transform={`translate(${cx}, ${cy})`}>
                  <SpaceNode
                    space={space}
                    showHomeRing={showHomeRing}
                    showControl={showControl}
                    isSelected={selectedSpace?.id === space.id}
                    onClick={handleSpaceClick}
                  />
                </g>
              );
            })}
          </svg>

          {/* ── Faction color key ribbon (bottom of map) ── */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/40 backdrop-blur px-3 py-2 rounded-full border border-amber-700/50">
            {FACTIONS.map((f) => {
              const cfg = FACTION_CONFIG[f];
              const count = gameSpaces.filter((s) => s.currentControl === f).length;
              return (
                <div
                  key={f}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold border"
                  style={{
                    backgroundColor: cfg.color + '33',
                    borderColor: cfg.color + '88',
                    color: '#F5DEB3',
                  }}
                >
                  <span>{cfg.emoji}</span>
                  <span className="hidden sm:inline">{cfg.label}</span>
                  <span
                    className="ml-1 rounded-full px-1"
                    style={{ backgroundColor: cfg.color + '55' }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </main>

        {/* ── Right Sidebar ── */}
        <aside className="w-64 shrink-0 flex flex-col gap-3 p-3 bg-black/20 border-l border-amber-800 overflow-y-auto z-10">
          {selectedSpace ? (
            <>
              <InfoPanel space={selectedSpace} onClose={() => setSelectedSpace(null)} />
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-inner">
                <h3 className="text-amber-900 font-bold text-xs uppercase tracking-widest mb-3 font-serif">
                  Действия
                </h3>
                <button
                  onClick={cycleControl}
                  className="w-full text-sm bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-amber-50 py-2.5 px-3 rounded-lg transition-colors font-serif border border-amber-500 flex items-center justify-center gap-2"
                >
                  <span>⚔️</span>
                  <span>Сменить контроль</span>
                </button>
                <p className="text-amber-500 text-xs mt-2 text-center">
                  Циклически перебирает все фракции
                </p>
              </div>
            </>
          ) : (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 shadow-inner text-center">
              <div className="text-4xl mb-3">🗺</div>
              <h3 className="text-amber-900 font-bold text-sm font-serif mb-1">
                Выберите локацию
              </h3>
              <p className="text-amber-600 text-xs leading-relaxed">
                Нажмите на любую точку карты, чтобы увидеть подробности о территории
              </p>
            </div>
          )}

          {/* Occupied territories list */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 shadow-inner">
            <h3 className="text-amber-900 font-bold text-xs uppercase tracking-widest mb-2 font-serif flex items-center gap-1">
              <span>⚔️</span> Оккупированные
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {gameSpaces.filter((s) => s.homeFaction !== s.currentControl).length === 0 ? (
                <p className="text-amber-500 text-xs italic">Нет оккупированных территорий</p>
              ) : (
                gameSpaces
                  .filter((s) => s.homeFaction !== s.currentControl)
                  .map((s) => {
                    const home = FACTION_CONFIG[s.homeFaction];
                    const ctrl = FACTION_CONFIG[s.currentControl];
                    return (
                      <div
                        key={s.id}
                        className="text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 rounded p-1 transition-colors"
                        onClick={() => setSelectedSpace(s)}
                      >
                        <span style={{ color: home.color }}>{home.emoji}</span>
                        <span className="text-amber-800 flex-1 truncate font-serif">{s.name}</span>
                        <span style={{ color: ctrl.color }}>{ctrl.emoji}</span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
