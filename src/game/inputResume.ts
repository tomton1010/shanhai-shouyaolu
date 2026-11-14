export interface ResettablePointer {
  id: number;
  active: boolean;
  reset: () => void;
}

/**
 * Card taps can leave a touch pointer active: the button is removed on pointerup,
 * so the matching touchend never reaches Phaser. Later fingers then find no free slot.
 * Drop every non-mouse pointer. The mouse pointer is id 0 and stays active by design.
 */
export function releaseStuckTouchPointers(pointers: ResettablePointer[]): number {
  let released = 0;
  for (const pointer of pointers) {
    if (pointer.id > 0 && pointer.active) {
      pointer.reset();
      released += 1;
    }
  }
  return released;
}
