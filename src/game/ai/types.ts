import type { CombatEvent } from "../simulation/combat";
import type { CombatCollisionBounds, CombatEnemy, EnemyMotionState } from "../simulation/combat";
import type { GameState } from "../simulation/state";

export type EnemyAiState =
  | "idle"
  | "wander"
  | "chase"
  | "attackWindup"
  | "attackActive"
  | "recover"
  | "hurt"
  | "stunned"
  | "dead";

export type EnemyAnimationState = "idle" | "walk" | "run" | "area_attack" | "hurt" | "death";

export type EnemyAiProfileId = "slime" | "passive" | "stationaryBoss";

export type EnemyAnimationMap = Partial<Record<EnemyAiState, EnemyAnimationState>>;

export type EnemyMovementDefinition = {
  walkSpeedPxPerSecond: number;
  runSpeedPxPerSecond: number;
  detectionRadius: number;
  attackRadius: number;
  homeX: number;
  homeY: number;
  patrolRadius: number;
  wanderDecisionMs: number;
  recoverMs: number;
};

export type EnemyAiProfileDefinition = {
  id: EnemyAiProfileId;
  initialState: EnemyAiState;
  allowedStates: EnemyAiState[];
  canWander: boolean;
  canChase: boolean;
  canUseAreaAttack: boolean;
};

export type EnemyAiStepResult = {
  state: GameState;
  moved: boolean;
  enemyMotion: Record<string, EnemyMotionState>;
  enemyAnimationState: Record<string, EnemyAnimationState>;
  events: CombatEvent[];
};

export type EnemyAiContext = {
  state: GameState;
  enemy: CombatEnemy;
  deltaMs: number;
  bounds: CombatCollisionBounds;
  nowMs: number;
};
