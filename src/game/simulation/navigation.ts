import { Direction } from "../input/actions";
import { companionDefinitions } from "../content/companions";
import { dungeonMap, gatesById, roomsById, roomCenter, secretRumorForRoom } from "../content/maps/dungeon";
import { ConnectionDefinition, GateDefinition, RoomDefinition } from "../content/maps/types";
import { getRoomContent, getRoomRuntimeDefinition } from "../content/rooms";
import { discoverRoom, GameState, markRumorUsedForRoom, touchGameState } from "./state";
import { grantProgress } from "./progression";
import {
  GUILLE_TIMER_SAFE_ROOM_ID,
  isGuilleTimedAccess,
  normalizeTimerState,
  normalizeTimerStateForGame,
  refreshGuilleCircuitTimer,
  startGuilleCircuitIfNeeded,
} from "./timer";

export type ExitAccess = {
  open: boolean;
  reason?: string;
};

export type ExitDefinition = {
  connection: ConnectionDefinition;
  target: RoomDefinition;
  direction: Direction;
  access: ExitAccess;
};

export type MoveResult = {
  state: GameState;
  moved: boolean;
  message: string;
  exit?: ExitDefinition;
};

const directionVectors: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function normalizeStateRoom(state: GameState): GameState {
  const normalizedState = normalizeTimerStateForGame(state);
  const room = roomDefinitionForId(normalizedState.currentRoomId) ?? roomsById.get("PZ-E1");

  if (!room) {
    return state;
  }

  if (
    room.id === normalizedState.currentRoomId &&
    room.floor === normalizedState.currentFloor &&
    room.zone === normalizedState.currentZone
  ) {
    return normalizedState;
  }

  return {
    ...normalizedState,
    currentRoomId: room.id,
    currentFloor: room.floor,
    currentZone: room.zone,
  };
}

export function getCurrentRoom(state: GameState): RoomDefinition {
  const room = roomDefinitionForId(state.currentRoomId);

  if (!room) {
    throw new Error(`Unknown current room: ${state.currentRoomId}`);
  }

  return room;
}

export function getRoomExits(state: GameState): ExitDefinition[] {
  const currentRoom = getCurrentRoom(state);

  return dungeonMap.connections
    .filter((connection) => connection.from === currentRoom.id || connection.to === currentRoom.id)
    .map((connection) => {
      const targetId = connection.from === currentRoom.id ? connection.to : connection.from;
      const target = roomsById.get(targetId);

      if (!target) {
        throw new Error(`Unknown exit target: ${targetId}`);
      }

      return {
        connection,
        target,
        direction: directionToTarget(currentRoom.id, target.id),
        access: getConnectionAccess(state, connection, target),
      };
    })
    .sort((a, b) => directionSortValue(a.direction) - directionSortValue(b.direction) || a.target.id.localeCompare(b.target.id));
}

export function moveInDirection(state: GameState, direction: Direction, now = new Date()): MoveResult {
  const activeState = refreshGuilleCircuitTimer(state, now);

  const timerMove = timerMoveResult(state, activeState, now);

  if (timerMove) {
    return timerMove;
  }

  const exits = getRoomExits(activeState);
  const exit = chooseExitForDirection(activeState.currentRoomId, exits, direction);

  if (!exit) {
    return {
      state: touchGameState(activeState, now),
      moved: false,
      message: `No hay salida hacia ${directionLabel(direction)}`,
    };
  }

  if (!exit.access.open) {
    return {
      state: touchGameState(activeState, now),
      moved: false,
      message: exit.access.reason ?? "Salida bloqueada",
      exit,
    };
  }

  return moveThroughExit(activeState, exit, now);
}

export function moveToRoom(state: GameState, targetRoomId: string, now = new Date()): MoveResult {
  const activeState = refreshGuilleCircuitTimer(state, now);
  const timerMove = timerMoveResult(state, activeState, now);

  if (timerMove) {
    return timerMove;
  }

  const exits = getRoomExits(activeState);
  const exit = exits.find((entry) => entry.target.id === targetRoomId);

  if (exit) {
    if (!exit.access.open) {
      return {
        state: touchGameState(activeState, now),
        moved: false,
        message: exit.access.reason ?? "Salida bloqueada",
        exit,
      };
    }

    return moveThroughExit(activeState, exit, now);
  }

  const target = roomDefinitionForId(targetRoomId);

  if (!target) {
    return {
      state: touchGameState(activeState, now),
      moved: false,
      message: `Sala desconocida: ${targetRoomId}`,
    };
  }

  const movedState = discoverRoom({
    ...activeState,
    currentRoomId: target.id,
    currentFloor: target.floor,
    currentZone: target.zone,
  }, target.id);
  const secretAwareState = markRumorUsedForRoom(movedState, target.id);
  const nextState = touchGameState(startGuilleCircuitIfNeeded(secretAwareState, now), now);

  return {
    state: nextState,
    moved: true,
    message: `Entrando en ${target.id}`,
  };
}

