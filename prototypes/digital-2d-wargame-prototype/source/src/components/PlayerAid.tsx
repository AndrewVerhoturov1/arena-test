import React, { useRef, useState, useCallback, useEffect } from 'react';

interface PlayerAidProps {
  onClose: () => void;
}

const PlayerAid: React.FC<PlayerAidProps> = ({ onClose }) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={windowRef}
      className="player-aid-window"
      style={{ left: position.x, top: position.y }}
    >
      <div className="player-aid-header" onMouseDown={handleMouseDown}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="paperclip-icon">📎</span>
          Памятка игрока
        </div>
        <button className="player-aid-close" onClick={onClose}>×</button>
      </div>
      <div className="player-aid-body">
        <h3>⚔ Порядок хода</h3>
        <p>Каждый раунд состоит из следующих фаз:</p>
        <ul>
          <li><strong>Фаза карт</strong> — каждый игрок получает карты из своей колоды</li>
          <li><strong>Фаза действий</strong> — игроки по очереди разыгрывают карты для выполнения действий</li>
          <li><strong>Фаза перемещения</strong> — перемещение счётчиков по связям между провинциями</li>
          <li><strong>Фаза сражений</strong> — разрешение конфликтов в спорных провинциях</li>
          <li><strong>Фаза контроля</strong> — подсчёт очков влияния и контроля территорий</li>
        </ul>

        <h3>🏛 Типы провинций</h3>
        <ul>
          <li><strong>Город</strong> — даёт 2 очка контроля, может содержать до 3 счётчиков</li>
          <li><strong>Порт</strong> — позволяет посадку и высадку флотов</li>
          <li><strong>Поселение</strong> — даёт 1 очко контроля</li>
          <li><strong>Крепость</strong> — бонус +1 к обороне</li>
        </ul>

        <h3>⚓ Счётчики</h3>
        <ul>
          <li><strong>Легион ⚔</strong> — основная сухопутная единица</li>
          <li><strong>Флот ⚓</strong> — морская единица, действует в портах</li>
          <li><strong>Полководец ★</strong> — усиливает армию в бою</li>
          <li><strong>Вспомогательные ◆</strong> — лёгкие войска, дешевле в наборе</li>
        </ul>

        <h3>🎴 Использование карт</h3>
        <p>Каждая карта может быть использована для:</p>
        <ul>
          <li>Перемещения войск (значение операции)</li>
          <li>Набора новых войск (значение стратегии)</li>
          <li>Специального события (текст карты)</li>
        </ul>

        <h3>🏆 Условия победы</h3>
        <p>Игрок побеждает, набрав <strong>10 очков влияния</strong> или контролируя <strong>5 ключевых городов</strong> в конце раунда.</p>

        <h3>⌨ Управление</h3>
        <ul>
          <li><strong>Колёсико мыши</strong> — масштабирование карты</li>
          <li><strong>Shift + перетаскивание</strong> — прокрутка карты</li>
          <li><strong>ЛКМ на счётчике</strong> — выбрать и перетащить</li>
          <li><strong>ПКМ</strong> — контекстное меню</li>
          <li><strong>ЛКМ на провинции</strong> — информация</li>
        </ul>
      </div>
    </div>
  );
};

export default PlayerAid;
