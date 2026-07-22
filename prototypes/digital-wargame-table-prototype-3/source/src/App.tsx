import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  FolderOpen, 
  Layers, 
  BookOpen, 
  HelpCircle, 
  Shield, 
  Hammer, 
  Play, 
  Plus, 
  Sparkles, 
  MapPin, 
  List, 
  X, 
  Volume2, 
  VolumeX,
  Dices,
  Anchor,
  Flag
} from 'lucide-react';

// Faction definitions in Russian
interface Faction {
  id: string;
  name: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  vp: number;
  handSize: number;
  status: string;
  leaderName: string;
}

interface MapSpace {
  id: string;
  name: string;
  latinName: string;
  x: number;
  y: number;
  control: string; // rome, carthage, greek, gaul, samnite, neutral
  homeFaction: string;
  points: number;
  isPort: boolean;
  description: string;
  marker?: 'siege' | 'devastated' | 'none';
}

interface MapConnection {
  from: string;
  to: string;
  type: 'land' | 'sea';
}

interface WargameCounter {
  id: string;
  name: string;
  type: 'infantry' | 'cavalry' | 'elephants' | 'leader';
  faction: string; // rome | carthage | greek | gaul | samnite
  strength: number; // 1 or 2
  maxStrength: number; // 2
  exhausted: boolean;
  spaceId: string | null; // null means in reserves
  description: string;
  x?: number; // custom pixel coordinate if in reserve/dragging
  y?: number;
}

interface CardEvent {
  id: string;
  title: string;
  ops: number;
  faction: 'rome' | 'carthage' | 'neutral' | 'greek';
  flavour: string;
  effect: string;
}

// Initialize Audio Context & Synthesizer sounds for tactile board feel
class SoundSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playWoodThud() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.18);
    
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playTrumpet() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    // Simulating a short horn sound for battle/save
    const playHorn = (freq: number, delay: number, duration: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      osc.frequency.linearRampToValueAtTime(freq * 1.02, this.ctx.currentTime + delay + duration);
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);
      
      // Lowpass filter to make it sound old
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    };
    
    playHorn(220, 0, 0.15);
    playHorn(330, 0.12, 0.25);
    playHorn(440, 0.3, 0.4);
  }

  playFlip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }
  
  playDice() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    // Multiple short wood click noises for rolling dice
    for (let i = 0; i < 4; i++) {
      const delay = i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80 + Math.random() * 120, this.ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delay + 0.06);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + 0.06);
    }
  }
}

const synth = new SoundSynth();

