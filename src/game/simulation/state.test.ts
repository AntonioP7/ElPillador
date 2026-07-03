import { describe, expect, it } from "vitest";
import { createInitialGameState, INITIAL_ROOM_ID, touchGameState } from "./state";

describe("game state", () => {
  it("creates the initial playable state", () => {
    const state = createInitialGameState(new Date("2026-06-17T00:00:00.000Z"));

    expect(state.version).toBe(1);
    expect(state.currentRoomId).toBe(INITIAL_ROOM_ID);
    expect(state.currentFloor).toBe("piso1");
    expect(state.currentZone).toBe("Entrada");
    expect(state.playerHealth).toBe(100);
    expect(state.inventory).toEqual(["Reloj"]);
    expect(state.usedRumors).toEqual([]);
    expect(state.discoveredRooms).toEqual([INITIAL_ROOM_ID]);
    expect(state.equipment).toEqual({});
    expect(state.playerPose).toEqual({ x: 192, y: 192, facing: "down" });
    expect(state.timerState.guilleCircuitOpen).toBe(true);
  });

  it("touches state without mutating the original object", () => {
    const state = createInitialGameState(new Date("2026-06-17T00:00:00.000Z"));
    const next = touchGameState(state, new Date("2026-06-17T01:00:00.000Z"));

    expect(next).not.toBe(state);
    expect(next.lastUpdatedAt).toBe("2026-06-17T01:00:00.000Z");
    expect(state.lastUpdatedAt).toBe("2026-06-17T00:00:00.000Z");
    expect(next.playerPose).not.toBe(state.playerPose);
    expect(next.equipment).not.toBe(state.equipment);
    expect(next.discoveredRooms).not.toBe(state.discoveredRooms);
    expect(next.usedRumors).not.toBe(state.usedRumors);
  });

  it("normalizes old saves without player health", () => {
    const legacy = createInitialGameState();
    delete (legacy as Partial<typeof legacy>).playerHealth;

    expect(touchGameState(legacy).playerHealth).toBe(100);
  });
});
