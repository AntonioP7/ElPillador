import { describe, expect, it } from "vitest";
import { npcDefinitions, roomRewards } from "../content/progression";
import { createInitialGameState } from "./state";
import { getRoomInteractions, interactWithCurrentRoom } from "./progression";
import { getRoomExits, moveInDirection } from "./navigation";

describe("room progression", () => {
  it("grants NPC rewards and rumors once", () => {
    const state = {
      ...createInitialGameState(new Date("2026-06-17T00:00:00.000Z")),
      currentRoomId: "SR4",
      currentZone: "Grecia",
    };
    const first = interactWithCurrentRoom(state, new Date("2026-06-17T00:01:00.000Z"));
    const second = interactWithCurrentRoom(first.state, new Date("2026-06-17T00:02:00.000Z"));

    expect(first.changed).toBe(true);
    expect(first.state.inventory).toContain("Lupa");
    expect(first.state.rumors).not.toContain(1);
    expect(second.changed).toBe(false);
    expect(second.state.inventory.filter((item) => item === "Lupa")).toHaveLength(1);
  });

  it("blocks NPC rewards until their requirement is met", () => {
    const blockedState = {
      ...createInitialGameState(),
      currentRoomId: "SR19",
      currentFloor: "piso2" as const,
      currentZone: "Gym",
    };
    const blocked = interactWithCurrentRoom(blockedState);

    expect(blocked.changed).toBe(false);
    expect(blocked.message).toContain("Item NPC6");

    const ready = interactWithCurrentRoom({
      ...blockedState,
      inventory: ["Item NPC6"],
    });

    expect(ready.changed).toBe(true);
    expect(ready.state.inventory).toContain("Pista Loteria 2");
    expect(ready.state.rumors).not.toContain(4);
  });

  it("moves Rumor 3 to Mireia and Rumor 4 to NPC4", () => {
    const mireia = interactWithCurrentRoom({
      ...createInitialGameState(),
      currentRoomId: "SR18",
      currentFloor: "piso1",
      currentZone: "Entrada",
    });
    const npc4 = interactWithCurrentRoom({
      ...createInitialGameState(),
      currentRoomId: "SR16",
      currentFloor: "piso2",
      currentZone: "Loteria",
      inventory: ["Reloj", "Pocion"],
    });

    expect(mireia.state.rumors).toContain(3);
    expect(npc4.state.rumors).toContain(4);
  });

  it("grants room rewards and enables matching gates", () => {
    const secretState = {
      ...createInitialGameState(),
      currentRoomId: "SS1",
      rumors: [1],
    };
    const reward = interactWithCurrentRoom(secretState);
    const gateMove = moveInDirection(
      {
        ...reward.state,
        currentRoomId: "MG-R1",
        currentZone: "Correr",
      },
      "right",
    );

    expect(reward.state.inventory).toContain("Interruptor Azul");
    expect(gateMove.moved).toBe(true);
    expect(gateMove.state.currentRoomId).toBe("SR17");
    expect(gateMove.state.openGates).toContain("B7");
  });

  it("shows pending room content in interaction summaries", () => {
    const state = {
      ...createInitialGameState(),
      currentRoomId: "SR18",
    };
    const interactions = getRoomInteractions(state);

    expect(interactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "NPC3", status: "available" }),
        expect.objectContaining({ id: "room.SR18.ingrediente-5", status: "blocked" }),
      ]),
    );
  });

  it("shows Giratiempo in SS13 without granting it as an item", () => {
    const state = {
      ...createInitialGameState(),
      currentRoomId: "SS13",
      rumors: [13],
    };
    const interactions = getRoomInteractions(state);
    const result = interactWithCurrentRoom(state, new Date("2026-06-17T00:05:00.000Z"));

    expect(interactions).toEqual([
      expect.objectContaining({ id: "special.SS13.giratiempo", kind: "special", status: "available" }),
    ]);
    expect(result.changed).toBe(true);
    expect(result.message).toContain("Giratiempo activado");
    expect(result.state.inventory).not.toContain("Giratiempo");
  });

  it("opens SS13 from SR18 only after the clock rumor and the Lupa", () => {
    const blocked = interactWithCurrentRoom({
      ...createInitialGameState(),
      currentRoomId: "SR18",
      currentFloor: "piso1" as const,
      currentZone: "Entrada",
      inventory: ["Reloj", "Lupa"],
    });
    const opened = interactWithCurrentRoom({
      ...createInitialGameState(),
      currentRoomId: "SR18",
      currentFloor: "piso1" as const,
      currentZone: "Entrada",
      inventory: ["Reloj", "Lupa"],
      rumors: [13],
    });

    expect(blocked.state.flags["secret.SS13.open"]).toBeUndefined();
    expect(opened.state.flags["secret.SS13.open"]).toBe(true);
    expect(opened.state.openGates).toContain("LOCAL-SS13");
  });

  it("grants Rumor 1 when the player obtains Bombas", () => {
    const result = interactWithCurrentRoom({
      ...createInitialGameState(),
      currentRoomId: "SABIOS-2",
      currentFloor: "sabios",
      currentZone: "Sabios 2",
    });

    expect(result.state.inventory).toContain("Bombas");
    expect(result.state.rumors).toContain(1);
  });

  it("activates the MG-M1 stairs after solving the MG-M1 puzzle", () => {
    const dsR1State = {
      ...createInitialGameState(),
      currentRoomId: "DS-R1",
      currentFloor: "piso1" as const,
      currentZone: "Correr",
    };
    const blockedExit = getRoomExits(dsR1State).find((exit) => exit.target.id === "MG-M1");
    const solved = interactWithCurrentRoom({
      ...createInitialGameState(),
      currentRoomId: "MG-M1",
      currentFloor: "piso2",
      currentZone: "Magia Oscura",
    });
    const readyState = {
      ...solved.state,
      currentRoomId: "DS-R1",
      currentFloor: "piso1" as const,
      currentZone: "Correr",
    };
    const openExit = getRoomExits(readyState).find((exit) => exit.target.id === "MG-M1");
    const open = moveInDirection(readyState, openExit?.direction ?? "up");

    expect(blockedExit?.access).toMatchObject({
      open: false,
      reason: expect.stringContaining("B7B"),
    });
    expect(solved.state.flags["puzzle.MG-M1.resolved"]).toBe(true);
    expect(solved.state.openGates).toContain("B7B");
    expect(openExit?.access.open).toBe(true);
    expect(open.moved).toBe(true);
    expect(open.state.currentRoomId).toBe("MG-M1");
  });

  it("moves ingredient 4 behind SS14 bait and the CP-G1 legendary beast", () => {
    const ss14 = interactWithCurrentRoom({
      ...createInitialGameState(),
      currentRoomId: "SS14",
      rumors: [14],
    });
    const blockedCp = interactWithCurrentRoom({
      ...createInitialGameState(),
      currentRoomId: "CP-G1",
      rumors: [16],
    });
    const readyCp = interactWithCurrentRoom({
      ...ss14.state,
      currentRoomId: "CP-G1",
      rumors: [14, 16],
    });

    expect(ss14.state.inventory).toContain("Cebo especial");
    expect(ss14.state.inventory).not.toContain("Ingrediente legendario 4");
    expect(ss14.state.rumors).toContain(16);
    expect(blockedCp.changed).toBe(false);
    expect(blockedCp.message).toContain("Cebo especial");
    expect(readyCp.state.flags["beast.CP-G1.summoned"]).toBe(true);
  });

  it("models B11 as the 1M lottery price for Ingredient 5", () => {
    const blocked = interactWithCurrentRoom({
      ...createInitialGameState(),
      currentRoomId: "SR18",
      currentFloor: "piso1" as const,
      currentZone: "Entrada",
    });
    const mascle = interactWithCurrentRoom({
      ...createInitialGameState(),
      currentRoomId: "BOSS-Mascle",
      currentFloor: "piso2" as const,
      currentZone: "Loteria",
    });
    const bought = interactWithCurrentRoom({
      ...mascle.state,
      currentRoomId: "SR18",
      currentFloor: "piso1" as const,
      currentZone: "Entrada",
    });

    expect(blocked.state.inventory).not.toContain("Ingrediente legendario 5");
    expect(mascle.state.flags["lottery.million_won"]).toBe(true);
    expect(bought.state.inventory).toContain("Ingrediente legendario 5");
  });

  it("covers all documented rumors from 1 to 16 except the clock-inspection rumor", () => {
    const rumorSet = new Set<number>();

    for (const reward of roomRewards) {
      for (const rumor of reward.grants.rumors ?? []) {
        rumorSet.add(rumor);
      }
    }

    for (const npc of npcDefinitions) {
      for (const rumor of npc.grants.rumors ?? []) {
        rumorSet.add(rumor);
      }
    }

    expect([...rumorSet].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16]);
  });
});
