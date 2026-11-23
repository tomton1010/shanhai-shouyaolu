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
  ENEMY_PROFILES,
  ENEMY_ROUND_HP,
  ENEMY_TALL_HP,
  ENEMY_SPAWN_COUNT,
  ENEMY_SPAWN_COUNT_LATE,
  ENEMY_SPAWN_RAMP_MS,
} from '../src/game/constants.ts';
import {
  applyDashSlash,
  createHuntState,
  defaultHuntMods,
  enemyProfile,
  rollEnemyKind,
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

assert(ENEMY_HP === 2, `balanced enemy hp stays 2, got ${ENEMY_HP}`);
assert(ENEMY_PROFILES[1].hp === ENEMY_TALL_HP && ENEMY_TALL_HP < ENEMY_HP, 'the tall one is fragile');
assert(ENEMY_PROFILES[2].hp === ENEMY_ROUND_HP && ENEMY_ROUND_HP === ENEMY_HP + 1, 'the round one has one extra hit');
assert(
  ENEMY_PROFILES[1].speed > ENEMY_PROFILES[0].speed && ENEMY_PROFILES[2].speed < ENEMY_PROFILES[0].speed,
  'tall is faster and round is slower than the baseline',
);
assert(ENEMY_PROFILES[2].weight < ENEMY_PROFILES[1].weight && ENEMY_PROFILES[1].weight < ENEMY_PROFILES[0].weight, 'the tank is the rarest');
assert(DASH_SLASH_DAMAGE >= ENEMY_HP && DASH_SLASH_DAMAGE >= ENEMY_TALL_HP, 'a dash still deletes the common kinds');
assert(DASH_SLASH_DAMAGE < ENEMY_ROUND_HP, 'a dash still wounds the tank');
assert(ENEMY_CAP >= 24, `cap allows dozens, got ${ENEMY_CAP}`);
assert(ENEMY_LOOKS.length === ENEMY_KIND_COUNT && ENEMY_KIND_COUNT === 3, 'three enemy looks');
assert(new Set(ENEMY_LOOKS.map((look) => look.texture)).size === 3, 'three enemy textures');
assert(new Set(ENEMY_LOOKS.map((look) => look.name)).size === 3, 'three enemy names');
assert(ENEMY_LOOKS[0].facing === -1, 'yayu art faces left');
assert(ENEMY_LOOKS[1].facing === 1, 'the fox art faces right');
assert(ENEMY_LOOKS[2].facing === 0, 'dijiang stays frontal');
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
assert(alive.length === ENEMY_CAP, `screen holds the cap, got ${alive.length}`);
assert(
  alive.every((enemy) => enemy.hp === ENEMY_PROFILES[enemy.kind].hp),
  'a spawn uses that kind\'s hp',
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

const counts = [0, 0, 0];
for (let sample = 0; sample < 700; sample += 1) {
  counts[rollEnemyKind(() => sample / 700)] += 1;
}
assert(counts[0] > counts[1] && counts[1] > counts[2] && counts[2] > 0, `weights ${counts.join(',')}`);
const expectedHp =
  ENEMY_PROFILES.reduce((sum, profile) => sum + profile.hp * profile.weight, 0) /
  ENEMY_PROFILES.reduce((sum, profile) => sum + profile.weight, 0);
assert(expectedHp <= ENEMY_HP, `average hp stays at or under the old baseline, ${expectedHp}`);

function chaseDistance(kind: number): number {
  const state = createHuntState(640, 360);
  state.spawnMs = 10_000;
  state.attackCooldownMs = 10_000;
  const enemy = state.enemies[0];
  enemy.active = true;
  enemy.kind = kind;
  enemy.hp = 9;
  enemy.x = 200;
  enemy.y = 360;
  stepHunt(state, { x: 640, y: 360, facingX: 1, facingY: 0 }, 1000, () => 0);
  return enemy.x - 200;
}

const farFast = chaseDistance(1);
const farWide = chaseDistance(0);
const farRound = chaseDistance(2);
assert(farFast > farWide && farWide > farRound, `chase distances fast ${farFast} wide ${farWide} round ${farRound}`);
assert(Math.abs(farWide - enemyProfile(0).speed) < 2, `wide speed ${farWide}`);

const brush = createHuntState(300, 300);
brush.spawnMs = 10_000;
brush.attackCooldownMs = 10_000;
brush.enemies[0].active = true;
brush.enemies[0].kind = 1;
brush.enemies[0].hp = 4;
brush.enemies[0].x = 300;
brush.enemies[0].y = 300 + enemyProfile(1).contactRadius + 8;
stepHunt(brush, { x: 300, y: 300, facingX: 0, facingY: -1 }, 16, () => 0);
assert(brush.playerHp === 100, 'the narrow one does not touch from the old wider radius');
brush.enemies[1].active = true;
brush.enemies[1].kind = 2;
brush.enemies[1].hp = 4;
brush.enemies[1].x = 300 + enemyProfile(2).contactRadius - 4;
brush.enemies[1].y = 300;
stepHunt(brush, { x: 300, y: 300, facingX: 0, facingY: -1 }, 16, () => 0);
assert(brush.playerHp < 100, 'the round shell reaches a little farther');

if (failed > 0) {
  throw new Error(`${failed} mountain check(s) failed`);
}

console.log('mountain checks passed');
