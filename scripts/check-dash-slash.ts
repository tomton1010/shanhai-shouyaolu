import {
  COMPANION_DAMAGE,
  DASH_SLASH_DAMAGE,
  DASH_SLASH_RANGE,
  ENEMY_HP,
} from '../src/game/constants.ts';
import { applyDashSlash, createHuntState, stepHunt, type EnemySlot } from '../src/game/combat.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

assert(ENEMY_HP === 2, `enemy hp is 2, got ${ENEMY_HP}`);
assert(COMPANION_DAMAGE === 1, 'a whip still hits for 1');
assert(DASH_SLASH_DAMAGE >= ENEMY_HP, 'one dash slash can kill a fresh enemy');

const quiet = createHuntState(100, 200);
quiet.spawnMs = 10_000;
quiet.attackCooldownMs = 10_000;

function place(slot: EnemySlot, x: number, y: number, hp = ENEMY_HP): void {
  slot.active = true;
  slot.hp = hp;
  slot.x = x;
  slot.y = y;
}

const onPath = quiet.enemies[0];
const beside = quiet.enemies[1];
const far = quiet.enemies[2];
place(onPath, 160, 200);
place(beside, 160, 200 + DASH_SLASH_RANGE - 8, 5);
place(far, 160, 200 + DASH_SLASH_RANGE + 36);

const hit = new Set<EnemySlot>();
applyDashSlash(quiet, 100, 200, 220, 200, hit, true);
assert(!onPath.active && quiet.kills === 1, `slash kills the enemy on the path, hp=${onPath.hp} kills=${quiet.kills}`);
assert(beside.hp === 5 - DASH_SLASH_DAMAGE, `nearby enemy takes one hit, hp=${beside.hp}`);
assert(far.active && far.hp === ENEMY_HP, `far enemy is untouched, hp=${far.hp}`);
assert(quiet.slash.active && quiet.slash.x1 === 100 && quiet.slash.x2 === 220, 'slash mark follows the segment');

applyDashSlash(quiet, 100, 200, 240, 200, hit, false);
assert(beside.hp === 5 - DASH_SLASH_DAMAGE, 'the same dash does not hit twice');
assert(quiet.slash.x1 === 100 && quiet.slash.x2 === 240, 'later frames extend the same slash');

const later = quiet.enemies[3];
place(later, 320, 200, 5);
applyDashSlash(quiet, 240, 200, 360, 200, hit, false);
assert(later.hp === 5 - DASH_SLASH_DAMAGE, `enemy met on the next slice is hit once, hp=${later.hp}`);
applyDashSlash(quiet, 400, 200, 480, 200, hit, false);
assert(later.hp === 5 - DASH_SLASH_DAMAGE, 'a later slice does not hit that enemy again');

const point = createHuntState(400, 300);
point.spawnMs = 10_000;
point.attackCooldownMs = 10_000;
place(point.enemies[0], 400 + DASH_SLASH_RANGE, 300);
const pointHit = new Set<EnemySlot>();
applyDashSlash(point, 400, 300, 400, 300, pointHit, true);
assert(point.enemies[0].hp === ENEMY_HP - DASH_SLASH_DAMAGE, 'a dash in place still cuts around the player');

stepHunt(quiet, { x: 300, y: 200, facingX: 1, facingY: 0 }, 16, () => 0);
assert(quiet.slash.lifeMs < 180, 'the slash mark fades');

if (failed > 0) {
  throw new Error(`${failed} dash slash check(s) failed`);
}

console.log('dash slash checks passed');
