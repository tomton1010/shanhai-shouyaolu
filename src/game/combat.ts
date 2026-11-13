import {
  COMPANION_ATTACK_INTERVAL_MS,
  COMPANION_ATTACK_RANGE,
  COMPANION_DAMAGE,
  COMPANION_FOLLOW_DISTANCE,
  COMPANION_SPEED,
  ENEMY_CAP,
  ENEMY_CONTACT_RADIUS,
  ENEMY_HP,
  ENEMY_HIT_FLASH_MS,
  ENEMY_SPAWN_COUNT,
  ENEMY_SPAWN_INTERVAL_MS,
  ENEMY_SPAWN_MARGIN,
  ENEMY_SPEED,
  GAME_HEIGHT,
  GAME_WIDTH,
  ORB_CAP,
  ORB_MAGNET_RADIUS,
  ORB_MAGNET_SPEED,
  ORB_PICKUP_RADIUS,
  ORB_VALUE,
  PLAYER_HIT_FLASH_MS,
  WHIP_CAP,
  WHIP_DURATION_MS,
} from './constants.ts';

export interface EnemySlot {
  active: boolean;
  x: number;
  y: number;
  hp: number;
  hitFlashMs: number;
}

export interface OrbSlot {
  active: boolean;
  x: number;
  y: number;
}

export interface WhipSlot {
  active: boolean;
  x: number;
  y: number;
  angle: number;
  lifeMs: number;
}

export interface HuntState {
  companionX: number;
  companionY: number;
  companionAngle: number;
  attackCooldownMs: number;
  xp: number;
  playerFlashMs: number;
  spawnMs: number;
  timeMs: number;
  enemies: EnemySlot[];
  orbs: OrbSlot[];
  whips: WhipSlot[];
}

export interface HuntFocus {
  x: number;
  y: number;
  facingX: number;
  facingY: number;
}

export interface HuntMods {
  damage: number;
  attackIntervalMs: number;
  attackRange: number;
  pickupRadius: number;
  magnetRadius: number;
  magnetSpeed: number;
}

export function defaultHuntMods(): HuntMods {
  return {
    damage: COMPANION_DAMAGE,
    attackIntervalMs: COMPANION_ATTACK_INTERVAL_MS,
    attackRange: COMPANION_ATTACK_RANGE,
    pickupRadius: ORB_PICKUP_RADIUS,
    magnetRadius: ORB_MAGNET_RADIUS,
    magnetSpeed: ORB_MAGNET_SPEED,
  };
}

export function createHuntState(x: number, y: number): HuntState {
  return {
    companionX: x + 46,
    companionY: y + 28,
    companionAngle: -Math.PI / 2,
    attackCooldownMs: 0,
    xp: 0,
    playerFlashMs: 0,
    spawnMs: 0,
    timeMs: 0,
    enemies: Array.from({ length: ENEMY_CAP }, emptyEnemy),
    orbs: Array.from({ length: ORB_CAP }, emptyOrb),
    whips: Array.from({ length: WHIP_CAP }, emptyWhip),
  };
}

/** 推进一帧。rng 返回 [0, 1)。玩家没有生命值，碰到只记闪烁。 */
export function stepHunt(
  state: HuntState,
  focus: HuntFocus,
  deltaMs: number,
  rng: () => number,
  mods: HuntMods = defaultHuntMods(),
): void {
  state.timeMs += deltaMs;
  state.spawnMs -= deltaMs;
  if (state.spawnMs <= 0) {
    state.spawnMs = ENEMY_SPAWN_INTERVAL_MS;
    for (let n = 0; n < ENEMY_SPAWN_COUNT; n += 1) {
      spawnEnemy(state, rng);
    }
  }

  let touching = false;
  for (const enemy of state.enemies) {
    if (!enemy.active) {
      continue;
    }
    const dx = focus.x - enemy.x;
    const dy = focus.y - enemy.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0.001) {
      const step = Math.min(distance, ENEMY_SPEED * (deltaMs / 1000));
      enemy.x += (dx / distance) * step;
      enemy.y += (dy / distance) * step;
    }
    if (Math.hypot(focus.x - enemy.x, focus.y - enemy.y) <= ENEMY_CONTACT_RADIUS) {
      touching = true;
    }
    enemy.hitFlashMs = Math.max(0, enemy.hitFlashMs - deltaMs);
  }
  state.playerFlashMs = touching ? PLAYER_HIT_FLASH_MS : Math.max(0, state.playerFlashMs - deltaMs);

  followPlayer(state, focus, deltaMs);

  state.attackCooldownMs -= deltaMs;
  if (state.attackCooldownMs <= 0) {
    const target = nearestEnemy(state, state.companionX, state.companionY, mods.attackRange);
    if (target) {
      strike(state, target, mods.damage);
      state.attackCooldownMs = mods.attackIntervalMs;
    }
  }

  collectOrbs(state, focus, deltaMs, mods);
  for (const whip of state.whips) {
    if (!whip.active) {
      continue;
    }
    whip.lifeMs -= deltaMs;
    if (whip.lifeMs <= 0) {
      whip.active = false;
    }
  }
}

