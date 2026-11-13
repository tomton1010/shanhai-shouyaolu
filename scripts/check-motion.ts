import {
  DASH_COOLDOWN_MS,
  DASH_DISTANCE,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_HALF_EXTENT,
  PLAYER_MOVE_SPEED,
} from '../src/game/constants.ts';
import { createMotionState, stepMotion, type MotionState } from '../src/game/motion.ts';

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

function walk(state: MotionState, x: number, y: number, deltaMs: number): MotionState {
  return stepMotion(state, { x, y, dash: false }, deltaMs).state;
}

const open = createMotionState(480, 360);
let walked = open;
const stepMs = 1000 / 60;
for (let i = 0; i < 60; i += 1) {
  walked = walk(walked, 1, 0, stepMs);
}
assert(nearly(walked.x, open.x + PLAYER_MOVE_SPEED), `walk 1s right, x=${walked.x}`);
assert(nearly(walked.y, open.y), `walk 1s right keeps y, y=${walked.y}`);

let diagonal = open;
for (let i = 0; i < 60; i += 1) {
  diagonal = walk(diagonal, 1, 1, stepMs);
}
const diagonalDistance = Math.hypot(diagonal.x - open.x, diagonal.y - open.y);
assert(nearly(diagonalDistance, PLAYER_MOVE_SPEED, 0.01), `diagonal speed ${diagonalDistance}`);

let dashed = createMotionState(480, 360);
let dashDistance = 0;
for (let frame = 0; frame < 40; frame += 1) {
  const step = stepMotion(dashed, { x: 1, y: 0, dash: frame === 0 }, 16);
  if (!step.bursting) {
    break;
  }
  dashDistance += Math.hypot(step.state.x - dashed.x, step.state.y - dashed.y);
  dashed = step.state;
}
assert(nearly(dashDistance, DASH_DISTANCE, 0.01), `dash distance ${dashDistance}`);

const longDash = stepMotion(createMotionState(200, 200), { x: 0, y: 1, dash: true }, 1000);
const longDistance = Math.hypot(longDash.state.x - 200, longDash.state.y - 200);
assert(nearly(longDistance, DASH_DISTANCE, 0.01), `long frame dash distance ${longDistance}`);
assert(longDash.state.dashRemainingMs === 0, 'long frame finishes the burst');

const first = stepMotion(createMotionState(640, 360), { x: 1, y: 0, dash: true }, 16);
const second = stepMotion(first.state, { x: 1, y: 0, dash: true }, 16);
assert(first.dashStarted, 'first tap starts a dash');
assert(!second.dashStarted, 'dash during cooldown does not start');

let cooled = createMotionState(640, 360);
let starts = 0;
const simulatedMs = 5000;
for (let elapsed = 0; elapsed < simulatedMs; elapsed += 16) {
  const step = stepMotion(cooled, { x: 0, y: 0, dash: true }, 16);
  if (step.dashStarted) {
    starts += 1;
  }
  cooled = step.state;
}
const expectedStarts = Math.floor((simulatedMs - 1) / DASH_COOLDOWN_MS) + 1;
assert(starts === expectedStarts, `held dash starts ${starts}, expected ${expectedStarts}`);

const idleDash = stepMotion(createMotionState(640, 360), { x: 0, y: 0, dash: true }, DASH_COOLDOWN_MS);
assert(idleDash.dashStarted, 'idle dash starts');
assert(nearly(idleDash.state.x, 640), 'idle dash keeps x');
assert(idleDash.state.y < 360, 'idle dash follows the initial up facing');

const atRight = stepMotion(
  createMotionState(GAME_WIDTH - PLAYER_HALF_EXTENT, 360),
  { x: 1, y: 0, dash: false },
  1000,
);
assert(atRight.state.x === GAME_WIDTH - PLAYER_HALF_EXTENT, 'clamp right');
const atTop = stepMotion(createMotionState(640, PLAYER_HALF_EXTENT), { x: 0, y: -1, dash: true }, 1000);
assert(atTop.state.y === PLAYER_HALF_EXTENT, 'clamp top');
assert(atTop.state.y >= 0 && atTop.state.x <= GAME_WIDTH, 'stays on the canvas');
assert(GAME_HEIGHT === 720 && GAME_WIDTH === 1280, 'canvas size');

const idle = walk(createMotionState(400, 400), 0, 0, 500);
assert(nearly(idle.x, 400) && nearly(idle.y, 400), 'no input does not drift');

if (failed > 0) {
  throw new Error(`${failed} motion check(s) failed`);
}

console.log('motion checks passed');
