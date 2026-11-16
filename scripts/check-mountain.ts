import {
  CARD_RANGE_BONUS,
  CARD_STACK_CAP,
  COMPANION_ATTACK_RANGE,
  COMPANION_DAMAGE,
  DASH_SLASH_DAMAGE,
  ENEMY_CAP,
  ENEMY_HP,
  ENEMY_KIND_COUNT,
  ENEMY_LOOKS,
  ENEMY_SPAWN_COUNT,
  ENEMY_SPAWN_COUNT_LATE,
  ENEMY_SPAWN_RAMP_MS,
} from '../src/game/constants.ts';
import {
  applyDashSlash,
  createHuntState,
  defaultHuntMods,
  spawnCountFor,
  stepHunt,
  type EnemySlot,
} from '../src/game/combat.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

assert(ENEMY_HP === 2, `shared enemy hp stays 2, got ${ENEMY_HP}`);
assert(ENEMY_CAP >= 24, `cap allows dozens, got ${ENEMY_CAP}`);
assert(ENEMY_LOOKS.length === ENEMY_KIND_COUNT && ENEMY_KIND_COUNT === 3, 'three enemy looks');
assert(new Set(ENEMY_LOOKS.map((look) => look.body)).size === 3, 'body colors differ');
assert(new Set(ENEMY_LOOKS.map((look) => look.mark)).size === 3, 'mark colors differ');
assert(spawnCountFor(0) === ENEMY_SPAWN_COUNT, 'the opening still spawns one at a time');
assert(spawnCountFor(ENEMY_SPAWN_RAMP_MS) === ENEMY_SPAWN_COUNT_LATE, 'later waves spawn a pair');

const focus = { x: 158, y: 300, facingX: 1, facingY: 0 };

function arm(x: number, hp: number) {
  const state = createHuntState(100, 300);
  state.spawnMs = 10_000;
  state.attackCooldownMs = 0;
  state.companionX = 100;
  state.companionY = 300;
  state.enemies[0].active = true;
  state.enemies[0].hp = hp;
  state.enemies[0].x = x;
  state.enemies[0].y = 300;
  return state;
}

const base = arm(100 + COMPANION_ATTACK_RANGE - 12, ENEMY_HP);
stepHunt(base, focus, 16, () => 0);
const baseWhip = base.whips.find((whip) => whip.active);
assert(baseWhip?.reach === COMPANION_ATTACK_RANGE, `base whip reach ${baseWhip?.reach}`);
assert(base.popups.some((popup) => popup.amount === COMPANION_DAMAGE), 'a whip shows the damage it dealt');

const stackedRange = COMPANION_ATTACK_RANGE + CARD_STACK_CAP * CARD_RANGE_BONUS;
const stacked = arm(100 + stackedRange - 12, 5);
stepHunt(stacked, focus, 16, () => 0, { ...defaultHuntMods(), attackRange: stackedRange });
const longWhip = stacked.whips.find((whip) => whip.active);
assert(longWhip?.reach === stackedRange, `stacked whip reach ${longWhip?.reach}`);
assert((longWhip?.reach ?? 0) > (baseWhip?.reach ?? 0), 'each extra range stack lengthens the whip');
assert(stacked.enemies[0].hp === 5 - COMPANION_DAMAGE, 'the longer whip still connects');

const outside = arm(100 + COMPANION_ATTACK_RANGE + 40, ENEMY_HP);
stepHunt(outside, focus, 16, () => 0);
assert(outside.enemies[0].hp === ENEMY_HP, 'base range does not hit past itself');
assert(!outside.whips.some((whip) => whip.active), 'a miss does not play a whip');

const field = createHuntState(640, 360);
field.attackCooldownMs = 1_000_000;
let tick = 0;
const rng = () => {
  tick += 1;
  return (tick % 5) / 5;
};
for (let step = 0; step < ENEMY_CAP; step += 1) {
  field.spawnMs = 0;
  stepHunt(field, { x: 640, y: 360, facingX: 0, facingY: -1 }, 16, rng);
}
const alive = field.enemies.filter((enemy) => enemy.active);
const kinds = new Set(alive.map((enemy) => enemy.kind));
assert(alive.length === ENEMY_CAP, `screen holds the cap, got ${alive.length}`);
assert(kinds.size === ENEMY_KIND_COUNT, `all three kinds appear, got ${[...kinds].join(',')}`);
assert(
  alive.every((enemy) => enemy.hp === ENEMY_HP),
  'every kind spawns at the same hp',
);

const slash = createHuntState(200, 200);
slash.spawnMs = 10_000;
slash.attackCooldownMs = 10_000;
const quarry: EnemySlot = slash.enemies[0];
quarry.active = true;
quarry.hp = 5;
quarry.kind = 2;
quarry.x = 240;
quarry.y = 200;
applyDashSlash(slash, 200, 200, 280, 200, new Set(), true);
assert(quarry.hp === 5 - DASH_SLASH_DAMAGE, 'dash slash damage is unchanged');
assert(
  slash.popups.some((popup) => popup.amount === DASH_SLASH_DAMAGE),
  'dash slash shows its own damage number',
);

if (failed > 0) {
  throw new Error(`${failed} mountain check(s) failed`);
}

console.log('mountain checks passed');
