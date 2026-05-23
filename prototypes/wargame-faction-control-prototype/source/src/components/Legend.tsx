import React from 'react';
import { FACTION_CONFIG, Faction } from '../data/gameData';

const FACTIONS: Faction[] = ['rome', 'greek', 'gaul', 'samnite', 'carthage'];

interface Props {
  showHomeRing: boolean;
  showControl: boolean;
}

const Legend: React.FC<Props> = ({ showHomeRing, showControl }) => {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-inner">
      <h3 className="text-amber-900 font-bold text-sm mb-3 uppercase tracking-widest font-serif">
        Легенда фракций
      </h3>
      <div className="space-y-2">
        {FACTIONS.map((f) => {
          const cfg = FACTION_CONFIG[f];
          return (
            <div key={f} className="flex items-center gap-3">
              {/* Ring swatch */}
              {showHomeRing && (
                <svg width="28" height="28" viewBox="-14 -14 28 28">
                  <circle cx={0} cy={0} r={11} fill="#F5E6C8" stroke={cfg.color} strokeWidth={3} />
                </svg>
              )}
              {/* Flag swatch */}
              {showControl && (
                <svg width="20" height="18" viewBox="0 0 20 18">
                  <line x1={4} y1={2} x2={4} y2={16} stroke="#4B3009" strokeWidth={1.5} />
                  <polygon points="4,2 16,6 4,10" fill={cfg.color} />
                </svg>
              )}
              {!showHomeRing && !showControl && (
                <div
                  className="w-4 h-4 rounded-full border-2 border-amber-400"
                  style={{ backgroundColor: cfg.color }}
                />
              )}
              <span className="text-amber-900 text-sm font-medium font-serif">
                {cfg.emoji} {cfg.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Map symbol legend */}
      <div className="mt-4 pt-3 border-t border-amber-200">
        <h4 className="text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">Типы локаций</h4>
        <div className="grid grid-cols-2 gap-1 text-xs text-amber-800">
          <span>🏙 Город</span>
          <span>🏰 Крепость</span>
          <span>⚓ Порт</span>
          <span>🌄 Область</span>
        </div>
      </div>

      {/* Conflict indicator */}
      <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-amber-700">
        <div className="flex items-center gap-2">
          <svg width="24" height="12">
            <circle cx={12} cy={6} r={10} fill="none" stroke="#888" strokeWidth={2} strokeDasharray="4 2" />
          </svg>
          <span>Кольцо пунктиром — оккупация</span>
        </div>
      </div>
    </div>
  );
};

export default Legend;
