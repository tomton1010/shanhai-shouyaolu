/** 左半屏按下的位置是摇杆原点。向量长度最大为 1。 */
export function joystickVector(
  originX: number,
  originY: number,
  fingerX: number,
  fingerY: number,
  radius: number,
  deadzone: number,
): { x: number; y: number } {
  const dx = fingerX - originX;
  const dy = fingerY - originY;
  const length = Math.hypot(dx, dy);
  if (length === 0 || radius <= 0) {
    return { x: 0, y: 0 };
  }
  const clamped = Math.min(length, radius) / radius;
  if (clamped <= deadzone) {
    return { x: 0, y: 0 };
  }
  const span = 1 - deadzone;
  const strength = span <= 0 ? 1 : (clamped - deadzone) / span;
  return { x: (dx / length) * strength, y: (dy / length) * strength };
}

export function hitsDashButton(x: number, y: number, centerX: number, centerY: number, radius: number): boolean {
  return Math.hypot(x - centerX, y - centerY) <= radius;
}

export function isLeftHalf(x: number, width: number): boolean {
  return x < width / 2;
}
