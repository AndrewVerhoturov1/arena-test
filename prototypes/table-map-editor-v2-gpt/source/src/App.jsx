import React, { useEffect, useMemo, useRef, useState } from 'react';

const BACKGROUNDS = [
  {
    id: 'felt-green',
    name: 'Сукно зелёное',
    short: 'Сукно',
    color: '#081b16',
    image:
      'radial-gradient(circle at 20% 20%, rgba(255,255,255,.075), transparent 28%), radial-gradient(circle at 80% 10%, rgba(255,255,255,.045), transparent 30%), repeating-linear-gradient(45deg, rgba(255,255,255,.025) 0 2px, transparent 2px 7px), linear-gradient(135deg, #164737, #061713)',
    size: 'auto, auto, 18px 18px, auto',
  },
  {
    id: 'felt-burgundy',
    name: 'Сукно бордовое',
    short: 'Бордо',
    color: '#240a12',
    image:
      'radial-gradient(circle at 30% 15%, rgba(255,255,255,.06), transparent 30%), repeating-linear-gradient(45deg, rgba(255,255,255,.025) 0 2px, transparent 2px 8px), linear-gradient(135deg, #4b1024, #1a0710)',
    size: 'auto, 18px 18px, auto',
  },
  {
    id: 'dark-neutral',
    name: 'Тёмный нейтральный',
    short: 'Тёмный',
    color: '#0d1016',
    image:
      'radial-gradient(circle at 22% 14%, rgba(255,255,255,.055), transparent 28%), radial-gradient(circle at 80% 80%, rgba(96,165,250,.08), transparent 32%), linear-gradient(180deg, #151a22, #090c11)',
    size: 'auto, auto, auto',
  },
  {
    id: 'sea',
    name: 'Море',
    short: 'Море',
    color: '#07141f',
    image:
      'radial-gradient(circle at 28% 20%, rgba(125,211,252,.18), transparent 28%), repeating-linear-gradient(170deg, rgba(147,197,253,.12) 0 2px, transparent 2px 18px), linear-gradient(180deg, #0f3f5f, #07111f 78%)',
    size: 'auto, 120px 120px, auto',
  },
  {
    id: 'oak',
    name: 'Дерево светлое',
    short: 'Дерево',
    color: '#2b1b10',
    image:
      'repeating-linear-gradient(90deg, rgba(255,255,255,.045) 0 2px, transparent 2px 32px), repeating-linear-gradient(0deg, rgba(0,0,0,.10) 0 1px, transparent 1px 72px), linear-gradient(90deg, #5a351c, #2c180d 55%, #6a3d1f)',
    size: '96px 96px, 100% 72px, auto',
  },
  {
    id: 'walnut',
    name: 'Дерево тёмное',
    short: 'Орех',
    color: '#160e0a',
    image:
      'repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 26px), radial-gradient(circle at 10% 40%, rgba(255,255,255,.04), transparent 24%), linear-gradient(90deg, #2d1a12, #120a07 55%, #3a2115)',
    size: '80px 80px, auto, auto',
  },
  {
    id: 'stone',
    name: 'Камень / сланец',
    short: 'Камень',
    color: '#111827',
    image:
      'linear-gradient(135deg, rgba(255,255,255,.04) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,.035) 25%, transparent 25%), linear-gradient(180deg, #1d2532, #0e121a)',
    size: '46px 46px, 46px 46px, auto',
  },
  {
    id: 'parchment',
    name: 'Пергамент',
    short: 'Пергамент',
    color: '#2a2114',
    image:
      'radial-gradient(circle at 24% 26%, rgba(255,255,255,.18), transparent 24%), radial-gradient(circle at 78% 72%, rgba(120,72,28,.22), transparent 30%), linear-gradient(135deg, #9b7a47, #4b341b)',
    size: 'auto, auto, auto',
  },
  {
    id: 'sand',
    name: 'Песок',
    short: 'Песок',
    color: '#332615',
    image:
      'radial-gradient(circle at 20% 20%, rgba(255,255,255,.12), transparent 18%), radial-gradient(circle at 70% 45%, rgba(0,0,0,.12), transparent 22%), repeating-linear-gradient(18deg, rgba(255,255,255,.04) 0 1px, transparent 1px 11px), linear-gradient(135deg, #92723e, #3c2b18)',
    size: 'auto, auto, 28px 28px, auto',
  },
  {
    id: 'tactical',
    name: 'Тактическая сетка',
    short: 'Тактика',
    color: '#07111c',
    image:
      'linear-gradient(rgba(59,130,246,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,.14) 1px, transparent 1px), radial-gradient(circle at 50% 30%, rgba(59,130,246,.10), transparent 35%), linear-gradient(180deg, #0c1828, #050913)',
    size: '56px 56px, 56px 56px, auto, auto',
  },
];

const MAX_ASSET_SIZE = Number.POSITIVE_INFINITY;
const HISTORY_LIMIT = 10;