export function getConnectionAccess(
  state: GameState,
  connection: ConnectionDefinition,
  target: RoomDefinition,
): ExitAccess {
  const timerState = normalizeTimerState(state.timerState);

  if (isGuilleTimedAccess(connection) && !timerState.guilleCircuitOpen) {
    return {
      open: false,
      reason: "Cronometro de Guille agotado: activa el Giratiempo en SS13",
    };
  }

  const secretRumor = secretRumorForRoom(target.id);

  if (secretRumor && !state.rumors.includes(secretRumor)) {
    return {
      open: false,
      reason: `Necesitas Rumor ${secretRumor} para encontrar ${target.id}`,
    };
  }

  if (!connection.gateId || state.openGates.includes(connection.gateId)) {
    return { open: true };
  }

  const gate = gatesById.get(connection.gateId);

  if (!gate) {
    return {
      open: false,
      reason: `Bloqueo ${connection.gateId} sin definir`,
    };
  }

  if (meetsGateRequirement(state, gate)) {
    return { open: true };
  }

  return {
    open: false,
    reason: `${gate.id}: falta ${gate.requirement.description}`,
  };
}

function chooseExitForDirection(
  currentRoomId: string,
  exits: ExitDefinition[],
  direction: Direction,
): ExitDefinition | null {
  if (exits.length === 0) {
    return null;
  }

  const requested = directionVectors[direction];
  const currentCenter = roomCenter(currentRoomId);
  let best: { exit: ExitDefinition; score: number; distance: number } | null = null;

  for (const exit of exits) {
    const targetCenter = roomCenter(exit.target.id);
    const dx = targetCenter.x - currentCenter.x;
    const dy = targetCenter.y - currentCenter.y;
    const distance = Math.hypot(dx, dy) || 1;
    const score = (dx / distance) * requested.x + (dy / distance) * requested.y;

    if (score <= 0.35) {
      continue;
    }

    if (!best || score > best.score || (score === best.score && distance < best.distance)) {
      best = { exit, score, distance };
    }
  }

  return best?.exit ?? null;
}

function roomDefinitionForId(roomId: string): RoomDefinition | undefined {
  const graphRoom = roomsById.get(roomId);

  if (graphRoom) {
    return graphRoom;
  }

  const runtime = getRoomRuntimeDefinition(roomId);

  if (!runtime.world) {
    return undefined;
  }

  const content = getRoomContent(roomId);

  return {
    id: roomId,
    floor: content.floor,
    zone: content.zone,
    kind: runtime.graphKind ?? "normal",
    layout: {
      x: runtime.world.worldX,
      y: runtime.world.worldY,
      width: runtime.world.width,
      height: runtime.world.height,
    },
  };
}

function moveThroughExit(activeState: GameState, exit: ExitDefinition, now: Date): MoveResult {
  const movedState = discoverRoom({
    ...activeState,
    currentRoomId: exit.target.id,
    currentFloor: exit.target.floor,
    currentZone: exit.target.zone,
  }, exit.target.id);
  const secretAwareState = markRumorUsedForRoom(movedState, exit.target.id);
  const progressedState = exit.connection.gateId
    ? grantProgress(secretAwareState, { openGates: [exit.connection.gateId] })
    : secretAwareState;
  const nextState = touchGameState(startGuilleCircuitIfNeeded(progressedState, now), now);

  return {
    state: nextState,
    moved: true,
    message: `Entrando en ${exit.target.id}`,
    exit,
  };
}

function timerMoveResult(state: GameState, activeState: GameState, now: Date): MoveResult | undefined {
  if (activeState.currentRoomId === state.currentRoomId) {
    return undefined;
  }

  return {
    state: touchGameState(activeState, now),
    moved: true,
    message: `Cronometro agotado: vuelves a ${GUILLE_TIMER_SAFE_ROOM_ID}`,
  };
}

function directionToTarget(from: string, to: string): Direction {
  const origin = roomCenter(from);
  const target = roomCenter(to);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }

  return dy >= 0 ? "down" : "up";
}

function meetsGateRequirement(state: GameState, gate: GateDefinition): boolean {
  const itemsOk = gate.requirement.items?.every((item) => state.inventory.includes(item)) ?? true;
  const rumorsOk = gate.requirement.rumors?.every((rumor) => state.rumors.includes(rumor)) ?? true;
  const flagsOk = gate.requirement.flags?.every((flag) => state.flags[flag]) ?? true;
  const companionOk = gate.requirement.anyCompanion
    ? companionDefinitions.some((companion) => state.inventory.includes(companion.itemName))
    : true;

  return itemsOk && rumorsOk && flagsOk && companionOk;
}

function directionSortValue(direction: Direction): number {
  return {
    up: 0,
    right: 1,
    down: 2,
    left: 3,
  }[direction];
}

function directionLabel(direction: Direction): string {
  return {
    up: "arriba",
    down: "abajo",
    left: "izquierda",
    right: "derecha",
  }[direction];
}
