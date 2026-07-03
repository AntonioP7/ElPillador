import { describe, expect, it } from "vitest";
import { dungeonMap } from "../content/maps/dungeon";
import { getRoomExits } from "./navigation";
import { interactWithCurrentRoom } from "./progression";
import { createInitialGameState, GameState } from "./state";
import {
  GUILLE_CIRCUIT_DURATION_MS,
  GUILLE_TIMED_ROOM_IDS,
  formatRemainingMs,
  guilleTimerLabel,
  isGuilleTimedRoom,
  refreshGuilleCircuitTimer,
  startGuilleCircuit,
  startGuilleCircuitIfNeeded,
} from "./timer";

describe("Guille timed circuit", () => {
  it("starts the timer only in the documented timed rooms", () => {
    const now = new Date("2026-06-17T10:00:00.000Z");
    const safeCorrerState = {
      ...createInitialGameState(now),
      currentRoomId: "PZ-R1",
      currentFloor: "piso1" as const,
      currentZone: "Correr",
    };
    const timedState = {
      ...safeCorrerState,
      currentRoomId: "PZ-R3",
    };

    const safeResult = startGuilleCircuitIfNeeded(safeCorrerState, now);
    const timedResult = startGuilleCircuitIfNeeded(timedState, now);

    expect(safeResult.timerState.guilleCircuitStatus).toBe("idle");
    expect(timedResult.timerState.guilleCircuitStatus).toBe("running");
    expect(timedResult.timerState.guilleCircuitOpen).toBe(true);
    expect(timedResult.timerState.remainingMs).toBe(GUILLE_CIRCUIT_DURATION_MS);
  });

  it("matches the exact timed room list", () => {
    expect([...GUILLE_TIMED_ROOM_IDS]).toEqual(["PZ-R3", "PZ-R4", "MG-R2", "DS-R3", "DS-R2", "BOSS-G", "SS8", "SS10"]);
    expect(isGuilleTimedRoom("PZ-R1")).toBe(false);
    expect(isGuilleTimedRoom("PZ-R2")).toBe(false);
    expect(isGuilleTimedRoom("PZ-R3")).toBe(true);
  });

  it("closes the Correr perimeter without closing the safe Cocina stair", () => {
    const expired = expiredCircuitState();
    const safeRoomExits = getRoomExits({
      ...expired,
      currentRoomId: "PZ-R2",
      currentFloor: "piso1",
      currentZone: "Correr",
    });
    const timedStairExits = getRoomExits({
      ...expired,
      currentRoomId: "DS-R1",
      currentFloor: "piso1",
      currentZone: "Correr",
    });
    const safeExits = getRoomExits({
      ...expired,
      currentRoomId: "DS-C2",
      currentFloor: "piso1",
      currentZone: "Cocina",
    });

    expect(safeRoomExits.find((exit) => exit.target.id === "PZ-R1")?.access.open).toBe(true);
    expect(safeRoomExits.find((exit) => exit.target.id === "MG-R1")?.access.open).toBe(true);
    expect(safeRoomExits.find((exit) => exit.target.id === "PZ-K1")?.access).toMatchObject({
      open: true,
    });
    expect(timedStairExits.find((exit) => exit.target.id === "MG-M1")?.access).toMatchObject({
      open: false,
      reason: expect.stringContaining("B7B"),
    });
    expect(safeExits.find((exit) => exit.target.id === "DS-M1")?.access).toMatchObject({
      open: true,
    });
  });

  it("refreshes a running timer into an expired state after the deadline", () => {
    const started = startGuilleCircuit(
      createInitialGameState(new Date("2026-06-17T10:00:00.000Z")),
      new Date("2026-06-17T10:00:00.000Z"),
    );

    const refreshed = refreshGuilleCircuitTimer(started, new Date("2026-06-17T10:03:01.000Z"));

    expect(refreshed.timerState.guilleCircuitStatus).toBe("expired");
    expect(refreshed.timerState.guilleCircuitOpen).toBe(false);
    expect(refreshed.timerState.remainingMs).toBe(0);
  });

  it("ejects the player to PZ-R2 when the timer expires inside Correr", () => {
    const started = startGuilleCircuit(
      {
        ...createInitialGameState(new Date("2026-06-17T10:00:00.000Z")),
      currentRoomId: "MG-R2",
        currentFloor: "piso1" as const,
        currentZone: "Correr",
      },
      new Date("2026-06-17T10:00:00.000Z"),
    );

    const refreshed = refreshGuilleCircuitTimer(started, new Date("2026-06-17T10:03:01.000Z"));

    expect(refreshed.currentRoomId).toBe("PZ-R2");
    expect(refreshed.timerState.guilleCircuitOpen).toBe(false);
  });

  it("uses the Giratiempo in SS13 to reopen and restart the circuit", () => {
    const expired = {
      ...expiredCircuitState(),
      currentRoomId: "SS13",
      currentFloor: "piso1" as const,
      currentZone: "Entrada",
      rumors: [13],
    };

    const result = interactWithCurrentRoom(expired, new Date("2026-06-17T10:04:00.000Z"));

    expect(result.changed).toBe(true);
    expect(result.message).toContain("Giratiempo");
    expect(result.state.timerState.guilleCircuitOpen).toBe(true);
    expect(result.state.timerState.guilleCircuitStatus).toBe("running");
    expect(result.state.timerState.reopenCount).toBe(1);
    expect(result.state.inventory).not.toContain("Giratiempo");
  });

  it("keeps the documented anti-softlock route and removed stairs under test", () => {
    const stairs = dungeonMap.connections.filter((connection) => connection.kind === "escalera");
    const removed = new Set(dungeonMap.removedStairRoomIds);

    expect(stairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "DS-C2", to: "DS-M1" }),
        expect.objectContaining({ from: "DS-R1", to: "MG-M1" }),
      ]),
    );
    expect(stairs.some((connection) => removed.has(connection.from) || removed.has(connection.to))).toBe(false);
  });

  it("formats HUD timer labels", () => {
    expect(formatRemainingMs(61000)).toBe("1:01");
    expect(guilleTimerLabel(expiredCircuitState().timerState)).toBe("Circuito cerrado");
  });
});

function expiredCircuitState(): GameState {
  return {
    ...createInitialGameState(new Date("2026-06-17T10:00:00.000Z")),
    timerState: {
      guilleCircuitOpen: false,
      guilleCircuitStatus: "expired",
      durationMs: GUILLE_CIRCUIT_DURATION_MS,
      remainingMs: 0,
      startedAt: "2026-06-17T10:00:00.000Z",
      deadlineAt: "2026-06-17T10:03:00.000Z",
      lastClosedAt: "2026-06-17T10:03:00.000Z",
      reopenCount: 0,
    },
  };
}
