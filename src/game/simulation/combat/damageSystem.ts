import {
  LEGENDARY_BEAST_DEFEATED_FLAG,
  LEGENDARY_BEAST_ENEMY_ID,
  LEGENDARY_BEAST_REWARD_ITEM,
} from "../../content/enemies";
import { grantProgress } from "../progression";
import type { GameState } from "../state";
import { touchGameState } from "../state";
import { ENEMY_HIT_INVULNERABILITY_MS, ENEMY_HURT_STUN_MS } from "./weaponConfig";
import { isEnemyInvulnerable, isPlayerInvulnerable } from "./invulnerabilitySystem";
import type { CombatEnemy, CombatEvent, CombatResult } from "./types";

const ENEMY_ATTACK_RESUME_AFTER_HURT_MS = 260;
const ENEMY_DAMAGE_KNOCKBACK_DISTANCE = 10;

export function damagePlayerWithCombatRules(
  state: GameState,
  amount: number,
  source: string,
  now = new Date(),
  invulnerabilityMs = 550,
): CombatResult {
  const usesInvulnerability = invulnerabilityMs > 0;

  if (usesInvulnerability && isPlayerInvulnerable(state, now.getTime())) {
    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      worldChanged: false,
      hit: false,
      message: `${source}: protegido`,
      events: [],
    };
  }

  const safeAmount = Math.max(0, Math.floor(amount));
  const maxHealth = state.playerCombat.maxHealth || 100;
  const currentHealth = Math.min(maxHealth, Math.max(0, state.playerCombat.health ?? state.playerHealth));
  const nextHealth = Math.min(maxHealth, Math.max(0, currentHealth - safeAmount));
  const changed = nextHealth !== currentHealth;
  const nextState = touchGameState(
    {
      ...state,
      playerHealth: nextHealth,
      playerCombat: {
        ...state.playerCombat,
        maxHealth,
        health: nextHealth,
        invulnerableUntil: changed && usesInvulnerability
          ? new Date(now.getTime() + invulnerabilityMs).toISOString()
          : state.playerCombat.invulnerableUntil,
      },
    },
    now,
  );

  return {
    state: nextState,
    handled: true,
    changed,
    worldChanged: nextHealth <= 0,
    hit: changed,
    message: changed ? `${source}: -${safeAmount} vida` : source,
    events: changed
      ? [
          { type: "damage", target: "player", targetId: "player", amount: safeAmount, source },
          ...(nextHealth <= 0 ? [{ type: "death" as const, target: "player" as const, targetId: "player", source }] : []),
        ]
      : [],
  };
}

export function damageEnemy(
  state: GameState,
  enemy: CombatEnemy,
  damage: number,
  now: Date,
  source: string,
): CombatResult {
  if (isEnemyInvulnerable(state, enemy.id, now.getTime())) {
    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      worldChanged: false,
      hit: false,
      message: `${source}: enemigo protegido`,
      events: [],
    };
  }

  const result = damageEnemyState(state, enemy, damage, now);

  if (result.defeated) {
    return defeatEnemy(result.state, enemy, now, source, damage);
  }

  return {
    state: touchGameState(result.state, now),
    handled: true,
    changed: true,
    worldChanged: false,
    hit: true,
    message: `${source}: enemigo golpeado`,
    events: [
      { type: "damage", target: "enemy", targetId: enemy.id, amount: damage, source, x: enemy.x, y: enemy.y },
      { type: "playAnimation", targetId: enemy.id, animation: "hurt" },
      { type: "impactFx", x: enemy.x, y: enemy.y, kind: source === "Varita" ? "magic" : source === "Bomba" ? "bomb" : "sword" },
    ],
  };
}