export default function App() {
  // 1. FACTIONS INITIAL STATE
  const [factions, setFactions] = useState<Faction[]>([
    { id: 'rome', name: 'Римская Республика', color: '#cc2222', textColor: '#ffffff', bgColor: 'bg-red-950', borderColor: 'border-red-600', vp: 8, handSize: 5, status: 'Консулы готовы к походу', leaderName: 'Луций Эмилий' },
    { id: 'carthage', name: 'Великий Карфаген', color: '#38707a', textColor: '#ffffff', bgColor: 'bg-teal-950', borderColor: 'border-teal-600', vp: 7, handSize: 5, status: 'Ганнибал в Сицилии', leaderName: 'Ганнибал Барка' },
    { id: 'greek', name: 'Магна Греция (Сиракузы)', color: '#8b22cc', textColor: '#ffffff', bgColor: 'bg-purple-950', borderColor: 'border-purple-600', vp: 5, handSize: 4, status: 'Полисы колеблются', leaderName: 'Гиерон II' },
    { id: 'gaul', name: 'Племена Цизальпийской Галлии', color: '#228b22', textColor: '#ffffff', bgColor: 'bg-emerald-950', borderColor: 'border-emerald-700', vp: 4, handSize: 3, status: 'Вожди собирают орду', leaderName: 'Бренн Новейший' },
    { id: 'samnite', name: 'Самнитский и Этрусский Союз', color: '#cc8822', textColor: '#000000', bgColor: 'bg-amber-950', borderColor: 'border-amber-600', vp: 4, handSize: 3, status: 'В ущельях зреет месть', leaderName: 'Геллий Эгнаций' }
  ]);

  // 2. SPACES INITIAL STATE
  const [spaces, setSpaces] = useState<MapSpace[]>([
    // North Africa
    { id: 'carthage', name: 'Карфаген', latinName: 'Carthago', x: 160, y: 820, control: 'carthage', homeFaction: 'carthage', points: 3, isPort: true, description: 'Великая торговая столица Пунической империи. Имеет мощные стены.' },
    { id: 'lilybaeum', name: 'Лилибей', latinName: 'Lilybaeum', x: 380, y: 810, control: 'carthage', homeFaction: 'carthage', points: 2, isPort: true, description: 'Грозная морская крепость Карфагена на западе Сицилии.' },
    
    // Islands
    { id: 'caralis', name: 'Каралис', latinName: 'Caralis', x: 150, y: 580, control: 'carthage', homeFaction: 'carthage', points: 1, isPort: true, description: 'Главная гавань Сардинии, экспортирующая зерно и медь.' },
    { id: 'aleria', name: 'Алерия', latinName: 'Aleria', x: 180, y: 410, control: 'neutral', homeFaction: 'neutral', points: 1, isPort: true, description: 'Форпост на Корсике, переходящий из рук в руки.' },
    
    // Sicily
    { id: 'syracuse', name: 'Сиракузы', latinName: 'Syracusae', x: 570, y: 850, control: 'greek', homeFaction: 'greek', points: 2, isPort: true, description: 'Самый богатый греческий мегаполис Запада, прославленный инженерией Архимеда.' },
    { id: 'messana', name: 'Мессина', latinName: 'Messana', x: 550, y: 730, control: 'neutral', homeFaction: 'neutral', points: 1, isPort: true, description: 'Мамертинский порт, контролирующий пролив в Италию.' },
    
    // Southern Italy
    { id: 'rhegium', name: 'Регий', latinName: 'Rhegium', x: 650, y: 710, control: 'neutral', homeFaction: 'greek', points: 1, isPort: true, description: 'Греческий полис, смотрящий прямо на Сицилию сквозь узкий пролив.' },
    { id: 'tarentum', name: 'Тарент', latinName: 'Tarentum', x: 860, y: 530, control: 'greek', homeFaction: 'greek', points: 2, isPort: true, description: 'Оплот Спартанского наследия, центр Великой Греции в Италии.' },
    { id: 'neapolis', name: 'Неаполь', latinName: 'Neapolis', x: 580, y: 540, control: 'greek', homeFaction: 'greek', points: 1, isPort: true, description: 'Живописный культурный центр у Везувия, славящийся философами.' },
    
    // Central Italy
    { id: 'beneventum', name: 'Беневент', latinName: 'Beneventum', x: 690, y: 460, control: 'samnite', homeFaction: 'samnite', points: 1, isPort: false, description: 'Центральное укрепление Самнитов в суровых Апеннинских горах.' },
    { id: 'capua', name: 'Капуя', latinName: 'Capua', x: 610, y: 480, control: 'rome', homeFaction: 'rome', points: 2, isPort: false, description: 'Второй по богатству город Италии, столица Кампании. Очаг гладиаторского дела.' },
    { id: 'rome', name: 'Рим', latinName: 'Roma', x: 480, y: 390, control: 'rome', homeFaction: 'rome', points: 3, isPort: true, description: 'Сердце Сената и Народа Рима. Военная кузница легионов.' },
    { id: 'alba_longa', name: 'Альба-Лонга', latinName: 'Alba Longa', x: 540, y: 420, control: 'rome', homeFaction: 'rome', points: 1, isPort: false, description: 'Священный колыбельный город Латинского союза.' },
    { id: 'ancona', name: 'Анкона', latinName: 'Ancona', x: 600, y: 260, control: 'neutral', homeFaction: 'neutral', points: 1, isPort: true, description: 'Адриатический порт с крутыми скалами, населенный греческими беженцами.' },
    
    // Northern Italy & Etruria
    { id: 'clusium', name: 'Клузий', latinName: 'Clusium', x: 420, y: 280, control: 'samnite', homeFaction: 'samnite', points: 1, isPort: false, description: 'Древний бастион этрусков, некогда грозивший самому Риму.' },
    { id: 'ariminum', name: 'Аримин', latinName: 'Ariminum', x: 520, y: 200, control: 'neutral', homeFaction: 'neutral', points: 1, isPort: true, description: 'Римский оборонительный колониальный форпост у реки Рубикон.' },
    { id: 'bononia', name: 'Бонония', latinName: 'Bononia', x: 390, y: 140, control: 'gaul', homeFaction: 'gaul', points: 1, isPort: false, description: 'Главный кельтский оплот племени Бойев в долине реки По.' },
    { id: 'genua', name: 'Генуя', latinName: 'Genua', x: 230, y: 180, control: 'gaul', homeFaction: 'gaul', points: 1, isPort: true, description: 'Лигурийский порт, контролирующий морские ворота в Галлию.' }
  ]);

  // 3. CONNECTIONS INITIAL STATE
  const [connections] = useState<MapConnection[]>([
    { from: 'bononia', to: 'genua', type: 'land' },
    { from: 'bononia', to: 'ariminum', type: 'land' },
    { from: 'genua', to: 'clusium', type: 'land' },
    { from: 'ariminum', to: 'clusium', type: 'land' },
    { from: 'clusium', to: 'rome', type: 'land' },
    { from: 'ariminum', to: 'ancona', type: 'land' },
    { from: 'ancona', to: 'beneventum', type: 'land' },
    { from: 'rome', to: 'alba_longa', type: 'land' },
    { from: 'rome', to: 'capua', type: 'land' },
    { from: 'alba_longa', to: 'beneventum', type: 'land' },
    { from: 'capua', to: 'neapolis', type: 'land' },
    { from: 'capua', to: 'beneventum', type: 'land' },
    { from: 'beneventum', to: 'tarentum', type: 'land' },
    { from: 'neapolis', to: 'rhegium', type: 'land' },
    { from: 'tarentum', to: 'rhegium', type: 'land' },
    
    // Sea routes and Strait
    { from: 'rhegium', to: 'messana', type: 'sea' },
    { from: 'messana', to: 'syracuse', type: 'land' },
    { from: 'messana', to: 'lilybaeum', type: 'land' },
    { from: 'syracuse', to: 'lilybaeum', type: 'land' },
    
    // Trans-Mediterranean Sea Lanes
    { from: 'lilybaeum', to: 'carthage', type: 'sea' },
    { from: 'carthage', to: 'caralis', type: 'sea' },
    { from: 'caralis', to: 'aleria', type: 'sea' },
    { from: 'aleria', to: 'genua', type: 'sea' },
    { from: 'rome', to: 'caralis', type: 'sea' },
    { from: 'tarentum', to: 'syracuse', type: 'sea' }
  ]);

  // 4. COUNTERS INITIAL STATE
  const [counters, setCounters] = useState<WargameCounter[]>([
    // Rome
    { id: 'c-r1', name: 'I Легион Публия', type: 'infantry', faction: 'rome', strength: 2, maxStrength: 2, exhausted: false, spaceId: 'rome', description: 'Опытные гастаты и принципы первого консульского призыва.' },
    { id: 'c-r2', name: 'II Легион Сицилийский', type: 'infantry', faction: 'rome', strength: 2, maxStrength: 2, exhausted: false, spaceId: 'capua', description: 'Свеженабранный легион, дислоцированный в Кампании.' },
    { id: 'c-r3', name: 'Квинт Фабий Корнелий', type: 'leader', faction: 'rome', strength: 1, maxStrength: 1, exhausted: false, spaceId: 'rome', description: 'Медлительный, но мудрый римский тактик, мастер обороны.' },
    
    // Carthage
    { id: 'c-c1', name: 'Ливийские ветераны', type: 'infantry', faction: 'carthage', strength: 2, maxStrength: 2, exhausted: false, spaceId: 'carthage', description: 'Тяжеловооруженные копейщики из Африки, верные семье Барки.' },
    { id: 'c-c2', name: 'Нумидийские кони', type: 'cavalry', faction: 'carthage', strength: 2, maxStrength: 2, exhausted: false, spaceId: 'lilybaeum', description: 'Быстрые застрельщики, наводящие ужас на римскую пехоту.' },
    { id: 'c-c3', name: 'Слоны Ганнибала', type: 'elephants', faction: 'carthage', strength: 2, maxStrength: 2, exhausted: false, spaceId: 'lilybaeum', description: 'Наводящие панику лесные слоны, готовые прорывать оборонительные порядки.' },
    { id: 'c-c4', name: 'Ганнибал Великий', type: 'leader', faction: 'carthage', strength: 2, maxStrength: 2, exhausted: false, spaceId: 'lilybaeum', description: 'Величайший гений древнего мира, клявшийся уничтожить Рим.' },

    // Greeks
    { id: 'c-g1', name: 'Сиракузская фаланга', type: 'infantry', faction: 'greek', strength: 2, maxStrength: 2, exhausted: false, spaceId: 'syracuse', description: 'Гоплиты в тяжелой броне, защищающие свободу Сицилии.' },
    { id: 'c-g2', name: 'Армия Эпира (Пирр)', type: 'leader', faction: 'greek', strength: 2, maxStrength: 2, exhausted: false, spaceId: 'tarentum', description: 'Призванный из Эпира гениальный полководец, гроза легионов.' },

    // Gauls
    { id: 'c-ga1', name: 'Галльская орда бойев', type: 'infantry', faction: 'gaul', strength: 2, maxStrength: 2, exhausted: false, spaceId: 'bononia', description: 'Свирепые воины с огромными мечами, презирающие доспехи.' },
    { id: 'c-ga2', name: 'Лигурийские воители', type: 'cavalry', faction: 'gaul', strength: 1, maxStrength: 2, exhausted: true, spaceId: 'genua', description: 'Горные кельтские всадники, служащие за пунийское золото.' },

    // Samnites / Etruscans
    { id: 'c-s1', name: 'Самнитские копейщики', type: 'infantry', faction: 'samnite', strength: 2, maxStrength: 2, exhausted: false, spaceId: 'beneventum', description: 'Ополчение горных племен Апеннин, злейшие враги Рима.' },
    { id: 'c-s2', name: 'Воинство Этрурии', type: 'infantry', faction: 'samnite', strength: 1, maxStrength: 2, exhausted: false, spaceId: 'clusium', description: 'Остатки былого величия этрусских царей, поднявшие восстание.' }
  ]);

  // 5. PLAYABLE HISTORICAL CARDS HAND
  const [cardHand, setCardHand] = useState<CardEvent[]>([
    { id: 'card-1', title: 'Сенатское Постановление', ops: 3, faction: 'rome', flavour: '«Иди к консулам и вели им готовить мечи»', effect: 'Добавить 1 силу любому Легиону Рима на карте или перевернуть его.' },
    { id: 'card-2', title: 'Слоны на марше', ops: 4, faction: 'carthage', flavour: '«Они прошли сквозь Альпы, теряя силу, но сохраняя ярость»', effect: 'Пунийский отряд слонов может немедленно совершить перемещение на 2 шага без истощения.' },
    { id: 'card-3', title: 'Клятва Самнитов', ops: 2, faction: 'neutral', flavour: '«Священный союз на крови принесенных жертв»', effect: 'Повысить Влияние Самнитов. Беневент немедленно переходит под контроль фракции Самнитов.' },
    { id: 'card-4', title: 'Инженерный Гений Архимеда', ops: 2, faction: 'greek', flavour: '«Дайте мне точку опоры, и я переверну Землю»', effect: 'Разместить маркер Осады на Сиракузах. Ни один враг не может штурмовать город в этом ходу.' },
    { id: 'card-5', title: 'Галльский Набег', ops: 2, faction: 'neutral', flavour: '«Горе побежденным! Меч брошен на весы»', effect: 'Галльская фишка в Бононии полностью восстанавливает боеспособность (снимает усталость).' },
    { id: 'card-6', title: 'Ветер Адриатики', ops: 3, faction: 'neutral', flavour: '«Посейдон благоволит смелым мореходам»', effect: 'Связывает два любых портовых города прямым переходом флота.' },
    { id: 'card-7', title: 'Плата Наемникам', ops: 2, faction: 'carthage', flavour: '«Золото Карфагена решает то, что не решила сталь»', effect: 'Добавить одну новую наемную фишку Силы 1 в Карфаген или Лилибей.' },
    { id: 'card-8', title: 'Триумфальный Марш', ops: 3, faction: 'rome', flavour: '«Лавры победителю, рабство побежденным»', effect: '+1 к Победным Очкам Римской Республики.' }
  ]);

  // State for application setup
  const [designerMode, setDesignerMode] = useState<boolean>(false); // false = Play Mode, true = Designer Mode
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>('rome');
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>('c-r1');
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [actionLog, setActionLog] = useState<string[]>([
    'Добро пожаловать на цифровой стол wargame-симулятора!',
    'Карта древней Италии и Средиземноморья разложена.',
    'Режим: Режим Игры (некоторые действия ограничены правилами во благо симуляции).',
    'Инициализировано 18 стратегических узлов и 12 легионов.'
  ]);
  
  // Layers toggling state
  const [layers, setLayers] = useState({
    connections: true,
    flags: true,
    names: true,
    seaConnections: true,
    gridLines: false
  });
  const [showLayersMenu, setShowLayersMenu] = useState<boolean>(false);

  // Interactive rules and player aid state
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showPlayerAid, setShowPlayerAid] = useState<boolean>(true);
  const [playerAidPos, setPlayerAidPos] = useState<{ x: number; y: number }>({ x: 680, y: 120 });
  const [isDraggingPlayerAid, setIsDraggingPlayerAid] = useState<boolean>(false);
  const [dragAidStart, setDragAidStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drag and drop counter states
  const [draggedCounterId, setDraggedCounterId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Context menus states
  const [spaceContextMenu, setSpaceContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    spaceId: string;
  } | null>(null);

  const [counterContextMenu, setCounterContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    counterId: string;
  } | null>(null);

  // Designer mode modal templates
  const [isEditingSpace, setIsEditingSpace] = useState<string | null>(null);
  const [editSpaceName, setEditSpaceName] = useState<string>('');
  const [editSpacePoints, setEditSpacePoints] = useState<number>(1);
  const [editSpaceControl, setEditSpaceControl] = useState<string>('neutral');

  // Sound toggle effect
  useEffect(() => {
    synth.enabled = soundOn;
  }, [soundOn]);

  // Add a logger helper
  const addLog = (message: string) => {
    const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActionLog(prev => [`[${timeStr}] ${message}`, ...prev]);
  };

  // Save / Load game state to LocalStorage
  const saveState = () => {
    const stateToSave = {
      spaces,
      counters,
      factions,
      log: actionLog
    };
    localStorage.setItem('ancient_italy_wargame_state', JSON.stringify(stateToSave));
    synth.playTrumpet();
    addLog('⚔️ Станция игры сохранена в память браузера!');
  };

  const loadState = () => {
    const saved = localStorage.getItem('ancient_italy_wargame_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.spaces) setSpaces(parsed.spaces);
        if (parsed.counters) setCounters(parsed.counters);
        if (parsed.factions) setFactions(parsed.factions);
        if (parsed.log) setActionLog(parsed.log);
        synth.playTrumpet();
        addLog('⏳ Загружено предыдущее состояние поля боя.');
      } catch (e) {
        addLog(' Ошибка при загрузке файла сохранения.');
      }
    } else {
      addLog(' Сохранения не найдено в браузере.');
    }
  };

  // Keyboard shortcut for space menu or dragging
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Mouse zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.08;
    let newZoom = zoom + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
    newZoom = Math.max(0.5, Math.min(2.0, newZoom));
    setZoom(newZoom);
  };

  // Map Panning handlers
  const handleMapMouseDown = (e: React.MouseEvent) => {
    // If user is clicking on interactive node, card or menu, don't pan
    if ((e.target as HTMLElement).closest('.interactive-element')) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMapMouseUp = () => {
    setIsPanning(false);
  };

  // Custom HTML drag event simulated inside the SVG/Parchment coord space
  const handleCounterDragStart = (e: React.MouseEvent, counterId: string) => {
    e.stopPropagation();
    synth.playClick();
    const counter = counters.find(c => c.id === counterId);
    if (!counter) return;

    setSelectedCounterId(counterId);
    setDraggedCounterId(counterId);

    // Find mouse coordinates relative to map-container
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      // Store offset relative to counter visual center
      const xOnMap = (e.clientX - rect.left - pan.x) / zoom;
      const yOnMap = (e.clientY - rect.top - pan.y) / zoom;

      // Find original space coordinate
      let currentX = xOnMap;
      let currentY = yOnMap;

      if (counter.spaceId) {
        const space = spaces.find(s => s.id === counter.spaceId);
        if (space) {
          currentX = space.x;
          currentY = space.y;
        }
      }

      setDragOffset({
        x: xOnMap - currentX,
        y: yOnMap - currentY
      });

      setDragPosition({ x: xOnMap, y: yOnMap });
    }
  };

  const handleCounterDragMove = (e: MouseEvent) => {
    if (!draggedCounterId) return;

    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const xOnMap = (e.clientX - rect.left - pan.x) / zoom;
      const yOnMap = (e.clientY - rect.top - pan.y) / zoom;

      setDragPosition({
        x: xOnMap - dragOffset.x,
        y: yOnMap - dragOffset.y
      });
    }
  };

  const handleCounterDragEnd = () => {
    if (!draggedCounterId) return;

    // Find closest space to snap to
    const targetX = dragPosition.x;
    const targetY = dragPosition.y;

    let closestSpace: MapSpace | null = null;
    let minDistance = 85; // Snapping radius threshold in pixels

    spaces.forEach(space => {
      const dist = Math.hypot(space.x - targetX, space.y - targetY);
      if (dist < minDistance) {
        minDistance = dist;
        closestSpace = space;
      }
    });

    const movingCounter = counters.find(c => c.id === draggedCounterId);
    if (movingCounter) {
      if (closestSpace) {
        const destination: MapSpace = closestSpace;
        const oldSpaceId = movingCounter.spaceId;
        const oldSpaceName = oldSpaceId ? (spaces.find(s => s.id === oldSpaceId)?.name || 'Резерва') : 'Резерва';

        // Check rule limit in Play mode (e.g. can only move if not exhausted)
        if (!designerMode && movingCounter.exhausted) {
          addLog(`⚠️ Фишка "${movingCounter.name}" истощена! Движение ограничено правилами игры.`);
          synth.playClick();
        } else {
          // Successful snap
          setCounters(prev => prev.map(c => {
            if (c.id === draggedCounterId) {
              return { 
                ...c, 
                spaceId: destination.id,
                exhausted: !designerMode ? true : c.exhausted // Exhaust upon move in Play mode
              };
            }
            return c;
          }));

          synth.playWoodThud();
          addLog(`🗂️ Фишка [${getFactionLabel(movingCounter.faction)}] "${movingCounter.name}" перемещена из ${oldSpaceName} в ${destination.name}` + 
            (!designerMode ? ' и получила маркер усталости ⏳' : ''));
          
          setSelectedSpaceId(destination.id);
        }
      } else {
        // Return to reserves if dropped in open ocean/space far away, or keep in previous space
        synth.playClick();
        addLog(`💨 Перемещение отменено (фишка вернулась в исходное положение).`);
      }
    }

    setDraggedCounterId(null);
  };

  // Global mouse hook to handle drag movements smoothly
  useEffect(() => {
    if (draggedCounterId) {
      window.addEventListener('mousemove', handleCounterDragMove);
      window.addEventListener('mouseup', handleCounterDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleCounterDragMove);
      window.removeEventListener('mouseup', handleCounterDragEnd);
    };
  }, [draggedCounterId, dragPosition, dragOffset]);

  // Draggable Player Aid window mouse handlers
  const handleAidMouseDown = (e: React.MouseEvent) => {
    setIsDraggingPlayerAid(true);
    setDragAidStart({
      x: e.clientX - playerAidPos.x,
      y: e.clientY - playerAidPos.y
    });
  };

  useEffect(() => {
    const handleAidMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayerAid) {
        setPlayerAidPos({
          x: e.clientX - dragAidStart.x,
          y: e.clientY - dragAidStart.y
        });
      }
    };

    const handleAidMouseUp = () => {
      setIsDraggingPlayerAid(false);
    };

    if (isDraggingPlayerAid) {
      window.addEventListener('mousemove', handleAidMouseMove);
      window.addEventListener('mouseup', handleAidMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleAidMouseMove);
      window.removeEventListener('mouseup', handleAidMouseUp);
    };
  }, [isDraggingPlayerAid, dragAidStart]);

  // Helper translations
  const getFactionLabel = (factionId: string) => {
    switch (factionId) {
      case 'rome': return 'Рим';
      case 'carthage': return 'Карфаген';
      case 'greek': return 'Греки';
      case 'gaul': return 'Галлы';
      case 'samnite': return 'Самниты';
      default: return 'Нейтрал';
    }
  };

  const getFactionColor = (factionId: string) => {
    switch (factionId) {
      case 'rome': return '#cc2222';
      case 'carthage': return '#38707a';
      case 'greek': return '#8b22cc';
      case 'gaul': return '#228b22';
      case 'samnite': return '#cc8822';
      default: return '#7c6d53';
    }
  };

  const getUnitTypeName = (type: string) => {
    switch (type) {
      case 'infantry': return 'Тяжелая пехота';
      case 'cavalry': return 'Быстрая кавалерия';
      case 'elephants': return 'Боевые слоны';
      case 'leader': return 'Полководец (Лидер)';
      default: return 'Вспомогательный отряд';
    }
  };

  // Actions from menus
  const handleSpaceClick = (spaceId: string) => {
    synth.playClick();
    setSelectedSpaceId(spaceId);
    const primaryCounter = counters.find(c => c.spaceId === spaceId);
    if (primaryCounter) {
      setSelectedCounterId(primaryCounter.id);
    }
  };

  const handleRightClickSpace = (e: React.MouseEvent, spaceId: string) => {
    e.preventDefault();
    synth.playClick();
    setSelectedSpaceId(spaceId);
    setSpaceContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      spaceId
    });
    setCounterContextMenu(null); // Close other
  };

  const handleRightClickCounter = (e: React.MouseEvent, counterId: string) => {
    e.preventDefault();
    e.stopPropagation();
    synth.playClick();
    setSelectedCounterId(counterId);
    
    const counter = counters.find(c => c.id === counterId);
    if (counter && counter.spaceId) {
      setSelectedSpaceId(counter.spaceId);
    }

    setCounterContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      counterId
    });
    setSpaceContextMenu(null); // Close other
  };

  // Context Menu Actions for Counter
  const triggerFlipCounter = (counterId: string) => {
    synth.playFlip();
    setCounters(prev => prev.map(c => {
      if (c.id === counterId) {
        const nextStrength = c.strength === 2 ? 1 : 2;
        addLog(`🔄 Фишка "${c.name}" перевернута на ${nextStrength === 2 ? 'полную силу (II)' : 'ослабленную сторону (I)'}`);
        return { ...c, strength: nextStrength };
      }
      return c;
    }));
    setCounterContextMenu(null);
  };

  const triggerExhaustCounter = (counterId: string) => {
    synth.playClick();
    setCounters(prev => prev.map(c => {
      if (c.id === counterId) {
        const nextExhaust = !c.exhausted;
        addLog(`⏳ Фишка "${c.name}" теперь ${nextExhaust ? 'Истощена (утомлена)' : 'Готова к бою'}`);
        return { ...c, exhausted: nextExhaust };
      }
      return c;
    }));
    setCounterContextMenu(null);
  };

  const triggerSendToReserve = (counterId: string) => {
    synth.playWoodThud();
    setCounters(prev => prev.map(c => {
      if (c.id === counterId) {
        addLog(`📥 Фишка "${c.name}" отозвана обратно в стратегический резерв фракции.`);
        return { ...c, spaceId: null };
      }
      return c;
    }));
    setCounterContextMenu(null);
  };

  const triggerDeleteCounter = (counterId: string) => {
    synth.playClick();
    const found = counters.find(c => c.id === counterId);
    setCounters(prev => prev.filter(c => c.id !== counterId));
    addLog(`❌ Фишка "${found ? found.name : ''}" удалена с карты военачальником.`);
    setCounterContextMenu(null);
  };

  // Context Menu Actions for Space
  const triggerAddCounterToSpace = (spaceId: string, faction: string = 'rome') => {
    synth.playWoodThud();
    const newId = `c-gen-${Date.now()}`;
    const space = spaces.find(s => s.id === spaceId);
    const spaceName = space?.name || 'Неизвестно';
    
    let name = '';
    let type: 'infantry' | 'cavalry' | 'elephants' | 'leader' = 'infantry';
    
    if (faction === 'rome') {
      name = `Римская Когорта ${Math.floor(Math.random() * 10) + 3}`;
      type = 'infantry';
    } else if (faction === 'carthage') {
      name = `Пунийские Ливийцы ${Math.floor(Math.random() * 5) + 1}`;
      type = 'infantry';
    } else if (faction === 'greek') {
      name = `Наемные Гоплиты`;
      type = 'infantry';
    } else {
      name = `Вспомогательный отряд племен`;
      type = 'cavalry';
    }

    const newCounter: WargameCounter = {
      id: newId,
      name,
      type,
      faction,
      strength: 2,
      maxStrength: 2,
      exhausted: false,
      spaceId,
      description: `Набор легионеров наспех мобилизован во время боевых действий в ${spaceName}.`
    };

    setCounters(prev => [...prev, newCounter]);
    setSelectedCounterId(newId);
    addLog(`⚔️ Создан новый отряд "${name}" в локации ${spaceName}.`);
    setSpaceContextMenu(null);
  };

  const triggerChangeControl = (spaceId: string, nextFaction: string) => {
    synth.playFlip();
    setSpaces(prev => prev.map(s => {
      if (s.id === spaceId) {
        addLog(`🏳️ Контроль над узлом [${s.name}] перешел фракции: ${getFactionLabel(nextFaction)}`);
        return { ...s, control: nextFaction };
      }
      return s;
    }));
    setSpaceContextMenu(null);
  };

  const triggerAddMarker = (spaceId: string, markerType: 'siege' | 'devastated' | 'none') => {
    synth.playClick();
    setSpaces(prev => prev.map(s => {
      if (s.id === spaceId) {
        const label = markerType === 'siege' ? 'Маркер осады 🛡️' : markerType === 'devastated' ? 'Маркер разорения ☠️' : 'Чистый статус';
        addLog(`📍 На узел [${s.name}] наложен статус: ${label}`);
        return { ...s, marker: markerType };
      }
      return s;
    }));
    setSpaceContextMenu(null);
  };

  // Close menus helper
  const closeAllMenus = () => {
    setSpaceContextMenu(null);
    setCounterContextMenu(null);
  };

  // Play Card Event
  const handlePlayCard = (card: CardEvent) => {
    synth.playTrumpet();
    addLog(`📜 СЫГРАНА КАРТА: "${card.title}" (${card.ops} Очка Действий)`);
    addLog(`   Эффект: "${card.effect}"`);

    // Add some specific thematic changes based on card
    if (card.id === 'card-3') {
      // Samnium rebellion
      triggerChangeControl('beneventum', 'samnite');
    } else if (card.id === 'card-8') {
      // Rome wins VP
      adjustFactionVP('rome', 1);
    } else if (card.id === 'card-1') {
      // Spawn Roman Legion at Rome
      triggerAddCounterToSpace('rome', 'rome');
    } else if (card.id === 'card-7') {
      // Carthage reinforcements
      triggerAddCounterToSpace('carthage', 'carthage');
    }

    // Remove or cycle card from hand
    synth.playDice();
    // Generate new card to replace
    const replacementTemplates = [
      { title: 'Подкуп Сенаторов', ops: 3, faction: 'carthage', flavour: '«Все имеет свою цену в городе олигархов»', effect: 'Переманить под свой контроль Алерию или Мессину.' },
      { title: 'Набор Новых Соратников', ops: 2, faction: 'greek', flavour: '«Мужи Великой Эллады готовы умереть за полис»', effect: 'Добавить отряд гоплитов в Сиракузы.' },
      { title: 'Горные засады', ops: 2, faction: 'samnite', flavour: '«Ущелье превратилось в ловушку»', effect: 'Нанести 1 урон любому Римскому Легиону на Апеннинах.' },
      { title: 'Священная Весна (Sacra Ver)', ops: 4, faction: 'samnite', flavour: '«Обет богам посылает молодых воинов на бой»', effect: 'Мобилизовать 2 новых отряда.' }
    ];

    const randomTemplate = replacementTemplates[Math.floor(Math.random() * replacementTemplates.length)];
    const newCard: CardEvent = {
      id: `card-gen-${Date.now()}`,
      title: randomTemplate.title,
      ops: randomTemplate.ops,
      faction: randomTemplate.faction as any,
      flavour: randomTemplate.flavour,
      effect: randomTemplate.effect
    };

    setCardHand(prev => prev.map(c => c.id === card.id ? newCard : c));
  };

  // Roll dice
  const [lastDiceResult, setLastDiceResult] = useState<number | null>(null);
  const handleRollDice = () => {
    synth.playDice();
    const result = Math.floor(Math.random() * 6) + 1;
    setLastDiceResult(result);
    addLog(`🎲 Бросок кости судьбы: результат [ ${result} ]`);
  };

  // Modify Victory points helper
  const adjustFactionVP = (factionId: string, amount: number) => {
    synth.playClick();
    setFactions(prev => prev.map(f => {
      if (f.id === factionId) {
        const nextVp = Math.max(0, f.vp + amount);
        addLog(`🏆 Изменение очков влияния [${f.name}]: ${f.vp} -> ${nextVp}`);
        return { ...f, vp: nextVp };
      }
      return f;
    }));
  };

  // Counter generator in Designer Mode
  const [designerSpawnFaction, setDesignerSpawnFaction] = useState<string>('rome');
  const [designerSpawnType, setDesignerSpawnType] = useState<'infantry' | 'cavalry' | 'elephants' | 'leader'>('infantry');
  
  const handleDesignerSpawn = () => {
    if (!selectedSpaceId) {
      alert("Пожалуйста, сначала выберите узел на карте, куда поставить фишку.");
      return;
    }
    
    const randomNames = {
      rome: ['III Союзный Легион', 'Аквилифер Марк', 'Кавалерия Эквиты'],
      carthage: ['Ливийская Фаланга', 'Слоны Ганнона', 'Нумидийский отряд'],
      greek: ['Гоплиты Сиракуз', 'Спартанские щиты', 'Критские лучники'],
      gaul: ['Орда Бойев', 'Вождь Верцингеториг', 'Лигурийская конница'],
      samnite: ['Самнитские триарии', 'Луканские горцы', 'Этрусская стража']
    };

    const namesList = randomNames[designerSpawnFaction as keyof typeof randomNames] || ['Вспомогательный отряд'];
    const name = namesList[Math.floor(Math.random() * namesList.length)] + ` (${Math.floor(Math.random()*90 + 10)})`;

    const newCounter: WargameCounter = {
      id: `c-design-${Date.now()}`,
      name,
      type: designerSpawnType,
      faction: designerSpawnFaction,
      strength: 2,
      maxStrength: 2,
      exhausted: false,
      spaceId: selectedSpaceId,
      description: 'Создано вручную в режиме Редактора Таблицы.'
    };

    setCounters(prev => [...prev, newCounter]);
    setSelectedCounterId(newCounter.id);
    synth.playWoodThud();
    addLog(`🛠️ Редактор: Спавн фишки "${name}" в городе ${spaces.find(s => s.id === selectedSpaceId)?.name}`);
  };

  // Toggle space editor modal
  const openSpaceEditor = (space: MapSpace) => {
    setEditSpaceName(space.name);
    setEditSpacePoints(space.points);
    setEditSpaceControl(space.control);
    setIsEditingSpace(space.id);
    setSpaceContextMenu(null);
  };

  const saveSpaceEdits = () => {
    if (isEditingSpace) {
      setSpaces(prev => prev.map(s => {
        if (s.id === isEditingSpace) {
          addLog(`🛠️ Изменен узел [${s.name}] -> [${editSpaceName}] (Ценность: ${editSpacePoints}, Контроль: ${getFactionLabel(editSpaceControl)})`);
          return {
            ...s,
            name: editSpaceName,
            points: editSpacePoints,
            control: editSpaceControl
          };
        }
        return s;
      }));
      setIsEditingSpace(null);
      synth.playClick();
    }
  };

  // Helpers for group stacking
  // If multiple counters are in the same space, we need to calculate an offset so they fan out or stack
  const getStackedPosition = (_counter: WargameCounter, index: number, total: number, spaceX: number, spaceY: number) => {
    if (total <= 1) {
      return { x: spaceX, y: spaceY };
    }
    // Fan out in a mini-circle or grid around the node center
    const offsetRadius = 26;
    const angle = (index * (2 * Math.PI)) / total;
    return {
      x: spaceX + offsetRadius * Math.cos(angle),
      y: spaceY + offsetRadius * Math.sin(angle)
    };
  };

  return (
    <div className="min-h-screen bg-[#131710] text-[#e2d9c2] flex flex-col select-none font-serif-ancient overflow-hidden">
      
      {/* TOP ANTIQUE HEADER TOOLBAR */}
      <header className="h-16 bg-gradient-to-b from-[#2d2116] to-[#1a120b] border-b border-[#4e3823] flex items-center justify-between px-4 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-900 rounded-md flex items-center justify-center border border-amber-600 shadow-inner">
            <Shield className="w-6 h-6 text-amber-200" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-[#f4ecd8] tracking-wider flex items-center gap-2">
              ИМПЕРИУМ <span className="text-amber-400 font-light text-sm italic hidden md:inline">Войны Великой Италии &amp; Карфагена</span>
            </h1>
            <p className="text-xs text-amber-600 font-mono uppercase tracking-widest">Цифровой Стол 2D • Карточно-Движимый Варгейм</p>
          </div>
        </div>

        {/* Play Mode / Designer Mode switcher */}
        <div className="flex items-center gap-2">
          <div className="bg-black/40 rounded-lg p-1 flex border border-[#4e3823] text-xs">
            <button 
              onClick={() => {
                setDesignerMode(false);
                synth.playTrumpet();
                addLog("ℹ️ Включен [РЕЖИМ ИГРЫ]. Изменения карты и добавления фишек ограничены правилами симуляции.");
              }}
              className={`px-3 py-1.5 rounded flex items-center gap-1 transition-all ${!designerMode ? 'bg-[#8c7652] text-[#21170d] font-bold shadow' : 'text-amber-600 hover:text-amber-300'}`}
              title="Стандартный игровой процесс: броски, движение, розыгрыш карт"
            >
              <Play className="w-3.5 h-3.5" />
              <span>ИГРА</span>
            </button>
            <button 
              onClick={() => {
                setDesignerMode(true);
                synth.playTrumpet();
                addLog("🛠️ Включен [РЕЖИМ ДИЗАЙНЕРА]. Разрешено свободное редактирование карты, создание любых армий и изменение очков.");
              }}
              className={`px-3 py-1.5 rounded flex items-center gap-1 transition-all ${designerMode ? 'bg-[#cca56a] text-[#21170d] font-bold shadow' : 'text-amber-600 hover:text-amber-300'}`}
              title="Режим редактирования: ставьте фишки в любом месте, меняйте очки победы, редактируйте узлы"
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>РЕДАКТОР</span>
            </button>
          </div>

          {/* Horizontal Divider */}
          <div className="h-8 w-[1px] bg-[#4e3823] mx-1"></div>

          {/* Persistence Actions */}
          <div className="flex items-center gap-1">
            <button 
              onClick={saveState} 
              className="bg-[#222d1c] border border-[#455d3b] hover:bg-[#2c3d25] text-emerald-300 text-xs font-sans px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors"
              title="Сохранить текущее состояние поля в память браузера"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сохранить</span>
            </button>
            <button 
              onClick={loadState} 
              className="bg-[#2d271d] border border-[#5d513b] hover:bg-[#3d3527] text-amber-300 text-xs font-sans px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors"
              title="Загрузить последнее сохранение"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Загрузить</span>
            </button>
          </div>

          <div className="h-8 w-[1px] bg-[#4e3823] mx-1"></div>

          {/* Control Layers Dropdown Button */}
          <div className="relative">
            <button 
              onClick={() => {
                synth.playClick();
                setShowLayersMenu(!showLayersMenu);
              }}
              className={`border border-[#4e3823] text-xs px-2 py-1.5 rounded flex items-center gap-1 transition-colors ${showLayersMenu ? 'bg-amber-900 text-amber-100' : 'bg-[#1b120b] text-amber-500 hover:text-amber-300'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Слои</span>
            </button>
            
            {showLayersMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#211811] border border-[#8c7652] rounded-md shadow-2xl p-3 z-50 text-left font-sans">
                <div className="text-xs text-amber-400 font-bold border-b border-[#4e3823] pb-1.5 mb-2 flex justify-between items-center">
                  <span>Видимость Элементов</span>
                  <button onClick={() => setShowLayersMenu(false)} className="text-amber-600 hover:text-amber-300">✕</button>
                </div>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={layers.connections} 
                      onChange={() => setLayers(l => ({ ...l, connections: !l.connections }))}
                      className="accent-amber-700" 
                    />
                    <span>Линии Сухопутных Дорог</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={layers.seaConnections} 
                      onChange={() => setLayers(l => ({ ...l, seaConnections: !l.seaConnections }))}
                      className="accent-amber-700" 
                    />
                    <span>Линии Морских Путей</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={layers.flags} 
                      onChange={() => setLayers(l => ({ ...l, flags: !l.flags }))}
                      className="accent-amber-700" 
                    />
                    <span>Флаги Контроля Фракций</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={layers.names} 
                      onChange={() => setLayers(l => ({ ...l, names: !l.names }))}
                      className="accent-amber-700" 
                    />
                    <span>Латинские Названия Городов</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={layers.gridLines} 
                      onChange={() => setLayers(l => ({ ...l, gridLines: !l.gridLines }))}
                      className="accent-amber-700" 
                    />
                    <span>Вспомогательная Сетка</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Audio Toggle */}
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="p-1.5 border border-[#4e3823] rounded bg-[#1b120b] text-amber-500 hover:text-amber-300"
            title={soundOn ? "Выключить звук кликов" : "Включить звук кликов"}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>

          {/* Help / Rules and Player Aid */}
          <button 
            onClick={() => {
              synth.playClick();
              setShowRules(!showRules);
            }}
            className="bg-[#2c1e12] border border-[#8c7652] text-amber-300 text-xs px-3 py-1.5 rounded flex items-center gap-1 hover:bg-[#3f2b1a] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Книга Правил</span>
          </button>

          <button 
            onClick={() => {
              synth.playClick();
              setShowPlayerAid(!showPlayerAid);
            }}
            className={`text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-all ${showPlayerAid ? 'bg-[#b89b6c] text-[#1a120b] font-bold' : 'bg-stone-800 text-amber-400 border border-[#4e3823] hover:bg-stone-700'}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Памятка</span>
          </button>
        </div>
      </header>

      {/* SUB-HEADER: FACTIONS & VICTORY POINTS STATUS BAR */}
      <section className="bg-[#1a140e] border-b border-[#4e3823] py-2 px-4 flex flex-wrap items-center justify-between gap-2 z-20 text-xs">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <span>СТАТУС ВЛИЯНИЯ (VP):</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {factions.map((faction) => {
            const countInReserves = counters.filter(c => c.faction === faction.id && !c.spaceId).length;
            const countOnMap = counters.filter(c => c.faction === faction.id && c.spaceId).length;
            
            return (
              <div 
                key={faction.id} 
                className="bg-black/30 rounded border border-[#3d2d1e] p-1.5 flex items-center gap-2.5 min-w-[180px] hover:border-amber-800 transition-all"
              >
                <div className="w-3 h-6 rounded-sm" style={{ backgroundColor: faction.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center font-sans">
                    <span className="font-bold text-[#e5dec9] truncate" title={faction.name}>{faction.name.split(' ')[0]}</span>
                    <span className="font-mono text-amber-400 font-bold bg-amber-950/50 px-1 rounded">{faction.vp} VP</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-400">
                    <span>Карт: {faction.handSize}</span>
                    <span>Карта/Резерв: {countOnMap}/{countInReserves}</span>
                  </div>
                </div>

                {/* VP adjuster in designer mode */}
                {designerMode && (
                  <div className="flex flex-col gap-0.5">
                    <button 
                      onClick={() => adjustFactionVP(faction.id, 1)}
                      className="bg-[#362718] hover:bg-[#4f3b26] text-emerald-400 text-[9px] font-bold px-1 rounded-sm"
                    >
                      +
                    </button>
                    <button 
                      onClick={() => adjustFactionVP(faction.id, -1)}
                      className="bg-[#362718] hover:bg-[#4f3b26] text-red-400 text-[9px] font-bold px-1 rounded-sm"
                    >
                      -
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Instant Dice Roller */}
        <div className="flex items-center gap-2 bg-[#281f16] border border-[#5c4c35] px-2.5 py-1 rounded shadow-sm">
          <button 
            onClick={handleRollDice} 
            className="hover:text-amber-200 text-amber-400 font-bold flex items-center gap-1 text-xs"
            title="Бросить игровую шестигранную кость"
          >
            <Dices className="w-4 h-4 text-yellow-500" />
            <span>Бросить Кость</span>
          </button>
          {lastDiceResult !== null && (
            <div className="w-6 h-6 bg-yellow-700 text-white font-mono font-bold text-sm flex items-center justify-center rounded border border-yellow-500 animate-bounce">
              {lastDiceResult}
            </div>
          )}
        </div>
      </section>

      {/* MAIN PLAYFIELD AREA: SPLIT SIDEBAR / WORKSPACE */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT WORKSPACE: FELT TABLETOP WITH PARCHMENT MAP SHEET */}
        <div 
          className="flex-1 felt-tabletop relative overflow-auto p-8 custom-scroll"
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={handleMapMouseUp}
          onWheel={handleWheel}
          onClick={closeAllMenus}
        >
          {/* Mini Navigation Instructions Overlay */}
          <div className="absolute top-3 left-3 bg-black/75 border border-amber-900/60 rounded px-2 py-1 text-[10px] text-[#bcab90] pointer-events-none z-10 font-sans space-y-0.5">
            <div>🖱️ <span className="text-amber-400">ЛКМ + Перетаскивание</span> — Двигать карту по столу</div>
            <div>🎡 <span className="text-amber-400">Колесо мыши</span> — Масштаб: {Math.round(zoom * 100)}%</div>
            <div>👉 <span className="text-amber-400 font-semibold">Нажмите ЛКМ на городе</span> — Открыть инспектор</div>
            <div>🖱️ <span className="text-amber-400 font-semibold">ПКМ на узле или фишке</span> — Контекстное меню wargame</div>
          </div>

          {/* Scale control buttons */}
          <div className="absolute top-3 right-3 flex gap-1 z-10 interactive-element">
            <button 
              onClick={() => setZoom(z => Math.min(2.0, z + 0.15))}
              className="w-8 h-8 bg-stone-900/90 hover:bg-stone-800 text-[#f4ecd8] rounded border border-[#8c7652] flex items-center justify-center font-mono text-lg font-bold"
              title="Увеличить масштаб"
            >
              +
            </button>
            <button 
              onClick={() => setZoom(1.0)}
              className="px-2 h-8 bg-stone-900/90 hover:bg-stone-800 text-[#f4ecd8] rounded border border-[#8c7652] flex items-center justify-center text-xs font-mono"
              title="Сбросить масштаб"
            >
              100%
            </button>
            <button 
              onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
              className="w-8 h-8 bg-stone-900/90 hover:bg-stone-800 text-[#f4ecd8] rounded border border-[#8c7652] flex items-center justify-center font-mono text-lg font-bold"
              title="Уменьшить масштаб"
            >
              -
            </button>
            <button 
              onClick={() => {
                setPan({ x: 0, y: 0 });
                setZoom(0.9);
                synth.playClick();
              }}
              className="px-2 h-8 bg-[#36281a]/95 hover:bg-[#4d3825] text-amber-300 rounded border border-[#8c7652] flex items-center justify-center text-xs font-sans"
              title="Центрировать карту"
            >
              Центр
            </button>
          </div>

          {/* PARCHMENT MAP CONTAINER */}
          <div 
            ref={mapContainerRef}
            className="parchment-map mx-auto transition-transform duration-75 origin-top-left interactive-element"
            style={{
              width: '1080px',
              height: '960px',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              cursor: isPanning ? 'grabbing' : 'default'
            }}
          >
            {/* Watermarks, Compass Rose, Latin ocean labels */}
            <div className="absolute top-[340px] left-[240px] w-72 h-72 compass-rose" />
            
            {/* Cartography Decorative Texts */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none text-center opacity-30 select-none">
              <h2 className="stamp-text text-[#5c4831] text-2xl tracking-[0.25em] font-extrabold">ITALIA ET CENTRAL MEDITERRANEUM</h2>
              <p className="text-xs italic text-[#423220] mt-1">Bellum Romanum - Secundum Punicum Aetatis Mockup</p>
            </div>

            <div className="absolute top-[230px] left-[620px] pointer-events-none select-none opacity-25 font-serif italic text-stone-800 text-xs font-semibold tracking-widest">
              MARE ADRIATICUM (АДРИАТИЧЕСКОЕ МОРЕ)
            </div>

            <div className="absolute top-[620px] left-[320px] pointer-events-none select-none opacity-25 font-serif italic text-stone-800 text-xs font-semibold tracking-widest">
              MARE TYRRHENUM (ТИРРЕНСКОЕ МОРЕ)
            </div>

            <div className="absolute top-[880px] left-[720px] pointer-events-none select-none opacity-25 font-serif italic text-stone-800 text-xs font-semibold tracking-widest">
              MARE IONIUM (ИОНИЧЕСКОЕ МОРЕ)
            </div>

            <div className="absolute bottom-6 left-10 pointer-events-none select-none opacity-40 border-t border-[#8c7652] pt-1.5 text-[11px] text-[#5c4831]">
              Картографическая разметка Линий и Поселений для Симуляции Сената • 264 г. до н.э.
            </div>

            {/* THEMATIC COASTLINE DECORATIVE SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {/* Background grid if selected in layers */}
              {layers.gridLines && (
                <defs>
                  <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#8b754e" strokeWidth="0.35" opacity="0.2" />
                  </pattern>
                </defs>
              )}
              {layers.gridLines && <rect width="100%" height="100%" fill="url(#map-grid)" />}

              {/* Simulated Coastlines (Italy Boot, Sicily, Sardinia, Corsica, North Africa) */}
              <g fill="none" stroke="#c8b99c" strokeWidth="6" opacity="0.7">
                {/* Italy Boot */}
                <path d="M 210,120 Q 280,130 320,160 T 380,130 T 470,200 T 580,230 T 640,320 T 720,420 T 880,480 T 920,540 T 830,600 T 740,620 T 670,720 T 610,700 T 620,640 T 520,580 T 440,420 T 320,310 T 210,220 Z" fill="#ecdcb9" opacity="0.45" />
                
                {/* Sicily */}
                <path d="M 360,780 Q 500,750 590,830 T 460,890 T 350,820 Z" fill="#ecdcb9" opacity="0.45" />
                
                {/* Sardinia */}
                <path d="M 110,500 Q 190,500 190,640 T 110,650 T 100,570 Z" fill="#ecdcb9" opacity="0.45" />
                
                {/* Corsica */}
                <path d="M 140,340 Q 210,340 210,440 T 140,460 T 130,390 Z" fill="#ecdcb9" opacity="0.45" />
                
                {/* North Africa (Carthage area) */}
                <path d="M 20,830 Q 150,800 260,830 T 280,940 T 20,950 Z" fill="#e5d4af" opacity="0.6" />
              </g>

              {/* Muted coastline inner detail line */}
              <g fill="none" stroke="#8b754e" strokeWidth="1" opacity="0.3" strokeDasharray="3,3">
                <path d="M 210,120 Q 280,130 320,160 T 380,130 T 470,200 T 580,230 T 640,320 T 720,420 T 880,480 T 920,540" />
                <path d="M 360,780 Q 500,750 590,830 T 460,890 Z" />
              </g>
              
              {/* CONNECTIONS (Drawn as lines) */}
              {layers.connections && (
                <g>
                  {connections
                    .filter(conn => conn.type === 'land')
                    .map((conn, index) => {
                      const fromSpace = spaces.find(s => s.id === conn.from);
                      const toSpace = spaces.find(s => s.id === conn.to);
                      if (!fromSpace || !toSpace) return null;
                      
                      return (
                        <line 
                          key={`land-conn-${index}`}
                          x1={fromSpace.x}
                          y1={fromSpace.y}
                          x2={toSpace.x}
                          y2={toSpace.y}
                          className="map-line"
                        />
                      );
                    })
                  }
                </g>
              )}

              {layers.seaConnections && (
                <g>
                  {connections
                    .filter(conn => conn.type === 'sea')
                    .map((conn, index) => {
                      const fromSpace = spaces.find(s => s.id === conn.from);
                      const toSpace = spaces.find(s => s.id === conn.to);
                      if (!fromSpace || !toSpace) return null;
                      
                      return (
                        <line 
                          key={`sea-conn-${index}`}
                          x1={fromSpace.x}
                          y1={fromSpace.y}
                          x2={toSpace.x}
                          y2={toSpace.y}
                          className="map-line-sea"
                        />
                      );
                    })
                  }
                </g>
              )}
            </svg>

            {/* RENDERING MAP NODES / SPACES */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
              {spaces.map((space) => {
                const isSelected = selectedSpaceId === space.id;
                const currentControlData = factions.find(f => f.id === space.control);
                
                return (
                  <div
                    key={space.id}
                    className="absolute pointer-events-auto"
                    style={{
                      left: `${space.x}px`,
                      top: `${space.y}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {/* Interactive outer ring glow */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpaceClick(space.id);
                      }}
                      onContextMenu={(e) => handleRightClickSpace(e, space.id)}
                      className={`w-14 h-14 rounded-full cursor-pointer flex items-center justify-center transition-all relative ${
                        isSelected ? 'node-glow-active ring-4 ring-yellow-400 bg-[#fdfaf2]/90 scale-110' : 'node-glow bg-[#ebdcb9]/95 hover:scale-105 hover:bg-[#fffbf2]'
                      }`}
                      style={{
                        border: `3.5px solid ${getFactionColor(space.control)}`,
                        boxShadow: isSelected 
                          ? '0 0 20px rgba(234, 179, 8, 0.95)' 
                          : `0 3px 6px rgba(0, 0, 0, 0.4), inset 0 0 8px ${getFactionColor(space.homeFaction)}90`
                      }}
                      title={`${space.name} (${space.latinName})`}
                    >
                      {/* Victory points small marker inside */}
                      <div className="absolute -top-2.5 -right-2 bg-[#3c2c1a] border border-[#8c7652] text-amber-200 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                        {space.points}
                      </div>

                      {/* Port anchor indicator */}
                      {space.isPort && (
                        <div className="absolute -bottom-1.5 -left-1.5 bg-[#2b4251] border border-[#49697f] text-cyan-200 text-[8px] p-0.5 rounded-sm shadow" title="Морской Порт">
                          <Anchor className="w-2.5 h-2.5" />
                        </div>
                      )}

                      {/* Control Flag or Shield Indicator */}
                      {layers.flags && space.control !== 'neutral' && currentControlData && (
                        <div 
                          className="absolute -bottom-2 -right-1.5 shadow-md rounded-full p-0.5 border border-amber-800/70"
                          style={{ backgroundColor: currentControlData.color }}
                          title={`Контролируется: ${currentControlData.name}`}
                        >
                          <Flag className="w-3 h-3 text-white" />
                        </div>
                      )}

                      {/* Center structural dot or home faction mini ring */}
                      <div 
                        className="w-4 h-4 rounded-full border border-black/40 shadow-inner"
                        style={{ 
                          backgroundColor: space.homeFaction !== 'neutral' ? getFactionColor(space.homeFaction) : '#8b754e' 
                        }} 
                      />

                      {/* Status markers (Siege or Devastated) */}
                      {space.marker === 'siege' && (
                        <div className="absolute -top-5 bg-red-900 border border-red-400 text-white text-[9px] font-sans px-1 rounded shadow animate-pulse">
                          🛡️ ОСАДА
                        </div>
                      )}
                      {space.marker === 'devastated' && (
                        <div className="absolute -top-5 bg-stone-950 border border-stone-500 text-[#cc2222] text-[9px] font-bold font-sans px-1 rounded shadow">
                          ☠️ РАЗОРЕНО
                        </div>
                      )}
                    </div>

                    {/* City labels overlay */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center w-32 pointer-events-none">
                      <p className="text-[#21170e] font-bold text-[12px] leading-tight filter drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
                        {space.name}
                      </p>
                      {layers.names && (
                        <p className="text-stone-700 font-serif italic text-[10px] leading-none tracking-wide">
                          {space.latinName}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RENDERING DRAGGABLE COUNTERS / Wargame Pieces */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
              {/* We group counters by their spaceId to stack them if there are multiple */}
              {spaces.map((space) => {
                const countersInThisSpace = counters.filter(c => c.spaceId === space.id);
                
                return countersInThisSpace.map((counter, index) => {
                  const isSelected = selectedCounterId === counter.id;
                  const isDragged = draggedCounterId === counter.id;
                  
                  // Calculate fanned stacked positions
                  const pos = isDragged && dragPosition.x !== 0
                    ? { x: dragPosition.x, y: dragPosition.y }
                    : getStackedPosition(counter, index, countersInThisSpace.length, space.x, space.y);

                  const factionData = factions.find(f => f.id === counter.faction);
                  
                  return (
                    <div
                      key={counter.id}
                      onMouseDown={(e) => handleCounterDragStart(e, counter.id)}
                      onContextMenu={(e) => handleRightClickCounter(e, counter.id)}
                      className={`absolute pointer-events-auto counter-piece rounded-md w-12 h-12 flex flex-col items-center justify-between p-1 text-center shadow-lg ${
                        isSelected ? 'ring-4 ring-yellow-400 scale-105 z-30' : 'ring-1 ring-black/80 hover:ring-2 hover:ring-amber-400'
                      } ${counter.exhausted ? 'counter-exhausted' : ''}`}
                      style={{
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: factionData ? factionData.color : '#7c6d53',
                        color: factionData ? factionData.textColor : '#ffffff',
                        opacity: isDragged ? 0.8 : 1,
                        border: '3px double rgba(255,255,255,0.45)'
                      }}
                      title={`${counter.name} - Фракция: ${getFactionLabel(counter.faction)}. Нажмите ЛКМ для перетаскивания. ПКМ для опций.`}
                    >
                      {/* Strength marker: Star or Number */}
                      <div className="w-full flex justify-between items-center text-[8px] leading-none px-0.5">
                        <span className="font-bold uppercase font-mono">{counter.type === 'leader' ? '★' : 'II'}</span>
                        <span className="font-bold font-mono text-amber-300">{counter.strength}⚔️</span>
                      </div>

                      {/* Miniature Unit Icon / Character Visual representation */}
                      <div className="text-center font-serif text-[9px] font-bold truncate w-full leading-tight select-none pointer-events-none">
                        {counter.type === 'infantry' && '🛡️'}
                        {counter.type === 'cavalry' && '🏇'}
                        {counter.type === 'elephants' && '🐘'}
                        {counter.type === 'leader' && '👑'}
                        <span className="block truncate text-[8px] mt-0.5">{counter.name.split(' ')[0]}</span>
                      </div>

                      {/* Exhaustion indicator banner */}
                      <div className="w-full text-[7px] leading-none bg-black/30 text-center rounded-[2px]">
                        {counter.exhausted ? 'УСТАЛ' : 'ГОТОВ'}
                      </div>

                      {/* Stack indicator badge for top layer */}
                      {index === 0 && countersInThisSpace.length > 1 && (
                        <div className="absolute -bottom-1.5 -right-1.5 bg-[#21180f] text-amber-400 border border-[#8c7652] text-[8px] font-mono w-4 h-4 rounded-full flex items-center justify-center font-bold shadow" title={`Стопка из ${countersInThisSpace.length} отрядов`}>
                          +{countersInThisSpace.length - 1}
                        </div>
                      )}
                    </div>
                  );
                });
              })}
            </div>

          </div>
        </div>

        {/* RIGHT SIDEBAR: DOUBLE INSPECTORS & LOG & CREATOR */}
        <aside className="w-80 bg-[#1a130d] border-l border-[#4e3823] flex flex-col z-20">
          
          {/* ACTIVE SPACE INSPECTOR */}
          <div className="border-b border-[#4e3823] p-3 bg-[#261c12] relative">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>Инспектор Локации</span>
            </div>

            {selectedSpaceId ? (() => {
              const space = spaces.find(s => s.id === selectedSpaceId);
              if (!space) return <p className="text-xs text-stone-500">Узел не найден</p>;
              
              return (
                <div className="font-sans">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#f4ecd8] font-serif-ancient flex items-center gap-1.5">
                        {space.name}
                        {space.isPort && <Anchor className="w-3.5 h-3.5 text-cyan-400 inline" />}
                      </h3>
                      <span className="text-[11px] italic text-amber-600 font-serif font-light block">{space.latinName}</span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xs px-2 py-0.5 rounded font-bold uppercase text-white" style={{ backgroundColor: getFactionColor(space.control) }}>
                        {getFactionLabel(space.control)}
                      </span>
                      <span className="text-[9px] text-stone-400 mt-1">Ценность: {space.points} VP</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#c5bba5] mt-1.5 leading-snug italic bg-black/30 p-1.5 rounded border border-[#3d2c1b]">
                    {space.description}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {/* Actions for the space directly in inspector */}
                    <button 
                      onClick={(e) => handleRightClickSpace(e, space.id)}
                      className="text-[10px] bg-[#3d2b1a] hover:bg-[#543d28] text-amber-300 px-2 py-1 rounded border border-[#6b4e30] flex items-center gap-1 transition-colors"
                    >
                      <span>Меню Узла ⚙️</span>
                    </button>

                    {designerMode && (
                      <button 
                        onClick={() => openSpaceEditor(space)}
                        className="text-[10px] bg-blue-950/60 hover:bg-blue-900 text-blue-300 px-2 py-1 rounded border border-blue-800 flex items-center gap-1 transition-colors"
                      >
                        <span>Редактировать</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })() : (
              <p className="text-xs text-stone-500 italic">Нажмите на круглый город на карте для инспекции.</p>
            )}
          </div>

          {/* ACTIVE COUNTER PIECE INSPECTOR */}
          <div className="border-b border-[#4e3823] p-3 bg-[#21180f]">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4 text-amber-500" />
              <span>Инспектор Воинской Фишки</span>
            </div>

            {selectedCounterId ? (() => {
              const counter = counters.find(c => c.id === selectedCounterId);
              if (!counter) return <p className="text-xs text-stone-500">Фишка снята или в резерве</p>;
              const factionData = factions.find(f => f.id === counter.faction);
              const currentSpace = spaces.find(s => s.id === counter.spaceId);
              
              return (
                <div className="font-sans">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#f4ecd8]" style={{ color: factionData?.color }}>
                        {counter.name}
                      </h3>
                      <span className="text-[10px] font-mono text-stone-400">
                        {getUnitTypeName(counter.type)} ({getFactionLabel(counter.faction)})
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${counter.exhausted ? 'bg-red-950 text-red-300' : 'bg-emerald-950 text-emerald-300'}`}>
                        {counter.exhausted ? '⏳ Истощен' : '⚡ Готов'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 my-2 bg-black/30 p-1.5 rounded text-xs border border-[#3d2c1b]">
                    <div>
                      <span className="text-stone-400 text-[10px] block">Боевая Сила:</span>
                      <strong className="text-amber-200 text-sm font-mono">{counter.strength} / {counter.maxStrength} ⚔️</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] block">Локация:</span>
                      <strong className="text-amber-300 truncate block text-xs">{currentSpace ? currentSpace.name : 'В резерве 📥'}</strong>
                    </div>
                  </div>

                  <p className="text-xs text-[#c5bba5] leading-relaxed italic">
                    {counter.description}
                  </p>

                  {/* Quick actions for selected counter */}
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    <button 
                      onClick={() => triggerFlipCounter(counter.id)}
                      className="text-[10px] bg-[#3d2d1d] hover:bg-[#523d28] text-stone-200 px-2 py-1 rounded border border-[#5c4c35]"
                      title="Перевернуть на слабую/сильную сторону"
                    >
                      🔄 Степень
                    </button>
                    <button 
                      onClick={() => triggerExhaustCounter(counter.id)}
                      className="text-[10px] bg-[#3d2d1d] hover:bg-[#523d28] text-stone-200 px-2 py-1 rounded border border-[#5c4c35]"
                    >
                      ⏳ Усталость
                    </button>
                    <button 
                      onClick={() => triggerSendToReserve(counter.id)}
                      className="text-[10px] bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 px-2 py-1 rounded border border-amber-800"
                    >
                      📥 Резерв
                    </button>
                    {designerMode && (
                      <button 
                        onClick={() => triggerDeleteCounter(counter.id)}
                        className="text-[10px] bg-red-950/80 hover:bg-red-900 text-red-300 px-2 py-1 rounded border border-red-800"
                      >
                        ✕ Удалить
                      </button>
                    )}
                  </div>
                </div>
              );
            })() : (
              <p className="text-xs text-stone-500 italic">Фишка не выбрана. Нажмите на легион на карте для просмотра характеристик.</p>
            )}
          </div>

          {/* DESIGNER UNIT CREATOR TOOL */}
          {designerMode && (
            <div className="p-3 bg-[#262117] border-b border-[#4e3823]">
              <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Plus className="w-4 h-4" />
                <span>Редактор: Создание Фишек</span>
              </h3>
              
              <div className="space-y-2 text-xs font-sans">
                <div>
                  <label className="block text-[10px] text-stone-400 mb-0.5">Фракция призыва:</label>
                  <select 
                    value={designerSpawnFaction} 
                    onChange={(e) => setDesignerSpawnFaction(e.target.value)}
                    className="w-full bg-[#18140e] border border-[#5c4c35] rounded px-1.5 py-1 text-[#ebdcb9]"
                  >
                    <option value="rome">Римская Республика</option>
                    <option value="carthage">Великий Карфаген</option>
                    <option value="greek">Сиракузы / Греки</option>
                    <option value="gaul">Галльские Племена</option>
                    <option value="samnite">Самниты / Этруски</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-0.5">Тип отряда:</label>
                    <select 
                      value={designerSpawnType} 
                      onChange={(e) => setDesignerSpawnType(e.target.value as any)}
                      className="w-full bg-[#18140e] border border-[#5c4c35] rounded px-1 py-1 text-[#ebdcb9]"
                    >
                      <option value="infantry">Пехота</option>
                      <option value="cavalry">Кавалерия</option>
                      <option value="elephants">Слоны</option>
                      <option value="leader">Полководец</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button 
                      onClick={handleDesignerSpawn}
                      className="w-full bg-amber-800 hover:bg-amber-700 text-amber-100 font-bold rounded py-1 flex items-center justify-center gap-1 border border-[#b89b6c] transition-colors"
                      title="Призвать фишку в выбранный на карте город"
                    >
                      <span>Призвать</span>
                    </button>
                  </div>
                </div>
                <p className="text-[9px] text-amber-600/80 italic">Спавнится на выделенном узле: <strong>{spaces.find(s => s.id === selectedSpaceId)?.name || 'Нет'}</strong></p>
              </div>
            </div>
          )}

          {/* STRATEGIC ACTION LOG */}
          <div className="flex-1 flex flex-col min-h-0 bg-black/20">
            <div className="p-2.5 bg-[#16100a] border-b border-[#3a2716] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-400 uppercase">
                <List className="w-3.5 h-3.5 text-amber-600" />
                <span>Журнал Военных Действий</span>
              </div>
              <button 
                onClick={() => {
                  setActionLog(['[Журнал очищен военачальником]']);
                  synth.playClick();
                }}
                className="text-[9px] text-red-400 hover:text-red-300 hover:underline"
              >
                Очистить
              </button>
            </div>

            {/* LOG ITEMS VIEW */}
            <div className="flex-1 overflow-y-auto p-2.5 font-mono text-[11px] space-y-1.5 scroll-smooth custom-scroll">
              {actionLog.map((logEntry, index) => {
                let entryColor = 'text-stone-300';
                if (logEntry.includes('⚠️') || logEntry.includes('Ошибка')) entryColor = 'text-amber-400';
                else if (logEntry.includes('СЫГРАНА КАРТА')) entryColor = 'text-purple-300 font-bold border-l border-purple-500 pl-1';
                else if (logEntry.includes('РЕДАКТОР') || logEntry.includes('Редактор')) entryColor = 'text-cyan-300';
                else if (logEntry.includes('🏆')) entryColor = 'text-yellow-300 font-bold';
                else if (logEntry.includes('⚔️')) entryColor = 'text-rose-400';
                else if (logEntry.includes('🏳️')) entryColor = 'text-blue-300';
                
                return (
                  <div key={index} className={`leading-tight pb-1 border-b border-stone-900/40 ${entryColor}`}>
                    {logEntry}
                  </div>
                );
              })}
            </div>
          </div>

        </aside>
      </main>

      {/* BOTTOM PLAYABLE CARDS DRAWER & HAND */}
      <footer className="bg-[#211811] border-t border-[#4e3823] p-3 z-20">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#f4ecd8] tracking-wider font-serif-ancient uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Карточно-Движимый Движок (Свитки Стратегии):
              </span>
              <span className="text-[11px] text-stone-400 italic hidden md:inline">
                Разыграйте историческое событие, чтобы мгновенно изменить расклад сил в Средиземноморье
              </span>
            </div>
            
            <div className="text-[10px] text-stone-500 font-mono">
              В руке: {cardHand.length} карт • Розыгрыш заменяет карту на новую случайную
            </div>
          </div>

          {/* CARDS LIST GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {cardHand.map((card) => {
              // Pick card visual theme based on faction association
              let borderTheme = 'border-[#695337] hover:border-amber-500';
              let headerBg = 'bg-[#33261b] text-amber-300';
              if (card.faction === 'rome') {
                borderTheme = 'border-[#9c2424] hover:border-red-400';
                headerBg = 'bg-[#5c1717] text-red-200';
              } else if (card.faction === 'carthage') {
                borderTheme = 'border-[#2b5c66] hover:border-teal-400';
                headerBg = 'bg-[#1d3f47] text-teal-200';
              } else if (card.faction === 'greek') {
                borderTheme = 'border-[#6a239c] hover:border-purple-400';
                headerBg = 'bg-[#441763] text-purple-200';
              }

              return (
                <div 
                  key={card.id}
                  className={`bg-[#16110d] border ${borderTheme} rounded p-2 flex flex-col justify-between min-h-[125px] hover:bg-[#1f1813] transition-all hover:-translate-y-1 shadow-md cursor-pointer group`}
                  onClick={() => handlePlayCard(card)}
                >
                  {/* Card Header */}
                  <div className={`text-[9px] font-bold uppercase px-1 rounded flex justify-between items-center ${headerBg}`}>
                    <span>Очки: {card.ops} OP</span>
                    <span>{getFactionLabel(card.faction)}</span>
                  </div>

                  {/* Card Title */}
                  <h4 className="text-[11px] font-bold text-stone-100 leading-tight mt-1.5 group-hover:text-amber-300 transition-colors">
                    {card.title}
                  </h4>

                  {/* Flavour text */}
                  <p className="text-[9px] text-stone-400 italic my-1 leading-tight line-clamp-2">
                    {card.flavour}
                  </p>

                  {/* Rules effect */}
                  <div className="text-[9px] text-amber-200/90 bg-[#241a12] p-1 rounded leading-tight border border-amber-900/30 mt-auto">
                    {card.effect}
                  </div>

                  {/* Overlay button on hover */}
                  <div className="text-center text-[9px] font-bold text-yellow-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    РАЗЫГРАТЬ 📜
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </footer>

      {/* CONTEXT MENU FOR SPACE (RIGHT CLICK / LONG TOUCH) */}
      {spaceContextMenu?.visible && (
        <div 
          className="absolute bg-[#211811] border-2 border-[#8c7652] rounded-md shadow-2xl p-2 z-50 w-60 font-sans text-xs text-[#ebdcb9]"
          style={{
            left: `${spaceContextMenu.x}px`,
            top: `${spaceContextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] text-amber-400 font-bold border-b border-[#4e3823] pb-1 mb-1.5 uppercase tracking-wider flex justify-between items-center">
            <span>Узел: {spaces.find(s => s.id === spaceContextMenu.spaceId)?.name}</span>
            <button onClick={closeAllMenus} className="text-stone-500 hover:text-stone-200 font-bold">✕</button>
          </div>
          
          <div className="space-y-1">
            {/* Add Counter submenu */}
            <div className="py-0.5 text-stone-400 text-[9px] font-bold">Мобилизовать отряд:</div>
            <div className="grid grid-cols-2 gap-1">
              <button 
                onClick={() => triggerAddCounterToSpace(spaceContextMenu.spaceId, 'rome')}
                className="bg-[#5c1717] text-red-100 px-1.5 py-1 rounded hover:bg-red-850 text-left text-[9px]"
              >
                🚩 Легион Рима
              </button>
              <button 
                onClick={() => triggerAddCounterToSpace(spaceContextMenu.spaceId, 'carthage')}
                className="bg-[#1d3f47] text-teal-100 px-1.5 py-1 rounded hover:bg-teal-800 text-left text-[9px]"
              >
                🛡️ Наемник Карфагена
              </button>
              <button 
                onClick={() => triggerAddCounterToSpace(spaceContextMenu.spaceId, 'greek')}
                className="bg-[#441763] text-purple-100 px-1.5 py-1 rounded hover:bg-[#521c7a] text-left text-[9px]"
              >
                ⚔️ Фаланга Греков
              </button>
              <button 
                onClick={() => triggerAddCounterToSpace(spaceContextMenu.spaceId, 'samnite')}
                className="bg-amber-950/95 text-amber-100 px-1.5 py-1 rounded hover:bg-amber-900 text-left text-[9px]"
              >
                🏹 Самниты
              </button>
            </div>

            <hr className="border-[#4e3823] my-1.5" />

            {/* Change Control submenu */}
            <div className="py-0.5 text-stone-400 text-[9px] font-bold">Изменить Влияние (Флаг):</div>
            <div className="grid grid-cols-3 gap-1">
              {['rome', 'carthage', 'greek', 'gaul', 'samnite', 'neutral'].map((fac) => (
                <button
                  key={fac}
                  onClick={() => triggerChangeControl(spaceContextMenu.spaceId, fac)}
                  className="bg-[#3d2c1b] hover:bg-[#5c4328] px-1.5 py-0.5 rounded text-[9px] text-stone-200 truncate"
                >
                  {getFactionLabel(fac)}
                </button>
              ))}
            </div>

            <hr className="border-[#4e3823] my-1.5" />

            {/* Add/Remove Markers */}
            <div className="py-0.5 text-stone-400 text-[9px] font-bold">Маркеры военного положения:</div>
            <div className="flex gap-1">
              <button 
                onClick={() => triggerAddMarker(spaceContextMenu.spaceId, 'siege')}
                className="bg-red-900/80 hover:bg-red-900 text-red-200 text-[9px] py-1 px-2 rounded flex-1"
              >
                🛡️ Осада
              </button>
              <button 
                onClick={() => triggerAddMarker(spaceContextMenu.spaceId, 'devastated')}
                className="bg-amber-900/80 hover:bg-amber-900 text-amber-200 text-[9px] py-1 px-2 rounded flex-1"
              >
                ☠️ Разорить
              </button>
              <button 
                onClick={() => triggerAddMarker(spaceContextMenu.spaceId, 'none')}
                className="bg-stone-800 hover:bg-stone-700 text-stone-300 text-[9px] py-1 px-2 rounded flex-1"
              >
                Снять
              </button>
            </div>

            {designerMode && (
              <>
                <hr className="border-[#4e3823] my-1.5" />
                <button 
                  onClick={() => {
                    const space = spaces.find(s => s.id === spaceContextMenu.spaceId);
                    if (space) openSpaceEditor(space);
                  }}
                  className="w-full bg-yellow-850 text-yellow-200 text-center py-1 rounded text-[10px] hover:bg-yellow-800 font-bold"
                >
                  🛠️ Быстрое Изменение Параметров
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* CONTEXT MENU FOR COUNTER (RIGHT CLICK) */}
      {counterContextMenu?.visible && (
        <div 
          className="absolute bg-[#2b1f16] border-2 border-[#8c7652] rounded-md shadow-2xl p-2.5 z-50 w-56 font-sans text-xs text-[#ebdcb9]"
          style={{
            left: `${counterContextMenu.x}px`,
            top: `${counterContextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const counter = counters.find(c => c.id === counterContextMenu.counterId);
            if (!counter) return <p className="text-xs text-stone-500">Фишка отсутствует</p>;
            return (
              <div>
                <div className="text-[10px] text-amber-400 font-bold border-b border-[#4e3823] pb-1 mb-1.5 uppercase tracking-wider flex justify-between items-center">
                  <span>Фишка: {counter.name.split(' ')[0]}</span>
                  <button onClick={closeAllMenus} className="text-stone-500 hover:text-stone-200 font-bold">✕</button>
                </div>
                
                <div className="space-y-1">
                  <button 
                    onClick={() => triggerFlipCounter(counter.id)}
                    className="w-full text-left py-1 px-2 rounded hover:bg-[#473324] flex items-center justify-between"
                  >
                    <span>🔄 Перевернуть (Сила)</span>
                    <span className="font-mono text-stone-400">{counter.strength === 2 ? 'II ➔ I' : 'I ➔ II'}</span>
                  </button>

                  <button 
                    onClick={() => triggerExhaustCounter(counter.id)}
                    className="w-full text-left py-1 px-2 rounded hover:bg-[#473324] flex items-center justify-between"
                  >
                    <span>⏳ Усталость / Готовность</span>
                    <span className="text-stone-400 text-[10px]">{counter.exhausted ? 'Снять' : 'Наложить'}</span>
                  </button>

                  <button 
                    onClick={() => triggerSendToReserve(counter.id)}
                    className="w-full text-left py-1 px-2 rounded hover:bg-[#473324] flex items-center text-amber-400 gap-1.5"
                  >
                    <span>📥 Отозвать в Резервы</span>
                  </button>

                  <hr className="border-[#4e3823] my-1.5" />

                  <button 
                    onClick={() => {
                      synth.playDice();
                      addLog(`🎲 Фишка "${counter.name}" совершает вылазку! Бросок атаки: ${Math.floor(Math.random()*6)+1} + Сила: ${counter.strength}`);
                      closeAllMenus();
                    }}
                    className="w-full text-left py-1 px-2 rounded bg-[#3f2a1b] text-yellow-400 hover:bg-[#543a26] flex items-center justify-between font-bold"
                  >
                    <span>🎲 Тест Сражения (Кость)</span>
                  </button>

                  <button 
                    onClick={() => triggerDeleteCounter(counter.id)}
                    className="w-full text-left py-1 px-2 rounded hover:bg-red-900/50 text-red-300 flex items-center justify-between"
                  >
                    <span>✕ Распустить / Удалить</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 6. DRAGGABLE FLOATING PLAYER AID WINDOW */}
      {showPlayerAid && (
        <div 
          className="absolute bg-[#faf5eb] border-2 border-[#6b4e30] rounded shadow-2xl w-[360px] z-40 pointer-events-auto font-sans"
          style={{
            left: `${playerAidPos.x}px`,
            top: `${playerAidPos.y}px`,
            boxShadow: '5px 15px 40px rgba(0,0,0,0.6), inset 0 0 30px rgba(139, 115, 80, 0.15)'
          }}
        >
          {/* Paperclip & Drag Bar */}
          <div 
            onMouseDown={handleAidMouseDown}
            className="bg-[#ebdcb9] border-b border-[#c5bba5] p-2 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            title="Зажмите мышь здесь, чтобы переместить Памятку"
          >
            <div className="flex items-center gap-1 text-[#2d1e12] font-serif font-bold text-xs">
              {/* Clip emoji represents the paperclip visual */}
              <span className="text-lg">📎</span>
              <span>ПАМЯТКА ИСТОРИЧЕСКОГО СТРАТЕГА</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-stone-500 font-mono font-bold border border-stone-400/40 px-1 rounded">DRAG МЕНЮ</span>
              <button 
                onClick={() => setShowPlayerAid(false)}
                className="text-stone-600 hover:text-stone-900 font-bold text-sm p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Rules text in Russian */}
          <div className="p-3.5 text-[#2d1e12] text-xs max-h-96 overflow-y-auto space-y-2.5 leading-snug custom-scroll">
            <div className="border-b border-[#c5bba5] pb-1">
              <h4 className="font-bold font-serif text-[13px] text-amber-900">🏛️ Суть Карточного Варгейма</h4>
              <p className="text-[11px] text-stone-700 mt-0.5">
                Игра повествует об эпическом столкновении Древнего Рима, Карфагена Ганнибала, отважных Самнитов, Лигурийских Галлов и Сиракузских Греков.
              </p>
            </div>

            <div className="space-y-1 text-[11px]">
              <p><strong>1. Фазы Хода:</strong> Игроки поочередно разыгрывают Свитки Стратегии (Карты внизу). Каждая дает Очки Операций (OP) либо указанное Событие.</p>
              <p><strong>2. Перемещение отрядов:</strong> Перетащите фишку на соседний соединенный узел. В режиме Игры отряд помечается символом Усталости (⏳) и не может двигаться дважды за раунд.</p>
              <p><strong>3. Сражения и Снаппинг:</strong> При перемещении легиона в точку с вражескими войсками кликните правой кнопкой мыши по фишке и выберите <strong>«Тест Сражения»</strong>.</p>
              <p><strong>4. Контроль (Флаги):</strong> Удерживайте важные полисы со звездной ценой (Рим: 3, Карфаген: 3, Капуя: 2, Сиракузы: 2). Изменяйте маркер владения через правый клик по городу.</p>
            </div>

            <div className="bg-[#eddcb9]/50 p-2 rounded border border-[#8c7652]/30 text-[10px]">
              <span className="font-bold block text-[#6b4e30] text-[11px]">⚙️ Режим Дизайнера (Редактора)</span>
              Включите его в верхней панели, чтобы свободно расставлять фишки любой фракции, менять характеристики, удалять легионы, накладывать статус осады или переименовывать ключевые города.
            </div>

            <div className="text-[10px] text-stone-500 text-center italic pt-1.5 border-t border-[#c5bba5]">
              Разработано для симуляции настольных маневров. Звуковые эффекты генерируются вашим браузером тактильно.
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DIALOG FOR SPACE EDITING (DESIGNER MODE ONLY) */}
      {isEditingSpace && (() => {
        const spaceToEdit = spaces.find(s => s.id === isEditingSpace);
        if (!spaceToEdit) return null;

        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-[#231b14] border-2 border-[#c5a880] p-5 rounded-lg max-w-md w-full shadow-2xl text-[#ebdcb9]">
              <h3 className="text-lg font-bold text-amber-400 font-serif-ancient border-b border-amber-900/60 pb-2 mb-3 flex items-center gap-2">
                <Hammer className="w-5 h-5" />
                <span>Редактирование Узла [ {spaceToEdit.name} ]</span>
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Название города (на русском):</label>
                  <input 
                    type="text" 
                    value={editSpaceName} 
                    onChange={(e) => setEditSpaceName(e.target.value)}
                    className="w-full bg-[#16100a] border border-[#8c7652] rounded px-2.5 py-1.5 text-sm text-[#f4ecd8] focus:ring-1 focus:ring-yellow-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Ценность в VP (1-5):</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="5" 
                      value={editSpacePoints} 
                      onChange={(e) => setEditSpacePoints(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#16100a] border border-[#8c7652] rounded px-2.5 py-1 text-sm text-[#f4ecd8] text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Текущий контроль:</label>
                    <select 
                      value={editSpaceControl} 
                      onChange={(e) => setEditSpaceControl(e.target.value)}
                      className="w-full bg-[#16100a] border border-[#8c7652] rounded px-2 py-1 text-sm text-[#f4ecd8]"
                    >
                      <option value="rome">Римская Республика</option>
                      <option value="carthage">Великий Карфаген</option>
                      <option value="greek">Магна Греция</option>
                      <option value="gaul">Галльские Племена</option>
                      <option value="samnite">Самниты / Этруски</option>
                      <option value="neutral">Нейтральное поселение</option>
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-stone-400 italic">
                  Примечание: Географические координаты (x:{spaceToEdit.x}, y:{spaceToEdit.y}) зафиксированы согласно исторической карте древней Италии.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setIsEditingSpace(null)}
                    className="px-4 py-2 rounded bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-bold"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={saveSpaceEdits}
                    className="px-4 py-2 rounded bg-amber-800 hover:bg-amber-700 text-amber-100 text-xs font-bold border border-[#b89b6c]"
                  >
                    Сохранить изменения
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 8. FULL RULEBOOK MODAL DIALOG */}
      {showRules && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-[#ebdcb9] border-4 double border-[#6b4e30] p-6 rounded-md max-w-2xl w-full shadow-2xl text-[#2d1e12] max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start border-b border-[#c5bba5] pb-2.5 mb-4">
                <div>
                  <h3 className="text-xl font-bold font-serif-ancient text-amber-900 tracking-wide uppercase">
                    📜 КОНДУКТОР СЕНАТА: СВОД ИСТОРИЧЕСКИХ ПРАВИЛ
                  </h3>
                  <p className="text-xs italic text-[#5c4831] mt-0.5">Официальный регламент симулятора «ИМПЕРИУМ»</p>
                </div>
                <button 
                  onClick={() => {
                    synth.playClick();
                    setShowRules(false);
                  }} 
                  className="text-[#6b4e30] hover:text-black font-bold text-lg p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs leading-relaxed overflow-y-auto max-h-[60vh] pr-2 custom-scroll">
                <div>
                  <h4 className="font-bold font-serif text-[#6b4e30] text-[13px] border-b border-[#c5bba5]/50 pb-0.5">
                    1. Развертывание и Подготовка к Походу
                  </h4>
                  <p className="text-stone-700 mt-1">
                    Варгейм разыгрывается на точечной карте древней Италии. Красные кольца и круги представляют собой сферу влияния Римской Республики, серые и синие — Карфаген и Великие Сиракузы. Оранжевые точки в Апеннинских хребтах олицетворяют гордые племена Самнитов и Этрусков, готовых в любой момент поднять знамя бунта.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold font-serif text-[#6b4e30] text-[13px] border-b border-[#c5bba5]/50 pb-0.5">
                    2. Карточно-Движимая Система (Card-Driven System)
                  </h4>
                  <p className="text-stone-700 mt-1">
                    Вместо хаотичных ходов каждый раунд вы разыгрываете одну из 8 стратегических карт, находящихся внизу экрана. 
                    Каждая карта дает вам определенное количество очков действий (Operations Points - OP) либо уникальное событие, меняющее контроль на поле боя, или призывающее дополнительные когорты легионеров в Италии или Карфагене.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold font-serif text-[#6b4e30] text-[13px] border-b border-[#c5bba5]/50 pb-0.5">
                    3. Маневры и Правило Истощения от усталости (Exhaustion)
                  </h4>
                  <p className="text-stone-700 mt-1">
                    Вы можете свободно перетаскивать фишки воинств из одной локации в другую по проложенным пунктирным линиям.
                    Сухопутные дороги обозначены коричневым пунктиром, морские — сине-голубым. В игровом режиме любое перемещение утомляет отряд.
                    Для снятия жетона утомления используйте контекстное меню правой кнопки мыши или специальные карты.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold font-serif text-[#6b4e30] text-[13px] border-b border-[#c5bba5]/50 pb-0.5">
                    4. Тестирование Битв и Влияния (Броски Dice)
                  </h4>
                  <p className="text-stone-700 mt-1">
                    Когда воинство заходит в город, контролируемый врагом, или вступает в бой, бросьте кость судьбы при помощи верхней желтой кнопки. Сила лидера или легиона суммируется с выпавшим значением для определения триумфатора.
                  </p>
                </div>

                <div className="bg-[#f5ecd3] p-3 rounded border border-[#c5a880] text-[11px]">
                  <span className="font-bold text-amber-950 block">🛠️ Функции Интерактивного Стола (Sandbox):</span>
                  Этот веб-прототип разработан в лучших традициях симулятора VASSAL и Tabletop Simulator. Вы можете изменять статус контроля над городами, расставлять отряды, добавлять осадные щиты вокруг городов, просто кликая по элементам правой кнопкой мыши!
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#c5bba5] flex justify-end">
              <button 
                onClick={() => {
                  synth.playClick();
                  setShowRules(false);
                }}
                className="bg-amber-950 hover:bg-amber-900 text-amber-100 px-6 py-2 rounded text-xs font-bold shadow-md"
              >
                Ознакомлен и Готов к Бою
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
