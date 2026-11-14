import { releaseStuckTouchPointers, type ResettablePointer } from '../src/game/inputResume.ts';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

function pointer(id: number, active: boolean): ResettablePointer & { active: boolean } {
  return {
    id,
    active,
    reset() {
      this.active = this.id === 0;
    },
  };
}

const pool = [pointer(0, true), pointer(1, true), pointer(2, true), pointer(3, true), pointer(4, true), pointer(5, true)];
const released = releaseStuckTouchPointers(pool);
assert(released === 5, `released ${released}`);
assert(pool[0].active === true, 'mouse pointer stays active');
assert(pool.slice(1).every((item) => item.active === false), 'touch pointers are free again');

const next = pool.find((item) => item.id > 0 && !item.active);
assert(Boolean(next), 'a new finger can take a free touch pointer');

const idle = [pointer(0, true), pointer(1, false)];
assert(releaseStuckTouchPointers(idle) === 0, 'nothing to release when the pool is already free');

if (failed > 0) {
  throw new Error(`${failed} input resume check(s) failed`);
}

console.log('input resume checks passed');
