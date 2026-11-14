import {
  ENEMY_CONTACT_DAMAGE,
  ENEMY_HP,
  PLAYER_MAX_HP,
  RUN_DURATION_MS,
} from '../src/game/constants.ts';
import { createHuntState, stepHunt } from '../src/game/combat.ts';
import { advanceRunClock, formatRunClock } from '../src/game/runClock.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

assert(RUN_DURATION_MS === 180_000, 'a run is 3 minutes');
assert(formatRunClock(180_000) === '3:00', formatRunClock(180_000));
assert(formatRunClock(61_000) === '1:01', formatRunClock(61_000));
assert(formatRunClock(0) === '0:00', 'zero clock');

const almost = advanceRunClock(RUN_DURATION_MS - 30, 16);
assert(!almost.finished && almost.elapsedMs === RUN_DURATION_MS - 14, 'clock keeps the remainder');
const done = advanceRunClock(RUN_DURATION_MS - 10, 40);
assert(done.finished && done.elapsedMs === RUN_DURATION_MS, 'clock stops at the duration');

const touch = createHuntState(300, 300);
touch.spawnMs = 10_000;
touch.attackCooldownMs = 10_000;
touch.enemies[0].active = true;
touch.enemies[0].hp = ENEMY_HP;
touch.enemies[0].x = 300;
touch.enemies[0].y = 300;
const focus = { x: 300, y: 300, facingX: 0, facingY: -1 };
stepHunt(touch, focus, 16, () => 0);
assert(touch.playerHp === PLAYER_MAX_HP - ENEMY_CONTACT_DAMAGE, `contact damage ${touch.playerHp}`);
assert(touch.enemies[0].hp === ENEMY_HP, 'contact does not hurt the enemy');
stepHunt(touch, focus, 16, () => 0);
assert(touch.playerHp === PLAYER_MAX_HP - ENEMY_CONTACT_DAMAGE, 'contact cooldown blocks a second hit');

const fragile = createHuntState(300, 300);
fragile.spawnMs = 10_000;
fragile.attackCooldownMs = 10_000;
fragile.playerHp = ENEMY_CONTACT_DAMAGE;
fragile.enemies[0].active = true;
fragile.enemies[0].hp = ENEMY_HP;
fragile.enemies[0].x = 300;
fragile.enemies[0].y = 300;
stepHunt(fragile, focus, 16, () => 0);
assert(fragile.playerHp === 0, 'contact can empty the player');

const kill = createHuntState(200, 360);
kill.spawnMs = 10_000;
kill.companionX = 200;
kill.companionY = 360;
kill.attackCooldownMs = 0;
kill.enemies[0].active = true;
kill.enemies[0].hp = 1;
kill.enemies[0].x = 280;
kill.enemies[0].y = 360;
stepHunt(kill, { x: 200, y: 360, facingX: -1, facingY: 0 }, 16, () => 0);
assert(kill.kills === 1, `kill count ${kill.kills}`);

const fresh = createHuntState(640, 360);
assert(fresh.playerHp === PLAYER_MAX_HP && fresh.kills === 0 && fresh.xp === 0, 'a new run starts clean');

if (failed > 0) {
  throw new Error(`${failed} run check(s) failed`);
}

console.log('run checks passed');