const DEFAULT_SHADOW = {
  shadowEnabled: true,
  shadowX: 0,
  shadowY: 24,
  shadowBlur: 46,
  shadowSpread: 0,
  shadowOpacity: 36,
};

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function buildShadow(asset, insetShadow = '') {
  const shadows = [];

  if (asset?.shadowEnabled) {
    const x = Number(asset.shadowX ?? DEFAULT_SHADOW.shadowX);
    const y = Number(asset.shadowY ?? DEFAULT_SHADOW.shadowY);
    const blur = clamp(asset.shadowBlur ?? DEFAULT_SHADOW.shadowBlur, 0, 500);
    const spread = clamp(asset.shadowSpread ?? DEFAULT_SHADOW.shadowSpread, -300, 500);
    const opacity = clamp(asset.shadowOpacity ?? DEFAULT_SHADOW.shadowOpacity, 0, 100) / 100;
    shadows.push(`${x}px ${y}px ${blur}px ${spread}px rgba(0,0,0,${opacity})`);
  }

  if (insetShadow) shadows.push(insetShadow);
  return shadows.length ? shadows.join(', ') : 'none';
}

function angleBetween(cx, cy, x, y) {
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
}

function round(value, precision = 2) {
  const p = 10 ** precision;
  return Math.round(value * p) / p;
}

function normalizeLayerOrder(visualTopFirst) {
  return visualTopFirst.map((asset, index) => ({
    ...asset,
    zIndex: visualTopFirst.length - index,
  }));
}

