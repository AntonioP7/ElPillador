import type { EnemyAiProfileDefinition } from "./types";

export const slimeAiProfile: EnemyAiProfileDefinition = {
  id: "slime",
  initialState: "wander",
  allowedStates: ["idle", "wander", "chase", "attackWindup", "attackActive", "recover", "hurt", "stunned", "dead"],
  canWander: true,
  canChase: true,
  canUseAreaAttack: true,
};

export const passiveAiProfile: EnemyAiProfileDefinition = {
  id: "passive",
  initialState: "wander",
  allowedStates: ["idle", "wander", "hurt", "stunned", "dead"],
  canWander: true,
  canChase: false,
  canUseAreaAttack: false,
};

export const stationaryBossAiProfile: EnemyAiProfileDefinition = {
  id: "stationaryBoss",
  initialState: "idle",
  allowedStates: ["idle", "attackWindup", "attackActive", "recover", "hurt", "stunned", "dead"],
  canWander: false,
  canChase: false,
  canUseAreaAttack: true,
};

export const enemyAiProfiles = {
  slime: slimeAiProfile,
  passive: passiveAiProfile,
  stationaryBoss: stationaryBossAiProfile,
} as const satisfies Record<string, EnemyAiProfileDefinition>;
