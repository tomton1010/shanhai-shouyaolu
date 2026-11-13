import {
  COMPANION_ATTACK_RANGE,
  COMPANION_DAMAGE,
  ENEMY_CAP,
  ENEMY_CONTACT_RADIUS,
  ENEMY_HP,
  GAME_HEIGHT,
  GAME_WIDTH,
  ORB_VALUE,
} from '../src/game/constants.ts';
import { countActive, createHuntState, stepHunt, type HuntFocus, type HuntState } from '../src/game/combat.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

function nearly(actual: number, expected: number, epsilon = 1): boolean {
  return Math.abs(actual - expected) <= epsilon;
}

const focus: HuntFocus = { x: 640, y: 360, facingX: 1, facingY: 0 };

function quiet(state: HuntState, ms: number, rng: () => number = () => 0): void {
  stepHunt(state, focus, ms, rng);
}

const spawned = createHuntState(focus.x, focus.y);
spawned.spawnMs = 0;
quiet(spawned, 16);
const born = spawned.enemies.find((enemy) => enemy.active);
assert(Boolean(born), 'an enemy spawns');
if (born) {
  const outside = born.x < -1 || born.x > GAME_WIDTH + 1 || born.y < -1 || born.y > GAME_HEIGHT + 1;
  assert(outside, `spawn stays off the canvas (${born.x}, ${born.y})`);
  assert(born.y < 0, `rng 0 uses the top edge, y=${born.y}`);
}

const chase = createHuntState(focus.x, focus.y);
chase.spawnMs = 10_000;
const chaser = chase.enemies[0];
chaser.active = true;
chaser.hp = ENEMY_HP;
chaser.x = 200;
chaser.y = 360;
quiet(chase, 1000);
assert(chaser.x > 200, `enemy chases, x=${chaser.x}`);
assert(nearly(chaser.y, 360, 2), `enemy holds the lane, y=${chaser.y}`);

const hunt = createHuntState(400, 360);
hunt.spawnMs = 10_000;
hunt.companionX = 400;
hunt.companionY = 360;
hunt.attackCooldownMs = 0;
const target = hunt.enemies[0];
target.active = true;
target.hp = ENEMY_HP;
target.x = 400 + COMPANION_ATTACK_RANGE - 20;
target.y = 360;
quiet(hunt, 16, () => 0.99);
assert(target.hp === ENEMY_HP - COMPANION_DAMAGE, `first whip damages, hp=${target.hp}`);
assert(hunt.xp === 0, 'damage is not xp');
assert(hunt.whips.some((whip) => whip.active), 'whip is visible');

const far = createHuntState(100, 100);
far.spawnMs = 10_000;
far.companionX = 100;
far.companionY = 100;
far.attackCooldownMs = 0;
far.enemies[0].active = true;
far.enemies[0].hp = ENEMY_HP;
far.enemies[0].x = 100 + COMPANION_ATTACK_RANGE + 40;
far.enemies[0].y = 100;
const farFocus: HuntFocus = { x: 100, y: 100, facingX: 0, facingY: -1 };
stepHunt(far, farFocus, 16, () => 0);
assert(far.enemies[0].hp === ENEMY_HP, 'out of range is not hit');

const closeKill = createHuntState(500, 360);
closeKill.spawnMs = 10_000;
closeKill.companionX = 600;
closeKill.companionY = 360;
closeKill.attackCooldownMs = 0;
closeKill.enemies[0].active = true;
closeKill.enemies[0].hp = 1;
closeKill.enemies[0].x = 660;
closeKill.enemies[0].y = 360;
stepHunt(closeKill, { x: 640, y: 360, facingX: 1, facingY: 0 }, 16, () => 0);
assert(!closeKill.enemies[0].active, 'lethal whip removes the enemy');
assert(closeKill.xp === ORB_VALUE, `nearby orb is picked up, xp=${closeKill.xp}`);

const kill = createHuntState(200, 360);
kill.spawnMs = 10_000;
kill.companionX = 200;
kill.companionY = 360;
kill.attackCooldownMs = 0;
kill.enemies[0].active = true;
kill.enemies[0].hp = 1;
kill.enemies[0].x = 320;
kill.enemies[0].y = 360;
const killFocus: HuntFocus = { x: 200, y: 360, facingX: -1, facingY: 0 };
stepHunt(kill, killFocus, 16, () => 0);
assert(!kill.enemies[0].active, 'far lethal whip removes the enemy');
const orb = kill.orbs.find((slot) => slot.active);
assert(Boolean(orb), 'a distant kill leaves an orb');
assert(kill.xp === 0, `distant orb is not collected yet, xp=${kill.xp}`);
if (orb) {
  let guard = 0;
  while (kill.xp === 0 && guard < 80) {
    stepHunt(kill, killFocus, 50, () => 0);
    guard += 1;
  }
  assert(kill.xp === ORB_VALUE, `magnet pickup grants xp, xp=${kill.xp}`);
}

const touch = createHuntState(300, 300);
touch.spawnMs = 10_000;
touch.attackCooldownMs = 10_000;
touch.enemies[0].active = true;
touch.enemies[0].hp = ENEMY_HP;
touch.enemies[0].x = 300;
touch.enemies[0].y = 300;
const touchFocus: HuntFocus = { x: 300, y: 300, facingX: 0, facingY: -1 };
stepHunt(touch, touchFocus, 16, () => 0);
assert(touch.playerFlashMs > 0, 'contact flashes the player');
assert(touch.enemies[0].active && touch.enemies[0].hp === ENEMY_HP, 'contact does not damage or kill');
assert(Math.hypot(touch.enemies[0].x - 300, touch.enemies[0].y - 300) <= ENEMY_CONTACT_RADIUS + 5, 'still in contact');

const crowd = createHuntState(640, 360);
let steps = 0;
while (countActive(crowd.enemies) < ENEMY_CAP && steps < ENEMY_CAP + 5) {
  crowd.spawnMs = 0;
  quiet(crowd, 16, () => 0.25);
  steps += 1;
}
assert(countActive(crowd.enemies) === ENEMY_CAP, `cap holds at ${countActive(crowd.enemies)}`);
crowd.spawnMs = 0;
quiet(crowd, 16, () => 0.5);
assert(countActive(crowd.enemies) === ENEMY_CAP, 'further spawns do not exceed the cap');

if (failed > 0) {
  throw new Error(`${failed} hunt check(s) failed`);
}

console.log('hunt checks passed');
