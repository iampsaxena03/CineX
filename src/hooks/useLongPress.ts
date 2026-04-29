import { useState, useRef, useCallback } from 'react';

interface Options {
  delay?: number;
  shouldPreventDefault?: boolean;
}

export default function useLongPress(
  onLongPress: (e: any) => void,
  onClick?: (e: any) => void,
  { delay = 600, shouldPreventDefault = true }: Options = {}
) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout>(null);
  const target = useRef<any>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (event: any) => {
      // For touch, record the starting position
      if (event.touches && event.touches[0]) {
        startPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
      
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('contextmenu', preventDefault, {
          passive: false
        });
      }
      target.current = event.target;
      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      if (timeout.current) clearTimeout(timeout.current);
      if (shouldTriggerClick && !longPressTriggered && onClick) onClick(event);
      setLongPressTriggered(false);
      startPos.current = null;
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('contextmenu', preventDefault);
      }
    },
    [onClick, longPressTriggered, shouldPreventDefault]
  );

  const handleMove = useCallback((event: any) => {
    if (!startPos.current || !event.touches[0]) return;
    
    const moveX = Math.abs(event.touches[0].clientX - startPos.current.x);
    const moveY = Math.abs(event.touches[0].clientY - startPos.current.y);
    
    // If moved more than 10px, it's a scroll/swipe, cancel long press
    if (moveX > 10 || moveY > 10) {
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }
    }
  }, []);

  return {
    onMouseDown: (e: any) => start(e),
    onTouchStart: (e: any) => start(e),
    onMouseUp: (e: any) => clear(e),
    onMouseLeave: (e: any, shouldTriggerClick = false) => clear(e, shouldTriggerClick),
    onTouchEnd: (e: any) => clear(e),
    onTouchMove: (e: any) => handleMove(e)
  };
}

const preventDefault = (event: any) => {
  if (!event.cancelable) return;
  event.preventDefault();
};
