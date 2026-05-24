import React, { useState, useCallback, useMemo, useRef } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import FactionPanel from './components/FactionPanel';
import PlayerAid from './components/PlayerAid';
import ContextMenu from './components/ContextMenu';
import {
  Space, Counter, Faction, ActionLogEntry, GameMode, Layers,
  ContextMenuState, FactionId, CounterType,
} from './types';
import { FACTIONS, SPACES, INITIAL_COUNTERS, COUNTER_ICONS } from './data';

let actionIdCounter = 0;

const App: React.FC = () => {
  // Game state
  const [gameMode, setGameMode] = useState<GameMode>('designer');
  const [spaces, setSpaces] = useState<Space[]>(SPACES);
  const [counters, setCounters] = useState<Counter[]>(INITIAL_COUNTERS);
  const [factions, setFactions] = useState<Faction[]>(FACTIONS);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([
    { id: 1, text: 'Начальная расстановка завершена', timestamp: new Date(Date.now() - 300000) },
    { id: 2, text: 'Раунд III начался', timestamp: new Date(Date.now() - 240000), faction: 'rome' },
    { id: 3, text: 'Рим разыгрывает карту «Марс» — перемещение', timestamp: new Date(Date.now() - 180000), faction: 'rome' },
    { id: 4, text: 'Легион I перемещён из Рима в Неаполь', timestamp: new Date(Date.now() - 120000), faction: 'rome' },
    { id: 5, text: 'Карфаген разыгрывает карту «Флот» — набор войск', timestamp: new Date(Date.now() - 60000), faction: 'carthage' },
  ]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);
  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);
  const [showPlayerAid, setShowPlayerAid] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [layers, setLayers] = useState<Layers>({
    connections: true,
    names: true,
    control: true,
    terrain: true,
    homeRings: true,
  });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const logAction = useCallback((text: string, faction?: FactionId) => {
    actionIdCounter++;
    setActionLog(prev => [...prev, {
      id: actionIdCounter,
      text,
      timestamp: new Date(),
      faction,
    }]);
  }, []);

  // Selected objects
  const selectedSpace = useMemo(
    () => selectedSpaceId ? spaces.find(s => s.id === selectedSpaceId) || null : null,
    [spaces, selectedSpaceId]
  );
  const selectedCounter = useMemo(
    () => selectedCounterId ? counters.find(c => c.id === selectedCounterId) || null : null,
    [counters, selectedCounterId]
  );

  // Counter movement
  const handleMoveCounter = useCallback((counterId: string, newSpaceId: string, oldSpaceId?: string) => {
    const counter = counters.find(c => c.id === counterId);
    const newSpace = spaces.find(s => s.id === newSpaceId);
    const oldSpace = oldSpaceId ? spaces.find(s => s.id === oldSpaceId) : null;

    if (!counter || !newSpace) return;

    setCounters(prev => prev.map(c =>
      c.id === counterId ? { ...c, spaceId: newSpaceId, x: undefined, y: undefined } : c
    ));

    const faction = FACTIONS.find(f => f.id === counter.faction);
    logAction(
      `${counter.name} (${faction?.name}) перемещён${oldSpace ? ` из ${oldSpace.name}` : ''} в ${newSpace.name}`,
      counter.faction
    );
  }, [counters, spaces, logAction]);

  // Context menu actions
  const handleContextAction = useCallback((action: string, targetId?: string) => {
    if (!targetId) {
      if (action === 'center') {
        showToast('Карта центрирована');
      } else if (action === 'resetZoom') {
        showToast('Масштаб сброшен');
      }
      return;
    }

    if (action === 'flip') {
      const counter = counters.find(c => c.id === targetId);
      if (counter) {
        setCounters(prev => prev.map(c =>
          c.id === targetId ? { ...c, flipped: !c.flipped } : c
        ));
        logAction(`Счётчик «${counter.name}» ${counter.flipped ? 'восстановлен' : 'перевёрнут'}`, counter.faction);
      }
    } else if (action === 'exhaust') {
      const counter = counters.find(c => c.id === targetId);
      if (counter) {
        setCounters(prev => prev.map(c =>
          c.id === targetId ? { ...c, exhausted: !c.exhausted } : c
        ));
        logAction(`Счётчик «${counter.name}» ${counter.exhausted ? 'восстановлен' : 'истощён'}`, counter.faction);
      }
    } else if (action === 'delete') {
      const counter = counters.find(c => c.id === targetId);
      if (counter) {
        setCounters(prev => prev.filter(c => c.id !== targetId));
        logAction(`Счётчик «${counter.name}» удалён`, counter.faction);
      }
    } else if (action === 'reserve') {
      const counter = counters.find(c => c.id === targetId);
      if (counter) {
        setCounters(prev => prev.map(c =>
          c.id === targetId ? { ...c, spaceId: undefined, x: 50, y: 50 } : c
        ));
        logAction(`Счётчик «${counter.name}» отправлен в резерв`, counter.faction);
      }
    } else if (action === 'inspect') {
      setSelectedCounterId(targetId);
      setSelectedSpaceId(null);
    } else if (action === 'addCounter') {
      const space = spaces.find(s => s.id === targetId);
      if (space) {
        const factionId = space.controlFaction || space.homeFaction || 'rome';
        const faction = FACTIONS.find(f => f.id === factionId);
        const newId = `c${Date.now()}`;
        const types: CounterType[] = ['legion', 'fleet', 'auxiliary'];
        const type = types[Math.floor(Math.random() * types.length)];
        const newCounter: Counter = {
          id: newId,
          name: `${faction?.name} ${COUNTER_ICONS[type]}`,
          faction: factionId,
          type,
          strength: Math.floor(Math.random() * 3) + 2,
          spaceId: targetId,
          flipped: false,
          exhausted: false,
        };
        setCounters(prev => [...prev, newCounter]);
        logAction(`Добавлен счётчик «${newCounter.name}» в ${space.name}`, factionId);
      }
    } else if (action === 'changeControl') {
      const space = spaces.find(s => s.id === targetId);
      if (space) {
        const factionOrder: FactionId[] = ['rome', 'greek', 'gaul', 'samnite', 'carthage'];
        const currentIdx = space.controlFaction ? factionOrder.indexOf(space.controlFaction) : -1;
        const nextIdx = (currentIdx + 1) % factionOrder.length;
        const newFaction = factionOrder[nextIdx];
        const newFactionName = FACTIONS.find(f => f.id === newFaction)?.name;
        setSpaces(prev => prev.map(s =>
          s.id === targetId ? { ...s, controlFaction: newFaction } : s
        ));
        logAction(`Контроль над ${space.name} передан: ${newFactionName}`, newFaction);
      }
    } else if (action === 'editSpace') {
      setSelectedSpaceId(targetId);
      showToast('Редактирование провинции');
    } else if (action === 'addMarker') {
      showToast('Маркер добавлен');
    }
  }, [counters, spaces, logAction, showToast]);

  // Toolbar actions
  const handleToggleMode = useCallback(() => {
    setGameMode(prev => {
      const next = prev === 'designer' ? 'play' : 'designer';
      logAction(`Режим изменён на «${next === 'designer' ? 'Конструктор' : 'Игра'}»`);
      return next;
    });
  }, [logAction]);

  const handleSave = useCallback(() => {
    const state = { spaces, counters, factions, actionLog: actionLog.slice(0, 100), gameMode };
    localStorage.setItem('wargame-state', JSON.stringify(state));
    logAction('Игра сохранена');
    showToast('Игра сохранена ✓');
  }, [spaces, counters, factions, actionLog, gameMode, logAction, showToast]);

  const handleLoad = useCallback(() => {
    const saved = localStorage.getItem('wargame-state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setSpaces(state.spaces);
        setCounters(state.counters);
        setFactions(state.factions);
        setActionLog(state.actionLog || []);
        setGameMode(state.gameMode || 'designer');
        logAction('Игра загружена');
        showToast('Игра загружена ✓');
      } catch {
        showToast('Ошибка загрузки');
      }
    } else {
      showToast('Нет сохранённой игры');
    }
  }, [logAction, showToast]);

  const handleToggleLayer = useCallback((layer: keyof Layers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  return (
    <div className="tabletop" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* ===== TOOLBAR ===== */}
      <div className="toolbar">
        <span className="toolbar-title">⚔ ITALIA ANTIQUA</span>
        <div className="toolbar-separator" />

        <button
          className={`toolbar-btn ${gameMode === 'designer' ? 'active' : ''}`}
          onClick={handleToggleMode}
        >
          ⚙ Конструктор
        </button>
        <button
          className={`toolbar-btn ${gameMode === 'play' ? 'active' : ''}`}
          onClick={handleToggleMode}
        >
          ⚔ Игра
        </button>

        <div className="toolbar-separator" />

        <button className="toolbar-btn" onClick={handleSave}>💾 Сохранить</button>
        <button className="toolbar-btn" onClick={handleLoad}>📂 Загрузить</button>

        <div className="toolbar-separator" />

        <button
          className={`toolbar-btn ${showLayers ? 'active' : ''}`}
          onClick={() => setShowLayers(prev => !prev)}
        >
          🗺 Слои
        </button>
        <button className="toolbar-btn" onClick={() => showToast('Правила — в разработке')}>
          📜 Правила
        </button>
        <button
          className={`toolbar-btn ${showPlayerAid ? 'active' : ''}`}
          onClick={() => setShowPlayerAid(prev => !prev)}
        >
          📎 Памятка
        </button>

        <div className="toolbar-spacer" />

        {/* Turn & Phase Indicator */}
        <div className="turn-indicator">
          Раунд III · 280 г. до н.э.
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginLeft: 6 }}>
          {['Карты', 'Действия', 'Перемещение', 'Бой', 'Контроль'].map((phase, i) => (
            <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div className={`phase-dot ${i === 1 ? 'active' : 'inactive'}`} title={phase} />
              {i < 4 && <div style={{ width: 8, height: 1, background: '#6b5a3e' }} />}
            </div>
          ))}
        </div>

        <div className="toolbar-separator" />

        <div className={`mode-indicator ${gameMode === 'designer' ? 'mode-designer' : 'mode-play'}`}>
          {gameMode === 'designer' ? 'РЕЖИМ КОНСТРУКТОРА' : 'РЕЖИМ ИГРЫ'}
        </div>
      </div>

      {/* Layers panel */}
      {showLayers && (
        <div className="layers-panel">
          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: 11, color: '#c9a84c',
            marginBottom: 8, letterSpacing: 1, fontWeight: 600,
          }}>
            СЛОИ КАРТЫ
          </div>
          <label>
            <input type="checkbox" checked={layers.connections} onChange={() => handleToggleLayer('connections')} />
            Связи
          </label>
          <label>
            <input type="checkbox" checked={layers.names} onChange={() => handleToggleLayer('names')} />
            Названия
          </label>
          <label>
            <input type="checkbox" checked={layers.control} onChange={() => handleToggleLayer('control')} />
            Контроль
          </label>
          <label>
            <input type="checkbox" checked={layers.terrain} onChange={() => handleToggleLayer('terrain')} />
            Рельеф
          </label>
          <label>
            <input type="checkbox" checked={layers.homeRings} onChange={() => handleToggleLayer('homeRings')} />
            Родные кольца
          </label>
        </div>
      )}

      {/* ===== MAIN AREA ===== */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Map */}
        <MapView
          spaces={spaces}
          counters={counters}
          selectedSpaceId={selectedSpaceId}
          selectedCounterId={selectedCounterId}
          gameMode={gameMode}
          layers={layers}
          onSelectSpace={setSelectedSpaceId}
          onSelectCounter={setSelectedCounterId}
          onMoveCounter={handleMoveCounter}
          onContextMenu={setContextMenu}
        />

        {/* Sidebar */}
        <Sidebar
          selectedSpace={selectedSpace}
          selectedCounter={selectedCounter}
          actionLog={actionLog}
          counters={counters}
          spaces={spaces}
        />
      </div>

      {/* ===== FACTION PANEL ===== */}
      <FactionPanel
        factions={factions}
        counters={counters}
        selectedFactionId={selectedFactionId}
        onSelectFaction={setSelectedFactionId}
      />

      {/* ===== FLOATING ELEMENTS ===== */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showPlayerAid && (
        <PlayerAid onClose={() => setShowPlayerAid(false)} />
      )}

      {/* Toast notification */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default App;
