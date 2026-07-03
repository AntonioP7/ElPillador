import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./state";
import { getRoomExits, moveInDirection } from "./navigation";

describe("dungeon navigation", () => {
  it("moves from the initial hub through a real documented connection", () => {
    const result = moveInDirection(
      createInitialGameState(new Date("2026-06-17T00:00:00.000Z")),
      "right",
      new Date("2026-06-17T00:01:00.000Z"),
    );

    expect(result.moved).toBe(true);
    expect(result.state.currentRoomId).toBe("PZ-E2");
    expect(result.state.currentZone).toBe("Entrada");
    expect(result.state.discoveredRooms).toEqual(expect.arrayContaining(["PZ-E1", "PZ-E2"]));
  });

  it("blocks secret access without the matching rumor", () => {
    const state = {
      ...createInitialGameState(),
      currentRoomId: "SR2",
      currentFloor: "piso1" as const,
      currentZone: "Entrada",
    };
    const result = moveInDirection(state, "right");

    expect(result.moved).toBe(false);
    expect(result.message).toContain("Rumor 1");
    expect(result.state.currentRoomId).toBe("SR2");
  });

  it("requires Rumor 1 and the broken B1 wall to enter SS1", () => {
    const state = {
      ...createInitialGameState(),
      currentRoomId: "SR2",
      currentFloor: "piso1" as const,
      currentZone: "Entrada",
      rumors: [1],
    };
    const blocked = moveInDirection(state, "right");
    const result = moveInDirection({ ...state, openGates: ["B1"] }, "right");

    expect(blocked.moved).toBe(false);
    expect(blocked.message).toContain("B1");
    expect(result.moved).toBe(true);
    expect(result.state.currentRoomId).toBe("SS1");
    expect(result.state.usedRumors).toContain(1);
  });

  it("uses Rumor 16 for the CP-G1 Pokemon combat secret", () => {
    const blocked = moveInDirection(
      {
        ...createInitialGameState(),
        currentRoomId: "PZ-G1",
        currentFloor: "piso1" as const,
        currentZone: "Grecia",
      },
      "left",
    );
    const open = moveInDirection(
      {
        ...createInitialGameState(),
        currentRoomId: "PZ-G1",
        currentFloor: "piso1" as const,
        currentZone: "Grecia",
        rumors: [16],
        flags: { "secret.CP-G1.open": true },
      },
      "left",
    );

    expect(blocked.moved).toBe(false);
    expect(blocked.message).toContain("Rumor 16");
    expect(open.moved).toBe(true);
    expect(open.state.currentRoomId).toBe("CP-G1");
    expect(open.state.usedRumors).toContain(16);
  });

  it("requires both the rumor and the simple open flag for secret rooms", () => {
    const base = {
      ...createInitialGameState(),
      currentRoomId: "PZ-C3",
      currentFloor: "piso1" as const,
      currentZone: "Cocina",
    };
    const noRumor = getRoomExits(base).find((exit) => exit.target.id === "SS9");
    const noFlag = getRoomExits({ ...base, rumors: [9] }).find((exit) => exit.target.id === "SS9");
    const open = getRoomExits({
      ...base,
      rumors: [9],
      flags: { "secret.SS9.open": true },
    }).find((exit) => exit.target.id === "SS9");

    expect(noRumor?.access).toMatchObject({
      open: false,
      reason: expect.stringContaining("Rumor 9"),
    });
    expect(noFlag?.access).toMatchObject({
      open: false,
      reason: expect.stringContaining("SECRET-SS9"),
    });
    expect(open?.access.open).toBe(true);
  });

  it("lists blocked exits with readable reasons", () => {
    const state = {
      ...createInitialGameState(),
      currentRoomId: "MG-R1",
      currentFloor: "piso1" as const,
      currentZone: "Correr",
    };
    const exits = getRoomExits(state);
    const blocked = exits.find((exit) => exit.target.id === "SR17");

    expect(blocked?.access.open).toBe(false);
    expect(blocked?.access.reason).toContain("B7");
  });

  it("opens the B4 bakery/catacombs block with any companion", () => {
    const base = {
      ...createInitialGameState(),
      currentRoomId: "DS-K1",
      currentFloor: "piso1" as const,
      currentZone: "Catacumbas",
    };
    const blocked = getRoomExits(base).find((exit) => exit.target.id === "PZ-K3");
    const withChoco = getRoomExits({ ...base, inventory: ["Reloj", "Choco"] }).find((exit) => exit.target.id === "PZ-K3");

    expect(blocked?.access).toMatchObject({
      open: false,
      reason: expect.stringContaining("cualquier companero"),
    });
    expect(withChoco?.access.open).toBe(true);
  });
});
