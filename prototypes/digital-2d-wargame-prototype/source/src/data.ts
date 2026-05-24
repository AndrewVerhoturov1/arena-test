import { Faction, Space, Counter } from './types';

export const FACTIONS: Faction[] = [
  { id: 'rome', name: 'Рим', emblem: '🦅', color: '#8B1A1A', darkColor: '#5C1010', lightColor: '#C44040', vp: 3, handSize: 7, status: 'active' },
  { id: 'greek', name: 'Греки', emblem: 'Ω', color: '#1E5799', darkColor: '#0E3769', lightColor: '#4E87C9', vp: 2, handSize: 6, status: 'active' },
  { id: 'gaul', name: 'Галлы', emblem: '🌿', color: '#2D5016', darkColor: '#1D3006', lightColor: '#5D8036', vp: 1, handSize: 5, status: 'active' },
  { id: 'samnite', name: 'Самниты', emblem: '⚔', color: '#8B6914', darkColor: '#5B4904', lightColor: '#BB9934', vp: 1, handSize: 5, status: 'active' },
  { id: 'carthage', name: 'Карфаген', emblem: '🐘', color: '#5B2C6F', darkColor: '#3B0C4F', lightColor: '#8B5C9F', vp: 3, handSize: 6, status: 'active' },
];

export const SPACES: Space[] = [
  { id: 'mediolanum', name: 'Медиолан', x: 340, y: 65, homeFaction: 'gaul', controlFaction: 'gaul', connections: ['genua', 'arretium', 'ariminum'], terrain: 'city' },
  { id: 'genua', name: 'Генуя', x: 270, y: 110, connections: ['mediolanum', 'arretium', 'aleria', 'caralis'], terrain: 'port' },
  { id: 'arretium', name: 'Арреций', x: 345, y: 145, homeFaction: 'samnite', controlFaction: 'samnite', connections: ['genua', 'mediolanum', 'roma', 'ariminum'], terrain: 'city' },
  { id: 'ariminum', name: 'Аримин', x: 410, y: 125, connections: ['mediolanum', 'arretium', 'roma', 'samnium'], terrain: 'town' },
  { id: 'roma', name: 'Рим', x: 370, y: 220, homeFaction: 'rome', controlFaction: 'rome', connections: ['arretium', 'ariminum', 'samnium', 'capua'], terrain: 'city' },
  { id: 'samnium', name: 'Самний', x: 425, y: 258, homeFaction: 'samnite', controlFaction: 'samnite', connections: ['ariminum', 'roma', 'capua'], terrain: 'town' },
  { id: 'capua', name: 'Капуя', x: 398, y: 290, connections: ['roma', 'samnium', 'neapolis'], terrain: 'city' },
  { id: 'neapolis', name: 'Неаполь', x: 422, y: 320, connections: ['capua', 'tarentum', 'messana'], terrain: 'port' },
  { id: 'tarentum', name: 'Тарент', x: 490, y: 345, connections: ['neapolis', 'croton'], terrain: 'port' },
  { id: 'croton', name: 'Кротон', x: 482, y: 368, connections: ['tarentum', 'rhegium'], terrain: 'town' },
  { id: 'rhegium', name: 'Регий', x: 452, y: 372, connections: ['croton', 'messana'], terrain: 'port' },
  { id: 'messana', name: 'Мессана', x: 440, y: 398, connections: ['rhegium', 'neapolis', 'syracusae', 'lilybaeum'], terrain: 'port' },
  { id: 'syracusae', name: 'Сиракузы', x: 462, y: 438, homeFaction: 'greek', controlFaction: 'greek', connections: ['messana', 'lilybaeum'], terrain: 'city' },
  { id: 'lilybaeum', name: 'Лилибей', x: 392, y: 428, connections: ['messana', 'syracusae', 'carthago'], terrain: 'port' },
  { id: 'caralis', name: 'Каралис', x: 210, y: 265, connections: ['genua', 'aleria', 'utica'], terrain: 'port' },
  { id: 'aleria', name: 'Алерия', x: 248, y: 152, connections: ['genua', 'caralis'], terrain: 'port' },
  { id: 'carthago', name: 'Карфаген', x: 292, y: 498, homeFaction: 'carthage', controlFaction: 'carthage', connections: ['lilybaeum', 'utica'], terrain: 'city' },
  { id: 'utica', name: 'Утика', x: 252, y: 488, connections: ['carthago', 'caralis'], terrain: 'port' },
];

export const INITIAL_COUNTERS: Counter[] = [
  { id: 'c1', name: 'Легион I', faction: 'rome', type: 'legion', strength: 4, spaceId: 'roma', flipped: false, exhausted: false },
  { id: 'c2', name: 'Легион II', faction: 'rome', type: 'legion', strength: 3, spaceId: 'roma', flipped: false, exhausted: false },
  { id: 'c3', name: 'Флот I', faction: 'rome', type: 'fleet', strength: 2, spaceId: 'neapolis', flipped: false, exhausted: false },
  { id: 'c4', name: 'Гоплиты', faction: 'greek', type: 'legion', strength: 3, spaceId: 'syracusae', flipped: false, exhausted: false },
  { id: 'c5', name: 'Флот I', faction: 'greek', type: 'fleet', strength: 2, spaceId: 'syracusae', flipped: false, exhausted: false },
  { id: 'c6', name: 'Воины', faction: 'gaul', type: 'legion', strength: 3, spaceId: 'mediolanum', flipped: false, exhausted: false },
  { id: 'c7', name: 'Воины', faction: 'samnite', type: 'legion', strength: 3, spaceId: 'samnium', flipped: false, exhausted: false },
  { id: 'c8', name: 'Легион I', faction: 'carthage', type: 'legion', strength: 4, spaceId: 'carthago', flipped: false, exhausted: false },
  { id: 'c9', name: 'Легион II', faction: 'carthage', type: 'legion', strength: 3, spaceId: 'carthago', flipped: false, exhausted: false },
  { id: 'c10', name: 'Флот I', faction: 'carthage', type: 'fleet', strength: 3, spaceId: 'carthago', flipped: false, exhausted: false },
];

export const COUNTER_ICONS: Record<string, string> = {
  legion: '⚔',
  fleet: '⚓',
  leader: '★',
  auxiliary: '◆',
};

export const TERRAIN_ICONS: Record<string, string> = {
  city: '🏛',
  town: '🏘',
  fortress: '🏰',
  port: '⚓',
  pass: '⛰',
};
