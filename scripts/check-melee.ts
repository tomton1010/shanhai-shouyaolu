import {
  CARD_RANGE_BONUS,
  CARD_STACK_CAP,
  COMPANION_ATTACK_INTERVAL_MS,
  COMPANION_ATTACK_RANGE,
  COMPANION_DAMAGE,
  DASH_SLASH_DAMAGE,
  DASH_SLASH_RANGE,
  ENEMY_HP,
  ORB_VALUE,
  WHIP_SECTOR_DEGREES,
  WHIP_SECTOR_STACK_DEGREES,
} from '../src/game/constants.ts';
import {
  applyDashSlash,
  createHuntState,
  defaultHuntMods,
  inDashBand,
  inWhipSector,
  stepHunt,
  whipSectorRadians,
  type EnemySlot,
} from '../src/game/combat.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

const baseSpan = whipSectorRadians(COMPANION_ATTACK_RANGE);
const stackedSpan = whipSectorRadians(COMPANION_ATTACK_RANGE + CARD_STACK_CAP * CARD_RANGE_BONUS);
assert(Math.abs((baseSpan * 180) / Math.PI - WHIP_SECTOR_DEGREES) < 0.001, 'base sector is 65 degrees');
assert(
  Math.abs((stackedSpan * 180) / Math.PI - (WHIP_SECTOR_DEGREES + CARD_STACK_CAP * WHIP_SECTOR_STACK_DEGREES)) < 0.001,
  'five stacks open the sector to 105 degrees',
);
assert(inWhipSector(0, 0, 0, 220, baseSpan, 220, 0), 'the rim on the aim line is a hit');
assert(!inWhipSector(0, 0, 0, 220, baseSpan, 221, 0), 'one pixel past the radius is a miss');
const rimAngle = baseSpan / 2;
assert(
  inWhipSector(0, 0, 0, 220, baseSpan, Math.cos(rimAngle) * 220, Math.sin(rimAngle) * 220),
  'the angle rim is a hit',
);
assert(
  !inWhipSector(0, 0, 0, 220, baseSpan, Math.cos(rimAngle + 0.08) * 180, Math.sin(rimAngle + 0.08) * 180),
  'just outside the angle is a miss',
);
assert(inDashBand(0, DASH_SLASH_RANGE, 0, 0, 100, 0), 'the rim of the dash band is a hit');
assert(!inDashBand(0, DASH_SLASH_RANGE + 1, 0, 0, 100, 0), 'just outside the dash band is a miss');
assert(inDashBand(-DASH_SLASH_RANGE, 0, 0, 0, 80, 0), 'the round cap behind the dash start still hits');

function place(slot: EnemySlot, x: number, y: number, hp: number): void {
  slot.active = true;
  slot.hp = hp;
  slot.x = x;
  slot.y = y;
}

const focus = { x: 158, y: 300, facingX: 1, facingY: 0 };

function quietHunt() {
  const state = createHuntState(100, 300);
  state.spawnMs = 10_000;
  state.attackCooldownMs = 0;
  state.companionX = 100;
  state.companionY = 300;
  return state;
}

function fromCompanion(angle: number, distance: number): [number, number] {
  return [100 + Math.cos(angle) * distance, 300 + Math.sin(angle) * distance];
}

const crowd = quietHunt();
const aimSpot = fromCompanion(0, 40);
const sideSpot = fromCompanion(-0.3, 160);
const edgeSpot = fromCompanion(baseSpan / 2, COMPANION_ATTACK_RANGE);
const wideSpot = fromCompanion(baseSpan / 2 + 0.12, 150);
const farSpot = fromCompanion(0, COMPANION_ATTACK_RANGE + 24);
place(crowd.enemies[0], aimSpot[0], aimSpot[1], 4);
place(crowd.enemies[1], sideSpot[0], sideSpot[1], 4);
place(crowd.enemies[2], edgeSpot[0], edgeSpot[1], 4);
place(crowd.enemies[3], wideSpot[0], wideSpot[1], 4);
place(crowd.enemies[4], farSpot[0], farSpot[1], 4);
stepHunt(crowd, focus, 16, () => 0);
assert(crowd.enemies[0].hp === 4 - COMPANION_DAMAGE, `aim enemy ${crowd.enemies[0].hp}`);
assert(crowd.enemies[1].hp === 4 - COMPANION_DAMAGE, `inside the sector ${crowd.enemies[1].hp}`);
assert(crowd.enemies[2].hp === 4 - COMPANION_DAMAGE, `angle rim ${crowd.enemies[2].hp}`);
assert(crowd.enemies[3].hp === 4, `outside the angle ${crowd.enemies[3].hp}`);
assert(crowd.enemies[4].hp === 4, `past the radius ${crowd.enemies[4].hp}`);
assert(
  crowd.popups.filter((popup) => popup.amount === COMPANION_DAMAGE).length === 3,
  `one number per victim ${crowd.popups.length}`,
);

