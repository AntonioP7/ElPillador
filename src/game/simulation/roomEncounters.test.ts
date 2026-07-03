import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./state";
import {
  filterRoomEncounterSpawns,
  isRoomEncounterActive,
  progressRoomEncounter,
  roomEncounterForChest,
  shouldRoomEncounterBlockDoor,
  startRoomEncounter,
} from "./roomEncounters";
import type { EnemySpawnDefinition } from "../content/enemies/types";

const spawns: EnemySpawnDefinition[] = [
  { id: "enemy.SR2.wave1.a", roomId: "SR2", species: "slime1", x: 100, y: 100, wave: 1 },
  { id: "enemy.SR2.wave2.a", roomId: "SR2", species: "slime2", x: 140, y: 100, wave: 2 },
];

describe("room encounters", () => {
  it("starts SR2 from its chest and advances waves after enemies die", () => {
    const encounter = roomEncounterForChest("SR2", "chest.43");

    expect(encounter).toBeDefined();
    expect(filterRoomEncounterSpawns({ ...createInitialGameState(), currentRoomId: "SR2", currentZone: "Entrada" }, spawns)).toEqual([]);

    const started = startRoomEncounter(
      { ...createInitialGameState(), currentRoomId: "SR2", currentZone: "Entrada" },
      encounter!,
      spawns,
    );

    expect(isRoomEncounterActive(started, "SR2")).toBe(true);
    expect(filterRoomEncounterSpawns(started, spawns).map((spawn) => spawn.id)).toEqual(["enemy.SR2.wave1.a"]);
    expect(shouldRoomEncounterBlockDoor(started, { isLocked: false }, "SR2")).toBe(true);

    const wave2 = progressRoomEncounter(
      { ...started, defeatedEnemies: ["enemy.SR2.wave1.a"] },
      spawns,
    );

    expect(filterRoomEncounterSpawns(wave2, spawns).map((spawn) => spawn.id)).toEqual(["enemy.SR2.wave2.a"]);
    expect(wave2.flags["encounter.SR2.chest-waves.wave.1"]).toBeUndefined();
    expect(wave2.flags["encounter.SR2.chest-waves.wave.2"]).toBe(true);

    const completed = progressRoomEncounter(
      { ...wave2, defeatedEnemies: ["enemy.SR2.wave1.a", "enemy.SR2.wave2.a"] },
      spawns,
    );

    expect(isRoomEncounterActive(completed, "SR2")).toBe(false);
    expect(completed.flags["encounter.SR2.chest-waves.wave.2"]).toBeUndefined();
    expect(shouldRoomEncounterBlockDoor(completed, { isLocked: false }, "SR2")).toBe(false);
    expect(filterRoomEncounterSpawns(completed, spawns)).toEqual([]);
  });
});
