import React from 'react';
import { Space, FACTION_CONFIG } from '../data/gameData';

interface Props {
  space: Space | null;
  onClose: () => void;
}

const TYPE_LABEL: Record<Space['type'], string> = {
  city: 'Город',
  region: 'Область',
  port: 'Порт',
  stronghold: 'Крепость',
};

const TYPE_ICONS: Record<Space['type'], string> = {
  city: '🏙',
  region: '🌄',
  port: '⚓',
  stronghold: '🏰',
};

const InfoPanel: React.FC<Props> = ({ space, onClose }) => {
  if (!space) return null;

  const homeConfig = FACTION_CONFIG[space.homeFaction];
  const controlConfig = FACTION_CONFIG[space.currentControl];
  const isConflict = space.homeFaction !== space.currentControl;

  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: homeConfig.color + '22', borderBottom: `2px solid ${homeConfig.color}44` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{TYPE_ICONS[space.type]}</span>
          <div>
            <h2 className="text-amber-900 font-bold text-lg font-serif leading-tight">{space.name}</h2>
            <span className="text-amber-600 text-xs">{TYPE_LABEL[space.type]}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-amber-400 hover:text-amber-700 transition-colors text-xl font-bold"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Description */}
        <p className="text-amber-800 text-sm italic font-serif">{space.description}</p>

        {/* Home faction */}
        <div className="flex items-center gap-3 bg-amber-100 rounded-lg p-2.5">
          <svg width="28" height="28" viewBox="-14 -14 28 28">
            <circle cx={0} cy={0} r={11} fill="#F5E6C8" stroke={homeConfig.color} strokeWidth={3} />
            <text x={0} y={5} textAnchor="middle" fontSize="10" style={{ userSelect: 'none' }}>
              {homeConfig.emoji}
            </text>
          </svg>
          <div>
            <div className="text-xs text-amber-600 uppercase tracking-wide font-bold">Исконная фракция</div>
            <div className="text-amber-900 font-semibold font-serif" style={{ color: homeConfig.color }}>
              {homeConfig.label}
            </div>
          </div>
        </div>

        {/* Current control */}
        <div className="flex items-center gap-3 bg-amber-100 rounded-lg p-2.5">
          <svg width="24" height="22" viewBox="0 0 24 22">
            <line x1={5} y1={2} x2={5} y2={20} stroke="#4B3009" strokeWidth={1.5} />
            <polygon points="5,2 20,8 5,14" fill={controlConfig.color} />
          </svg>
          <div>
            <div className="text-xs text-amber-600 uppercase tracking-wide font-bold">Под контролем</div>
            <div className="font-semibold font-serif" style={{ color: controlConfig.color }}>
              {controlConfig.emoji} {controlConfig.label}
            </div>
          </div>
        </div>

        {/* Conflict badge */}
        {isConflict && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
            <span>⚔️</span>
            <span>
              Оккупация! Территория под управлением чужой фракции
            </span>
          </div>
        )}

        {/* Loyalty badge */}
        {!isConflict && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700">
            <span>✅</span>
            <span>Территория под властью исконной фракции</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoPanel;
