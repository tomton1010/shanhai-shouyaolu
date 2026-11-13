import { DASH_BUTTON_RADIUS, DASH_BUTTON_X, DASH_BUTTON_Y, GAME_WIDTH, JOYSTICK_MAX_RADIUS } from '../src/game/constants.ts';
import { hitsDashButton, isLeftHalf, joystickVector } from '../src/game/joystick.ts';

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

const idle = joystickVector(100, 100, 100, 100, JOYSTICK_MAX_RADIUS, 0.18);
assert(idle.x === 0 && idle.y === 0, 'untouched stick is zero');

const insideDeadzone = joystickVector(100, 100, 110, 100, JOYSTICK_MAX_RADIUS, 0.18);
assert(insideDeadzone.x === 0 && insideDeadzone.y === 0, 'deadzone ignores a small nudge');

const full = joystickVector(100, 100, 100 + JOYSTICK_MAX_RADIUS, 100, JOYSTICK_MAX_RADIUS, 0.18);
assert(nearly(full.x, 1) && nearly(full.y, 0), `full deflection ${full.x}`);

const past = joystickVector(100, 100, 400, 100, JOYSTICK_MAX_RADIUS, 0.18);
assert(nearly(past.x, 1) && nearly(past.y, 0), 'past the rim stays at full speed');

const half = joystickVector(0, 0, JOYSTICK_MAX_RADIUS / 2, 0, JOYSTICK_MAX_RADIUS, 0);
assert(nearly(half.x, 0.5) && nearly(half.y, 0), `half deflection ${half.x}`);

const diagonal = joystickVector(0, 0, 80, 80, JOYSTICK_MAX_RADIUS, 0);
assert(nearly(Math.hypot(diagonal.x, diagonal.y), 1), 'diagonal past the rim is unit length');

assert(isLeftHalf(100, GAME_WIDTH), 'left side');
assert(!isLeftHalf(GAME_WIDTH / 2, GAME_WIDTH), 'the midline belongs to the right side');
assert(!isLeftHalf(DASH_BUTTON_X, GAME_WIDTH), 'dash button is not on the left half');

assert(hitsDashButton(DASH_BUTTON_X, DASH_BUTTON_Y, DASH_BUTTON_X, DASH_BUTTON_Y, DASH_BUTTON_RADIUS), 'center hits');
assert(
  !hitsDashButton(DASH_BUTTON_X - 400, DASH_BUTTON_Y, DASH_BUTTON_X, DASH_BUTTON_Y, DASH_BUTTON_RADIUS),
  'far from the button misses',
);

if (failed > 0) {
  throw new Error(`${failed} joystick check(s) failed`);
}

console.log('joystick checks passed');
