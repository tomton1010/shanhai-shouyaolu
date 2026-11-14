import {
  DASH_COOLDOWN_MS,
  DASH_DISTANCE,
  DASH_DURATION_MS,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_HALF_EXTENT,
  PLAYER_MOVE_SPEED,
} from './constants.ts';

export interface MotionState {
  x: number;
  y: number;
  /** 上次非零移动方向，单位向量。站着冲刺时用它。 */
  facingX: number;
  facingY: number;
  dashRemainingMs: number;
  cooldownRemainingMs: number;
  dashDirX: number;
  dashDirY: number;
}

export interface MotionInput {
  /**
   * 移动向量。长度 ≤ 1 时按比例走路（摇杆半推就是半速）。
   * 键盘斜向会给出长度大于 1 的向量，这时收成单位向量，所以斜向不会更快。
   */
  x: number;
  y: number;
  /** 只在冲刺键按下的那一帧为 true。按住不重复。 */
  dash: boolean;
  /** 缺省用 PLAYER_MOVE_SPEED。升级的快步会传入更大的值。 */
  moveSpeed?: number;
  dashDistance?: number;
  dashCooldownMs?: number;
}

export interface MotionStep {
  state: MotionState;
  /** 这一帧在做冲刺位移。 */
  bursting: boolean;
  /** 这一帧刚开始一次冲刺。 */
  dashStarted: boolean;
  /** 冷却结束且没有正在进行的冲刺。 */
  dashReady: boolean;
}

export function createMotionState(x: number, y: number): MotionState {
  return {
    x,
    y,
    facingX: 0,
    facingY: -1,
    dashRemainingMs: 0,
    cooldownRemainingMs: 0,
    dashDirX: 0,
    dashDirY: -1,
  };
}

export function stepMotion(state: MotionState, input: MotionInput, deltaMs: number): MotionStep {
  const move = clampToUnit(input.x, input.y);
  let facingX = state.facingX;
  let facingY = state.facingY;
  if (move.x !== 0 || move.y !== 0) {
    facingX = move.x;
    facingY = move.y;
  }

  let dashRemainingMs = state.dashRemainingMs;
  let cooldownRemainingMs = state.cooldownRemainingMs;
  let dashDirX = state.dashDirX;
  let dashDirY = state.dashDirY;
  let dashStarted = false;

  const dashDistance = input.dashDistance ?? DASH_DISTANCE;
  const dashCooldownMs = input.dashCooldownMs ?? DASH_COOLDOWN_MS;
  const moveSpeed = input.moveSpeed ?? PLAYER_MOVE_SPEED;
  const canDash = input.dash && dashRemainingMs <= 0 && cooldownRemainingMs <= 0;
  if (canDash) {
    dashStarted = true;
    dashRemainingMs = DASH_DURATION_MS;
    cooldownRemainingMs = dashCooldownMs;
    dashDirX = facingX;
    dashDirY = facingY;
  }

  let x = state.x;
  let y = state.y;
  let bursting = false;

  if (dashRemainingMs > 0) {
    bursting = true;
    const stepMs = Math.min(deltaMs, dashRemainingMs);
    const distance = (dashDistance * stepMs) / DASH_DURATION_MS;
    x += dashDirX * distance;
    y += dashDirY * distance;
    dashRemainingMs = Math.max(0, dashRemainingMs - deltaMs);
  } else if (move.x !== 0 || move.y !== 0) {
    const seconds = deltaMs / 1000;
    x += move.x * moveSpeed * seconds;
    y += move.y * moveSpeed * seconds;
  }

  cooldownRemainingMs = Math.max(0, cooldownRemainingMs - deltaMs);

  x = clamp(x, PLAYER_HALF_EXTENT, GAME_WIDTH - PLAYER_HALF_EXTENT);
  y = clamp(y, PLAYER_HALF_EXTENT, GAME_HEIGHT - PLAYER_HALF_EXTENT);

  return {
    state: {
      x,
      y,
      facingX,
      facingY,
      dashRemainingMs,
      cooldownRemainingMs,
      dashDirX,
      dashDirY,
    },
    bursting,
    dashStarted,
    dashReady: dashRemainingMs <= 0 && cooldownRemainingMs <= 0,
  };
}

function clampToUnit(x: number, y: number): { x: number; y: number } {
  if (x === 0 && y === 0) {
    return { x: 0, y: 0 };
  }
  const length = Math.hypot(x, y);
  if (length <= 1) {
    return { x, y };
  }
  return { x: x / length, y: y / length };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
