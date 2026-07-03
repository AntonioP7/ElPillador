import type { AttackDefinition } from "./types";

export const SWORD_CONFIG = {
  id: "weapon.sword.slash",
  kind: "meleeCone",
  damage: 1,
  range: 16,
  startDistance: 8,
  width: 16,
  coneWidth: 16,
  durationMs: 100,
  cooldownMs: 120,
  impactDelayMs: 50,
  recoilDistance: 14,
  canHitPlayer: false,
  canHitEnemies: true,
} as const satisfies AttackDefinition & {
  width: number;
  impactDelayMs: number;
  recoilDistance: number;
};

export const MAGIC_PROJECTILE_CONFIG = {
  id: "weapon.wand.projectile",
  kind: "projectile",
  speedPxPerSecond: 360,
  cooldownMs: 420,
  damage: 1,
  radius: 7,
  range: 520,
  spawnOffset: 26,
  durationMs: 1500,
  canHitPlayer: false,
  canHitEnemies: true,
} as const satisfies AttackDefinition & {
  spawnOffset: number;
};

export const BOMB_CONFIG = {
  id: "item.bomb.explosion",
  kind: "area",
  fuseMs: 3000,
  radius: 92,
  damage: 2,
  playerDamage: 2,
  placedRadius: 12,
  maxActive: 1,
  warningMs: 3000,
  cooldownMs: 0,
  durationMs: 220,
  canHitPlayer: true,
  canHitEnemies: true,
} as const satisfies AttackDefinition & {
  fuseMs: number;
  playerDamage: number;
  placedRadius: number;
  maxActive: number;
  warningMs: number;
};

export const ENEMY_HURT_STUN_MS = 420;
export const ENEMY_HIT_INVULNERABILITY_MS = 650;
