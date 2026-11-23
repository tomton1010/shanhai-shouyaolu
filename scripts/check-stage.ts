import { readFileSync } from 'node:fs';
import {
  COMPANION_ATTACK_INTERVAL_MS,
  COMPANION_ATTACK_RANGE,
  DASH_SLASH_DAMAGE,
  DASH_SLASH_DURATION_MS,
  DASH_SLASH_LOOK,
  DASH_SLASH_RANGE,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_LOOK,
  ORB_DISPLAY_SIZE,
  ORB_LOOK,
  ORB_PICKUP_RADIUS,
  WHIP_SECTOR_DEGREES,
  WHIP_VINE_LOOK,
} from '../src/game/constants.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

function pngSize(path: string): { w: number; h: number } {
  const bytes = readFileSync(path);
  const copy = new Uint8Array(bytes);
  const view = new DataView(copy.buffer);
  return { w: view.getUint32(16), h: view.getUint32(20) };
}

const ground = pngSize(`public/${GROUND_LOOK.file}`);
const source = pngSize('art/ground/source/zhaoyao_ground.png');
assert(ground.w === GAME_WIDTH && ground.h === GAME_HEIGHT, `ground fills the canvas, got ${ground.w}x${ground.h}`);
assert(source.w === GAME_WIDTH && source.h === GAME_HEIGHT, 'ground source is the same canvas');

const vine = pngSize(`public/${WHIP_VINE_LOOK.file}`);
assert(vine.w === WHIP_VINE_LOOK.frameWidth && vine.h === WHIP_VINE_LOOK.frameHeight, 'whip frame matches the file');
assert(WHIP_VINE_LOOK.originY > 0.75 && WHIP_VINE_LOOK.originX < 0.4, 'the vine is anchored at the root');
assert(WHIP_VINE_LOOK.tipRadius > 700 && WHIP_VINE_LOOK.tipRadius < 1000, 'the vine scales from its own length');

const slash = pngSize(`public/${DASH_SLASH_LOOK.file}`);
assert(
  slash.w === DASH_SLASH_LOOK.frameWidth && slash.h === DASH_SLASH_LOOK.frameHeight,
  'dash slash frame matches the file',
);
assert(slash.w > slash.h * 3, 'the slash art is a long band');

const orb = pngSize(`public/${ORB_LOOK.file}`);
assert(orb.w > 64 && orb.h > 64, 'lingqi art is a real texture');
assert(ORB_DISPLAY_SIZE === 14, `orb display stays the old 14px circle, got ${ORB_DISPLAY_SIZE}`);

assert(WHIP_SECTOR_DEGREES === 65 && COMPANION_ATTACK_RANGE === 220, 'whip sector numbers stay');
assert(COMPANION_ATTACK_INTERVAL_MS === 640, 'whip interval stays');
assert(DASH_SLASH_RANGE === 78 && DASH_SLASH_DAMAGE === 2 && DASH_SLASH_DURATION_MS === 180, 'dash slash hitbox stays');
assert(ORB_PICKUP_RADIUS === 52, 'pickup radius stays');

const readme = new TextDecoder().decode(readFileSync('art/fx/README.md'));
assert(readme.includes('狌狌') && !readme.includes('狼狼') && !readme.includes('狒狒'), 'stage readme keeps the companion name');
assert(readme.includes('招摇之山'), 'the map name stays a label, not only a bitmap');

if (failed > 0) {
  throw new Error(`${failed} stage check(s) failed`);
}
console.log('stage checks passed');
