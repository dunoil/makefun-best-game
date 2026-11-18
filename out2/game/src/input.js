// Keyboard and mouse input for the warden. The tracker keeps a movement direction from the
// arrow keys / WASD, the last pointer position in field coordinates, and a queue of one-shot
// actions (confirm, pause, nova) the game loop drains each frame.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_NOVA = 4;

const KEY_DIRECTIONS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

/**
 * Create the input tracker bound to a canvas. `toField(clientX, clientY)` converts pointer
 * events into logical field coordinates (the renderer owns the scaling, so it is injected).
 */
export function createInput(canvas, toField) {
  const held = new Set();
  let pendingActions = 0;
  let pointer = null;
  let pointerActive = false;

  window.addEventListener('keydown', (event) => {
    if (KEY_DIRECTIONS[event.code]) {
      held.add(event.code);
      event.preventDefault();
    } else if (event.code === 'Enter') {
      pendingActions |= ACTION_CONFIRM;
    } else if (event.code === 'Space') {
      pendingActions |= ACTION_NOVA;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      pendingActions |= ACTION_PAUSE;
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointermove', (event) => {
    pointer = toField(event.clientX, event.clientY);
    pointerActive = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    pointer = toField(event.clientX, event.clientY);
    pointerActive = true;
    pendingActions |= ACTION_CONFIRM | ACTION_NOVA;
  });
  canvas.addEventListener('pointerleave', () => {
    pointerActive = false;
  });

  return {
    /** Current keyboard direction, each axis in -1..1 (diagonals are normalised by callers). */
    keyboardDirection() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const direction = KEY_DIRECTIONS[code];
        if (direction) {
          x += direction[0];
          y += direction[1];
        }
      }
      return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    },
    /** The pointer position in field coordinates, or null while the pointer is away. */
    pointerPosition() {
      return pointerActive ? pointer : null;
    },
    /** Drain the one-shot actions pressed since the last call, as an ACTION_* bitmask. */
    takeActions() {
      const actions = pendingActions;
      pendingActions = 0;
      return actions;
    },
  };
}
