import { ConnectionDefinition } from "../content/maps/types";
import { roomsById } from "../content/maps/dungeon";
import { discoverRoom, GameState, TimerState } from "./state";

export const GUILLE_CIRCUIT_DURATION_MS = 180000;
export const GUILLE_TIMED_ZONE = "Correr";
export const GUILLE_TIMER_SAFE_ROOM_ID = "PZ-R2";
const GUILLE_TIMER_SAFE_ROOM_POSE = { x: 400, y: 225, facing: "down" as const };
export const GUILLE_TIMED_ROOM_IDS = new Set(["PZ-R3", "PZ-R4", "MG-R2", "DS-R3", "DS-R2", "BOSS-G", "SS8", "SS10"]);

export function normalizeTimerState(timerState: Partial<TimerState> | undefined): TimerState {
  return {
    guilleCircuitOpen: timerState?.guilleCircuitOpen ?? true,
    guilleCircuitStatus: timerState?.guilleCircuitStatus ?? "idle",
    durationMs: timerState?.durationMs ?? GUILLE_CIRCUIT_DURATION_MS,
    remainingMs: timerState?.remainingMs ?? GUILLE_CIRCUIT_DURATION_MS,
    startedAt: timerState?.startedAt,
    deadlineAt: timerState?.deadlineAt,
    lastClosedAt: timerState?.lastClosedAt,
    reopenCount: timerState?.reopenCount ?? 0,
  };
}

export function normalizeTimerStateForGame(state: GameState): GameState {
  return {
    ...state,
    timerState: normalizeTimerState(state.timerState),
  };
}

export function startGuilleCircuitIfNeeded(state: GameState, now = new Date()): GameState {
  const refreshed = refreshGuilleCircuitTimer(state, now);
  const timerState = normalizeTimerState(refreshed.timerState);

  if (!isGuilleTimedRoom(refreshed.currentRoomId) || timerState.guilleCircuitStatus !== "idle") {
    return refreshed;
  }

  return startGuilleCircuit(refreshed, now);
}

export function startGuilleCircuit(state: GameState, now = new Date()): GameState {
  const timerState = normalizeTimerState(state.timerState);
  const durationMs = timerState.durationMs || GUILLE_CIRCUIT_DURATION_MS;
  const deadline = new Date(now.getTime() + durationMs);

  return {
    ...state,
    timerState: {
      ...timerState,
      guilleCircuitOpen: true,
      guilleCircuitStatus: "running",
      durationMs,
      remainingMs: durationMs,
      startedAt: now.toISOString(),
      deadlineAt: deadline.toISOString(),
      lastClosedAt: undefined,
    },
  };
}

export function refreshGuilleCircuitTimer(state: GameState, now = new Date()): GameState {
  const timerState = normalizeTimerState(state.timerState);

  if (timerState.guilleCircuitStatus !== "running" || !timerState.deadlineAt) {
    return {
      ...state,
      timerState,
    };
  }

  const remainingMs = new Date(timerState.deadlineAt).getTime() - now.getTime();

  if (remainingMs <= 0) {
    return expireGuilleCircuit(state, now);
  }

  return {
    ...state,
    timerState: {
      ...timerState,
      guilleCircuitOpen: true,
      remainingMs,
    },
  };
}

export function expireGuilleCircuit(state: GameState, now = new Date()): GameState {
  const ejectedState = ejectFromGuilleTimedZone(state);

  return {
    ...ejectedState,
    timerState: {
      ...normalizeTimerState(state.timerState),
      guilleCircuitOpen: false,
      guilleCircuitStatus: "expired",
      remainingMs: 0,
      lastClosedAt: now.toISOString(),
    },
  };
}

export function reopenGuilleCircuitWithGiratiempo(state: GameState, now = new Date()): GameState {
  const timerState = normalizeTimerState(state.timerState);
  const durationMs = timerState.durationMs || GUILLE_CIRCUIT_DURATION_MS;
  const deadline = new Date(now.getTime() + durationMs);

  return {
    ...state,
    timerState: {
      ...timerState,
      guilleCircuitOpen: true,
      guilleCircuitStatus: "running",
      durationMs,
      remainingMs: durationMs,
      startedAt: now.toISOString(),
      deadlineAt: deadline.toISOString(),
      lastClosedAt: undefined,
      reopenCount: timerState.reopenCount + 1,
    },
  };
}

export function isGuilleTimedRoom(roomId: string): boolean {
  return GUILLE_TIMED_ROOM_IDS.has(roomId);
}

export function isGuilleTimedAccess(connection: ConnectionDefinition): boolean {
  return isGuilleTimedRoom(connection.from) !== isGuilleTimedRoom(connection.to);
}

export function ejectFromGuilleTimedZone(state: GameState): GameState {
  if (!isGuilleTimedRoom(state.currentRoomId)) {
    return state;
  }

  const safeRoom = roomsById.get(GUILLE_TIMER_SAFE_ROOM_ID);

  if (!safeRoom) {
    return state;
  }

  return discoverRoom({
    ...state,
    currentRoomId: safeRoom.id,
    currentFloor: safeRoom.floor,
    currentZone: safeRoom.zone,
    playerPose: { ...GUILLE_TIMER_SAFE_ROOM_POSE },
  }, safeRoom.id);
}

export function guilleTimerLabel(timerState: TimerState): string {
  const normalized = normalizeTimerState(timerState);

  if (normalized.guilleCircuitStatus === "idle") {
    return "Circuito listo";
  }

  if (normalized.guilleCircuitStatus === "expired") {
    return "Circuito cerrado";
  }

  if (normalized.guilleCircuitStatus === "completed") {
    return "Circuito completado";
  }

  return `Circuito abierto (${formatRemainingMs(normalized.remainingMs ?? normalized.durationMs)})`;
}

export function formatRemainingMs(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
