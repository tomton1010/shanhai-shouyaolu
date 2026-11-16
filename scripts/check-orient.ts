import { GAME_HEIGHT, GAME_WIDTH } from '../src/game/constants.ts';
import {
  clientToStage,
  oppositePresentation,
  orientButtonAria,
  orientButtonText,
  physicalOrientation,
  stageLayout,
  stageToClient,
  stageToGame,
  useDeviceLock,
} from '../src/game/orient.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

function nearly(actual: number, expected: number, epsilon = 0.01): boolean {
  return Math.abs(actual - expected) <= epsilon;
}

const phone = { width: 390, height: 844 };
assert(physicalOrientation(phone) === 'portrait', 'a tall viewport is portrait');
assert(orientButtonText('portrait') === '横屏', 'portrait offers landscape');
assert(orientButtonAria('portrait') === '切换到横屏', 'aria names the landscape switch');
assert(oppositePresentation('portrait') === 'landscape', 'toggle leaves portrait');

const landscape = stageLayout(phone, 'landscape');
assert(landscape.rotateDeg === 90, 'portrait device uses a 90 degree fallback for landscape');
assert(landscape.stageWidth === 844 && landscape.stageHeight === 390, 'landscape stage swaps the viewport');
for (const point of [
  { x: 0, y: 0 },
  { x: landscape.stageWidth, y: 0 },
  { x: 0, y: landscape.stageHeight },
  { x: landscape.stageWidth, y: landscape.stageHeight },
]) {
  const client = stageToClient(point.x, point.y, landscape);
  assert(client.x >= -0.01 && client.x <= phone.width + 0.01, `client x stays in view ${client.x}`);
  assert(client.y >= -0.01 && client.y <= phone.height + 0.01, `client y stays in view ${client.y}`);
  const back = clientToStage(client.x, client.y, landscape);
  assert(nearly(back.x, point.x) && nearly(back.y, point.y), `round trip ${point.x},${point.y} -> ${back.x},${back.y}`);
}

const identity = stageLayout(phone, 'portrait');
assert(identity.rotateDeg === 0 && identity.stageWidth === 390 && identity.stageHeight === 844, 'matching orientation is not rotated');
const same = clientToStage(40, 80, identity);
assert(same.x === 40 && same.y === 80, 'identity mapping keeps the pointer');

const wide = { width: 800, height: 400 };
const portraitOnWide = stageLayout(wide, 'portrait');
assert(portraitOnWide.rotateDeg === -90, 'landscape device rotates the other way for portrait');
const backToLandscape = stageLayout(wide, oppositePresentation('portrait'));
assert(backToLandscape.rotateDeg === 0, 'switching back clears the rotation');

const fit = {
  canvasLeft: 75,
  canvasTop: 0,
  canvasWidth: 693,
  canvasHeight: 390,
  gameWidth: GAME_WIDTH,
  gameHeight: GAME_HEIGHT,
};
const origin = stageToGame(fit.canvasLeft, fit.canvasTop, fit);
const far = stageToGame(fit.canvasLeft + fit.canvasWidth, fit.canvasTop + fit.canvasHeight, fit);
assert(nearly(origin.x, 0) && nearly(origin.y, 0), 'canvas origin is game origin');
assert(nearly(far.x, GAME_WIDTH) && nearly(far.y, GAME_HEIGHT), 'canvas far corner is the game far corner');

assert(useDeviceLock(true, 'landscape', 'landscape'), 'a resolved lock counts only after the viewport matches');
assert(!useDeviceLock(true, 'portrait', 'landscape'), 'a resolved lock that did not rotate falls back');
assert(!useDeviceLock(false, 'landscape', 'landscape'), 'a rejected lock is not treated as a device rotation');

if (failed > 0) {
  throw new Error(`${failed} orientation check(s) failed`);
}

console.log('orientation checks passed');
