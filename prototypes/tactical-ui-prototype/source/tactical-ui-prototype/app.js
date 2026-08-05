(() => {
  'use strict';

  const data = window.TacticalData;
  const S = window.TacticalState;
  let state = S.createInitialState(data.units);
  let eventCursor = 0;
  const postureTimers = new Map();
  const autoDismissTimers = new Map();

  const el = {
    shell: document.getElementById('appShell'),
    workspace: document.getElementById('workspace'),
    roster: document.getElementById('roster'),
    groupSelect: document.getElementById('groupSelectButton'),
    unitLayer: document.getElementById('unitLayer'),
    enemyLayer: document.getElementById('enemyLayer'),
    threatLines: document.getElementById('threatLines'),
    routeOverlay: document.getElementById('routeOverlay'),
    map: document.getElementById('mapViewport'),
    mapCoordinates: document.getElementById('mapCoordinates'),
    routeTool: document.getElementById('routeToolButton'),
    rightContent: document.getElementById('rightContent'),
    bottomContent: document.getElementById('bottomContent'),
    bottomSummary: document.getElementById('bottomSummary'),
    eventStack: document.getElementById('eventStack'),
    simTime: document.getElementById('simTime'),
    pauseState: document.getElementById('pauseState'),
    pauseButton: document.getElementById('pauseButton'),
    pausedOverlay: document.getElementById('pausedOverlay'),
    activeLayerSummary: document.getElementById('activeLayerSummary'),
    speedSwitch: document.getElementById('speedSwitch'),
    tooltip: document.getElementById('tooltip'),
    shortcutsDialog: document.getElementById('shortcutsDialog'),
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function icon(name) {
    return `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function getUnit(id) {
    const base = data.units.find((unit) => unit.id === id);
    if (!base) return null;
    return { ...base, ...(state.unitOverrides[id] || {}) };
  }

  function selectedUnit() {
    return getUnit(state.selectedUnitId) || getUnit(data.units[0]?.id);
  }

  function toneForUnit(unit) {
    if (!unit) return 'normal';
    if (unit.state === 'firing' || state.demoState === 'critical') return 'critical';
    if (['suppressed', 'wounded'].includes(unit.state) || state.demoState === 'warning') return 'warning';
    return 'normal';
  }

  function stateLabel(unit) {
    const labels = {
      normal: 'Готов',
      executing: 'В пути',
      suppressed: 'Подавлен',
      wounded: 'Ранен',
      firing: 'Огонь',
      offline: 'Нет связи',
    };
    return labels[unit.state] || unit.statusText;
  }

  function stateIcon(unit) {
    if (unit.state === 'firing') return 'target';
    if (unit.state === 'suppressed' || unit.state === 'wounded') return 'alert';
    if (unit.state === 'offline') return 'radio';
    return unit.state === 'executing' ? 'route' : 'eye';
  }

  function postureLabel(id) {
    return data.postures.find((item) => item.id === id)?.label || id;
  }

  function movementLabel(id) {
    return data.movements.find((item) => item.id === id)?.label || id;
  }

  function shortPosture(id) {
    return { standing: 'СТ', crouched: 'ПР', prone: 'ЛЁЖ' }[id] || id;
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(seconds)) % 86400;
    const h = String(Math.floor(safe / 3600)).padStart(2, '0');
    const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
    const s = String(safe % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function setState(next, renderMode = 'all') {
    state = next;
    if (renderMode === 'top') renderTop();
    else renderAll();
  }

  function renderTop() {
    el.simTime.textContent = formatTime(state.time.seconds);
    el.pauseState.textContent = state.time.paused ? 'ПАУЗА' : `ХОД ×${String(state.time.speed).replace('.', ',')}`;
    el.pauseState.classList.toggle('running', !state.time.paused);
    el.pauseButton.classList.toggle('active', state.time.paused);
    el.pauseButton.innerHTML = icon(state.time.paused ? 'play' : 'pause');
    el.pauseButton.setAttribute('aria-label', state.time.paused ? 'Продолжить' : 'Пауза');
    el.pausedOverlay.classList.toggle('hidden', !state.time.paused);
    el.speedSwitch.querySelectorAll('[data-speed]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.speed) === state.time.speed);
      button.classList.toggle('armed', Number(button.dataset.speed) === state.time.speed && state.time.paused);
    });
  }

  function renderShell() {
    el.shell.classList.toggle('left-collapsed', state.panels.leftCollapsed);
    el.shell.classList.toggle('right-collapsed', state.panels.rightCollapsed);
    el.shell.classList.toggle('bottom-collapsed', state.panels.bottomCollapsed);
    el.shell.classList.toggle('demo-warning', state.demoState === 'warning');
    el.shell.classList.toggle('demo-critical', state.demoState === 'critical');

    document.querySelectorAll('[data-selection-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.selectionMode === state.selectionMode);
    });
    document.querySelectorAll('[data-right-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.rightTab === state.panels.rightTab);
    });
    el.groupSelect.classList.toggle('active', state.selectionMode === 'group');
    el.routeTool.classList.toggle('active', state.routePlanning);
    el.map.classList.toggle('route-mode', state.routePlanning);
  }

  function renderRoster() {
    el.roster.innerHTML = data.units.map((unitBase) => {
      const unit = getUnit(unitBase.id);
      const selected = state.selectionMode === 'unit' && unit.id === state.selectedUnitId;
      const groupMember = state.selectionMode === 'group';
      return `
        <button class="roster-item ${selected ? 'selected' : ''} ${groupMember ? 'group-member' : ''}" data-unit-id="${unit.id}" data-state="${unit.state}" data-tooltip="${escapeHtml(unit.statusText)} · ${escapeHtml(unit.action)}">
          <span class="roster-avatar">${escapeHtml(unit.number)}<i class="roster-state-dot"></i></span>
          <span class="roster-main">
            <strong>${escapeHtml(unit.name)} <i class="state-icon">${icon(stateIcon(unit))}</i></strong>
            <small>${escapeHtml(unit.role)} · ${escapeHtml(unit.action)}</small>
          </span>
          <span class="roster-meta"><b>${unit.health}%</b><span>${escapeHtml(stateLabel(unit))}</span></span>
        </button>`;
    }).join('');
  }

  function renderMapUnits() {
    el.unitLayer.innerHTML = data.units.map((base) => {
      const unit = getUnit(base.id);
      const selected = state.selectionMode === 'unit' && unit.id === state.selectedUnitId;
      const groupMember = state.selectionMode === 'group';
      const transition = state.postureTransitions[unit.id];
      const posture = transition?.status === 'transition' ? `${postureLabel(unit.posture)} → ${postureLabel(transition.requested)}` : postureLabel(unit.posture);
      const tooltip = `${unit.name} · ${unit.role}\n${unit.action}\nПоза: ${posture}; подавление: ${unit.suppression}%`;
      return `
        <button class="unit-marker ${selected ? 'selected' : ''} ${groupMember ? 'group-member' : ''}" data-unit-id="${unit.id}" data-state="${unit.state}" style="left:${unit.x}%;top:${unit.y}%" data-tooltip="${escapeHtml(tooltip)}">
          <span class="unit-heading" style="transform:translate(-50%,-100%) rotate(${unit.heading}deg)"></span>
          <span class="unit-ring"></span>
          <span class="unit-core"></span>
          <span class="unit-status-badge"></span>
          <span class="unit-label"><b>${escapeHtml(unit.number)}</b>${escapeHtml(unit.name)}</span>
        </button>`;
    }).join('');
  }

  function renderEnemies() {
    el.enemyLayer.innerHTML = data.enemies.map((enemy) => `
      <div class="enemy-marker ${enemy.type}" style="left:${enemy.x}%;top:${enemy.y}%" data-tooltip="${escapeHtml(enemy.label)} · уверенность ${enemy.confidence}%">
        <span class="enemy-symbol"></span>
        <span class="enemy-label">${escapeHtml(enemy.label)} · ${enemy.confidence}%</span>
      </div>`).join('');
  }

  function renderThreatLines() {
    const unit = selectedUnit();
    if (!unit) {
      el.threatLines.innerHTML = '';
      return;
    }
    const showDanger = state.layers.danger || state.demoState !== 'normal' || unit.detection === 'Обнаружен';
    const showVisibility = state.layers.visibility;
    const lines = [];
    if (showDanger) {
      data.enemies.filter((enemy) => enemy.type === 'confirmed').forEach((enemy, index) => {
        lines.push(`<line class="${index === 0 ? 'primary' : ''}" x1="${enemy.x * 10}" y1="${enemy.y * 6}" x2="${unit.x * 10}" y2="${unit.y * 6}"></line>`);
      });
    }
    if (showVisibility) {
      data.enemies.slice(0, 2).forEach((enemy) => {
        lines.push(`<line x1="${unit.x * 10}" y1="${unit.y * 6}" x2="${enemy.x * 10}" y2="${enemy.y * 6}" style="stroke:rgba(117,199,212,.5)"></line>`);
      });
    }
    el.threatLines.innerHTML = lines.join('');
  }

  function renderRoute() {
    if (!state.route) {
      el.routeOverlay.innerHTML = '';
      return;
    }
    const route = state.route;
    const svg = [];
    route.segments.forEach((segment, index) => {
      const a = route.points[index];
      const b = route.points[index + 1];
      const x1 = a.x * 10;
      const y1 = a.y * 6;
      const x2 = b.x * 10;
      const y2 = b.y * 6;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      svg.push(`<line class="route-segment ${route.status} movement-${segment.movement}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`);
      svg.push(`<polygon class="route-arrow" points="-7,-4 7,0 -7,4" transform="translate(${mx} ${my}) rotate(${angle})"></polygon>`);
      svg.push(`<g class="route-label" transform="translate(${mx} ${my - 16})"><rect x="-29" y="-10" width="58" height="20" rx="4"></rect><text x="0" y="1">${shortPosture(segment.posture)} · ${escapeHtml(movementLabel(segment.movement).slice(0, 5))}</text></g>`);
    });
    route.points.forEach((point, index) => {
      svg.push(`<circle class="route-point ${index === route.points.length - 1 ? 'target' : ''}" cx="${point.x * 10}" cy="${point.y * 6}" r="${index === 0 ? 5 : 7}"></circle>`);
    });
    el.routeOverlay.innerHTML = svg.join('');
  }

  function renderLayers() {
    const opacity = state.layerOpacity / 100;
    document.querySelectorAll('[data-layer-view]').forEach((layer) => {
      const id = layer.dataset.layerView;
      layer.classList.toggle('visible', Boolean(state.layers[id]));
      layer.style.setProperty('--layer-opacity', opacity);
    });
    const active = data.layers.filter((layer) => state.layers[layer.id]);
    el.activeLayerSummary.textContent = active.length ? `Слои: ${active.map((item) => item.label).join(', ')}` : 'Слои выключены';
  }

  function renderEvents() {
    el.eventStack.innerHTML = state.notifications.slice(-3).reverse().map((item) => `
      <article class="event-card ${item.level}" data-notification-id="${item.id}">
        <strong>${escapeHtml(item.title)}</strong>
        ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ''}
        <button data-dismiss-notification="${item.id}" aria-label="Закрыть сообщение">${icon('close')}</button>
      </article>`).join('');
  }

  function renderRightPanel() {
    if (state.panels.rightTab === 'layers') renderLayerPanel();
    else if (state.panels.rightTab === 'orders') renderOrderPanel();
    else renderInfoPanel();
  }

  function renderLayerPanel() {
    const activeCount = Object.values(state.layers).filter(Boolean).length;
    el.rightContent.innerHTML = `
      <section class="right-section">
        <header class="right-section-header">
          <div><span class="eyebrow">КАРТА</span><h3>Информационные слои</h3><p>Можно включать несколько слоёв. Общая прозрачность ограничивает смешение цветов.</p></div>
          <button class="text-button" data-clear-layers>Сбросить</button>
        </header>
        <div class="layer-list">
          ${data.layers.map((layer) => `
            <button class="layer-toggle ${state.layers[layer.id] ? 'active' : ''}" data-layer-id="${layer.id}" data-tone="${layer.tone}" data-tooltip="${escapeHtml(layer.description)} Клавиша ${layer.shortcut}.">
              <span class="layer-swatch">${icon(layer.id === 'visibility' ? 'eye' : layer.id === 'routeCost' ? 'route' : 'layers')}</span>
              <span><strong>${escapeHtml(layer.label)}</strong><small>${escapeHtml(layer.description)}</small></span>
              <i class="layer-switch"></i>
            </button>`).join('')}
        </div>
        <div class="opacity-control">
          <div class="opacity-row"><span>Общая прозрачность</span><output>${state.layerOpacity}%</output></div>
          <input id="layerOpacity" type="range" min="0" max="100" value="${state.layerOpacity}" style="--range-value:${state.layerOpacity}%" aria-label="Прозрачность слоёв">
        </div>
        <div class="layer-legend">
          <span class="danger"><i></i>опасность</span><span class="conceal"><i></i>скрытность</span>
          <span class="route"><i></i>цена пути</span><span class="position"><i></i>позиции</span>
        </div>
        <div class="info-cell" style="margin-top:14px"><span>Включено</span><strong>${activeCount ? `${activeCount} из ${data.layers.length}` : 'нет активных слоёв'}</strong></div>
      </section>`;
  }

  function renderOrderPanel() {
    const unit = selectedUnit();
    if (!state.route) {
      el.rightContent.innerHTML = `
        <section class="right-section">
          <header class="right-section-header"><div><span class="eyebrow">ПРИКАЗ</span><h3>${state.selectionMode === 'group' ? 'Приказ отделению' : `Приказ: ${escapeHtml(unit.name)}`}</h3><p>Маршрут можно начать кнопкой ниже, клавишей R или правой кнопкой на карте.</p></div></header>
          <div class="order-banner"><strong>${escapeHtml(state.selectionMode === 'group' ? data.squad.task : unit.order)}</strong><p>${escapeHtml(unit.action)}</p></div>
          <div class="route-empty" style="margin-top:12px">${icon('route')}<strong>Маршрут не построен</strong><p>Укажите конечную точку на карте. Прототип создаст два участка, которые можно настроить отдельно.</p><button class="primary-action" data-start-route style="width:100%;margin-top:8px">Начать построение</button></div>
        </section>`;
      return;
    }
    const route = state.route;
    el.rightContent.innerHTML = `
      <section class="right-section">
        <header class="right-section-header"><div><span class="eyebrow">ПРИКАЗ · ${route.status === 'draft' ? 'ЧЕРНОВИК' : 'ПРИНЯТ'}</span><h3>Маршрут: ${escapeHtml(unit.name)}</h3><p>Поза и способ движения задаются независимо для каждого участка.</p></div></header>
        <div class="order-banner ${route.status === 'draft' ? 'warning' : ''}">
          <strong>${route.status === 'draft' ? 'Требуется подтверждение' : 'Приказ передан бойцу'}</strong>
          <p>${route.segments.length} участка · ориентировочно 74 м · ${route.status === 'draft' ? 'время не рассчитано' : 'начало после снятия паузы'}</p>
        </div>
        ${route.segments.map((segment, index) => `
          <div class="route-segment-editor">
            <div class="segment-title"><strong>Участок ${index + 1}</strong><span>${index === 0 ? '32 м' : '42 м'}</span></div>
            <div class="segment-options">
              <label>Поза
                <select data-segment-index="${index}" data-segment-field="posture">
                  ${data.postures.map((item) => `<option value="${item.id}" ${segment.posture === item.id ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
                </select>
              </label>
              <label>Движение
                <select data-segment-index="${index}" data-segment-field="movement">
                  ${data.movements.map((item) => `<option value="${item.id}" ${segment.movement === item.id ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
                </select>
              </label>
            </div>
          </div>`).join('')}
        <div class="order-actions">
          ${route.status === 'draft' ? '<button class="primary-action" data-confirm-route>Подтвердить приказ</button>' : '<button class="secondary-action" data-start-route>Перестроить</button>'}
          <button class="danger-action" data-cancel-route>Отменить маршрут</button>
        </div>
      </section>`;
  }

  function renderInfoPanel() {
    if (state.selectionMode === 'group') {
      const avgHealth = Math.round(data.units.reduce((sum, base) => sum + getUnit(base.id).health, 0) / data.units.length);
      const contacts = data.enemies.filter((enemy) => enemy.type === 'confirmed').length;
      el.rightContent.innerHTML = `
        <section class="right-section">
          <header class="right-section-header"><div><span class="eyebrow">СВЕДЕНИЯ</span><h3>${escapeHtml(data.squad.name)} «${escapeHtml(data.squad.callsign)}»</h3><p>${escapeHtml(data.squad.task)}</p></div></header>
          <div class="info-grid">
            <div class="info-cell"><span>Состав</span><strong>${data.units.length} бойцов</strong></div>
            <div class="info-cell"><span>Среднее здоровье</span><strong>${avgHealth}%</strong></div>
            <div class="info-cell"><span>Подтверждено целей</span><strong>${contacts}</strong></div>
            <div class="info-cell"><span>Связь</span><strong>5 из 6</strong></div>
          </div>
          ${renderDemoStateBlock()}
        </section>`;
      return;
    }
    const unit = selectedUnit();
    el.rightContent.innerHTML = `
      <section class="right-section">
        <header class="right-section-header"><div><span class="eyebrow">СВЕДЕНИЯ О БОЙЦЕ</span><h3>${escapeHtml(unit.name)} · ${escapeHtml(unit.role)}</h3><p>${escapeHtml(unit.statusText)}</p></div></header>
        <div class="info-grid">
          <div class="info-cell"><span>Положение</span><strong>${unit.x.toFixed(1)}, ${unit.y.toFixed(1)}</strong></div>
          <div class="info-cell"><span>Поза</span><strong>${escapeHtml(postureLabel(unit.posture))}</strong></div>
          <div class="info-cell"><span>Обнаружение</span><strong>${escapeHtml(unit.detection)}</strong></div>
          <div class="info-cell"><span>Наблюдение</span><strong>${escapeHtml(unit.visibility)}</strong></div>
          <div class="info-cell"><span>Приказ</span><strong>${escapeHtml(unit.order)}</strong></div>
          <div class="info-cell"><span>Действие</span><strong>${escapeHtml(unit.action)}</strong></div>
        </div>
        <div class="accordion">
          <button class="accordion-button ${state.panels.detailsOpen ? 'open' : ''}" data-toggle-details><span>Дополнительные сведения</span>${icon('chevron')}</button>
          <div class="accordion-content ${state.panels.detailsOpen ? 'open' : ''}">
            <p>Вооружение: ${escapeHtml(unit.weapon)}; снаряжение: ${escapeHtml(unit.secondary)}.</p>
            <div class="tag-row">${unit.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
          </div>
        </div>
        ${renderDemoStateBlock()}
      </section>`;
  }

  function renderDemoStateBlock() {
    return `
      <div class="accordion">
        <button class="accordion-button open" type="button"><span>Демонстрация общего состояния</span>${icon('chevron')}</button>
        <div class="accordion-content open">
          <p>Переключатели показывают спокойное, предупреждающее и критическое оформление без постоянного мигания.</p>
          <div class="demo-state-row">
            <button data-demo-state="normal" class="${state.demoState === 'normal' ? 'active' : ''}">Обычное</button>
            <button data-demo-state="warning" class="${state.demoState === 'warning' ? 'active' : ''}">Внимание</button>
            <button data-demo-state="critical" class="${state.demoState === 'critical' ? 'active' : ''}">Критическое</button>
          </div>
        </div>
      </div>`;
  }

  function meter(name, value, inverse = false) {
    const dangerValue = inverse ? value : 100 - value;
    const level = dangerValue > 65 ? 'critical' : dangerValue > 35 ? 'warning' : '';
    return `<div class="meter-item ${level}"><div class="meter-label"><span>${escapeHtml(name)}</span><b>${value}%</b></div><div class="meter-track"><div class="meter-fill" style="width:${Math.max(0, Math.min(100, value))}%"></div></div></div>`;
  }

  function renderBottom() {
    if (state.selectionMode === 'group') renderGroupBottom();
    else renderUnitBottom();
  }

  function renderUnitBottom() {
    const unit = selectedUnit();
    const tone = toneForUnit(unit);
    const transition = state.postureTransitions[unit.id];
    const movement = data.movements.find((item) => item.id === unit.movement) || data.movements[1];
    const warnings = [];
    if (unit.suppression >= 45) warnings.push({ tone: 'warning', text: `Подавление ${unit.suppression}%: точность и скорость снижены.` });
    if (unit.health < 75) warnings.push({ tone: 'critical', text: `${unit.statusText}: часть действий недоступна.` });
    if (unit.ammo <= 10) warnings.push({ tone: 'warning', text: 'Меньше одного магазина.' });
    if (unit.state === 'offline') warnings.push({ tone: 'info', text: 'Нет подтверждения получения нового приказа.' });
    if (!warnings.length) warnings.push({ tone: 'info', text: `${unit.detection}. ${unit.visibility}.` });

    el.bottomContent.innerHTML = `
      <article class="card-zone identity-zone">
        <div class="unit-identity">
          <div class="identity-emblem">${escapeHtml(unit.number)}</div>
          <div class="identity-copy"><span class="eyebrow">${escapeHtml(unit.group)} · ${escapeHtml(unit.role)}</span><h2>${escapeHtml(unit.name)}</h2><p>${escapeHtml(unit.weapon)} · ${escapeHtml(unit.statusText)}</p><div class="status-line ${tone}">${icon(stateIcon(unit))}<strong>${escapeHtml(unit.action)}</strong></div></div>
        </div>
        <div class="current-task"><span>ТЕКУЩИЙ ПРИКАЗ</span><strong>${escapeHtml(unit.order)}</strong></div>
        <div class="meter-grid">${meter('Здоровье', unit.health)}${meter('Боевой дух', unit.morale)}${meter('Подавление', unit.suppression, true)}${meter('Усталость', unit.fatigue, true)}</div>
      </article>

      <article class="card-zone movement-zone">
        <div class="zone-title"><h3>Поза и перемещение</h3><span>${transition?.status === 'transition' ? `переход ${transition.progress}%` : 'готов к изменению'}</span></div>
        <div class="posture-controls">
          ${data.postures.map((posture) => {
            const unavailable = unit.unavailablePostures.includes(posture.id);
            const active = unit.posture === posture.id && transition?.status !== 'transition';
            const requested = transition?.status === 'transition' && transition.requested === posture.id;
            const tooltip = unavailable ? `${posture.hint} Недоступно: ${unit.statusText}.` : `${posture.hint} Текущий профиль уязвимости: ${posture.exposure}.`;
            return `<button class="posture-button ${active ? 'active' : ''} ${requested ? 'requested' : ''}" data-posture="${posture.id}" ${unavailable ? 'disabled' : ''} data-tooltip="${escapeHtml(tooltip)}">${icon(posture.icon)}<strong>${escapeHtml(posture.label)}</strong><small>${escapeHtml(posture.exposure)} профиль</small>${requested ? `<span class="transition-progress"><i style="width:${transition.progress}%"></i></span>` : ''}</button>`;
          }).join('')}
        </div>
        <div class="movement-controls">
          ${data.movements.map((item) => `<button class="movement-button ${unit.movement === item.id ? 'active' : ''}" data-movement="${item.id}" data-tooltip="Скорость ${item.speed}. Шум: ${item.noise}. Утомление: ${item.fatigue}. Наблюдение: ${item.observation}.">${icon('walk')}<strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.speed)}</small></button>`).join('')}
        </div>
        <div class="effect-strip"><div class="effect-cell">Шум<b>${escapeHtml(movement.noise)}</b></div><div class="effect-cell">Утомление<b>${escapeHtml(movement.fatigue)}</b></div><div class="effect-cell">Наблюдение<b>${escapeHtml(movement.observation)}</b></div></div>
      </article>

      <article class="card-zone weapon-zone">
        <div class="zone-title"><h3>Оружие и готовность</h3><span>${unit.detection}</span></div>
        <div class="weapon-line">${icon('ammo')}<div><strong>${escapeHtml(unit.weapon)}</strong><span>${escapeHtml(unit.secondary)}</span></div><b class="ammo-value ${unit.ammo <= 10 ? 'low' : ''}">${unit.ammo}/${unit.ammoMax}</b></div>
        <div class="warning-list">${warnings.map((warning) => `<div class="warning-chip ${warning.tone}">${icon(warning.tone === 'critical' ? 'alert' : 'info')}<span>${escapeHtml(warning.text)}</span></div>`).join('')}</div>
        <div class="action-grid"><button class="route-action" data-start-route>${icon('route')}Проложить маршрут</button><button class="secondary-action" data-action-event="observe">${icon('eye')}Наблюдать</button><button class="secondary-action" data-action-event="fire">${icon('target')}Огонь</button></div>
      </article>

      <article class="card-zone order-zone">
        <div class="zone-title"><h3>Приказ и контакты</h3><span>${state.route ? (state.route.status === 'draft' ? 'черновик' : 'принят') : 'без маршрута'}</span></div>
        <div class="info-grid"><div class="info-cell"><span>Видит</span><strong>${escapeHtml(unit.visibility)}</strong></div><div class="info-cell"><span>Кто видит его</span><strong>${unit.detection === 'Обнаружен' ? '1 подтверждённая угроза' : 'нет подтверждения'}</strong></div></div>
        <div class="current-task"><span>СЛЕДУЮЩЕЕ ДЕЙСТВИЕ</span><strong>${state.route ? (state.route.status === 'draft' ? 'Подтвердить маршрут' : 'Снять паузу для выполнения') : 'Указать цель или маршрут'}</strong></div>
        <div class="action-grid"><button class="primary-action" data-open-order>${icon('order')}Открыть приказ</button><button class="danger-action" data-action-event="stop">Остановить</button></div>
      </article>`;

    el.bottomSummary.innerHTML = `<div class="identity-emblem">${escapeHtml(unit.number)}</div><strong>${escapeHtml(unit.name)}</strong><span>${escapeHtml(unit.role)}</span><span class="summary-state">${escapeHtml(unit.action)}</span><span class="summary-spacer"></span><div class="summary-meter"><span><small>Здоровье</small><b>${unit.health}%</b></span><div class="meter-track"><div class="meter-fill" style="width:${unit.health}%"></div></div></div>`;
  }

  function renderGroupBottom() {
    const units = data.units.map((item) => getUnit(item.id));
    const avgHealth = Math.round(units.reduce((sum, unit) => sum + unit.health, 0) / units.length);
    const avgMorale = Math.round(units.reduce((sum, unit) => sum + unit.morale, 0) / units.length);
    const avgSuppression = Math.round(units.reduce((sum, unit) => sum + unit.suppression, 0) / units.length);
    const ready = units.filter((unit) => !['offline', 'suppressed'].includes(unit.state)).length;
    const currentMovement = getUnit(data.squad.commanderId).movement;

    el.bottomContent.innerHTML = `
      <article class="card-zone identity-zone">
        <div class="unit-identity"><div class="identity-emblem">А</div><div class="identity-copy"><span class="eyebrow">ПОДРАЗДЕЛЕНИЕ · ${escapeHtml(data.squad.callsign)}</span><h2>${escapeHtml(data.squad.name)}</h2><p>${units.length} бойцов · командир ${escapeHtml(getUnit(data.squad.commanderId).name)}</p><div class="status-line ${ready < units.length ? 'warning' : ''}">${icon('radio')}<strong>${ready} из ${units.length} готовы к общему приказу</strong></div></div></div>
        <div class="current-task"><span>ЗАДАЧА ОТДЕЛЕНИЯ</span><strong>${escapeHtml(data.squad.task)}</strong></div>
        <div class="meter-grid">${meter('Среднее здоровье', avgHealth)}${meter('Боевой дух', avgMorale)}${meter('Подавление', avgSuppression, true)}${meter('Готовность', Math.round(ready / units.length * 100))}</div>
      </article>
      <article class="card-zone movement-zone">
        <div class="zone-title"><h3>Общее перемещение</h3><span>изменение для всего отделения</span></div>
        <div class="movement-controls">${data.movements.map((item) => `<button class="movement-button ${currentMovement === item.id ? 'active' : ''}" data-group-movement="${item.id}" data-tooltip="Назначить всему отделению: ${item.label}. Скорость ${item.speed}; шум ${item.noise}.">${icon('walk')}<strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.speed)}</small></button>`).join('')}</div>
        <div class="zone-title" style="margin-top:16px"><h3>Состояние состава</h3><span>${ready}/${units.length} готовы</span></div>
        <div class="roster" style="display:grid;grid-template-columns:1fr 1fr">${units.map((unit) => `<button class="roster-item" data-unit-id="${unit.id}" data-state="${unit.state}" style="min-height:45px"><span class="roster-avatar" style="width:28px;height:28px">${unit.number}<i class="roster-state-dot"></i></span><span class="roster-main"><strong>${escapeHtml(unit.name)}</strong><small>${escapeHtml(stateLabel(unit))}</small></span><span class="roster-meta"><b>${unit.health}%</b></span></button>`).join('')}</div>
      </article>
      <article class="card-zone weapon-zone">
        <div class="zone-title"><h3>Боевые возможности</h3><span>краткая сводка</span></div>
        <div class="info-grid"><div class="info-cell"><span>Пулемёт</span><strong>1 · готов</strong></div><div class="info-cell"><span>Гранатомёт</span><strong>1 · нет связи</strong></div><div class="info-cell"><span>Подтверждено целей</span><strong>2</strong></div><div class="info-cell"><span>Боеприпасы</span><strong>достаточно</strong></div></div>
        <div class="warning-list"><div class="warning-chip warning">${icon('alert')}<span>Сокол подавлен; Ручей вне устойчивой связи.</span></div></div>
        <div class="action-grid"><button class="route-action" data-start-route>${icon('route')}Маршрут отделения</button><button class="secondary-action" data-action-event="observe">${icon('eye')}Общий обзор</button><button class="secondary-action" data-action-event="fire">${icon('target')}Огневая задача</button></div>
      </article>
      <article class="card-zone order-zone">
        <div class="zone-title"><h3>Управление группой</h3><span>командир Барс</span></div>
        <div class="current-task"><span>ТЕКУЩИЙ ПРИКАЗ</span><strong>${escapeHtml(data.squad.task)}</strong></div>
        <div class="action-grid"><button class="primary-action" data-open-order>${icon('order')}Редактор приказа</button><button class="secondary-action" data-demo-state="warning">Показать тревогу</button><button class="danger-action" data-action-event="stop">Остановить группу</button></div>
      </article>`;

    el.bottomSummary.innerHTML = `<div class="identity-emblem">А</div><strong>${escapeHtml(data.squad.name)}</strong><span>${units.length} бойцов</span><span class="summary-state">${escapeHtml(data.squad.task)}</span><span class="summary-spacer"></span><div class="summary-meter"><span><small>Готовность</small><b>${ready}/${units.length}</b></span><div class="meter-track"><div class="meter-fill" style="width:${ready / units.length * 100}%"></div></div></div>`;
  }

  function renderAll() {
    renderShell();
    renderTop();
    renderRoster();
    renderMapUnits();
    renderEnemies();
    renderLayers();
    renderThreatLines();
    renderRoute();
    renderRightPanel();
    renderBottom();
    renderEvents();
  }

  function scheduleAutoDismiss(notification) {
    if (!notification || notification.level === 'critical' || autoDismissTimers.has(notification.id)) return;
    const delay = notification.level === 'warning' ? 9000 : 6500;
    const timer = window.setTimeout(() => dismissNotification(notification.id), delay);
    autoDismissTimers.set(notification.id, timer);
  }

  function pushNotification(notification) {
    state = S.addNotification(state, notification);
    renderAll();
    scheduleAutoDismiss(state.notifications.at(-1));
  }

  function dismissNotification(id) {
    autoDismissTimers.delete(id);
    state = { ...state, notifications: state.notifications.filter((item) => item.id !== Number(id)) };
    renderEvents();
  }

  function startPostureTransition(unit, posture) {
    const next = S.requestPosture(state, unit, posture);
    if (next === state) return;
    state = next;
    renderAll();
    const transition = state.postureTransitions[unit.id];
    if (!transition || transition.status !== 'transition') return;
    if (postureTimers.has(unit.id)) window.clearInterval(postureTimers.get(unit.id));
    const started = performance.now();
    const duration = 1600;
    const timer = window.setInterval(() => {
      const progress = Math.min(100, Math.round((performance.now() - started) / duration * 100));
      state = S.setPostureProgress(state, unit.id, progress);
      renderBottom();
      if (progress >= 100) {
        window.clearInterval(timer);
        postureTimers.delete(unit.id);
        state = S.completePosture(state, unit.id);
        state = S.addNotification(state, { level: 'success', title: 'Поза изменена', body: `${unit.name}: ${postureLabel(posture).toLowerCase()}.` });
        renderAll();
        scheduleAutoDismiss(state.notifications.at(-1));
      }
    }, 90);
    postureTimers.set(unit.id, timer);
  }

  function startRoutePlanning() {
    state = S.setRoutePlanning(state, true);
    state = S.setRightTab(state, 'orders');
    renderAll();
    el.map.focus();
  }

  function buildRouteAt(clientX, clientY) {
    const rect = el.map.getBoundingClientRect();
    const x = Math.max(1, Math.min(99, (clientX - rect.left) / rect.width * 100));
    const y = Math.max(1, Math.min(99, (clientY - rect.top) / rect.height * 100));
    const unit = selectedUnit();
    if (!unit) return;
    state = S.buildRoute(state, unit.id, { x: unit.x, y: unit.y }, { x, y });
    renderAll();
    scheduleAutoDismiss(state.notifications.at(-1));
  }

  function triggerDemoEvent(forced) {
    let event;
    if (forced === 'observe') event = { level: 'info', title: 'Сектор наблюдения назначен', body: 'Качество обзора показано голубым слоем.' };
    else if (forced === 'fire') event = { level: 'critical', title: 'Огневая задача', body: 'Подтверждённая цель отмечена на востоке.' };
    else if (forced === 'stop') event = { level: 'warning', title: 'Приказ остановиться', body: 'Текущее движение и маршрут приостановлены.' };
    else {
      event = data.demoEvents[eventCursor % data.demoEvents.length];
      eventCursor += 1;
    }
    pushNotification(event);
    if (event.level === 'critical') state = S.setDemoState(state, 'critical');
    else if (event.level === 'warning') state = S.setDemoState(state, 'warning');
    renderAll();
  }

  function handleDocumentClick(event) {
    const unitButton = event.target.closest('[data-unit-id]');
    if (unitButton) {
      event.stopPropagation();
      setState(S.selectUnit(state, unitButton.dataset.unitId));
      return;
    }

    const collapse = event.target.closest('[data-collapse]');
    if (collapse) {
      setState(S.togglePanel(state, collapse.dataset.collapse));
      return;
    }

    const tab = event.target.closest('[data-right-tab]');
    if (tab) {
      setState(S.setRightTab(state, tab.dataset.rightTab));
      return;
    }

    const selection = event.target.closest('[data-selection-mode]');
    if (selection) {
      setState(selection.dataset.selectionMode === 'group' ? S.selectGroup(state) : S.selectUnit(state, state.selectedUnitId));
      return;
    }

    const speed = event.target.closest('[data-speed]');
    if (speed) {
      setState(S.setTimeSpeed(state, Number(speed.dataset.speed)));
      return;
    }

    const layer = event.target.closest('[data-layer-id]');
    if (layer) {
      setState(S.toggleLayer(state, layer.dataset.layerId));
      return;
    }

    if (event.target.closest('[data-clear-layers]')) {
      setState(S.clearLayers(state));
      return;
    }

    const posture = event.target.closest('[data-posture]');
    if (posture) {
      startPostureTransition(selectedUnit(), posture.dataset.posture);
      return;
    }

    const movement = event.target.closest('[data-movement]');
    if (movement) {
      setState(S.setMovement(state, state.selectedUnitId, movement.dataset.movement));
      return;
    }

    const groupMovement = event.target.closest('[data-group-movement]');
    if (groupMovement) {
      let next = state;
      data.units.forEach((unit) => { next = S.setMovement(next, unit.id, groupMovement.dataset.groupMovement); });
      next = S.addNotification(next, { level: 'success', title: 'Режим движения назначен', body: `${movementLabel(groupMovement.dataset.groupMovement)} для всего отделения.` });
      setState(next);
      scheduleAutoDismiss(state.notifications.at(-1));
      return;
    }

    if (event.target.closest('[data-start-route]')) {
      startRoutePlanning();
      return;
    }

    if (event.target.closest('[data-confirm-route]')) {
      const next = S.confirmRoute(state);
      setState(next);
      scheduleAutoDismiss(state.notifications.at(-1));
      return;
    }

    if (event.target.closest('[data-cancel-route]')) {
      const next = S.cancelRoute(state);
      setState(next);
      scheduleAutoDismiss(state.notifications.at(-1));
      return;
    }

    if (event.target.closest('[data-open-order]')) {
      setState(S.setRightTab(state, 'orders'));
      return;
    }

    const dismiss = event.target.closest('[data-dismiss-notification]');
    if (dismiss) {
      dismissNotification(dismiss.dataset.dismissNotification);
      return;
    }

    const details = event.target.closest('[data-toggle-details]');
    if (details) {
      setState(S.setPanelFlag(state, 'detailsOpen', !state.panels.detailsOpen));
      return;
    }

    const demoState = event.target.closest('[data-demo-state]');
    if (demoState) {
      const value = demoState.dataset.demoState;
      setState(S.setDemoState(state, value));
      if (value === 'warning') pushNotification({ level: 'warning', title: 'Предупреждающее состояние', body: 'Важные элементы получили янтарный акцент без мигания.' });
      if (value === 'critical') pushNotification({ level: 'critical', title: 'Критическое состояние', body: 'Угроза подтверждена. Сообщение остаётся до закрытия.' });
      return;
    }

    const actionEvent = event.target.closest('[data-action-event]');
    if (actionEvent) {
      triggerDemoEvent(actionEvent.dataset.actionEvent);
    }
  }

  document.addEventListener('click', handleDocumentClick);

  el.groupSelect.addEventListener('click', () => setState(S.selectGroup(state)));
  document.querySelector('.panel-collapsed-icon').addEventListener('click', () => setState(S.togglePanel(state, 'left')));
  el.pauseButton.addEventListener('click', () => setState(S.togglePause(state)));
  el.routeTool.addEventListener('click', () => setState(S.setRoutePlanning(state, !state.routePlanning)));
  document.getElementById('centerButton').addEventListener('click', () => {
    const unit = selectedUnit();
    const marker = document.querySelector(`.unit-marker[data-unit-id="${unit.id}"]`);
    marker?.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.35)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 420, easing: 'ease-out' });
  });
  document.getElementById('triggerEventButton').addEventListener('click', () => triggerDemoEvent());

  el.map.addEventListener('click', (event) => {
    if (event.target.closest('.unit-marker') || event.target.closest('.enemy-marker')) return;
    if (state.routePlanning) buildRouteAt(event.clientX, event.clientY);
  });
  el.map.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    buildRouteAt(event.clientX, event.clientY);
  });
  el.map.addEventListener('mousemove', (event) => {
    const rect = el.map.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width * 100).toFixed(1);
    const y = ((event.clientY - rect.top) / rect.height * 100).toFixed(1);
    el.mapCoordinates.textContent = `КВ. 11-Г · X ${x} · Y ${y}`;
  });

  el.rightContent.addEventListener('input', (event) => {
    if (event.target.id === 'layerOpacity') {
      state = S.setLayerOpacity(state, event.target.value);
      renderLayers();
      event.target.style.setProperty('--range-value', `${state.layerOpacity}%`);
      event.target.previousElementSibling.querySelector('output').textContent = `${state.layerOpacity}%`;
    }
  });
  el.rightContent.addEventListener('change', (event) => {
    const select = event.target.closest('[data-segment-index]');
    if (!select) return;
    const index = Number(select.dataset.segmentIndex);
    const field = select.dataset.segmentField;
    setState(S.updateRouteSegment(state, index, { [field]: select.value }));
  });

  document.getElementById('shortcutsButton').addEventListener('click', () => el.shortcutsDialog.showModal());
  document.getElementById('closeShortcuts').addEventListener('click', () => el.shortcutsDialog.close());
  el.shortcutsDialog.addEventListener('click', (event) => {
    const rect = el.shortcutsDialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) el.shortcutsDialog.close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input,select,textarea')) return;
    if (event.code === 'Space') {
      event.preventDefault();
      setState(S.togglePause(state));
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      startRoutePlanning();
    } else if (event.key.toLowerCase() === 'g') {
      setState(S.selectGroup(state));
    } else if (event.key.toLowerCase() === 'e') {
      triggerDemoEvent();
    } else if (event.key === 'Escape') {
      if (el.shortcutsDialog.open) el.shortcutsDialog.close();
      else if (state.routePlanning) setState(S.setRoutePlanning(state, false));
      else if (state.route?.status === 'draft') setState(S.cancelRoute(state));
    } else if (/^[1-7]$/.test(event.key)) {
      const layer = data.layers[Number(event.key) - 1];
      if (layer) setState(S.toggleLayer(state, layer.id));
    }
  });

  function positionTooltip(target, clientX, clientY) {
    const margin = 12;
    const rect = el.tooltip.getBoundingClientRect();
    let x = clientX + margin;
    let y = clientY + margin;
    if (x + rect.width > window.innerWidth - 8) x = clientX - rect.width - margin;
    if (y + rect.height > window.innerHeight - 8) y = clientY - rect.height - margin;
    el.tooltip.style.left = `${Math.max(8, x)}px`;
    el.tooltip.style.top = `${Math.max(8, y)}px`;
  }

  document.addEventListener('mouseover', (event) => {
    const target = event.target.closest('[data-tooltip]');
    if (!target) return;
    el.tooltip.textContent = target.dataset.tooltip;
    el.tooltip.classList.add('visible');
    positionTooltip(target, event.clientX, event.clientY);
  });
  document.addEventListener('mousemove', (event) => {
    if (!el.tooltip.classList.contains('visible')) return;
    positionTooltip(null, event.clientX, event.clientY);
  });
  document.addEventListener('mouseout', (event) => {
    const target = event.target.closest('[data-tooltip]');
    if (!target || target.contains(event.relatedTarget)) return;
    el.tooltip.classList.remove('visible');
  });

  window.setInterval(() => {
    if (!state.time.paused) {
      state = S.advanceTime(state, 0.25);
      renderTop();
    }
  }, 250);

  data.operation && Object.assign(document.getElementById('operationTitle'), { textContent: data.operation.title });
  document.getElementById('operationPhase').textContent = data.operation.phase;
  document.getElementById('connectionText').textContent = data.operation.connection;
  document.getElementById('weatherText').textContent = data.operation.weather;
  document.getElementById('squadName').textContent = data.squad.name;
  document.getElementById('squadTask').textContent = data.squad.task;

  renderAll();
  state.notifications.forEach(scheduleAutoDismiss);
})();