export function countActive(slots: { active: boolean }[]): number {
  let count = 0;
  for (const slot of slots) {
    if (slot.active) {
      count += 1;
    }
  }
  return count;
}

function followPlayer(state: HuntState, focus: HuntFocus, deltaMs: number): void {
  const aimX = focus.x - focus.facingX * COMPANION_FOLLOW_DISTANCE;
  const aimY = focus.y - focus.facingY * COMPANION_FOLLOW_DISTANCE;
  const dx = aimX - state.companionX;
  const dy = aimY - state.companionY;
  const distance = Math.hypot(dx, dy);
  if (distance > 2) {
    const step = Math.min(distance, COMPANION_SPEED * (deltaMs / 1000));
    state.companionX += (dx / distance) * step;
    state.companionY += (dy / distance) * step;
    state.companionAngle = Math.atan2(dy, dx);
  }
}

function strike(state: HuntState, enemy: EnemySlot, damage: number): void {
  state.companionAngle = Math.atan2(enemy.y - state.companionY, enemy.x - state.companionX);
  enemy.hp -= damage;
  enemy.hitFlashMs = ENEMY_HIT_FLASH_MS;
  const whip = state.whips.find((slot) => !slot.active);
  if (whip) {
    whip.active = true;
    whip.x = state.companionX;
    whip.y = state.companionY;
    whip.angle = state.companionAngle;
    whip.lifeMs = WHIP_DURATION_MS;
  }
  if (enemy.hp <= 0) {
    enemy.active = false;
    dropOrb(state, enemy.x, enemy.y);
  }
}

function dropOrb(state: HuntState, x: number, y: number): void {
  const orb = state.orbs.find((slot) => !slot.active);
  if (!orb) {
    return;
  }
  orb.active = true;
  orb.x = x;
  orb.y = y;
}

function collectOrbs(state: HuntState, focus: HuntFocus, deltaMs: number, mods: HuntMods): void {
  let left = deltaMs;
  while (left > 0) {
    const slice = Math.min(16, left);
    left -= slice;
    for (const orb of state.orbs) {
      if (!orb.active) {
        continue;
      }
      const toPlayer = Math.hypot(focus.x - orb.x, focus.y - orb.y);
      const toCompanion = Math.hypot(state.companionX - orb.x, state.companionY - orb.y);
      const playerCloser = toPlayer <= toCompanion;
      const nearest = playerCloser ? toPlayer : toCompanion;
      if (nearest <= mods.pickupRadius) {
        orb.active = false;
        state.xp += ORB_VALUE;
        continue;
      }
      if (nearest <= mods.magnetRadius && nearest > 0.001) {
        const targetX = playerCloser ? focus.x : state.companionX;
        const targetY = playerCloser ? focus.y : state.companionY;
        const travel = Math.min(mods.magnetSpeed * (slice / 1000), nearest - mods.pickupRadius * 0.45);
        if (travel > 0) {
          orb.x += ((targetX - orb.x) / nearest) * travel;
          orb.y += ((targetY - orb.y) / nearest) * travel;
        }
      }
    }
  }
}

function spawnEnemy(state: HuntState, rng: () => number): void {
  const enemy = state.enemies.find((slot) => !slot.active);
  if (!enemy) {
    return;
  }
  const side = Math.floor(rng() * 4) % 4;
  const along = rng();
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = along * GAME_WIDTH;
    y = -ENEMY_SPAWN_MARGIN;
  } else if (side === 1) {
    x = GAME_WIDTH + ENEMY_SPAWN_MARGIN;
    y = along * GAME_HEIGHT;
  } else if (side === 2) {
    x = along * GAME_WIDTH;
    y = GAME_HEIGHT + ENEMY_SPAWN_MARGIN;
  } else {
    x = -ENEMY_SPAWN_MARGIN;
    y = along * GAME_HEIGHT;
  }
  enemy.active = true;
  enemy.x = x;
  enemy.y = y;
  enemy.hp = ENEMY_HP;
  enemy.hitFlashMs = 0;
}

function nearestEnemy(state: HuntState, x: number, y: number, range: number): EnemySlot | null {
  let best: EnemySlot | null = null;
  let bestDistance = range;
  for (const enemy of state.enemies) {
    if (!enemy.active) {
      continue;
    }
    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if (distance <= bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}

function emptyEnemy(): EnemySlot {
  return { active: false, x: 0, y: 0, hp: 0, hitFlashMs: 0 };
}

function emptyOrb(): OrbSlot {
  return { active: false, x: 0, y: 0 };
}

function emptyWhip(): WhipSlot {
  return { active: false, x: 0, y: 0, angle: 0, lifeMs: 0 };
}
