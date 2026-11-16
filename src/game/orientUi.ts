import Phaser from 'phaser';
import { ORIENT_BUTTON_MARGIN, ORIENT_BUTTON_MIN_HEIGHT, ORIENT_BUTTON_MIN_WIDTH } from './constants.ts';
import {
  clientToStage,
  oppositePresentation,
  orientButtonAria,
  orientButtonText,
  physicalOrientation,
  stageLayout,
  stageToGame,
  useDeviceLock,
  type Presentation,
  type StageLayout,
  type Viewport,
} from './orient.ts';

/**
 * 手机上的横竖屏按钮。
 * 能锁方向的浏览器（多半要先全屏，iOS 不支持）就锁设备方向。
 * 锁不成就把整个画面转过来，按钮、符箓和结算跟着转，触摸坐标也换算回游戏里。
 */
export function installOrientationToggle(game: Phaser.Game): void {
  const shell = document.getElementById('shell');
  const button = document.getElementById('orient-toggle');
  if (!(shell instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
    return;
  }

  button.style.minWidth = `${ORIENT_BUTTON_MIN_WIDTH}px`;
  button.style.minHeight = `${ORIENT_BUTTON_MIN_HEIGHT}px`;
  button.style.left = `max(${ORIENT_BUTTON_MARGIN}px, env(safe-area-inset-left))`;
  button.style.bottom = `max(${ORIENT_BUTTON_MARGIN}px, env(safe-area-inset-bottom))`;

  let chosen: Presentation | null = null;
  let layout: StageLayout = stageLayout(readViewport(), 'landscape');
  let applying = false;

  const manager = game.input;
  const original = manager.transformPointer.bind(manager);
  manager.transformPointer = (pointer, pageX, pageY, wasMove) => {
    if (layout.rotateDeg === 0 || !game.canvas || game.canvas.clientWidth === 0 || game.canvas.clientHeight === 0) {
      original(pointer, pageX, pageY, wasMove);
      return;
    }
    const stage = clientToStage(pageX - window.scrollX, pageY - window.scrollY, layout);
    const gamePoint = stageToGame(stage.x, stage.y, {
      canvasLeft: game.canvas.offsetLeft,
      canvasTop: game.canvas.offsetTop,
      canvasWidth: game.canvas.clientWidth,
      canvasHeight: game.canvas.clientHeight,
      gameWidth: game.canvas.width,
      gameHeight: game.canvas.height,
    });
    const position = pointer.position;
    const previous = pointer.prevPosition;
    previous.x = position.x;
    previous.y = position.y;
    const smooth = pointer.smoothFactor;
    if (!wasMove || smooth === 0) {
      position.x = gamePoint.x;
      position.y = gamePoint.y;
      return;
    }
    position.x = gamePoint.x * smooth + previous.x * (1 - smooth);
    position.y = gamePoint.y * smooth + previous.y * (1 - smooth);
  };

  const originalBounds = game.scale.getParentBounds.bind(game.scale);
  game.scale.getParentBounds = () => {
    if (layout.rotateDeg === 0) {
      return originalBounds();
    }
    const changed = game.scale.parentSize.width !== layout.stageWidth || game.scale.parentSize.height !== layout.stageHeight;
    game.scale.parentSize.setSize(layout.stageWidth, layout.stageHeight);
    return changed;
  };
  const originalCenter = game.scale.updateCenter.bind(game.scale);
  game.scale.updateCenter = () => {
    if (layout.rotateDeg === 0 || !game.canvas) {
      originalCenter();
      return;
    }
    // getBoundingClientRect 在旋转后宽高对调，不能拿来算边距。
    const offsetX = Math.floor((layout.stageWidth - game.canvas.clientWidth) / 2);
    const offsetY = Math.floor((layout.stageHeight - game.canvas.clientHeight) / 2);
    game.canvas.style.marginLeft = `${offsetX}px`;
    game.canvas.style.marginTop = `${offsetY}px`;
  };

  const sync = () => {
    const viewport = readViewport();
    const presented = chosen ?? physicalOrientation(viewport);
    layout = stageLayout(viewport, presented);
    shell.style.width = `${layout.stageWidth}px`;
    shell.style.height = `${layout.stageHeight}px`;
    shell.style.transformOrigin = '0 0';
    shell.style.transform =
      layout.rotateDeg === 0
        ? 'none'
        : `translate(${layout.translateX}px, ${layout.translateY}px) rotate(${layout.rotateDeg}deg)`;
    shell.classList.toggle('presented-portrait', presented === 'portrait');
    shell.classList.toggle('presented-landscape', presented === 'landscape');
    document.documentElement.dataset.presented = presented;
    button.textContent = orientButtonText(presented);
    button.setAttribute('aria-label', orientButtonAria(presented));
    button.hidden = !coarsePointer();
    game.scale.refresh();
    window.dispatchEvent(new Event('shanhai-presented'));
  };

  const onToggle = () => {
    if (applying) {
      return;
    }
    const viewport = readViewport();
    const current = chosen ?? physicalOrientation(viewport);
    const next = oppositePresentation(current);
    chosen = next;
    applying = true;
    void lockOrFallback(next)
      .catch(() => {
        /* 锁方向失败时走页面旋转，不把拒绝变成未处理的 Promise。 */
      })
      .finally(() => {
        applying = false;
        sync();
      });
  };

  button.addEventListener('click', onToggle);
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mouseup'] as const) {
    button.addEventListener(type, (event) => {
      event.stopPropagation();
    });
  }

  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  window.visualViewport?.addEventListener('resize', sync);
  document.addEventListener('fullscreenchange', sync);
  screen.orientation?.addEventListener?.('change', sync);
  sync();
}

function readViewport(): Viewport {
  const visual = window.visualViewport;
  return {
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
  };
}

function coarsePointer(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

async function lockOrFallback(target: Presentation): Promise<void> {
  const locked = await attemptLock(target);
  if (!locked) {
    return;
  }
  const matched = await waitForPhysical(target, 400);
  if (useDeviceLock(true, matched ? target : physicalOrientation(readViewport()), target)) {
    return;
  }
  unlockOrientation();
}

function waitForPhysical(target: Presentation, ms: number): Promise<boolean> {
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (physicalOrientation(readViewport()) === target) {
        resolve(true);
        return;
      }
      if (performance.now() - start >= ms) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

interface LockableOrientation {
  lock?: (orientation: Presentation) => Promise<void>;
  unlock?: () => void;
}

function lockableOrientation(): LockableOrientation | null {
  return (screen.orientation as LockableOrientation | null) ?? null;
}

async function attemptLock(target: Presentation): Promise<boolean> {
  const orientation = lockableOrientation();
  if (!orientation || typeof orientation.lock !== 'function') {
    return false;
  }
  try {
    await orientation.lock(target);
    return true;
  } catch {
    /* 很多浏览器没全屏会拒绝，接着试全屏后再锁。 */
  }
  const element = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  const request = element.requestFullscreen?.bind(element) ?? element.webkitRequestFullscreen?.bind(element);
  if (!request || document.fullscreenElement) {
    return false;
  }
  let entered = false;
  try {
    await request();
    entered = true;
    await orientation.lock(target);
    return true;
  } catch {
    if (entered && document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        /* 退出全屏失败也不要冒泡。 */
      }
    }
    return false;
  }
}

function unlockOrientation(): void {
  try {
    lockableOrientation()?.unlock?.();
  } catch {
    /* unlock 在不支持的浏览器上会抛。 */
  }
}
