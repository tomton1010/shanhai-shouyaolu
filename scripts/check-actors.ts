import { readFileSync } from 'node:fs';
import { actorFlipX, torsoLocalOffset } from '../src/game/actorFacing.ts';
import {
  ACTOR_FACING_DEADZONE,
  ACTOR_SPRITE_DISPLAY_SIZE,
  COMPANION_ATTACK_INTERVAL_MS,
  COMPANION_ATTACK_RANGE,
  COMPANION_BODY_HEIGHT,
  COMPANION_FOLLOW_DISTANCE,
  COMPANION_LOOK,
  DASH_COOLDOWN_MS,
  DASH_DISTANCE,
  DASH_DURATION_MS,
  DASH_SLASH_DAMAGE,
  DASH_SLASH_DURATION_MS,
  DASH_SLASH_RANGE,
  ORB_PICKUP_RADIUS,
  PLAYER_BODY_HEIGHT,
  PLAYER_HALF_EXTENT,
  PLAYER_LOOK,
  PLAYER_MAX_HP,
  PLAYER_MOVE_SPEED,
  TALISMAN_HEIGHT,
  TALISMAN_OFFSET_X,
  TALISMAN_WIDTH,
  TRAIL_FADE_MS,
  WHIP_SECTOR_DEGREES,
} from '../src/game/constants.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

function nearly(actual: number, expected: number, epsilon = 0.001): boolean {
  return Math.abs(actual - expected) <= epsilon;
}

function pngSize(path: string): { w: number; h: number } {
  const bytes = readFileSync(path);
  const copy = new Uint8Array(bytes);
  const view = new DataView(copy.buffer);
  return { w: view.getUint32(16), h: view.getUint32(20) };
}

function torsoStays(originX: number, originY: number, flipX: boolean): boolean {
  const offset = torsoLocalOffset(originX, originY, ACTOR_SPRITE_DISPLAY_SIZE, flipX);
  const dx = (originX - 0.5) * ACTOR_SPRITE_DISPLAY_SIZE;
  const dy = (originY - 0.5) * ACTOR_SPRITE_DISPLAY_SIZE;
  const torsoX = offset.x + (flipX ? -dx : dx);
  const torsoY = offset.y + dy;
  return nearly(torsoX, 0) && nearly(torsoY, 0);
}

assert(PLAYER_LOOK.name === '道士', 'player name');
assert(COMPANION_LOOK.name === '狌狌', 'companion name');
assert(!COMPANION_LOOK.name.includes('狒') && !COMPANION_LOOK.name.includes('狼'), 'companion is not renamed');
assert(PLAYER_LOOK.facing === 1 && COMPANION_LOOK.facing === 1, 'both idles face right');
assert(PLAYER_LOOK.file === 'art/player/taoist_idle.png', 'player texture path');
assert(COMPANION_LOOK.file === 'art/companion/xingxing_idle.png', 'companion texture path');
assert(PLAYER_LOOK.originY > 0.4 && PLAYER_LOOK.originY < 0.7, 'taoist anchor is the torso, not the hem');
assert(COMPANION_LOOK.originY > 0.3 && COMPANION_LOOK.originY < 0.6, 'xingxing anchor is the torso, not the ears');
assert(ACTOR_SPRITE_DISPLAY_SIZE >= PLAYER_BODY_HEIGHT && ACTOR_SPRITE_DISPLAY_SIZE <= 80, 'display size stays near the 64px body');
assert(COMPANION_BODY_HEIGHT === PLAYER_BODY_HEIGHT, 'companion height matches the player');

const playerPng = pngSize('public/art/player/taoist_idle.png');
const companionPng = pngSize('public/art/companion/xingxing_idle.png');
assert(playerPng.w === 256 && playerPng.h === 256, `player game texture is 256, got ${playerPng.w}x${playerPng.h}`);
assert(companionPng.w === 256 && companionPng.h === 256, `companion game texture is 256, got ${companionPng.w}x${companionPng.h}`);
const playerSource = pngSize('art/player/source/taoist_idle.png');
const companionSource = pngSize('art/companion/source/xingxing_idle.png');
assert(playerSource.w > 256 && playerSource.h > 256, 'player source is the higher-res original');
assert(companionSource.w > 256 && companionSource.h > 256, 'companion source is the higher-res original');

assert(torsoStays(PLAYER_LOOK.originX, PLAYER_LOOK.originY, false), 'taoist torso stays put facing right');
assert(torsoStays(PLAYER_LOOK.originX, PLAYER_LOOK.originY, true), 'taoist torso stays put when flipped');
assert(torsoStays(COMPANION_LOOK.originX, COMPANION_LOOK.originY, false), 'xingxing torso stays put facing right');
assert(torsoStays(COMPANION_LOOK.originX, COMPANION_LOOK.originY, true), 'xingxing torso stays put when flipped');

assert(actorFlipX(1, 1, ACTOR_FACING_DEADZONE, true) === false, 'moving right shows the original right-facing art');
assert(actorFlipX(-1, 1, ACTOR_FACING_DEADZONE, false) === true, 'moving left flips');
assert(actorFlipX(0.1, 1, ACTOR_FACING_DEADZONE, true) === true, 'a small horizontal component keeps the current facing');
assert(actorFlipX(-0.2, 1, ACTOR_FACING_DEADZONE, false) === false, 'nearly straight up or down does not flip');
assert(actorFlipX(-1, 0, ACTOR_FACING_DEADZONE, false) === false, 'a frontal sprite does not flip');

assert(DASH_DISTANCE === 140 && DASH_DURATION_MS === 110 && DASH_COOLDOWN_MS === 750, 'dash distance, duration, and cooldown stay');
assert(DASH_SLASH_RANGE === 78 && DASH_SLASH_DAMAGE === 2 && DASH_SLASH_DURATION_MS === 180, 'dash slash hitbox stays');
assert(WHIP_SECTOR_DEGREES === 65 && COMPANION_ATTACK_RANGE === 220 && COMPANION_ATTACK_INTERVAL_MS === 640, 'whip sector stays');
assert(ORB_PICKUP_RADIUS === 52 && PLAYER_MAX_HP === 100 && PLAYER_MOVE_SPEED === 320, 'pickup, hp, and move speed stay');
assert(PLAYER_HALF_EXTENT === 40 && COMPANION_FOLLOW_DISTANCE === 58 && TRAIL_FADE_MS === 180, 'bounds, follow, and trail timing stay');
assert(TALISMAN_WIDTH > 0 && TALISMAN_HEIGHT > 0 && Math.abs(TALISMAN_OFFSET_X) > 0, 'dash cooldown still has a talisman accent');

const readme = new TextDecoder().decode(readFileSync('art/actors/README.md'));
assert(readme.includes('狌狌') && !readme.includes('狒狒') && !readme.includes('狼狼'), 'readme keeps the companion name');

if (failed > 0) {
  throw new Error(`${failed} actor check(s) failed`);
}
console.log('actor checks passed');
