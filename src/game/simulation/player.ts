import { GameState } from "./state";
import { damagePlayerWithCombatRules } from "./combat/damageSystem";

export type PlayerDamageResult = {
  state: GameState;
  changed: boolean;
  message: string;
};

export function damagePlayer(
  state: GameState,
  amount: number,
  source = "Daño recibido",
  now = new Date(),
): PlayerDamageResult {
  const result = damagePlayerWithCombatRules(state, amount, source, now);

  if (!result.changed) {
    return {
      state: result.state,
      changed: false,
      message: source,
    };
  }

  return {
    state: result.state,
    changed: true,
    message: result.message,
  };
}
