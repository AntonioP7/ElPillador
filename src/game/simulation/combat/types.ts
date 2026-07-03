import type { Direction } from "../../input/actions";
import type { GameState } from "../state";
import type { EnemyAiProfileId, EnemyAnimationMap, EnemyAnimationState, EnemyMovementDefinition } from "../../ai/types";

export type AttackKind = "meleeCone" | "projectile" | "area";

export type AttackDefinition = {
  id: string;
  kind: AttackKind;
  damage: number;
  cooldownMs: number;
  durationMs: number;
  windupMs?: number;
  activeFromMs?: number;
  activeToMs?: number;
  range?: number;
  radius?: number;
  coneWidth?: number;
  startDistance?: number;
  speedPxPerSecond?: number;
  canHitPlayer: boolean;
  canHitEnemies: boolean;
  knockback?: number;
};

export type CombatCollisionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CombatCollisionBounds = {
  width: number;
  height: number;
  playerRadius: number;
  colliders: CombatCollisionRect[];
};

export type CombatEvent =
  | { type: "damage"; target: "player" | "enemy"; targetId: string; amount: number; source: string; x?: number; y?: number }
  | { type: "death"; target: "player" | "enemy"; targetId: string; source: string; x?: number; y?: number }
  | { type: "spawnProjectile"; projectileId: string }
  | { type: "destroyProjectile"; projectileId: string; x: number; y: number; reason: "enemy" | "wall" | "range" }
  | { type: "spawnBomb"; bombId: string; x: number; y: number }
  | { type: "bombWarning"; bombId: string; x: number; y: number; radius: number }
  | { type: "bombExplosion"; bombId: string; x: number; y: number; radius: number }
  | { type: "enemyAttackWarning"; attackId: string; enemyId: string; x: number; y: number; radius: number }
  | { type: "enemyAttackActive"; attackId: string; enemyId: string; x: number; y: number; radius: number }
  | { type: "playAnimation"; targetId: string; animation: string }
  | { type: "impactFx"; x: number; y: number; kind: "sword" | "magic" | "bomb" | "wall" };

export type CombatResult = {
  state: GameState;
  handled: boolean;
  changed: boolean;
  worldChanged?: boolean;
  hit?: boolean;
  message: string;
  events?: CombatEvent[];
};

export type ProjectileHitResult = CombatResult & {
  hit: boolean;
  hitX?: number;
  hitY?: number;
};

export type EnemyDamageDefinition = {
  damage: number;
  cooldownMs: number;
  knockback?: number;
};

export type EnemyAttackDefinition = {
  animation: string;
  damage: number;
  hitFrames: number[];
  hitbox: CombatCollisionRect;
  knockback: number;
  cooldownMs: number;
  frameRate: number;
  areaRadius?: number;
  windupMs?: number;
  activeFromMs?: number;
  activeToMs?: number;
  visualAfterMs?: number;
};

export type CombatEnemy = {
  id: string;
  roomId: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  kind: "minion" | "boss";
  species?: string;
  contactDamage?: EnemyDamageDefinition;
  attack?: EnemyAttackDefinition;
  attacks?: EnemyAttackDefinition[];
  aiProfile?: EnemyAiProfileId;
  movement?: EnemyMovementDefinition;
  animationMap?: EnemyAnimationMap;
  respawnOnEntry?: boolean;
};

export type EnemyMotionState = "idle" | "walk" | "run" | "attack";

export type EnemyAiResult = {
  state: GameState;
  moved: boolean;
  enemyMotion: Record<string, EnemyMotionState>;
  enemyAnimationState: Record<string, EnemyAnimationState>;
};

export type DirectionVector = {
  x: number;
  y: number;
};

export type DirectedPose = {
  x: number;
  y: number;
  facing: Direction;
};
