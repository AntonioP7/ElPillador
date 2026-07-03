import type { EnemyAiProfileDefinition, EnemyAiState } from "./types";
import type { EnemyCombatState } from "../simulation/state";

export function currentEnemyAiState(
  combat: EnemyCombatState | undefined,
  profile: EnemyAiProfileDefinition,
): EnemyAiState {
  const state = combat?.aiState ?? profile.initialState;

  return profile.allowedStates.includes(state) ? state : profile.initialState;
}

export function transitionEnemyAiState(
  combat: EnemyCombatState | undefined,
  profile: EnemyAiProfileDefinition,
  nextState: EnemyAiState,
  nowMs: number,
): EnemyCombatState {
  const safeNext = profile.allowedStates.includes(nextState) ? nextState : profile.initialState;
  const current = currentEnemyAiState(combat, profile);

  if (current === safeNext && combat?.aiStateStartedAt) {
    return {
      ...combat,
      aiState: safeNext,
    };
  }

  return {
    ...combat,
    aiState: safeNext,
    aiStateStartedAt: new Date(nowMs).toISOString(),
  };
}
