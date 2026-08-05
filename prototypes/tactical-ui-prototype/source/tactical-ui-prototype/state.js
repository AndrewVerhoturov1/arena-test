(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TacticalState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_LAYERS = {
    danger: false,
    concealment: false,
    visibility: false,
    routeCost: false,
    cover: false,
    positions: false,
    noise: false,
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function createInitialState(units = []) {
    return {
      selectedUnitId: units[0]?.id ?? null,
      selectionMode: 'unit',
      unitOverrides: {},
      postureTransitions: {},
      route: null,
      routePlanning: false,
      layers: { ...DEFAULT_LAYERS },
      layerOpacity: 58,
      time: { seconds: 8 * 3600 + 17 * 60 + 24, speed: 1, paused: true },
      notifications: [
        { id: 1, level: 'info', title: 'Сценарий загружен', body: 'Отделение готово к управлению.' },
      ],
      nextNotificationId: 2,
      panels: {
        leftCollapsed: false,
        rightCollapsed: false,
        bottomCollapsed: false,
        rightTab: 'layers',
        detailsOpen: false,
        shortcutsOpen: false,
      },
      demoState: 'normal',
    };
  }

  function selectUnit(state, unitId) {
    return { ...state, selectedUnitId: unitId, selectionMode: 'unit' };
  }

  function selectGroup(state) {
    return { ...state, selectionMode: 'group' };
  }

  function addNotification(state, notification) {
    const item = {
      id: state.nextNotificationId,
      level: notification.level || 'info',
      title: notification.title || 'Событие',
      body: notification.body || '',
    };
    return {
      ...state,
      notifications: [...state.notifications.slice(-4), item],
      nextNotificationId: state.nextNotificationId + 1,
    };
  }

  function requestPosture(state, unit, posture) {
    if (!unit || (unit.unavailablePostures || []).includes(posture)) {
      return addNotification(state, {
        level: 'warning',
        title: 'Поза недоступна',
        body: 'Текущее состояние бойца не позволяет выполнить действие.',
      });
    }
    const current = state.unitOverrides[unit.id]?.posture || unit.posture;
    if (current === posture) return state;
    return {
      ...state,
      postureTransitions: {
        ...state.postureTransitions,
        [unit.id]: { requested: posture, status: 'transition', progress: 0 },
      },
    };
  }

  function completePosture(state, unitId) {
    const transition = state.postureTransitions[unitId];
    if (!transition) return state;
    return {
      ...state,
      unitOverrides: {
        ...state.unitOverrides,
        [unitId]: {
          ...(state.unitOverrides[unitId] || {}),
          posture: transition.requested,
        },
      },
      postureTransitions: {
        ...state.postureTransitions,
        [unitId]: { ...transition, status: 'idle', progress: 100 },
      },
    };
  }

  function setPostureProgress(state, unitId, progress) {
    const transition = state.postureTransitions[unitId];
    if (!transition) return state;
    return {
      ...state,
      postureTransitions: {
        ...state.postureTransitions,
        [unitId]: { ...transition, progress: Math.max(0, Math.min(100, progress)) },
      },
    };
  }

  function setMovement(state, unitId, movement) {
    return {
      ...state,
      unitOverrides: {
        ...state.unitOverrides,
        [unitId]: { ...(state.unitOverrides[unitId] || {}), movement },
      },
    };
  }

  function buildRoute(state, unitId, start, target) {
    const bend = {
      x: Math.max(3, Math.min(97, start.x + (target.x - start.x) * 0.48 + (target.y > start.y ? -7 : 7))),
      y: Math.max(3, Math.min(97, start.y + (target.y - start.y) * 0.54)),
    };
    return addNotification(
      {
        ...state,
        routePlanning: false,
        route: {
          unitId,
          status: 'draft',
          points: [clone(start), bend, clone(target)],
          segments: [
            { posture: 'standing', movement: 'normal' },
            { posture: 'crouched', movement: 'careful' },
          ],
        },
        panels: { ...state.panels, rightCollapsed: false, rightTab: 'orders' },
      },
      { level: 'info', title: 'Маршрут построен', body: 'Проверьте параметры участков и подтвердите приказ.' },
    );
  }

  function updateRouteSegment(state, index, patch) {
    if (!state.route || !state.route.segments[index]) return state;
    return {
      ...state,
      route: {
        ...state.route,
        segments: state.route.segments.map((segment, i) => (i === index ? { ...segment, ...patch } : segment)),
      },
    };
  }

  function confirmRoute(state) {
    if (!state.route) return state;
    return addNotification(
      { ...state, route: { ...state.route, status: 'confirmed' } },
      { level: 'success', title: 'Приказ принят', body: 'Боец приступит к движению после снятия паузы.' },
    );
  }

  function cancelRoute(state) {
    if (!state.route) return state;
    return addNotification(
      { ...state, route: null, routePlanning: false },
      { level: 'info', title: 'Маршрут отменён', body: 'Боец сохраняет текущую позицию.' },
    );
  }

  function setRoutePlanning(state, enabled) {
    return { ...state, routePlanning: Boolean(enabled) };
  }

  function toggleLayer(state, layerId) {
    if (!(layerId in state.layers)) return state;
    return { ...state, layers: { ...state.layers, [layerId]: !state.layers[layerId] } };
  }

  function clearLayers(state) {
    return { ...state, layers: { ...DEFAULT_LAYERS } };
  }

  function setLayerOpacity(state, value) {
    return { ...state, layerOpacity: Math.max(0, Math.min(100, Number(value) || 0)) };
  }

  function setTimeSpeed(state, speed) {
    return { ...state, time: { ...state.time, speed, paused: false } };
  }

  function togglePause(state) {
    return { ...state, time: { ...state.time, paused: !state.time.paused } };
  }

  function advanceTime(state, realSeconds) {
    if (state.time.paused) return state;
    return {
      ...state,
      time: { ...state.time, seconds: state.time.seconds + realSeconds * state.time.speed },
    };
  }

  function togglePanel(state, panel) {
    const key = `${panel}Collapsed`;
    if (!(key in state.panels)) return state;
    return { ...state, panels: { ...state.panels, [key]: !state.panels[key] } };
  }

  function setRightTab(state, tab) {
    return { ...state, panels: { ...state.panels, rightTab: tab, rightCollapsed: false } };
  }

  function setPanelFlag(state, flag, value) {
    if (!(flag in state.panels)) return state;
    return { ...state, panels: { ...state.panels, [flag]: Boolean(value) } };
  }

  function setDemoState(state, value) {
    return { ...state, demoState: value };
  }

  return {
    createInitialState,
    selectUnit,
    selectGroup,
    requestPosture,
    completePosture,
    setPostureProgress,
    setMovement,
    buildRoute,
    updateRouteSegment,
    confirmRoute,
    cancelRoute,
    setRoutePlanning,
    toggleLayer,
    clearLayers,
    setLayerOpacity,
    setTimeSpeed,
    togglePause,
    advanceTime,
    addNotification,
    togglePanel,
    setRightTab,
    setPanelFlag,
    setDemoState,
  };
});
