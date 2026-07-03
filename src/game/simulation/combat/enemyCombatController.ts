import { stepRoomEnemies } from "../../ai/EnemyAiSystem";
import type { GameState } from "../state";
import type { CombatCollisionBounds, CombatEnemy, EnemyAiResult } from "../combat";

export function stepEnemyCombat(
  state: GameState,
  enemies: CombatEnemy[],
  deltaMs: number,
  bounds: CombatCollisionBounds,
  nowMs: number,
): EnemyAiResult {
  return stepRoomEnemies(state, enemies, deltaMs, bounds, nowMs);
}
