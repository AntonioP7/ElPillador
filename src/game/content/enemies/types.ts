import type { CombatEnemy, EnemyAttackDefinition, EnemyDamageDefinition } from "../../simulation/combat";
import type { EnemyAiProfileId, EnemyAnimationMap, EnemyMovementDefinition } from "../../ai/types";

export type EnemySpecies = "slime1" | "slime2" | "slime3" | "legendary-beast" | "generic-minion" | "generic-boss";

export type EnemyDefinition = {
  species: EnemySpecies;
  kind: CombatEnemy["kind"];
  radius: number;
  hp: number;
  contactDamage?: EnemyDamageDefinition;
  attack?: EnemyAttackDefinition;
  attacks?: EnemyAttackDefinition[];
  aiProfile?: EnemyAiProfileId;
  movement?: EnemyMovementDefinition;
  animationMap?: EnemyAnimationMap;
  respawnOnEntry?: boolean;
};

export type EnemySpawnDefinition = {
  id: string;
  roomId: string;
  species: EnemySpecies;
  x: number;
  y: number;
  hp?: number;
  kind?: CombatEnemy["kind"];
  radius?: number;
  contactDamage?: EnemyDamageDefinition;
  attack?: EnemyAttackDefinition;
  attacks?: EnemyAttackDefinition[];
  aiProfile?: EnemyAiProfileId;
  movement?: EnemyMovementDefinition;
  animationMap?: EnemyAnimationMap;
  respawnOnEntry?: boolean;
  wave?: number;
  requiresFlag?: string;
  excludedByFlag?: string;
};
