const keys = new Set();
let mouseDown = false;
let rightMouseDown = false;
let mouseX = 0, mouseY = 0;
let mouseDX = 0, mouseDY = 0;
let scrollDelta = 0;

let locked = false;

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) rightMouseDown = true;
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) rightMouseDown = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (locked) {
      mouseDX += e.movementX;
      mouseDY += e.movementY;
    }
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  canvas.addEventListener('wheel', (e) => {
    scrollDelta += e.deltaY;
  }, { passive: true });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('click', () => {
    if (!locked) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });
}

export function isKeyDown(code) { return keys.has(code); }
export function isMouseDown() { return mouseDown; }
export function isRightMouseDown() { return rightMouseDown; }

export function consumeRightClick() {
  if (rightMouseDown) {
    rightMouseDown = false;
    return true;
  }
  return false;
}

export function getMouseDelta() {
  const dx = mouseDX, dy = mouseDY;
  mouseDX = 0; mouseDY = 0;
  return { dx, dy };
}

export function consumeScrollDelta() {
  const d = scrollDelta;
  scrollDelta = 0;
  return d;
}

export function getMousePosition() {
  return { x: mouseX, y: mouseY };
}

export function isPointerLocked() { return locked; }
