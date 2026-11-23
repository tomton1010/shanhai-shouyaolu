import {
  COMPANION_ATTACK_INTERVAL_MS,
  CARD_RANGE_BONUS,
  COMPANION_ATTACK_RANGE,
  COMPANION_DAMAGE,
  WHIP_SECTOR_DEGREES,
  WHIP_SECTOR_STACK_DEGREES,
  DASH_SLASH_DAMAGE,
  DASH_SLASH_DURATION_MS,
  DASH_SLASH_RANGE,
  COMPANION_FOLLOW_DISTANCE,
  COMPANION_SPEED,
  ENEMY_CAP,
  ENEMY_SPAWN_COUNT_LATE,
  ENEMY_SPAWN_RAMP_MS,
  ENEMY_CONTACT_COOLDOWN_MS,
  ENEMY_CONTACT_DAMAGE,
  ENEMY_HIT_FLASH_MS,
  ENEMY_PROFILES,
  ENEMY_SPAWN_COUNT,
  ENEMY_SPAWN_INTERVAL_MS,
  ENEMY_SPAWN_MARGIN,
  GAME_HEIGHT,
  GAME_WIDTH,
  ORB_CAP,
  ORB_MAGNET_RADIUS,
  ORB_MAGNET_SPEED,
  ORB_PICKUP_RADIUS,
  ORB_VALUE,
  PLAYER_HIT_FLASH_MS,
  PLAYER_MAX_HP,
  WHIP_CAP,
  WHIP_DURATION_MS,
} from './constants.ts';

export interface EnemySlot {
  active: boolean;
  x: number;
  y: number;
  hp: number;
  hitFlashMs: number;
  /** 0 窫窳、1 九尾狐、2 帝江。数值仍是原来的三种小怪。 */
  kind: number;
}

export interface DamagePopup {
  x: number;
  y: number;
  amount: number;
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
  /** 这一下画出来的长度，等于出手时的攻击距离。 */
  reach: number;
  lifeMs: number;
}

export interface SlashMark {
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lifeMs: number;
}

export interface HuntState {
  companionX: number;
  companionY: number;
  companionAngle: number;
  attackCooldownMs: number;
  xp: number;
  playerHp: number;
  kills: number;
  contactCooldownMs: number;
  playerFlashMs: number;
  spawnMs: number;
  timeMs: number;
  enemies: EnemySlot[];
  orbs: OrbSlot[];
  whips: WhipSlot[];
  slash: SlashMark;
  popups: DamagePopup[];
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
    playerHp: PLAYER_MAX_HP,
    kills: 0,
    contactCooldownMs: 0,
    playerFlashMs: 0,
    spawnMs: 0,
    timeMs: 0,
    enemies: Array.from({ length: ENEMY_CAP }, emptyEnemy),
    orbs: Array.from({ length: ORB_CAP }, emptyOrb),
    whips: Array.from({ length: WHIP_CAP }, emptyWhip),
    slash: emptySlash(),
    popups: [],
  };
}

/** 开局刷一只；过了 ENEMY_SPAWN_RAMP_MS 每次刷 ENEMY_SPAWN_COUNT_LATE 只。 */
export function spawnCountFor(timeMs: number): number {
  return timeMs >= ENEMY_SPAWN_RAMP_MS ? ENEMY_SPAWN_COUNT_LATE : ENEMY_SPAWN_COUNT;
}

export function enemyProfile(kind: number): (typeof ENEMY_PROFILES)[number] {
  return ENEMY_PROFILES[kind] ?? ENEMY_PROFILES[0];
}

/** 按权重抽一种。rng 为 0 时落在最常见的窫窳上。 */
export function rollEnemyKind(rng: () => number): number {
  const total = ENEMY_PROFILES.reduce((sum, profile) => sum + profile.weight, 0);
  let roll = rng() * total;
  for (let kind = 0; kind < ENEMY_PROFILES.length; kind += 1) {
    roll -= ENEMY_PROFILES[kind].weight;
    if (roll < 0) {
      return kind;
    }
  }
  return ENEMY_PROFILES.length - 1;
}

/**
 * 冲刺这一帧扫过的线段。alreadyHit 在同一次冲刺里保留，避免每一帧重复扣血。
 * started 为真时刀光从这一帧的起点重新画。
 */
export function applyDashSlash(
  state: HuntState,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  alreadyHit: Set<EnemySlot>,
  started: boolean,
): void {
  const mark = state.slash;
  if (started || !mark.active) {
    mark.x1 = fromX;
    mark.y1 = fromY;
    mark.lifeMs = DASH_SLASH_DURATION_MS;
  }
  mark.active = true;
  mark.x2 = toX;
  mark.y2 = toY;

  for (const enemy of state.enemies) {
    if (!enemy.active || alreadyHit.has(enemy)) {
      continue;
    }
    if (!inDashBand(enemy.x, enemy.y, fromX, fromY, toX, toY)) {
      continue;
    }
    alreadyHit.add(enemy);
    damageEnemy(state, enemy, DASH_SLASH_DAMAGE);
  }
}

