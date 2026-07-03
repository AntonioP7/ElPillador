import { TOP_DOWN_ROOM_HEIGHT, TOP_DOWN_ROOM_WIDTH } from "../../simulation/topDown";
import { EnemyDefinition, EnemySpawnDefinition } from "./types";
import { getRoomEnemyPlacements, roomContentDefinitions } from "../rooms";
import { Slime1Enemy, Slime2Enemy, Slime3Enemy, SlimeEnemy } from "./SlimeEnemy";

export { Slime1Enemy, Slime2Enemy, Slime3Enemy, SlimeEnemy } from "./SlimeEnemy";

export const LEGENDARY_BEAST_ROOM_ID = "CP-G1";
export const LEGENDARY_BEAST_ENEMY_ID = "enemy.CP-G1.legendary-beast";
export const LEGENDARY_BEAST_SUMMONED_FLAG = "beast.CP-G1.summoned";
export const LEGENDARY_BEAST_DEFEATED_FLAG = "beast.CP-G1.defeated";
export const LEGENDARY_BEAST_REWARD_ITEM = "Ingrediente legendario 4";
export const SR2_SLIME_ENEMY_ID = "enemy.SR2.slime1";

export const SLIME1_ATTACK_CONFIG = SlimeEnemy.attack;
export const SLIME1_CONTACT_DAMAGE = SlimeEnemy.contactDamage;
export const SLIME1_MOVEMENT_CONFIG = SlimeEnemy.movement;
export const SLIME1_ANIMATION_MAP = SlimeEnemy.animationMap;

export const enemyDefinitions: Record<string, EnemyDefinition> = {
  slime1: Slime1Enemy.definition,
  slime2: Slime2Enemy.definition,
  slime3: Slime3Enemy.definition,
  "legendary-beast": {
    species: "legendary-beast",
    kind: "boss",
    radius: 28,
    hp: 5,
    aiProfile: "stationaryBoss",
  },
  "generic-minion": {
    species: "generic-minion",
    kind: "minion",
    radius: 18,
    hp: 2,
    aiProfile: "passive",
  },
  "generic-boss": {
    species: "generic-boss",
    kind: "boss",
    radius: 24,
    hp: 5,
    aiProfile: "stationaryBoss",
  },
} as const satisfies Record<string, EnemyDefinition>;

export const roomEnemySpawns: EnemySpawnDefinition[] = roomContentDefinitions.flatMap((room) =>
  getRoomEnemyPlacements(room.id).map((enemy) => ({
    ...enemy,
    roomId: room.id,
  })),
);

export function genericEnemySpawnForRoom(roomId: string, kind: "minion" | "boss"): EnemySpawnDefinition {
  return {
    id: `enemy.${roomId}.0`,
    roomId,
    species: kind === "boss" ? "generic-boss" : "generic-minion",
    x: kind === "boss" ? TOP_DOWN_ROOM_WIDTH / 2 : 580,
    y: kind === "boss" ? TOP_DOWN_ROOM_HEIGHT / 2 - 70 : 170,
  };
}
