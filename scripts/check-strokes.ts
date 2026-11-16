import {
  COMPANION_ATTACK_RANGE,
  CARD_RANGE_BONUS,
  CARD_STACK_CAP,
  DASH_SLASH_BOW_PX,
  DASH_SLASH_RANGE,
  WHIP_BEND_PX,
} from '../src/game/constants.ts';
import { slashStroke, whipStroke } from '../src/game/strokes.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function axisOffset(x: number, y: number, reachPointX: number, reachPointY: number): number {
  const dx = reachPointX;
  const dy = reachPointY;
  const length = Math.hypot(dx, dy) || 1;
  return Math.abs((-dy / length) * x + (dx / length) * y);
}

for (const reach of [COMPANION_ATTACK_RANGE, COMPANION_ATTACK_RANGE + CARD_STACK_CAP * CARD_RANGE_BONUS]) {
  const stroke = whipStroke(10, 20, 0, reach);
  assert(stroke.length === 3, 'a whip is one bent stroke');
  const tip = stroke[stroke.length - 1];
  assert(Math.abs(distance(10, 20, tip.x, tip.y) - reach) < 0.01, `tip sits on the attack range ${reach}, got ${distance(10, 20, tip.x, tip.y)}`);
  const bend = axisOffset(stroke[1].x - 10, stroke[1].y - 20, tip.x - 10, tip.y - 20);
  assert(Math.abs(bend - WHIP_BEND_PX) < 0.01, `bend stays small, ${bend}`);
  const oldSide = {
    x: 10 + Math.cos(0.7) * reach * 0.82,
    y: 20 + Math.sin(0.7) * reach * 0.82,
  };
  const nearOldRay = stroke.some((point) => distance(point.x, point.y, oldSide.x, oldSide.y) < reach * 0.2);
  assert(!nearOldRay, `no second ray at reach ${reach}`);
}

const slash = slashStroke(100, 200, 240, 200);
assert(slash.length === 3, 'a dash slash is one stroke');
assert(slash[0].x === 100 && slash[0].y === 200 && slash[2].x === 240 && slash[2].y === 200, 'the slash follows the dash segment');
assert(Math.abs(slash[1].y - 200) === DASH_SLASH_BOW_PX, `bow ${slash[1].y}`);
assert(DASH_SLASH_BOW_PX <= DASH_SLASH_RANGE, 'the visible bow stays inside the damage radius');
assert(Math.abs(slash[1].x - 170) < 0.01, 'the bow sits on the middle of the path');

if (failed > 0) {
  throw new Error(`${failed} stroke check(s) failed`);
}

console.log('stroke checks passed');