function createTestAsset(index) {
  return {
    id: `map-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: 'test',
    name: `Тестовая карта ${index}`,
    src: null,
    x: 150 + index * 26,
    y: 105 + index * 22,
    width: 520,
    height: 330,
    rotation: index % 2 === 0 ? 3 : -4,
    opacity: 94,
    locked: false,
    visible: true,
    zIndex: index,
    ...DEFAULT_SHADOW,
  };
}

const initialAssets = [
  {
    id: 'map-initial',
    kind: 'test',
    name: 'Тестовая карта 1',
    src: null,
    x: 180,
    y: 118,
    width: 520,
    height: 330,
    rotation: -4,
    opacity: 94,
    locked: false,
    visible: true,
    zIndex: 1,
    ...DEFAULT_SHADOW,
  },
];

export default function App() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [selectedId, setSelectedId] = useState('map-initial');
  const [tool, setTool] = useState('Выбрать');
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(false);
  const [bgId, setBgId] = useState('felt-green');
  const [message, setMessage] = useState('Готово');
  const [spacePressed, setSpacePressed] = useState(false);
  const [dragLayerId, setDragLayerId] = useState(null);
  const [view, setView] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [assets, setAssets] = useState(initialAssets);
  const [history, setHistory] = useState({ past: [], future: [] });

  const tableAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedAssetRef = useRef(null);
  const dragRef = useRef(null);
  const continuousChangeRef = useRef(null);
  const stateRef = useRef({ assets, selectedId, bgId, grid, snap });

  const selectedAsset = assets.find((asset) => asset.id === selectedId) ?? null;
  const visibleAssets = [...assets].filter((asset) => asset.visible).sort((a, b) => a.zIndex - b.zIndex);
  const visualLayers = [...assets].sort((a, b) => b.zIndex - a.zIndex);
  const currentBackground = BACKGROUNDS.find((bg) => bg.id === bgId) ?? BACKGROUNDS[0];

  useEffect(() => {
    stateRef.current = { assets, selectedId, bgId, grid, snap };
  }, [assets, selectedId, bgId, grid, snap]);

  const tableBackgroundStyle = useMemo(() => {
    if (!grid) {
      return {
        backgroundColor: currentBackground.color,
        backgroundImage: currentBackground.image,
        backgroundSize: currentBackground.size,
      };
    }

    return {
      backgroundColor: currentBackground.color,
      backgroundImage: `linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px), ${currentBackground.image}`,
      backgroundSize: `28px 28px, 28px 28px, ${currentBackground.size}`,
    };
  }, [currentBackground, grid]);

  function makeSnapshot() {
    const state = stateRef.current;
    return {
      assets: state.assets.map((asset) => ({ ...asset })),
      selectedId: state.selectedId,
      bgId: state.bgId,
      grid: state.grid,
      snap: state.snap,
    };
  }

  function restoreSnapshot(snapshot) {
    setAssets(snapshot.assets.map((asset) => ({ ...asset })));
    setSelectedId(snapshot.selectedId);
    setBgId(snapshot.bgId);
    setGrid(snapshot.grid);
    setSnap(snapshot.snap);
  }

  function pushHistory(snapshot = makeSnapshot()) {
    setHistory((prev) => ({
      past: [...prev.past, snapshot].slice(-HISTORY_LIMIT),
      future: [],
    }));
  }

  function undoAction() {
    setHistory((prev) => {
      if (!prev.past.length) return prev;
      const previous = prev.past[prev.past.length - 1];
      const current = makeSnapshot();
      restoreSnapshot(previous);
      setMessage('Действие отменено');
      return {
        past: prev.past.slice(0, -1),
        future: [current, ...prev.future].slice(0, HISTORY_LIMIT),
      };
    });
  }

  function redoAction() {
    setHistory((prev) => {
      if (!prev.future.length) return prev;
      const next = prev.future[0];
      const current = makeSnapshot();
      restoreSnapshot(next);
      setMessage('Действие повторено');
      return {
        past: [...prev.past, current].slice(-HISTORY_LIMIT),
        future: prev.future.slice(1),
      };
    });
  }

  function beginContinuousChange(key) {
    if (continuousChangeRef.current === key) return;
    continuousChangeRef.current = key;
    pushHistory();
  }

  function endContinuousChange(key) {
    if (continuousChangeRef.current === key) continuousChangeRef.current = null;
  }

  function rangeHistoryHandlers(key) {
    return {
      onPointerDown: () => beginContinuousChange(key),
      onPointerUp: () => endContinuousChange(key),
      onPointerCancel: () => endContinuousChange(key),
      onBlur: () => endContinuousChange(key),
      onKeyDown: (e) => {
        e.stopPropagation();
        beginContinuousChange(key);
      },
      onKeyUp: (e) => {
        e.stopPropagation();
        endContinuousChange(key);
      },
    };
  }

  function patchAsset(id, patch, options = { record: true }) {
    if (options.record) pushHistory();
    setAssets((prev) => prev.map((asset) => (asset.id === id ? { ...asset, ...patch } : asset)));
  }

  function addAsset(asset) {
    pushHistory();
    setAssets((prev) => [...prev, asset]);
    setSelectedId(asset.id);
  }

  function addTestMap() {
    const nextAsset = createTestAsset(assets.length + 1);
    addAsset(nextAsset);
    setMessage('Тестовая карта добавлена');
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Ошибка: выберите файл изображения.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setMessage('Ошибка загрузки файла.');
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const nativeWidth = img.naturalWidth || img.width;
        const nativeHeight = img.naturalHeight || img.height;
        const width = Math.max(1, nativeWidth);
        const height = Math.max(1, nativeHeight);
        const index = assets.length + 1;
        const nextAsset = {
          id: `image-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          kind: 'image',
          name: file.name.replace(/\.[^.]+$/, '') || `Карта ${index}`,
          src,
          x: 160 + index * 20,
          y: 120 + index * 18,
          width,
          height,
          rotation: 0,
          opacity: 100,
          locked: false,
          visible: true,
          zIndex: index,
          ...DEFAULT_SHADOW,
        };
        addAsset(nextAsset);
        setMessage(`Карта «${nextAsset.name}» загружена в родном размере ${width}×${height}px`);
      };
      img.onerror = () => setMessage('Ошибка: изображение не удалось прочитать.');
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function duplicateSelected() {
    if (!selectedAsset) return;
    const copy = {
      ...selectedAsset,
      id: `copy-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: `${selectedAsset.name} копия`,
      x: selectedAsset.x + 28,
      y: selectedAsset.y + 24,
      zIndex: Math.max(0, ...assets.map((asset) => asset.zIndex)) + 1,
      locked: false,
      visible: true,
    };
    addAsset(copy);
    setMessage('Карта дублирована');
  }

  function deleteSelected() {
    if (!selectedAsset) return;
    pushHistory();
    const nextVisual = normalizeLayerOrder(visualLayers.filter((asset) => asset.id !== selectedAsset.id));
    setAssets(nextVisual);
    setSelectedId(nextVisual[0]?.id ?? null);
    setMessage('Карта удалена');
  }

  function reorderLayer(id, direction) {
    pushHistory();
    setAssets((prev) => {
      const visual = [...prev].sort((a, b) => b.zIndex - a.zIndex);
      const index = visual.findIndex((asset) => asset.id === id);
      if (index === -1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= visual.length) return prev;

      [visual[index], visual[targetIndex]] = [visual[targetIndex], visual[index]];
      return normalizeLayerOrder(visual);
    });
    setSelectedId(id);
    setMessage(direction === 'up' ? 'Слой поднят выше' : 'Слой опущен ниже');
  }

  function reorderLayerByDrop(dragId, targetId) {
    if (!dragId || !targetId || dragId === targetId) return;

    pushHistory();
    setAssets((prev) => {
      const visual = [...prev].sort((a, b) => b.zIndex - a.zIndex);
      const fromIndex = visual.findIndex((asset) => asset.id === dragId);
      const toIndex = visual.findIndex((asset) => asset.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const [dragged] = visual.splice(fromIndex, 1);
      visual.splice(toIndex, 0, dragged);
      return normalizeLayerOrder(visual);
    });

    setSelectedId(dragId);
    setMessage('Порядок слоёв изменён');
  }

  function startMove(e, asset) {
    if (asset.locked || !asset.visible) return;
    e.stopPropagation();
    setSelectedId(asset.id);
    setTool('Переместить');
    pushHistory();
    dragRef.current = {
      type: 'move',
      id: asset.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: asset.x,
      originY: asset.y,
    };
  }

  function startResize(e, handle) {
    if (!selectedAsset || selectedAsset.locked || !selectedAsset.visible) return;
    e.stopPropagation();
    setTool('Масштаб');
    pushHistory();
    dragRef.current = {
      type: 'resize',
      id: selectedAsset.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      originX: selectedAsset.x,
      originY: selectedAsset.y,
      originWidth: selectedAsset.width,
      originHeight: selectedAsset.height,
      ratio: selectedAsset.width / selectedAsset.height,
    };
  }

  function startRotate(e) {
    if (!selectedAsset || selectedAsset.locked || !selectedAsset.visible || !selectedAssetRef.current) return;
    e.stopPropagation();
    const rect = selectedAssetRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setTool('Повернуть');
    pushHistory();
    dragRef.current = {
      type: 'rotate',
      id: selectedAsset.id,
      centerX,
      centerY,
      startAngle: angleBetween(centerX, centerY, e.clientX, e.clientY),
      originRotation: selectedAsset.rotation,
    };
  }

  function startPan(e) {
    const shouldPan = e.button === 1 || spacePressed;
    if (!shouldPan) return;
    e.preventDefault();
    dragRef.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      originPanX: view.panX,
      originPanY: view.panY,
    };
  }

  function handleWheel(e) {
    e.preventDefault();
    const rect = tableAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const oldZoom = view.zoom;
    const direction = e.deltaY > 0 ? -1 : 1;
    const nextZoom = clamp(round(oldZoom * (1 + direction * 0.08), 3), 0.25, 3.5);

    const viewportCenterX = rect.left + rect.width / 2 + view.panX;
    const viewportCenterY = rect.top + rect.height / 2 + view.panY;
    const localX = (e.clientX - viewportCenterX) / oldZoom;
    const localY = (e.clientY - viewportCenterY) / oldZoom;

    const nextPanX = e.clientX - rect.left - rect.width / 2 - localX * nextZoom;
    const nextPanY = e.clientY - rect.top - rect.height / 2 - localY * nextZoom;

    setView({ zoom: nextZoom, panX: nextPanX, panY: nextPanY });
  }

  function fitToScreen() {
    setView({ zoom: 0.9, panX: 0, panY: 0 });
    setMessage('Вид подогнан к экрану');
  }

  function resetView() {
    setView({ zoom: 1, panX: 0, panY: 0 });
    setMessage('Вид сброшен');
  }

  function exportProjectJson() {
    const project = {
      version: 'table-map-editor-0.2',
      table: { bgId, grid, snap, view },
      selectedId,
      assets,
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'table-map-editor-project.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('JSON-файл проекта сохранён');
  }

  function saveLocal() {
    const project = { version: 'table-map-editor-0.2', table: { bgId, grid, snap, view }, selectedId, assets };
    localStorage.setItem('table-map-editor-project', JSON.stringify(project));
    setMessage('Проект сохранён локально');
  }

  useEffect(() => {
    function onPointerMove(e) {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.type === 'move') {
        const dx = (e.clientX - drag.startX) / view.zoom;
        const dy = (e.clientY - drag.startY) / view.zoom;
        const step = snap ? 5 : 0.5;
        patchAsset(
          drag.id,
          {
            x: round(Math.round((drag.originX + dx) / step) * step, 2),
            y: round(Math.round((drag.originY + dy) / step) * step, 2),
          },
          { record: false },
        );
      }

      if (drag.type === 'pan') {
        setView((prev) => ({
          ...prev,
          panX: drag.originPanX + (e.clientX - drag.startX),
          panY: drag.originPanY + (e.clientY - drag.startY),
        }));
      }

      if (drag.type === 'resize') {
        const dx = (e.clientX - drag.startX) / view.zoom;
        const dy = (e.clientY - drag.startY) / view.zoom;

        let nextX = drag.originX;
        let nextY = drag.originY;
        let nextWidth = drag.originWidth;
        let nextHeight = drag.originHeight;

        if (drag.handle.includes('e')) nextWidth = drag.originWidth + dx;
        if (drag.handle.includes('w')) {
          nextWidth = drag.originWidth - dx;
          nextX = drag.originX + dx;
        }
        if (drag.handle.includes('s')) nextHeight = drag.originHeight + dy;
        if (drag.handle.includes('n')) {
          nextHeight = drag.originHeight - dy;
          nextY = drag.originY + dy;
        }

        if (e.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) nextHeight = nextWidth / drag.ratio;
          else nextWidth = nextHeight * drag.ratio;
        }

        nextWidth = clamp(nextWidth, 80, MAX_ASSET_SIZE);
        nextHeight = clamp(nextHeight, 60, MAX_ASSET_SIZE);

        if (snap) {
          nextX = Math.round(nextX / 5) * 5;
          nextY = Math.round(nextY / 5) * 5;
          nextWidth = Math.round(nextWidth / 5) * 5;
          nextHeight = Math.round(nextHeight / 5) * 5;
        }

        patchAsset(
          drag.id,
          {
            x: round(nextX, 2),
            y: round(nextY, 2),
            width: round(nextWidth, 2),
            height: round(nextHeight, 2),
          },
          { record: false },
        );
      }

      if (drag.type === 'rotate') {
        const angle = angleBetween(drag.centerX, drag.centerY, e.clientX, e.clientY);
        let nextRotation = drag.originRotation + (angle - drag.startAngle);
        if (e.shiftKey) nextRotation = Math.round(nextRotation / 15) * 15;
        patchAsset(drag.id, { rotation: round(nextRotation, 2) }, { record: false });
      }
    }

    function onPointerUp() {
      dragRef.current = null;
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [view.zoom, snap]);

  useEffect(() => {
    function onKeyDown(e) {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redoAction();
        else undoAction();
        return;
      }

      if (mod && key === 'y') {
        e.preventDefault();
        redoAction();
        return;
      }

      if (e.code === 'Space') setSpacePressed(true);
      if (e.key === 'Escape') setSelectedId(null);

      if (!selectedAsset || selectedAsset.locked) return;

      const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
      if (!isArrow) return;

      e.preventDefault();

      if (e.altKey) {
        const rotationStep = e.ctrlKey || e.metaKey ? 0.05 : e.shiftKey ? 1 : 0.25;
        if (e.key === 'ArrowLeft') patchAsset(selectedAsset.id, { rotation: round(selectedAsset.rotation - rotationStep, 2) });
        if (e.key === 'ArrowRight') patchAsset(selectedAsset.id, { rotation: round(selectedAsset.rotation + rotationStep, 2) });
        return;
      }

      const moveStep = e.ctrlKey || e.metaKey ? 0.1 : e.shiftKey ? 3 : 0.5;
      if (e.key === 'ArrowLeft') patchAsset(selectedAsset.id, { x: round(selectedAsset.x - moveStep, 2) });
      if (e.key === 'ArrowRight') patchAsset(selectedAsset.id, { x: round(selectedAsset.x + moveStep, 2) });
      if (e.key === 'ArrowUp') patchAsset(selectedAsset.id, { y: round(selectedAsset.y - moveStep, 2) });
      if (e.key === 'ArrowDown') patchAsset(selectedAsset.id, { y: round(selectedAsset.y + moveStep, 2) });
    }

    function onKeyUp(e) {
      if (e.code === 'Space') setSpacePressed(false);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedAsset, assets, bgId, grid, snap, history]);

  const topButtons = [
    ['Добавить', '⬆', openFilePicker],
    ['Тест', '▣', addTestMap],
    ['Выбрать', '↖', () => setTool('Выбрать')],
    ['Двигать', '✥', () => setTool('Переместить')],
    ['Повернуть', '↻', () => setTool('Повернуть')],
  ];

  return (
    <div className="editor-root">
      <input ref={fileInputRef} className="hidden-file-input" type="file" accept="image/*" onChange={handleFileChange} />

      <div className="topbar">
        <button className="icon-btn" onClick={() => setLeftOpen(!leftOpen)} title="Панель слоёв">
          {leftOpen ? '×' : '☰'}
        </button>

        <div className="toolbar-group">
          {topButtons.map(([label, icon, action]) => (
            <button
              key={label}
              onClick={action}
              title={String(label)}
              className={`toolbar-btn ${tool === label || (label === 'Двигать' && tool === 'Переместить') ? 'toolbar-btn-active' : ''}`}
            >
              <span className="icon-text">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        <button className="icon-btn" disabled={!history.past.length} onClick={undoAction} title="Отменить действие">
          ↶
        </button>
        <button className="icon-btn" disabled={!history.future.length} onClick={redoAction} title="Повторить действие">
          ↷
        </button>

        <div className="toolbar-divider" />

        <button className="toolbar-btn" disabled={!selectedAsset} onClick={() => selectedAsset && patchAsset(selectedAsset.id, { locked: !selectedAsset.locked })}>
          <span className="icon-text">{selectedAsset?.locked ? '🔓' : '🔒'}</span>
          <span>{selectedAsset?.locked ? 'Открепить' : 'Закрепить'}</span>
        </button>
        <button className="toolbar-btn" onClick={fitToScreen}>Подогнать</button>
        <button className="toolbar-btn" onClick={resetView}>Сбросить вид</button>

        <div className="toolbar-spacer" />

        <button className="toolbar-btn" onClick={exportProjectJson}>
          <span className="icon-text">💾</span>
          <span>JSON</span>
        </button>
        <button className="toolbar-btn" onClick={saveLocal}>Локально</button>
        <button className="icon-btn" onClick={() => setRightOpen(!rightOpen)} title="Панель свойств">
          {rightOpen ? '×' : '☰'}
        </button>
      </div>

      <div className="layout">
        {leftOpen && (
          <aside className="sidebar leftbar">
            <PanelTitle title="Слои" subtitle="Перетащите слой вверх или вниз" />

            <div className="layers-list">
              {visualLayers.map((asset) => (
                <div
                  key={asset.id}
                  className={`layer-item ${selectedId === asset.id ? 'layer-active' : ''} ${dragLayerId === asset.id ? 'layer-dragging' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    setDragLayerId(asset.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', asset.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain') || dragLayerId;
                    reorderLayerByDrop(id, asset.id);
                    setDragLayerId(null);
                  }}
                  onDragEnd={() => setDragLayerId(null)}
                  onClick={() => setSelectedId(asset.id)}
                  title="Перетащите слой, чтобы изменить порядок наложения"
                >
                  <span className="drag-handle">⋮⋮</span>
                  <button
                    className="mini-btn"
                    draggable={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      patchAsset(asset.id, { visible: !asset.visible });
                    }}
                    title={asset.visible ? 'Скрыть' : 'Показать'}
                  >
                    {asset.visible ? '👁' : '—'}
                  </button>
                  <button
                    className="mini-btn"
                    draggable={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      patchAsset(asset.id, { locked: !asset.locked });
                    }}
                    title={asset.locked ? 'Открепить' : 'Закрепить'}
                  >
                    {asset.locked ? '🔒' : '🔓'}
                  </button>
                  <div className="layer-text">
                    <div className="layer-name">{asset.name}</div>
                    <div className="layer-meta">#{asset.zIndex} · {asset.kind === 'image' ? 'изображение' : 'тест'}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="table-settings-compact">
              <div className="settings-title">Стол</div>
              <select
                className="input compact"
                value={bgId}
                onChange={(e) => {
                  pushHistory();
                  setBgId(e.target.value);
                  setMessage('Фон стола изменён');
                }}
              >
                {BACKGROUNDS.map((bg) => (
                  <option key={bg.id} value={bg.id}>{bg.name}</option>
                ))}
              </select>
              <div className="settings-row">
                <label><input type="checkbox" checked={grid} onChange={(e) => { pushHistory(); setGrid(e.target.checked); }} /> Сетка</label>
                <label><input type="checkbox" checked={snap} onChange={(e) => { pushHistory(); setSnap(e.target.checked); }} /> Привязка</label>
              </div>
            </div>
          </aside>
        )}

        <main
          ref={tableAreaRef}
          className={`table-area ${spacePressed ? 'is-panning' : ''}`}
          onWheel={handleWheel}
          onPointerDown={startPan}
        >
          <div className="table-surface" style={tableBackgroundStyle} onClick={() => setSelectedId(null)}>
            <div className="hud hud-left">
              <div>Инструмент: <b>{tool}</b></div>
              <div>Масштаб: <b>{Math.round(view.zoom * 100)}%</b> · Карт: <b>{assets.length}</b></div>
            </div>

            <div className="hud hud-right">{message}</div>

            <div
              className="viewport"
              style={{ transform: `translate(calc(-50% + ${view.panX}px), calc(-50% + ${view.panY}px)) scale(${view.zoom})` }}
              onClick={(e) => e.stopPropagation()}
            >
              {visibleAssets.map((asset) => {
                const isSelected = selectedId === asset.id;
                return (
                  <div
                    key={asset.id}
                    ref={isSelected ? selectedAssetRef : null}
                    className="map-object"
                    style={{
                      left: asset.x,
                      top: asset.y,
                      width: asset.width,
                      height: asset.height,
                      transform: `rotate(${asset.rotation}deg)`,
                      opacity: asset.opacity / 100,
                      zIndex: asset.zIndex,
                      cursor: asset.locked ? 'default' : 'move',
                    }}
                    onPointerDown={(e) => startMove(e, asset)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(asset.id);
                    }}
                  >
                    {asset.kind === 'image' ? <ImageMapCard asset={asset} /> : <TestMapCard asset={asset} />}

                    {isSelected && (
                      <div className="selection-box" onPointerDown={(e) => e.stopPropagation()}>
                        {!asset.locked && (
                          <>
                            <button className="handle handle-nw" onPointerDown={(e) => startResize(e, 'nw')} title="Масштабировать" />
                            <button className="handle handle-ne" onPointerDown={(e) => startResize(e, 'ne')} title="Масштабировать" />
                            <button className="handle handle-sw" onPointerDown={(e) => startResize(e, 'sw')} title="Масштабировать" />
                            <button className="handle handle-se" onPointerDown={(e) => startResize(e, 'se')} title="Масштабировать" />
                            <div className="rotate-line" />
                            <button className="rotate-handle" onPointerDown={startRotate} title="Повернуть">↻</button>
                          </>
                        )}
                        {asset.locked && <div className="locked-badge">🔒 Закреплена</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {rightOpen && (
          <aside className="sidebar rightbar">
            <PanelTitle title="Свойства" subtitle={selectedAsset ? selectedAsset.name : 'Объект не выбран'} />

            {!selectedAsset ? (
              <div className="empty-state">Объект не выбран.</div>
            ) : (
              <div className="inspector compact-inspector">
                <Section title="Объект">
                  <Field label="Название">
                    <input className="input" value={selectedAsset.name} onChange={(e) => patchAsset(selectedAsset.id, { name: e.target.value })} />
                  </Field>
                  <div className="inline-actions">
                    <TogglePill active={selectedAsset.visible} onClick={() => patchAsset(selectedAsset.id, { visible: !selectedAsset.visible })} label={selectedAsset.visible ? 'Видима' : 'Скрыта'} />
                    <TogglePill active={selectedAsset.locked} onClick={() => patchAsset(selectedAsset.id, { locked: !selectedAsset.locked })} label={selectedAsset.locked ? 'Закреплена' : 'Свободна'} />
                  </div>
                </Section>

                <Section title="Геометрия">
                  <div className="grid-2 compact-grid">
                    <NumberField label="X" value={selectedAsset.x} step="0.1" onChange={(v) => patchAsset(selectedAsset.id, { x: v })} />
                    <NumberField label="Y" value={selectedAsset.y} step="0.1" onChange={(v) => patchAsset(selectedAsset.id, { y: v })} />
                    <NumberField label="Ширина" value={selectedAsset.width} step="0.5" onChange={(v) => patchAsset(selectedAsset.id, { width: clamp(v, 80, MAX_ASSET_SIZE) })} />
                    <NumberField label="Высота" value={selectedAsset.height} step="0.5" onChange={(v) => patchAsset(selectedAsset.id, { height: clamp(v, 60, MAX_ASSET_SIZE) })} />
                    <NumberField label="Поворот" value={selectedAsset.rotation} step="0.1" onChange={(v) => patchAsset(selectedAsset.id, { rotation: clamp(v, -360, 360) })} />
                    <NumberField label="Слой" value={selectedAsset.zIndex} step="1" onChange={(v) => patchAsset(selectedAsset.id, { zIndex: clamp(v, 1, assets.length) })} />
                  </div>
                  <Field label={`Прозрачность: ${selectedAsset.opacity}%`}>
                    <input
                      className="range"
                      type="range"
                      min="0"
                      max="100"
                      value={selectedAsset.opacity}
                      {...rangeHistoryHandlers(`${selectedAsset.id}:opacity`)}
                      onChange={(e) => patchAsset(selectedAsset.id, { opacity: Number(e.target.value) }, { record: false })}
                    />
                  </Field>
                </Section>

                <details className="details-card" open>
                  <summary>
                    <span>Тень</span>
                    <small>{(selectedAsset.shadowEnabled ?? DEFAULT_SHADOW.shadowEnabled) ? `${selectedAsset.shadowBlur ?? DEFAULT_SHADOW.shadowBlur}px · ${selectedAsset.shadowOpacity ?? DEFAULT_SHADOW.shadowOpacity}%` : 'выкл.'}</small>
                  </summary>
                  <div className="details-body">
                    <label className="switch-row inline-switch">
                      <span>Включить тень</span>
                      <input
                        type="checkbox"
                        checked={selectedAsset.shadowEnabled ?? DEFAULT_SHADOW.shadowEnabled}
                        onChange={(e) => patchAsset(selectedAsset.id, { shadowEnabled: e.target.checked })}
                      />
                    </label>

                    <div className="grid-2 compact-grid">
                      <NumberField label="X" value={selectedAsset.shadowX ?? DEFAULT_SHADOW.shadowX} step="1" onChange={(v) => patchAsset(selectedAsset.id, { shadowX: v })} />
                      <NumberField label="Y" value={selectedAsset.shadowY ?? DEFAULT_SHADOW.shadowY} step="1" onChange={(v) => patchAsset(selectedAsset.id, { shadowY: v })} />
                      <NumberField label="Размытие" value={selectedAsset.shadowBlur ?? DEFAULT_SHADOW.shadowBlur} step="1" onChange={(v) => patchAsset(selectedAsset.id, { shadowBlur: clamp(v, 0, 500) })} />
                      <NumberField label="Растяжение" value={selectedAsset.shadowSpread ?? DEFAULT_SHADOW.shadowSpread} step="1" onChange={(v) => patchAsset(selectedAsset.id, { shadowSpread: clamp(v, -300, 500) })} />
                    </div>

                    <Field label={`Непрозрачность: ${selectedAsset.shadowOpacity ?? DEFAULT_SHADOW.shadowOpacity}%`}>
                      <input
                        className="range"
                        type="range"
                        min="0"
                        max="100"
                        value={selectedAsset.shadowOpacity ?? DEFAULT_SHADOW.shadowOpacity}
                        {...rangeHistoryHandlers(`${selectedAsset.id}:shadowOpacity`)}
                        onChange={(e) => patchAsset(selectedAsset.id, { shadowOpacity: Number(e.target.value) }, { record: false })}
                      />
                    </Field>
                  </div>
                </details>

                <Section title="Действия">
                  <div className="grid-2 compact-grid">
                    <ActionButton label="Центрировать" onClick={() => patchAsset(selectedAsset.id, { x: 230, y: 160 })} />
                    <ActionButton label="Сбросить" onClick={() => patchAsset(selectedAsset.id, { rotation: 0 })} />
                    <ActionButton label="Дублировать" onClick={duplicateSelected} />
                    <ActionButton label="Удалить" danger onClick={deleteSelected} />
                    <button className="action-btn" disabled={selectedAsset.zIndex >= assets.length} onClick={() => reorderLayer(selectedAsset.id, 'up')}>Выше</button>
                    <button className="action-btn" disabled={selectedAsset.zIndex <= 1} onClick={() => reorderLayer(selectedAsset.id, 'down')}>Ниже</button>
                  </div>
                </Section>

                <details className="details-card help-card">
                  <summary><span>Справка</span><small>горячие клавиши</small></summary>
                  <div className="details-body tip-box">
                    «Добавить» загружает свою карту. «Тест» добавляет ещё одну тестовую карту.<br />
                    Колесо мыши — зум в точку курсора. Углы рамки — размер, верхняя ручка — поворот.<br />
                    В панели слоёв перетаскивайте строки, чтобы менять порядок наложения.<br />
                    Ctrl/⌘+Z — отменить, Ctrl/⌘+Y или Ctrl/⌘+Shift+Z — повторить. История хранит 10 шагов.<br />
                    Перетаскивание ползунка считается одним действием, а не каждым процентом.<br />
                    Стрелки — 0.5 px, Ctrl/⌘ + стрелки — 0.1 px, Alt + ←/→ — поворот по 0.25°.
                  </div>
                </details>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function TestMapCard({ asset }) {
  return (
    <div className="map-card" style={{ boxShadow: buildShadow(asset, 'inset 0 2px 0 rgba(255,255,255,.18)') }}>
      <div className="map-paper-noise" />
      <div className="map-frame" />
      <svg className="map-svg" viewBox="0 0 520 330" preserveAspectRatio="none">
        <path d="M58 56 C144 18 212 86 302 48 C382 15 434 56 476 106" fill="none" stroke="rgba(78,45,18,.55)" strokeWidth="4" />
        <path d="M44 225 C116 164 208 252 278 190 C358 116 414 204 486 154" fill="none" stroke="rgba(78,45,18,.42)" strokeWidth="4" />
        <circle cx="130" cy="120" r="18" fill="rgba(64,91,57,.45)" />
        <circle cx="320" cy="138" r="22" fill="rgba(64,91,57,.38)" />
        <circle cx="410" cy="245" r="18" fill="rgba(64,91,57,.43)" />
        <line x1="130" y1="120" x2="320" y2="138" stroke="rgba(53,39,25,.5)" strokeWidth="3" strokeDasharray="8 8" />
        <line x1="320" y1="138" x2="410" y2="245" stroke="rgba(53,39,25,.5)" strokeWidth="3" strokeDasharray="8 8" />
      </svg>
      <div className="map-title-box">
        <div className="map-title">Тестовая карта</div>
        <div className="map-subtitle">заглушка редактора стола</div>
      </div>
    </div>
  );
}

function ImageMapCard({ asset }) {
  return (
    <div className="map-card image-card" style={{ boxShadow: buildShadow(asset, 'inset 0 1px 0 rgba(255,255,255,.08)') }}>
      <img className="uploaded-map-image" src={asset.src} alt={asset.name} draggable={false} />
    </div>
  );
}

function PanelTitle({ title, subtitle }) {
  return (
    <div className="panel-title-wrap">
      <div className="panel-title">{title}</div>
      <div className="panel-subtitle">{subtitle}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="section-card">
      <div className="section-title">{title}</div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function NumberField({ label, value, onChange, step = '1' }) {
  return (
    <Field label={label}>
      <input className="input" type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}

function TogglePill({ active, label, onClick }) {
  return (
    <button onClick={onClick} className={`toggle-pill ${active ? 'active' : ''}`}>
      {label}
    </button>
  );
}

function ActionButton({ label, onClick, danger }) {
  return (
    <button onClick={onClick} className={`action-btn ${danger ? 'danger' : ''}`}>
      {label}
    </button>
  );
}