/** 推进一帧。rng 返回 [0, 1)。接触按冷却扣玩家生命，并闪烁。 */
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
    const count = spawnCountFor(state.timeMs);
    for (let n = 0; n < count; n += 1) {
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
    const profile = enemyProfile(enemy.kind);
    if (distance > 0.001) {
      const step = Math.min(distance, profile.speed * (deltaMs / 1000));
      enemy.x += (dx / distance) * step;
      enemy.y += (dy / distance) * step;
    }
    if (Math.hypot(focus.x - enemy.x, focus.y - enemy.y) <= profile.contactRadius) {
      touching = true;
    }
    enemy.hitFlashMs = Math.max(0, enemy.hitFlashMs - deltaMs);
  }
  state.contactCooldownMs = Math.max(0, state.contactCooldownMs - deltaMs);
  if (touching && state.playerHp > 0) {
    state.playerFlashMs = PLAYER_HIT_FLASH_MS;
    if (state.contactCooldownMs <= 0) {
      state.playerHp = Math.max(0, state.playerHp - ENEMY_CONTACT_DAMAGE);
      state.contactCooldownMs = ENEMY_CONTACT_COOLDOWN_MS;
    }
  } else {
    state.playerFlashMs = Math.max(0, state.playerFlashMs - deltaMs);
  }

  followPlayer(state, focus, deltaMs);

  state.attackCooldownMs -= deltaMs;
  if (state.attackCooldownMs <= 0) {
    const target = nearestEnemy(state, state.companionX, state.companionY, mods.attackRange);
    if (target) {
      strike(state, target, mods.damage, mods.attackRange);
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
  if (state.slash.active) {
    state.slash.lifeMs -= deltaMs;
    if (state.slash.lifeMs <= 0) {
      state.slash.active = false;
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

function strike(state: HuntState, enemy: EnemySlot, damage: number, attackRange: number): void {
  state.companionAngle = Math.atan2(enemy.y - state.companionY, enemy.x - state.companionX);
  for (const victim of state.enemies) {
    if (
      !victim.active ||
      !inWhipSector(
        state.companionX,
        state.companionY,
        state.companionAngle,
        attackRange,
        whipSectorRadians(attackRange),
        victim.x,
        victim.y,
      )
    ) {
      continue;
    }
    damageEnemy(state, victim, damage);
  }
  const whip = state.whips.find((slot) => !slot.active);
  if (whip) {
    whip.active = true;
    whip.x = state.companionX;
    whip.y = state.companionY;
    whip.angle = state.companionAngle;
    whip.reach = attackRange;
    whip.lifeMs = WHIP_DURATION_MS;
  }
}

function damageEnemy(state: HuntState, enemy: EnemySlot, damage: number): void {
  state.popups.push({ x: enemy.x, y: enemy.y, amount: damage });
  enemy.hp -= damage;
  enemy.hitFlashMs = ENEMY_HIT_FLASH_MS;
  if (enemy.hp <= 0) {
    enemy.active = false;
    state.kills += 1;
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
  enemy.kind = rollEnemyKind(rng);
  enemy.hp = enemyProfile(enemy.kind).hp;
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
  return { active: false, x: 0, y: 0, hp: 0, hitFlashMs: 0, kind: 0 };
}

function emptyOrb(): OrbSlot {
  return { active: false, x: 0, y: 0 };
}

function emptyWhip(): WhipSlot {
  return { active: false, x: 0, y: 0, angle: 0, reach: 0, lifeMs: 0 };
}

function emptySlash(): SlashMark {
  return { active: false, x1: 0, y1: 0, x2: 0, y2: 0, lifeMs: 0 };
}

/** 这一下扇面的张角。长鞭每层加 WHIP_SECTOR_STACK_DEGREES。 */
export function whipSectorRadians(attackRange: number): number {
  const stacks = Math.max(0, (attackRange - COMPANION_ATTACK_RANGE) / CARD_RANGE_BONUS);
  const degrees = WHIP_SECTOR_DEGREES + stacks * WHIP_SECTOR_STACK_DEGREES;
  return (degrees * Math.PI) / 180;
}

/**
 * 扇面判定。朝向 aimAngle，张角居中。距离不超过半径、偏角不超过半张角都算打中。
 * 正好压在边上的也算。
 */
export function inWhipSector(
  originX: number,
  originY: number,
  aimAngle: number,
  range: number,
  sectorRadians: number,
  enemyX: number,
  enemyY: number,
): boolean {
  const dx = enemyX - originX;
  const dy = enemyY - originY;
  const distance = Math.hypot(dx, dy);
  if (distance > range + 1e-6) {
    return false;
  }
  if (distance <= 0.001) {
    return true;
  }
  const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - aimAngle), Math.cos(Math.atan2(dy, dx) - aimAngle));
  return Math.abs(delta) <= sectorRadians / 2 + 1e-6;
}

/** 冲刺这一段的范围：到线段的距离不超过带子半径，端点外的半圆也算。 */
export function inDashBand(
  enemyX: number,
  enemyY: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius = DASH_SLASH_RANGE,
): boolean {
  return distanceToSegment(enemyX, enemyY, fromX, fromY, toX, toY) <= radius;
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSquared = abx * abx + aby * aby;
  if (lengthSquared <= 0.0001) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.min(1, Math.max(0, ((px - ax) * abx + (py - ay) * aby) / lengthSquared));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}
