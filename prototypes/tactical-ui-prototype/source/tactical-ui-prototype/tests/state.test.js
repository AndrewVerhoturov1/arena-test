const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createInitialState,
  selectUnit,
  selectGroup,
  requestPosture,
  completePosture,
  setMovement,
  buildRoute,
  updateRouteSegment,
  confirmRoute,
  cancelRoute,
  toggleLayer,
  setLayerOpacity,
  setTimeSpeed,
  togglePause,
  addNotification,
  togglePanel,
  setRightTab,
} = require('../state.js');

const units = [
  { id: 'u1', posture: 'standing', movement: 'normal', unavailablePostures: [] },
  { id: 'u2', posture: 'crouched', movement: 'careful', unavailablePostures: ['prone'] },
];

test('выбор бойца снимает выбор группы', () => {
  const initial = createInitialState(units);
  const next = selectUnit({ ...initial, selectionMode: 'group' }, 'u2');
  assert.equal(next.selectedUnitId, 'u2');
  assert.equal(next.selectionMode, 'unit');
});

test('выбор группы сохраняет ведущего бойца для карточки', () => {
  const initial = createInitialState(units);
  const next = selectGroup(initial);
  assert.equal(next.selectionMode, 'group');
  assert.equal(next.selectedUnitId, 'u1');
});

test('запрос доступной позы создаёт переход, а завершение меняет текущую позу', () => {
  const initial = createInitialState(units);
  const requested = requestPosture(initial, units[0], 'prone');
  assert.equal(requested.postureTransitions.u1.requested, 'prone');
  assert.equal(requested.postureTransitions.u1.status, 'transition');

  const completed = completePosture(requested, 'u1');
  assert.equal(completed.unitOverrides.u1.posture, 'prone');
  assert.equal(completed.postureTransitions.u1.status, 'idle');
});

test('недоступная поза не запускает переход и создаёт предупреждение', () => {
  const initial = selectUnit(createInitialState(units), 'u2');
  const next = requestPosture(initial, units[1], 'prone');
  assert.equal(next.postureTransitions.u2, undefined);
  assert.equal(next.notifications.at(-1).level, 'warning');
});

test('смена режима движения записывается только выбранному бойцу', () => {
  const initial = createInitialState(units);
  const next = setMovement(initial, 'u1', 'run');
  assert.equal(next.unitOverrides.u1.movement, 'run');
  assert.equal(next.unitOverrides.u2, undefined);
});

test('маршрут строится с двумя редактируемыми участками', () => {
  const initial = createInitialState(units);
  const next = buildRoute(initial, 'u1', { x: 25, y: 30 }, { x: 80, y: 64 });
  assert.equal(next.route.status, 'draft');
  assert.equal(next.route.points.length, 3);
  assert.equal(next.route.segments.length, 2);
  assert.equal(next.route.segments[0].posture, 'standing');
});

test('параметры выбранного участка маршрута можно изменить', () => {
  const initial = buildRoute(createInitialState(units), 'u1', { x: 20, y: 20 }, { x: 70, y: 70 });
  const next = updateRouteSegment(initial, 1, { posture: 'prone', movement: 'careful' });
  assert.deepEqual(next.route.segments[1], { posture: 'prone', movement: 'careful' });
});

test('подтверждение и отмена маршрута меняют его состояние', () => {
  const draft = buildRoute(createInitialState(units), 'u1', { x: 10, y: 10 }, { x: 90, y: 90 });
  const confirmed = confirmRoute(draft);
  assert.equal(confirmed.route.status, 'confirmed');
  assert.equal(confirmed.notifications.at(-1).level, 'success');

  const cancelled = cancelRoute(confirmed);
  assert.equal(cancelled.route, null);
});

test('слой переключается, а прозрачность ограничивается диапазоном 0–100', () => {
  const initial = createInitialState(units);
  const on = toggleLayer(initial, 'danger');
  assert.equal(on.layers.danger, true);
  assert.equal(setLayerOpacity(on, 140).layerOpacity, 100);
  assert.equal(setLayerOpacity(on, -10).layerOpacity, 0);
});

test('управление временем различает паузу и скорость', () => {
  const initial = createInitialState(units);
  const fast = setTimeSpeed(initial, 4);
  assert.equal(fast.time.speed, 4);
  assert.equal(fast.time.paused, false);
  const paused = togglePause(fast);
  assert.equal(paused.time.paused, true);
});

test('уведомления получают последовательные номера', () => {
  const initial = createInitialState(units);
  const one = addNotification(initial, { level: 'info', title: 'Первое' });
  const two = addNotification(one, { level: 'critical', title: 'Второе' });
  assert.equal(two.notifications.at(-1).id, one.notifications.at(-1).id + 1);
});

test('панели сворачиваются независимо, вкладка справа переключается', () => {
  const initial = createInitialState(units);
  const leftClosed = togglePanel(initial, 'left');
  assert.equal(leftClosed.panels.leftCollapsed, true);
  const rightTab = setRightTab(leftClosed, 'orders');
  assert.equal(rightTab.panels.rightTab, 'orders');
});
