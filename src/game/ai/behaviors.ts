import { ensureEnemyAreaAttack } from "../simulation/combat/areaAttackSystem";
import { moveEnemyToward } from "../simulation/combat/knockbackSystem";
import type { GameState } from "../simulation/state";
import type { CombatCollisionBounds, CombatEnemy, CombatEvent, EnemyMotionState } from "../simulation/combat";
import type { EnemyAiState, EnemyAnimationState, EnemyMovementDefinition } from "./types";

export type BehaviorResult = {
  state: GameState;
  moved: boolean;
  nextState: EnemyAiState;
  motion: EnemyMotionState;
  animation: EnemyAnimationState;
  events: CombatEvent[];
};

export function wanderBehavior(
  state: GameState,
  enemy: CombatEnemy,
  movement: EnemyMovementDefinition,
  deltaMs: number,
  bounds: CombatCollisionBounds,
  nowMs: number,
): BehaviorResult {
  const combat = state.enemyCombat[enemy.id] ?? {};
  const target = shouldPickNewWanderTarget(combat.lastDecisionAt, nowMs, movement)
    ? deterministicWanderTarget(enemy.id, movement, nowMs)
    : {
        x: combat.targetX ?? movement.homeX,
        y: combat.targetY ?? movement.homeY,
      };
  const next = moveEnemyToward(enemy, target, movement.walkSpeedPxPerSecond * Math.max(0, deltaMs / 1000), bounds);
  const moved = next.x !== enemy.x || next.y !== enemy.y;

  return {
    state: {
      ...state,
      enemyPositions: {
        ...state.enemyPositions,
        [enemy.id]: next,
      },
      enemyCombat: {
        ...state.enemyCombat,
        [enemy.id]: {
          ...combat,
          targetX: target.x,
          targetY: target.y,
          lastDecisionAt: shouldPickNewWanderTarget(combat.lastDecisionAt, nowMs, movement)
            ? new Date(nowMs).toISOString()
            : combat.lastDecisionAt,
        },
      },
    },
    moved,
    nextState: "wander",
    motion: moved ? "walk" : "idle",
    animation: moved ? "walk" : "idle",
    events: [],
  };
}

export function chaseBehavior(
  state: GameState,
  enemy: CombatEnemy,
  movement: EnemyMovementDefinition,
  deltaMs: number,
  bounds: CombatCollisionBounds,
): BehaviorResult {
  const target = { x: state.playerPose.x, y: state.playerPose.y };
  const next = moveEnemyToward(enemy, target, movement.runSpeedPxPerSecond * Math.max(0, deltaMs / 1000), bounds);
  const moved = next.x !== enemy.x || next.y !== enemy.y;

  return {
    state: {
      ...state,
      enemyPositions: {
        ...state.enemyPositions,
        [enemy.id]: next,
      },
    },
    moved,
    nextState: "chase",
    motion: moved ? "run" : "idle",
    animation: moved ? "run" : "idle",
    events: [],
  };
}

export function areaAttackBehavior(
  state: GameState,
  enemy: CombatEnemy,
  movement: EnemyMovementDefinition,
  nowMs: number,
): BehaviorResult {
  const attack = enemy.attack;

  if (!attack) {
    return {
      state,
      moved: false,
      nextState: "recover",
      motion: "idle",
      animation: "idle",
      events: [],
    };
  }

  const result = ensureEnemyAreaAttack(state, enemy, nowMs, {
    intervalMs: attack.cooldownMs,
    windupMs: attack.windupMs ?? 650,
    activeFromMs: attack.activeFromMs ?? 650,
    activeToMs: attack.activeToMs ?? 1000,
    visualToMs: (attack.activeToMs ?? 1000) + (attack.visualAfterMs ?? movement.recoverMs),
    radius: attack.areaRadius ?? movement.attackRadius,
    damage: attack.damage,
  });
  const recoverUntil = new Date(nowMs + (attack.activeToMs ?? 1000) + movement.recoverMs).toISOString();

  return {
    state: {
      ...result.state,
      enemyCombat: {
        ...result.state.enemyCombat,
        [enemy.id]: {
          ...result.state.enemyCombat[enemy.id],
          recoverUntil,
        },
      },
    },
    moved: false,
    nextState: result.changed ? "attackWindup" : "recover",
    motion: "attack",
    animation: "area_attack",
    events: result.events ?? [],
  };
}

export function hurtBehavior(state: GameState, enemy: CombatEnemy): BehaviorResult {
  return {
    state,
    moved: false,
    nextState: "hurt",
    motion: "idle",
    animation: "hurt",
    events: [{ type: "playAnimation", targetId: enemy.id, animation: "hurt" }],
  };
}

function shouldPickNewWanderTarget(lastDecisionAt: string | undefined, nowMs: number, movement: EnemyMovementDefinition): boolean {
  const last = Date.parse(lastDecisionAt ?? "");

  return !Number.isFinite(last) || nowMs - last >= movement.wanderDecisionMs;
}

function deterministicWanderTarget(enemyId: string, movement: EnemyMovementDefinition, nowMs: number): { x: number; y: number } {
  const bucket = Math.floor(nowMs / Math.max(1, movement.wanderDecisionMs));
  const seed = hash(`${enemyId}:${bucket}`);
  const angle = (seed % 6283) / 1000;
  const radius = movement.patrolRadius * (0.35 + ((seed >>> 8) % 65) / 100);

  return {
    x: movement.homeX + Math.cos(angle) * radius,
    y: movement.homeY + Math.sin(angle) * radius,
  };
}

function hash(value: string): number {
  let result = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}
