import type { GameState } from "../state";
import { touchGameState } from "../state";
import { damagePlayerWithCombatRules } from "./damageSystem";
import { circlesOverlap } from "./hitboxSystem";
import type { CombatEnemy, CombatResult } from "./types";

export function ensureEnemyAreaAttack(
  state: GameState,
  enemy: CombatEnemy,
  nowMs: number,
  config: { intervalMs: number; windupMs: number; activeFromMs: number; activeToMs: number; visualToMs?: number; radius: number; damage: number },
): CombatResult {
  const combat = state.enemyCombat[enemy.id] ?? {};
  const lastAttackAt = Date.parse(combat.lastAttackAt ?? "");

  if (Number.isFinite(lastAttackAt) && nowMs - lastAttackAt < config.intervalMs) {
    return { state, handled: false, changed: false, worldChanged: false, message: "", events: [] };
  }

  const attackId = `area.${enemy.id}.${nowMs}`;
  return {
    state: touchGameState({
      ...state,
      enemyCombat: {
        ...state.enemyCombat,
        [enemy.id]: {
          ...combat,
          activeAttackId: attackId,
          lastAttackAt: new Date(nowMs).toISOString(),
        },
      },
      activeAreaAttacks: [
        ...state.activeAreaAttacks,
        {
          id: attackId,
          roomId: enemy.roomId,
          ownerId: enemy.id,
          x: enemy.x,
          y: enemy.y,
          radius: config.radius,
          damage: config.damage,
          startedAt: new Date(nowMs).toISOString(),
          windupMs: config.windupMs,
          activeFromMs: config.activeFromMs,
          activeToMs: config.activeToMs,
          visualToMs: config.visualToMs,
          hitPlayer: false,
        },
      ],
    }, new Date(nowMs)),
    handled: true,
    changed: true,
    worldChanged: false,
    message: "",
    events: [{ type: "enemyAttackWarning", attackId, enemyId: enemy.id, x: enemy.x, y: enemy.y, radius: config.radius }],
  };
}

export function stepAreaAttacks(state: GameState, nowMs: number, playerRadius: number): CombatResult {
  if (state.activeAreaAttacks.length === 0) {
    return { state, handled: false, changed: false, worldChanged: false, message: "", events: [] };
  }

  let nextState = state;
  const remaining = [];
  const events: CombatResult["events"] = [];
  let changed = false;
  let message = "";

  for (const attack of state.activeAreaAttacks) {
    if (attack.roomId !== state.currentRoomId) {
      changed = true;
      continue;
    }

    const elapsed = nowMs - Date.parse(attack.startedAt);
    const visualToMs = attack.visualToMs ?? attack.activeToMs;
    if (elapsed >= visualToMs) {
      changed = true;
      continue;
    }

    const active = elapsed >= attack.activeFromMs && elapsed < attack.activeToMs;
    let nextAttack = attack;

    if (active) {
      events?.push({ type: "enemyAttackActive", attackId: attack.id, enemyId: attack.ownerId, x: attack.x, y: attack.y, radius: attack.radius });
    }

    if (
      active &&
      !attack.hitPlayer &&
      circlesOverlap(attack.x, attack.y, attack.radius, state.playerPose.x, state.playerPose.y, playerRadius)
    ) {
      const result = damagePlayerWithCombatRules(nextState, attack.damage, "Ataque de slime", new Date(nowMs), 0);
      nextState = result.state;
      nextAttack = { ...attack, hitPlayer: true };
      events?.push(...(result.events ?? []));
      changed = true;
      message = result.message;
    }

    remaining.push(nextAttack);
  }

  return {
    state: touchGameState({ ...nextState, activeAreaAttacks: remaining }, new Date(nowMs)),
    handled: changed || events?.length > 0,
    changed,
    worldChanged: false,
    message,
    events,
  };
}
