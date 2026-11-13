import { CARD_STACK_CAP, LEVEL_XP_COSTS } from '../src/game/constants.ts';
import {
  emptyStacks,
  levelProgress,
  modifiersFrom,
  rollCards,
  xpToNextLevel,
  type CardId,
  type CardStacks,
} from '../src/game/cards.ts';
import { createHuntState, stepHunt } from '../src/game/combat.ts';
import { createMotionState, stepMotion } from '../src/game/motion.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

assert(LEVEL_XP_COSTS[3] > LEVEL_XP_COSTS[0], 'later levels cost more than the first');
assert(xpToNextLevel(1) === LEVEL_XP_COSTS[0], 'level 1 uses the first cost');
const progress = levelProgress(4, 0, 0);
assert(progress.level === 1 && progress.into === 4 && progress.need === LEVEL_XP_COSTS[0], 'progress before the first level');

const stacks = emptyStacks();
const first = rollCards(stacks, 3, mulberry32(1));
assert(first.length === 3, 'offers three cards');
assert(new Set(first).size === 3, 'the three cards are different');

const rerolled = rollCards(stacks, 3, mulberry32(2), first);
assert(rerolled.length === 3 && rerolled.every((id) => !first.includes(id)), 'reroll avoids the current three when it can');

const capped: CardStacks = emptyStacks();
for (const id of Object.keys(capped) as CardId[]) {
  capped[id] = CARD_STACK_CAP;
}
capped.damage = CARD_STACK_CAP - 1;
const onlyDamage = rollCards(capped, 3, () => 0);
assert(onlyDamage.length === 1 && onlyDamage[0] === 'damage', `full stacks leave only the open card, got ${onlyDamage.join(',')}`);

const stronger = modifiersFrom({ ...emptyStacks(), damage: 2, moveSpeed: 1, dashCooldown: 1 });
assert(stronger.hunt.damage === 1 + 2, `damage stacks, got ${stronger.hunt.damage}`);
assert(stronger.moveSpeed > 320, 'move speed increases');
assert(stronger.dashCooldownMs < 750, 'dash cooldown shortens');

const fast = createHuntState(400, 360);
fast.spawnMs = 10_000;
fast.companionX = 400;
fast.companionY = 360;
fast.attackCooldownMs = 0;
fast.enemies[0].active = true;
fast.enemies[0].hp = 3;
fast.enemies[0].x = 520;
fast.enemies[0].y = 360;
stepHunt(fast, { x: 400, y: 360, facingX: 1, facingY: 0 }, 16, () => 0, stronger.hunt);
assert(!fast.enemies[0].active, 'stacked damage kills a 3-hp enemy in one whip');

const moved = stepMotion(createMotionState(200, 360), { x: 1, y: 0, dash: false, moveSpeed: 640 }, 1000);
assert(Math.abs(moved.state.x - 840) < 1, `doubled move speed, x=${moved.state.x}`);

let slowSeeds = 0;
for (const seed of [1, 2, 3, 4, 5]) {
  const state = createHuntState(640, 360);
  const rng = mulberry32(seed);
  let taken = 0;
  let spent = 0;
  let atTwelve = 0;
  for (let elapsed = 0; elapsed < 60_000; elapsed += 16) {
    stepHunt(state, { x: 640, y: 360, facingX: 0, facingY: -1 }, 16, rng);
    while (state.xp - spent >= xpToNextLevel(taken + 1)) {
      spent += xpToNextLevel(taken + 1);
      taken += 1;
    }
    if (elapsed === 12_000 - 16) {
      atTwelve = taken;
    }
  }
  console.log(`seed ${seed}: levels ${taken}, xp ${state.xp}, at 12s ${atTwelve}`);
  if (taken < 3) {
    slowSeeds += 1;
  }
  assert(atTwelve < 3, `seed ${seed} reached 3 levels before 12s`);
}
assert(slowSeeds === 0, `${slowSeeds} seeds missed 3 levels in 60s`);

if (failed > 0) {
  throw new Error(`${failed} card check(s) failed`);
}

console.log('card checks passed');
