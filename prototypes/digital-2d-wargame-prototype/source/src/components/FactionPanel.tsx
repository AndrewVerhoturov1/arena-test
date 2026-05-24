import React from 'react';
import { Faction } from '../types';

import { Counter } from '../types';

interface FactionPanelProps {
  factions: Faction[];
  counters: Counter[];
  selectedFactionId: string | null;
  onSelectFaction: (id: string | null) => void;
}

const FactionPanel: React.FC<FactionPanelProps> = ({
  factions, counters, selectedFactionId, onSelectFaction,
}) => {
  return (
    <div className="faction-panel">
      {factions.map(faction => {
        const isSelected = selectedFactionId === faction.id;
        return (
          <div
            key={faction.id}
            className="faction-card"
            style={{
              background: `linear-gradient(180deg, ${faction.color}22 0%, ${faction.darkColor}22 100%)`,
              border: `1px solid ${isSelected ? faction.lightColor : faction.color}66`,
              boxShadow: isSelected ? `0 0 12px ${faction.color}44` : 'none',
            }}
            onClick={() => onSelectFaction(isSelected ? null : faction.id)}
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${faction.darkColor}, ${faction.color}, ${faction.lightColor})`,
            }} />
            <div className="faction-card-top">
              <span className="faction-emblem">{faction.emblem}</span>
              <span className="faction-name" style={{ color: faction.lightColor }}>
                {faction.name}
              </span>
            </div>
            <div className="faction-card-bottom">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: '#8b7a5e' }}>ОД:</span>
                <span className="faction-vp" style={{ color: faction.lightColor }}>
                  {faction.vp}
                </span>
              </div>
              <div className="faction-hand">
                <span style={{ fontSize: 9, color: '#8b7a5e' }}>Карт:</span>
                <span style={{ fontSize: 11, color: '#c9a84c', fontWeight: 600 }}>
                  {faction.handSize}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 9, color: '#8b7a5e' }}>Войск:</span>
                <span style={{ fontSize: 11, color: faction.lightColor, fontWeight: 600 }}>
                  {counters.filter(c => c.faction === faction.id).length}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span
                  className="faction-status"
                  style={{
                    background: faction.status === 'active' ? '#4a7c2e' :
                      faction.status === 'inactive' ? '#8b7a5e' : '#8B1A1A',
                  }}
                />
                <span style={{ fontSize: 9, color: '#8b7a5e' }}>
                  {faction.status === 'active' ? 'Активна' :
                   faction.status === 'inactive' ? 'Неактивна' : 'Устранена'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FactionPanel;
