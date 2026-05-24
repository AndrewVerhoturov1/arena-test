import React from 'react';
import { Space, Counter, FactionId, ActionLogEntry } from '../types';
import { FACTIONS, COUNTER_ICONS, TERRAIN_ICONS } from '../data';

const getFactionColor = (id?: FactionId) => {
  if (!id) return '#8b7a5e';
  return FACTIONS.find(f => f.id === id)?.color || '#8b7a5e';
};

interface SidebarProps {
  selectedSpace: Space | null;
  selectedCounter: Counter | null;
  actionLog: ActionLogEntry[];
  counters: Counter[];
  spaces: Space[];
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedSpace, selectedCounter, actionLog, counters, spaces,
}) => {
  const countersAtSpace = selectedSpace
    ? counters.filter(c => c.spaceId === selectedSpace.id)
    : [];

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return 'сейчас';
    if (diff < 60) return `${diff} мин назад`;
    return `${Math.floor(diff / 60)} ч назад`;
  };

  return (
    <div className="sidebar">
      {/* Selected Space Inspector */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Провинция</div>
        {selectedSpace ? (
          <div>
            <div className="inspector-row">
              <span className="inspector-label">Название:</span>
              <span className="inspector-value" style={{ fontFamily: 'Cinzel, serif', fontSize: 14 }}>
                {selectedSpace.name}
              </span>
            </div>
            <div className="inspector-row">
              <span className="inspector-label">Тип:</span>
              <span className="inspector-value">
                {TERRAIN_ICONS[selectedSpace.terrain]} {selectedSpace.terrain === 'city' ? 'Город' :
                  selectedSpace.terrain === 'port' ? 'Порт' :
                  selectedSpace.terrain === 'town' ? 'Поселение' :
                  selectedSpace.terrain === 'fortress' ? 'Крепость' : 'Перевал'}
              </span>
            </div>
            <div className="inspector-row">
              <span className="inspector-label">Контроль:</span>
              <span className="inspector-value" style={{ color: getFactionColor(selectedSpace.controlFaction) }}>
                ● {selectedSpace.controlFaction
                  ? FACTIONS.find(f => f.id === selectedSpace.controlFaction)?.name
                  : 'Нейтральная'}
              </span>
            </div>
            {selectedSpace.homeFaction && (
              <div className="inspector-row">
                <span className="inspector-label">Родная:</span>
                <span className="inspector-value" style={{ color: getFactionColor(selectedSpace.homeFaction) }}>
                  ● {FACTIONS.find(f => f.id === selectedSpace.homeFaction)?.name}
                </span>
              </div>
            )}
            <div className="inspector-row">
              <span className="inspector-label">Связи:</span>
              <span className="inspector-value" style={{ fontSize: 11 }}>
                {selectedSpace.connections.map(cid => {
                  const s = spaces.find(sp => sp.id === cid);
                  return s?.name || cid;
                }).join(', ')}
              </span>
            </div>
            {countersAtSpace.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div className="inspector-label" style={{ marginBottom: 4 }}>Счётчики ({countersAtSpace.length}):</div>
                {countersAtSpace.map(c => {
                  const faction = FACTIONS.find(f => f.id === c.faction);
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px',
                      background: 'rgba(107,90,62,0.15)', borderRadius: 3, marginBottom: 3,
                      fontSize: 12,
                    }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: faction?.color, display: 'inline-block',
                      }} />
                      <span>{COUNTER_ICONS[c.type]}</span>
                      <span>{c.name}</span>
                      <span style={{ color: '#8b7a5e', marginLeft: 'auto' }}>Сила: {c.strength}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">Выберите провинцию на карте</div>
        )}
      </div>

      {/* Selected Counter Inspector */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Счётчик</div>
        {selectedCounter ? (() => {
          const faction = FACTIONS.find(f => f.id === selectedCounter.faction);
          const currentSpace = selectedCounter.spaceId
            ? spaces.find(s => s.id === selectedCounter.spaceId)
            : null;
          return (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                padding: '6px 8px', background: `${faction?.color}22`, borderRadius: 4,
                borderLeft: `3px solid ${faction?.color}`,
              }}>
                <span style={{ fontSize: 20 }}>{COUNTER_ICONS[selectedCounter.type]}</span>
                <div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 600, color: faction?.lightColor }}>
                    {selectedCounter.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#8b7a5e' }}>{faction?.name}</div>
                </div>
              </div>
              <div className="inspector-row">
                <span className="inspector-label">Тип:</span>
                <span className="inspector-value">
                  {selectedCounter.type === 'legion' ? 'Легион' :
                   selectedCounter.type === 'fleet' ? 'Флот' :
                   selectedCounter.type === 'leader' ? 'Полководец' : 'Вспомогательные'}
                </span>
              </div>
              <div className="inspector-row">
                <span className="inspector-label">Сила:</span>
                <span className="inspector-value" style={{ fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
                  {selectedCounter.strength}
                </span>
              </div>
              <div className="inspector-row">
                <span className="inspector-label">Позиция:</span>
                <span className="inspector-value">{currentSpace?.name || 'Вне карты'}</span>
              </div>
              <div className="inspector-row">
                <span className="inspector-label">Состояние:</span>
                <span className="inspector-value">
                  {selectedCounter.flipped ? 'Перевёрнут' : selectedCounter.exhausted ? 'Истощён' : 'Готов'}
                </span>
              </div>
            </div>
          );
        })() : (
          <div className="empty-state">Выберите счётчик на карте</div>
        )}
      </div>

      {/* Action Log */}
      <div className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="sidebar-section-title">Журнал действий</div>
        <div className="action-log" style={{ flex: 1 }}>
          {actionLog.length === 0 ? (
            <div className="empty-state">Нет записей</div>
          ) : (
            actionLog.slice().reverse().slice(0, 30).map(entry => (
              <div key={entry.id} className="action-log-entry">
                {entry.faction && (
                  <span className="faction-dot" style={{ background: getFactionColor(entry.faction) }} />
                )}
                {entry.text}
                <span className="timestamp">{formatTime(entry.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
