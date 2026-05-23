import React from 'react';
import { Space, FACTION_CONFIG } from '../data/gameData';

interface Props {
  space: Space;
  showHomeRing: boolean;
  showControl: boolean;
  isSelected: boolean;
  onClick: (space: Space) => void;
}

const TYPE_ICONS: Record<Space['type'], string> = {
  city: '🏙',
  region: '🌄',
  port: '⚓',
  stronghold: '🏰',
};

const SpaceNode: React.FC<Props> = ({ space, showHomeRing, showControl, isSelected, onClick }) => {
  const homeConfig = FACTION_CONFIG[space.homeFaction];
  const controlConfig = FACTION_CONFIG[space.currentControl];
  const isConflict = space.homeFaction !== space.currentControl;

  const ringWidth = showHomeRing ? (isSelected ? 4 : 3) : 0;

  return (
    <g
      className="cursor-pointer group"
      onClick={() => onClick(space)}
      style={{ filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,215,0,0.9))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
    >
      {/* Outer home faction ring */}
      {showHomeRing && (
        <circle
          cx={0}
          cy={0}
          r={22}
          fill="none"
          stroke={homeConfig.color}
          strokeWidth={ringWidth}
          strokeDasharray={isConflict ? '5 2' : 'none'}
          opacity={0.9}
        />
      )}

      {/* Glow for selected */}
      {isSelected && (
        <circle
          cx={0}
          cy={0}
          r={26}
          fill="none"
          stroke="#FFD700"
          strokeWidth={2}
          opacity={0.8}
        />
      )}

      {/* Space body */}
      <circle
        cx={0}
        cy={0}
        r={17}
        fill="#F5E6C8"
        stroke="#8B6914"
        strokeWidth={1.5}
      />

      {/* Type icon text */}
      <text
        x={0}
        y={5}
        textAnchor="middle"
        fontSize="13"
        style={{ userSelect: 'none' }}
      >
        {TYPE_ICONS[space.type]}
      </text>

      {/* Current control flag / marker (top-right) */}
      {showControl && (
        <g transform="translate(10, -12)">
          {/* Flag pole */}
          <line x1={0} y1={0} x2={0} y2={10} stroke="#4B3009" strokeWidth={1.2} />
          {/* Flag body */}
          <polygon
            points="0,0 9,3 0,6"
            fill={controlConfig.color}
            stroke="#00000033"
            strokeWidth={0.5}
          />
        </g>
      )}

      {/* Name label */}
      <text
        x={0}
        y={30}
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="600"
        fill="#2C1A00"
        stroke="#F5E6C8"
        strokeWidth={2}
        paintOrder="stroke"
        style={{ userSelect: 'none', fontFamily: 'Georgia, serif' }}
      >
        {space.label}
      </text>
    </g>
  );
};

export default SpaceNode;