stepHunt(crowd, focus, 16, () => 0);
assert(crowd.enemies[0].hp === 4 - COMPANION_DAMAGE, 'the same swing does not hit again on the next frame');

crowd.attackCooldownMs = 0;
stepHunt(crowd, focus, COMPANION_ATTACK_INTERVAL_MS, () => 0);
assert(crowd.enemies[0].hp === 4 - COMPANION_DAMAGE * 2, 'the next swing hits the survivors');

const lethal = quietHunt();
place(lethal.enemies[0], 140, 300, COMPANION_DAMAGE);
place(lethal.enemies[1], 180, 320, COMPANION_DAMAGE);
stepHunt(lethal, focus, 16, () => 0);
assert(lethal.kills === 2, `two deaths count twice, got ${lethal.kills}`);
assert(
  lethal.orbs.filter((orb) => orb.active).length + (lethal.xp > 0 ? lethal.xp / ORB_VALUE : 0) === 2,
  'each death drops one orb',
);
stepHunt(lethal, focus, 16, () => 0);
assert(lethal.kills === 2, 'a dead enemy is not killed again');

const stackedRange = COMPANION_ATTACK_RANGE + CARD_STACK_CAP * CARD_RANGE_BONUS;
const opened = fromCompanion(0.7, 280);
const stacked = quietHunt();
place(stacked.enemies[0], 140, 300, 5);
place(stacked.enemies[1], opened[0], opened[1], 5);
place(stacked.enemies[2], 100 + stackedRange, 300, 5);
stepHunt(stacked, focus, 16, () => 0, { ...defaultHuntMods(), attackRange: stackedRange });
assert(stacked.enemies[1].hp === 5 - COMPANION_DAMAGE, 'five stacks open the angle enough to include 40 degrees');
assert(stacked.enemies[2].hp === 5 - COMPANION_DAMAGE, 'five stacks reach the new radius rim');
const shown = stacked.whips.find((whip) => whip.active);
assert(shown?.reach === stackedRange, `the sector radius is the upgraded range ${shown?.reach}`);
const stillWide = fromCompanion(stackedSpan / 2 + 0.2, 200);
const wideMiss = quietHunt();
place(wideMiss.enemies[0], 140, 300, 5);
place(wideMiss.enemies[1], stillWide[0], stillWide[1], 5);
stepHunt(wideMiss, focus, 16, () => 0, { ...defaultHuntMods(), attackRange: stackedRange });
assert(wideMiss.enemies[1].hp === 5, 'five stacks still leave a slash, not a circle');

const baseMiss = quietHunt();
place(baseMiss.enemies[0], 100 + stackedRange, 300, ENEMY_HP);
stepHunt(baseMiss, focus, 16, () => 0);
assert(baseMiss.enemies[0].hp === ENEMY_HP, 'without the upgrade that enemy is out of the circle');

const band = createHuntState(200, 200);
band.spawnMs = 10_000;
band.attackCooldownMs = 10_000;
place(band.enemies[0], 250, 200, 5);
place(band.enemies[1], 250, 200 + DASH_SLASH_RANGE, 5);
place(band.enemies[2], 250, 200 + DASH_SLASH_RANGE + 20, 5);
const hit = new Set<EnemySlot>();
applyDashSlash(band, 200, 200, 320, 200, hit, true);
assert(band.enemies[0].hp === 5 - DASH_SLASH_DAMAGE, 'dash hits the enemy on the path');
assert(band.enemies[1].hp === 5 - DASH_SLASH_DAMAGE, 'dash hits the enemy on the band rim');
assert(band.enemies[2].hp === 5, 'dash misses past the band');
applyDashSlash(band, 320, 200, 420, 200, hit, false);
assert(band.enemies[0].hp === 5 - DASH_SLASH_DAMAGE, 'the rest of the same dash does not hit them again');
applyDashSlash(band, 200, 200, 320, 200, new Set(), true);
assert(band.enemies[0].hp === 5 - DASH_SLASH_DAMAGE * 2, 'a new dash hits the survivor again');

if (failed > 0) {
  throw new Error(`${failed} melee check(s) failed`);
}

console.log('melee checks passed');
