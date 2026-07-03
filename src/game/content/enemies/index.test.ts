import { describe, expect, it } from "vitest";
import {
  enemyDefinitions,
  LEGENDARY_BEAST_DEFEATED_FLAG,
  LEGENDARY_BEAST_ENEMY_ID,
  LEGENDARY_BEAST_SUMMONED_FLAG,
  roomEnemySpawns,
  SR2_SLIME_ENEMY_ID,
} from ".";

describe("enemy content catalog", () => {
  it("keeps reusable enemy definitions separate from room spawns", () => {
    expect(enemyDefinitions.slime1).toEqual(
      expect.objectContaining({
        species: "slime1",
        hp: 4,
        kind: "minion",
        respawnOnEntry: true,
      }),
    );
    expect(enemyDefinitions.slime2).toEqual(
      expect.objectContaining({
        species: "slime2",
        kind: "minion",
        respawnOnEntry: true,
      }),
    );
    expect(enemyDefinitions.slime3).toEqual(
      expect.objectContaining({
        species: "slime3",
        kind: "minion",
        respawnOnEntry: true,
      }),
    );
    expect(roomEnemySpawns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: SR2_SLIME_ENEMY_ID, roomId: "SR2", species: "slime1" }),
        expect.objectContaining({
          id: LEGENDARY_BEAST_ENEMY_ID,
          roomId: "CP-G1",
          requiresFlag: LEGENDARY_BEAST_SUMMONED_FLAG,
          excludedByFlag: LEGENDARY_BEAST_DEFEATED_FLAG,
        }),
      ]),
    );
  });
});
