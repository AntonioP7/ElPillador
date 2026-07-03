import type { EnemyAnimationMap, EnemyMovementDefinition, EnemyAiState, EnemyAnimationState } from "../../ai/types";
import type { EnemyAttackDefinition, EnemyDamageDefinition } from "../../simulation/combat";
import type { EnemyDefinition, EnemySpecies } from "./types";

const SLIME_ANIMATION_MAP: EnemyAnimationMap = {
  idle: "idle",
  wander: "walk",
  chase: "run",
  attackWindup: "area_attack",
  attackActive: "area_attack",
  recover: "area_attack",
  hurt: "hurt",
  stunned: "hurt",
  dead: "death",
};

type SlimeVariantConfig = {
  species: Extract<EnemySpecies, "slime1" | "slime2" | "slime3">;
  hp: number;
  radius: number;
  attackDamage: number;
  contactDamage: number;
  walkSpeed: number;
  runSpeed: number;
  detectionRadius: number;
  attackRadius: number;
};

function createSlimeDefinition(config: SlimeVariantConfig) {
  const attack: EnemyAttackDefinition = {
    animation: "slime_attack",
    damage: config.attackDamage,
    hitFrames: [6, 7, 8],
    hitbox: { x: -30, y: -24, width: 60, height: 48 },
    knockback: 34,
    cooldownMs: 5000,
    frameRate: 10,
    areaRadius: 44,
    windupMs: 650,
    activeFromMs: 650,
    activeToMs: 1000,
    visualAfterMs: 0,
  };

  const contactDamage: EnemyDamageDefinition = {
    damage: config.contactDamage,
    cooldownMs: 700,
  };

  const movement: EnemyMovementDefinition = {
    walkSpeedPxPerSecond: config.walkSpeed,
    runSpeedPxPerSecond: config.runSpeed,
    detectionRadius: config.detectionRadius,
    attackRadius: config.attackRadius,
    homeX: 252,
    homeY: 214,
    patrolRadius: 38,
    wanderDecisionMs: 1400,
    recoverMs: 0,
  };

  const definition: EnemyDefinition = {
    species: config.species,
    kind: "minion",
    radius: config.radius,
    hp: config.hp,
    contactDamage,
    attack,
    attacks: [attack],
    aiProfile: "slime",
    movement,
    animationMap: SLIME_ANIMATION_MAP,
    respawnOnEntry: true,
  };

  return { attack, contactDamage, movement, animationMap: SLIME_ANIMATION_MAP, definition };
}

export class Slime1Enemy {
  static readonly species = "slime1" as const;
  private static readonly config = createSlimeDefinition({
    species: Slime1Enemy.species,
    hp: 4,
    radius: 15,
    attackDamage: 2,
    contactDamage: 1,
    walkSpeed: 36,
    runSpeed: 74,
    detectionRadius: 118,
    attackRadius: 34,
  });
  static readonly attack = Slime1Enemy.config.attack;
  static readonly contactDamage = Slime1Enemy.config.contactDamage;
  static readonly movement = Slime1Enemy.config.movement;
  static readonly animationMap = Slime1Enemy.config.animationMap;
  static readonly definition = Slime1Enemy.config.definition;
}

export class Slime2Enemy {
  static readonly species = "slime2" as const;
  private static readonly config = createSlimeDefinition({
    species: Slime2Enemy.species,
    hp: 5,
    radius: 15,
    attackDamage: 2,
    contactDamage: 1,
    walkSpeed: 39,
    runSpeed: 80,
    detectionRadius: 128,
    attackRadius: 36,
  });
  static readonly attack = Slime2Enemy.config.attack;
  static readonly contactDamage = Slime2Enemy.config.contactDamage;
  static readonly movement = Slime2Enemy.config.movement;
  static readonly animationMap = Slime2Enemy.config.animationMap;
  static readonly definition = Slime2Enemy.config.definition;
}

export class Slime3Enemy {
  static readonly species = "slime3" as const;
  private static readonly config = createSlimeDefinition({
    species: Slime3Enemy.species,
    hp: 6,
    radius: 16,
    attackDamage: 3,
    contactDamage: 2,
    walkSpeed: 43,
    runSpeed: 87,
    detectionRadius: 138,
    attackRadius: 40,
  });
  static readonly attack = Slime3Enemy.config.attack;
  static readonly contactDamage = Slime3Enemy.config.contactDamage;
  static readonly movement = Slime3Enemy.config.movement;
  static readonly animationMap = Slime3Enemy.config.animationMap;
  static readonly definition = Slime3Enemy.config.definition;
}

export class SlimeEnemy extends Slime1Enemy {
  static animationForAiState(state: EnemyAiState | undefined): EnemyAnimationState {
    return SLIME_ANIMATION_MAP[state ?? "idle"] ?? "idle";
  }
}