export function damageEnemyState(
  state: GameState,
  enemy: CombatEnemy,
  damage: number,
  now: Date,
): { state: GameState; defeated: boolean } {
  const nextHp = Math.max(0, enemy.hp - damage);
  const enemyHealth = { ...state.enemyHealth };
  const enemyStunUntil = { ...state.enemyStunUntil };
  const enemyInvulnerableUntil = { ...state.enemyInvulnerableUntil };
  const enemyCombat = { ...state.enemyCombat };
  const enemyPositions = { ...state.enemyPositions };
  const baseTime = now.getTime();

  if (nextHp > 0) {
    const stunnedUntil = new Date(baseTime + ENEMY_HURT_STUN_MS).toISOString();
    const invulnerableUntil = new Date(baseTime + ENEMY_HIT_INVULNERABILITY_MS).toISOString();
    const currentCombat = enemyCombat[enemy.id] ?? {};
    const currentRecoverUntil = Date.parse(currentCombat.recoverUntil ?? "");
    const hasActiveAttack = state.activeAreaAttacks.some((attack) => attack.ownerId === enemy.id && attack.roomId === enemy.roomId);
    const shouldResumeAttackAnimation = hasActiveAttack || (Number.isFinite(currentRecoverUntil) && baseTime < currentRecoverUntil);
    const resumeRecoverUntil = shouldResumeAttackAnimation
      ? new Date(Math.max(
          Number.isFinite(currentRecoverUntil) ? currentRecoverUntil : 0,
          baseTime + ENEMY_HURT_STUN_MS + ENEMY_ATTACK_RESUME_AFTER_HURT_MS,
        )).toISOString()
      : currentCombat.recoverUntil;

    enemyHealth[enemy.id] = nextHp;
    enemyPositions[enemy.id] = knockEnemyAwayFromPlayer(state, enemy, ENEMY_DAMAGE_KNOCKBACK_DISTANCE);
    enemyStunUntil[enemy.id] = stunnedUntil;
    enemyInvulnerableUntil[enemy.id] = invulnerableUntil;
    enemyCombat[enemy.id] = {
      ...currentCombat,
      health: nextHp,
      stunnedUntil,
      invulnerableUntil,
      recoverUntil: resumeRecoverUntil,
    };
  } else {
    delete enemyHealth[enemy.id];
    delete enemyStunUntil[enemy.id];
    delete enemyInvulnerableUntil[enemy.id];
    delete enemyCombat[enemy.id];
  }

  return {
    state: {
      ...state,
      enemyHealth,
      enemyStunUntil,
      enemyInvulnerableUntil,
      enemyCombat,
      enemyPositions,
    },
    defeated: nextHp <= 0,
  };
}

function knockEnemyAwayFromPlayer(state: GameState, enemy: CombatEnemy, distance: number): { x: number; y: number } {
  const dx = enemy.x - state.playerPose.x;
  const dy = enemy.y - state.playerPose.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: enemy.x + (dx / length) * distance,
    y: enemy.y + (dy / length) * distance,
  };
}

function defeatEnemy(state: GameState, enemy: CombatEnemy, now: Date, source: string, damage: number): CombatResult {
  const defeatedState = {
    ...state,
    defeatedEnemies: addUnique(state.defeatedEnemies, [enemy.id]),
    enemyHealth: Object.fromEntries(Object.entries(state.enemyHealth).filter(([enemyId]) => enemyId !== enemy.id)),
    enemyStunUntil: Object.fromEntries(Object.entries(state.enemyStunUntil).filter(([enemyId]) => enemyId !== enemy.id)),
    enemyInvulnerableUntil: Object.fromEntries(Object.entries(state.enemyInvulnerableUntil).filter(([enemyId]) => enemyId !== enemy.id)),
    enemyCombat: Object.fromEntries(Object.entries(state.enemyCombat).filter(([enemyId]) => enemyId !== enemy.id)),
    activeAreaAttacks: state.activeAreaAttacks.filter((attack) => attack.ownerId !== enemy.id),
  };
  const rewardedState =
    enemy.id === LEGENDARY_BEAST_ENEMY_ID
      ? grantProgress(defeatedState, {
          items: [LEGENDARY_BEAST_REWARD_ITEM],
          flags: [LEGENDARY_BEAST_DEFEATED_FLAG],
        })
      : defeatedState;

  return {
    state: touchGameState(rewardedState, now),
    handled: true,
    changed: true,
    worldChanged: true,
    hit: true,
    message:
      enemy.id === LEGENDARY_BEAST_ENEMY_ID
        ? `${source}: bestia legendaria derrotada, ${LEGENDARY_BEAST_REWARD_ITEM} obtenido`
        : `${source}: enemigo derrotado`,
    events: [
      { type: "damage", target: "enemy", targetId: enemy.id, amount: damage, source, x: enemy.x, y: enemy.y },
      { type: "death", target: "enemy", targetId: enemy.id, source, x: enemy.x, y: enemy.y },
    ],
  };
}

function addUnique<T>(current: T[], added: T[]): T[] {
  return [...current, ...added.filter((item) => !current.includes(item))];
}
