import {
  ATTACK_INTERVAL_MIN_MS,
  CARD_ATTACK_INTERVAL_DELTA_MS,
  CARD_DAMAGE_BONUS,
  CARD_DASH_COOLDOWN_DELTA_MS,
  CARD_DASH_DISTANCE_BONUS,
  CARD_MAGNET_RADIUS_BONUS,
  CARD_MAGNET_SPEED_BONUS,
  CARD_MOVE_SPEED_BONUS,
  CARD_PICKUP_BONUS,
  CARD_RANGE_BONUS,
  CARD_STACK_CAP,
  DASH_COOLDOWN_MIN_MS,
  DASH_COOLDOWN_MS,
  DASH_DISTANCE,
  LEVEL_XP_COSTS,
  LEVEL_XP_GROWTH,
  PLAYER_MOVE_SPEED,
} from './constants.ts';
import { defaultHuntMods, type HuntMods } from './combat.ts';

export type CardId =
  | 'damage'
  | 'attackSpeed'
  | 'range'
  | 'moveSpeed'
  | 'pickup'
  | 'magnet'
  | 'dashCooldown'
  | 'dashDistance';

export interface CardDef {
  id: CardId;
  name: string;
  detail: string;
}

export type CardStacks = Record<CardId, number>;

export function emptyStacks(): CardStacks {
  return {
    damage: 0,
    attackSpeed: 0,
    range: 0,
    moveSpeed: 0,
    pickup: 0,
    magnet: 0,
    dashCooldown: 0,
    dashDistance: 0,
  };
}

export function cardCatalog(): CardDef[] {
  return [
    { id: 'damage', name: '猛鞭', detail: `藤鞭伤害 +${CARD_DAMAGE_BONUS}` },
    { id: 'attackSpeed', name: '疾挥', detail: `攻击间隔 -${CARD_ATTACK_INTERVAL_DELTA_MS} 毫秒` },
    { id: 'range', name: '长鞭', detail: `攻击范围 +${CARD_RANGE_BONUS}` },
    { id: 'moveSpeed', name: '快步', detail: `移动速度 +${CARD_MOVE_SPEED_BONUS}` },
    { id: 'pickup', name: '广纳', detail: `拾取范围 +${CARD_PICKUP_BONUS}` },
    { id: 'magnet', name: '迅吸', detail: `灵气吸入速度 +${CARD_MAGNET_SPEED_BONUS}` },
    { id: 'dashCooldown', name: '疾冲', detail: `冲刺冷却 -${CARD_DASH_COOLDOWN_DELTA_MS} 毫秒` },
    { id: 'dashDistance', name: '长冲', detail: `冲刺距离 +${CARD_DASH_DISTANCE_BONUS}` },
  ];
}

export function cardById(id: CardId): CardDef {
  const found = cardCatalog().find((card) => card.id === id);
  if (!found) {
    throw new Error(`未知符箓 ${id}`);
  }
  return found;
}

/** 离开这一级还要多少灵气。level 从 1 开始。 */
export function xpToNextLevel(level: number): number {
  const index = Math.max(0, level - 1);
  if (index < LEVEL_XP_COSTS.length) {
    return LEVEL_XP_COSTS[index];
  }
  const last = LEVEL_XP_COSTS[LEVEL_XP_COSTS.length - 1];
  const extra = index - (LEVEL_XP_COSTS.length - 1);
  return Math.max(last + 1, Math.round(last * LEVEL_XP_GROWTH ** extra));
}

export interface LevelProgress {
  level: number;
  into: number;
  need: number;
}

export function levelProgress(xp: number, levelsTaken: number, xpSpent: number): LevelProgress {
  const level = levelsTaken + 1;
  const need = xpToNextLevel(level);
  const into = Math.max(0, xp - xpSpent);
  return { level, into: Math.min(into, need), need };
}

export interface RunModifiers {
  hunt: HuntMods;
  moveSpeed: number;
  dashDistance: number;
  dashCooldownMs: number;
}

export function modifiersFrom(stacks: CardStacks): RunModifiers {
  const base = defaultHuntMods();
  return {
    hunt: {
      damage: base.damage + stacks.damage * CARD_DAMAGE_BONUS,
      attackIntervalMs: Math.max(
        ATTACK_INTERVAL_MIN_MS,
        base.attackIntervalMs - stacks.attackSpeed * CARD_ATTACK_INTERVAL_DELTA_MS,
      ),
      attackRange: base.attackRange + stacks.range * CARD_RANGE_BONUS,
      pickupRadius: base.pickupRadius + stacks.pickup * CARD_PICKUP_BONUS,
      magnetRadius: base.magnetRadius + stacks.pickup * CARD_MAGNET_RADIUS_BONUS,
      magnetSpeed: base.magnetSpeed + stacks.magnet * CARD_MAGNET_SPEED_BONUS,
    },
    moveSpeed: PLAYER_MOVE_SPEED + stacks.moveSpeed * CARD_MOVE_SPEED_BONUS,
    dashDistance: DASH_DISTANCE + stacks.dashDistance * CARD_DASH_DISTANCE_BONUS,
    dashCooldownMs: Math.max(
      DASH_COOLDOWN_MIN_MS,
      DASH_COOLDOWN_MS - stacks.dashCooldown * CARD_DASH_COOLDOWN_DELTA_MS,
    ),
  };
}

export function eligibleCards(stacks: CardStacks): CardId[] {
  return cardCatalog()
    .filter((card) => stacks[card.id] < CARD_STACK_CAP)
    .map((card) => card.id);
}

/** 抽 count 张未满的符箓。优先避开 avoid，不够再从其余未满的里补。 */
export function rollCards(stacks: CardStacks, count: number, rng: () => number, avoid: CardId[] = []): CardId[] {
  const open = eligibleCards(stacks);
  const preferred = open.filter((id) => !avoid.includes(id));
  const pool = preferred.length >= count ? preferred : open;
  const shuffled = shuffle(pool, rng);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.min(index, Math.floor(Math.max(0, rng()) * (index + 1)));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}
