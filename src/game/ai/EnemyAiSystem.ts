import { isEnemyStunned } from "../simulation/combat/invulnerabilitySystem";
import type { CombatCollisionBounds, CombatEnemy } from "../simulation/combat";
import type { GameState } from "../simulation/state";
import { enemyAiProfiles } from "./profiles";
import { areaAttackBehavior, chaseBehavior, hurtBehavior, wanderBehavior } from "./behaviors";
import { currentEnemyAiState, transitionEnemyAiState } from "./EnemyStateMachine";
import type {
  EnemyAiProfileDefinition,
  EnemyAiStepResult,
  EnemyAiState,
  EnemyAnimationState,
  EnemyMovementDefinition,
} from "./types";

export function stepRoomEnemies(
  state: GameState,
  enemies: CombatEnemy[],
  deltaMs: number,
  bounds: CombatCollisionBounds,
  nowMs: number,
): EnemyAiStepResult {
  let nextState = state;
  let moved = false;
  const enemyMotion: EnemyAiStepResult["enemyMotion"] = {};
  const enemyAnimationState: EnemyAiStepResult["enemyAnimationState"] = {};
  const events: EnemyAiStepResult["events"] = [];

  for (const enemy of enemies) {
    if (enemy.roomId !== state.currentRoomId || state.defeatedEnemies.includes(enemy.id)) {
      continue;
    }

    const result = stepEnemy(nextState, enemy, deltaMs, bounds, nowMs);
    nextState = result.state;
    moved ||= result.moved;
    enemyMotion[enemy.id] = result.enemyMotion[enemy.id] ?? "idle";
    enemyAnimationState[enemy.id] = result.enemyAnimationState[enemy.id] ?? "idle";
    events.push(...result.events);
  }

  return {
    state: nextState,
    moved,
    enemyMotion,
    enemyAnimationState,
    events,
  };
}

function stepEnemy(
  state: GameState,
  enemy: CombatEnemy,
  deltaMs: number,
  bounds: CombatCollisionBounds,
  nowMs: number,
): EnemyAiStepResult {
  const profile = profileForEnemy(enemy);
  const movement = movementForEnemy(enemy);
  const combat = state.enemyCombat[enemy.id] ?? {};
  const distanceToPlayer = Math.hypot(state.playerPose.x - enemy.x, state.playerPose.y - enemy.y);
  const currentState = currentEnemyAiState(combat, profile);

  if (enemy.hp <= 0 || state.defeatedEnemies.includes(enemy.id)) {
    return finishState(state, enemy, profile, "dead", false, "idle", "death", nowMs);
  }

  const activeAttack = state.activeAreaAttacks.find((attack) => attack.ownerId === enemy.id && attack.roomId === state.currentRoomId);
  if (activeAttack) {
    const elapsed = nowMs - Date.parse(activeAttack.startedAt);
    if (elapsed < activeAttack.activeToMs) {
      const nextAiState: EnemyAiState = elapsed < activeAttack.activeFromMs ? "attackWindup" : "attackActive";
      return finishState(state, enemy, profile, nextAiState, false, "attack", animationForState(enemy, nextAiState), nowMs);
    }
  }

  const recoverUntil = Date.parse(combat.recoverUntil ?? "");
  if (Number.isFinite(recoverUntil) && nowMs < recoverUntil) {
    return finishState(state, enemy, profile, "recover", false, "idle", animationForState(enemy, "recover"), nowMs);
  }

  if (isEnemyStunned(state, enemy.id, nowMs)) {
    const hurt = hurtBehavior(state, enemy);
    return finishState(hurt.state, enemy, profile, currentState === "hurt" ? "stunned" : "hurt", false, hurt.motion, "hurt", nowMs, hurt.events);
  }

  if (profile.canUseAreaAttack && enemy.attack && distanceToPlayer <= movement.attackRadius && canStartAttack(combat.lastAttackAt, enemy.attack.cooldownMs, nowMs)) {
    const attack = areaAttackBehavior(state, enemy, movement, nowMs);
    return finishState(attack.state, enemy, profile, attack.nextState, false, attack.motion, attack.animation, nowMs, attack.events);
  }

  if (profile.canChase && distanceToPlayer <= movement.detectionRadius) {
    const chase = chaseBehavior(state, enemy, movement, deltaMs, bounds);
    return finishState(chase.state, enemy, profile, "chase", chase.moved, chase.motion, chase.animation, nowMs);
  }

  if (profile.canWander) {
    const wander = wanderBehavior(state, enemy, movement, deltaMs, bounds, nowMs);
    return finishState(wander.state, enemy, profile, "wander", wander.moved, wander.motion, wander.animation, nowMs);
  }

  return finishState(state, enemy, profile, "idle", false, "idle", animationForState(enemy, "idle"), nowMs);
}

function finishState(
  state: GameState,
  enemy: CombatEnemy,
  profile: EnemyAiProfileDefinition,
  nextAiState: EnemyAiState,
  moved: boolean,
  motion: EnemyAiStepResult["enemyMotion"][string],
  animation: EnemyAnimationState,
  nowMs: number,
  events: EnemyAiStepResult["events"] = [],
): EnemyAiStepResult {
  return {
    state: {
      ...state,
      enemyCombat: {
        ...state.enemyCombat,
        [enemy.id]: transitionEnemyAiState(state.enemyCombat[enemy.id], profile, nextAiState, nowMs),
      },
    },
    moved,
    enemyMotion: {
      [enemy.id]: motion,
    },
    enemyAnimationState: {
      [enemy.id]: animation,
    },
    events,
  };
}

function profileForEnemy(enemy: CombatEnemy): EnemyAiProfileDefinition {
  return enemyAiProfiles[enemy.aiProfile ?? "passive"] ?? enemyAiProfiles.passive;
}

function movementForEnemy(enemy: CombatEnemy): EnemyMovementDefinition {
  return enemy.movement ?? {
    walkSpeedPxPerSecond: 28,
    runSpeedPxPerSecond: 60,
    detectionRadius: 0,
    attackRadius: 0,
    homeX: enemy.x,
    homeY: enemy.y,
    patrolRadius: 24,
    wanderDecisionMs: 1600,
    recoverMs: 300,
  };
}

function animationForState(enemy: CombatEnemy, state: EnemyAiState): EnemyAnimationState {
  return enemy.animationMap?.[state] ?? fallbackAnimationForState(state);
}

function fallbackAnimationForState(state: EnemyAiState): EnemyAnimationState {
  if (state === "chase") {
    return "run";
  }

  if (state === "wander") {
    return "walk";
  }

  if (state === "attackWindup" || state === "attackActive") {
    return "area_attack";
  }

  if (state === "hurt" || state === "stunned") {
    return "hurt";
  }

  if (state === "dead") {
    return "death";
  }

  return "idle";
}

function canStartAttack(lastAttackAt: string | undefined, cooldownMs: number, nowMs: number): boolean {
  const last = Date.parse(lastAttackAt ?? "");

  return !Number.isFinite(last) || nowMs - last >= cooldownMs;
}
