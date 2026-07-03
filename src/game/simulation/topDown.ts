import { ConnectionDefinition } from "../content/maps/types";
import { Direction } from "../input/actions";
import { ExitDefinition, getRoomExits } from "./navigation";
import { grantProgress, interactWithCurrentRoom, InteractionResult, getRoomInteractions } from "./progression";
import { discoverRoom, GameState, markRumorUsedForRoom, PlayerPose, touchGameState } from "./state";
import { startGuilleCircuitIfNeeded } from "./timer";

export const TOP_DOWN_ROOM_WIDTH = 800;
export const TOP_DOWN_ROOM_HEIGHT = 450;
export const TOP_DOWN_PLAYER_RADIUS = 14;
export const TOP_DOWN_PLAYER_SPEED = 170;
export const TOP_DOWN_INTERACTION_RANGE = 48;

export type TopDownInputState = {
  up?: boolean;
  down?: boolean;
  left?: boolean;
  right?: boolean;
};

export type TopDownDoor = {
  id: string;
  direction: Direction;
  x: number;
  y: number;
  width: number;
  height: number;
  exit: ExitDefinition;
};

export type TopDownInteractable = {
  id: string;
  kind: "room-reward" | "npc" | "special";
  label: string;
  status: "available" | "blocked" | "completed";
  x: number;
  y: number;
};

export type TopDownStepResult = {
  state: GameState;
  moved: boolean;
};

export type TopDownTransitionResult = {
  state: GameState;
  transitioned: boolean;
  blocked: boolean;
  message: string;
  door?: TopDownDoor;
};

export function stepTopDownMovement(
  state: GameState,
  input: TopDownInputState,
  deltaMs: number,
): TopDownStepResult {
  const vector = inputVector(input);

  if (vector.x === 0 && vector.y === 0) {
    return { state, moved: false };
  }

  const distance = TOP_DOWN_PLAYER_SPEED * Math.max(0, deltaMs / 1000);
  const nextPose = clampPose({
    x: state.playerPose.x + vector.x * distance,
    y: state.playerPose.y + vector.y * distance,
    facing: vectorToFacing(vector, state.playerPose.facing),
  });

  return {
    state: {
      ...state,
      playerPose: nextPose,
    },
    moved: nextPose.x !== state.playerPose.x || nextPose.y !== state.playerPose.y,
  };
}

export function tryTopDownDoorTransition(state: GameState, now = new Date()): TopDownTransitionResult {
  const door = getTopDownDoors(state).find((entry) => poseIntersectsDoor(state.playerPose, entry));

  if (!door) {
    return { state, transitioned: false, blocked: false, message: "" };
  }

  if (!door.exit.access.open) {
    return {
      state: touchGameState(
        {
          ...state,
          playerPose: bounceFromDoor(state.playerPose, door.direction),
        },
        now,
      ),
      transitioned: false,
      blocked: true,
      message: door.exit.access.reason ?? "Salida bloqueada",
      door,
    };
  }

  const movedState = discoverRoom({
    ...state,
    currentRoomId: door.exit.target.id,
    currentFloor: door.exit.target.floor,
    currentZone: door.exit.target.zone,
    playerPose: spawnFromDoor(door.direction, door),
  }, door.exit.target.id);
  const secretAwareState = markRumorUsedForRoom(movedState, door.exit.target.id);
  const progressedState = door.exit.connection.gateId
    ? grantProgress(secretAwareState, { openGates: [door.exit.connection.gateId] })
    : secretAwareState;
  const nextState = touchGameState(startGuilleCircuitIfNeeded(progressedState, now), now);

  return {
    state: nextState,
    transitioned: true,
    blocked: false,
    message: `Entrando en ${door.exit.target.id}`,
    door,
  };
}

export function getTopDownDoors(state: GameState): TopDownDoor[] {
  const exits = getRoomExits(state);
  const totalsByDirection = directionCounts(exits);
  const seenByDirection: Record<Direction, number> = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
  };

  return exits.map((exit) => {
    const index = seenByDirection[exit.direction]++;
    const count = totalsByDirection[exit.direction];
    const rect = doorRect(exit.direction, index, count);

    return {
      id: doorId(exit.connection),
      direction: exit.direction,
      ...rect,
      exit,
    };
  });
}

export function getTopDownInteractables(state: GameState): TopDownInteractable[] {
  const interactions = getRoomInteractions(state);
  const spacing = 82;
  const startX = TOP_DOWN_ROOM_WIDTH / 2 - ((interactions.length - 1) * spacing) / 2;

  return interactions.map((interaction, index) => ({
    id: interaction.id,
    kind: interaction.kind,
    label: interaction.label,
    status: interaction.status,
    x: startX + index * spacing,
    y: TOP_DOWN_ROOM_HEIGHT / 2,
  }));
}

export function interactWithNearestTopDownObject(state: GameState, now = new Date()): InteractionResult {
  const nearest = nearestInteractable(state);

  if (!nearest || nearest.distance > TOP_DOWN_INTERACTION_RANGE) {
    return {
      state: touchGameState(state, now),
      changed: false,
      message: "No hay nada al alcance",
      interactions: getRoomInteractions(state),
    };
  }

  return interactWithCurrentRoom(state, now);
}

export function isTopDownInputActive(input: TopDownInputState): boolean {
  return Boolean(input.up || input.down || input.left || input.right);
}

function inputVector(input: TopDownInputState): { x: number; y: number } {
  const x = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const y = Number(Boolean(input.down)) - Number(Boolean(input.up));
  const length = Math.hypot(x, y);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

function vectorToFacing(vector: { x: number; y: number }, fallback: Direction): Direction {
  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    return vector.x > 0 ? "right" : "left";
  }

  if (vector.y !== 0) {
    return vector.y > 0 ? "down" : "up";
  }

  return fallback;
}

function clampPose(pose: PlayerPose): PlayerPose {
  return {
    ...pose,
    x: clamp(pose.x, TOP_DOWN_PLAYER_RADIUS, TOP_DOWN_ROOM_WIDTH - TOP_DOWN_PLAYER_RADIUS),
    y: clamp(pose.y, TOP_DOWN_PLAYER_RADIUS, TOP_DOWN_ROOM_HEIGHT - TOP_DOWN_PLAYER_RADIUS),
  };
}

function poseIntersectsDoor(pose: PlayerPose, door: TopDownDoor): boolean {
  return (
    pose.x >= door.x &&
    pose.x <= door.x + door.width &&
    pose.y >= door.y &&
    pose.y <= door.y + door.height
  );
}

function bounceFromDoor(pose: PlayerPose, direction: Direction): PlayerPose {
  const inset = TOP_DOWN_PLAYER_RADIUS + 34;

  if (direction === "left") {
    return { ...pose, x: inset, facing: "right" };
  }

  if (direction === "right") {
    return { ...pose, x: TOP_DOWN_ROOM_WIDTH - inset, facing: "left" };
  }

  if (direction === "up") {
    return { ...pose, y: inset, facing: "down" };
  }

  return { ...pose, y: TOP_DOWN_ROOM_HEIGHT - inset, facing: "up" };
}

function spawnFromDoor(direction: Direction, door: Pick<TopDownDoor, "x" | "y" | "width" | "height">): PlayerPose {
  const inset = TOP_DOWN_PLAYER_RADIUS + 42;
  const doorCenterX = door.x + door.width / 2;
  const doorCenterY = door.y + door.height / 2;

  if (direction === "left") {
    return { x: TOP_DOWN_ROOM_WIDTH - inset, y: doorCenterY, facing: "left" };
  }

  if (direction === "right") {
    return { x: inset, y: doorCenterY, facing: "right" };
  }

  if (direction === "up") {
    return { x: doorCenterX, y: TOP_DOWN_ROOM_HEIGHT - inset, facing: "up" };
  }

  return { x: doorCenterX, y: inset, facing: "down" };
}

function directionCounts(exits: ExitDefinition[]): Record<Direction, number> {
  return exits.reduce(
    (acc, exit) => ({
      ...acc,
      [exit.direction]: acc[exit.direction] + 1,
    }),
    { up: 0, down: 0, left: 0, right: 0 } satisfies Record<Direction, number>,
  );
}

function doorRect(direction: Direction, index: number, count: number): Pick<TopDownDoor, "x" | "y" | "width" | "height"> {
  const doorDepth = 28;
  const doorLength = 96;
  const horizontalCenter = distributedCenter(index, count, 150, TOP_DOWN_ROOM_WIDTH - 150);
  const verticalCenter = distributedCenter(index, count, 96, TOP_DOWN_ROOM_HEIGHT - 96);

  if (direction === "left") {
    return { x: 0, y: verticalCenter - doorLength / 2, width: doorDepth, height: doorLength };
  }

  if (direction === "right") {
    return { x: TOP_DOWN_ROOM_WIDTH - doorDepth, y: verticalCenter - doorLength / 2, width: doorDepth, height: doorLength };
  }

  if (direction === "up") {
    return { x: horizontalCenter - doorLength / 2, y: 0, width: doorLength, height: doorDepth };
  }

  return { x: horizontalCenter - doorLength / 2, y: TOP_DOWN_ROOM_HEIGHT - doorDepth, width: doorLength, height: doorDepth };
}

function distributedCenter(index: number, count: number, min: number, max: number): number {
  if (count <= 1) {
    return (min + max) / 2;
  }

  return min + ((max - min) * index) / (count - 1);
}

function nearestInteractable(state: GameState): { interactable: TopDownInteractable; distance: number } | null {
  let nearest: { interactable: TopDownInteractable; distance: number } | null = null;

  for (const interactable of getTopDownInteractables(state)) {
    const distance = Math.hypot(interactable.x - state.playerPose.x, interactable.y - state.playerPose.y);

    if (!nearest || distance < nearest.distance) {
      nearest = { interactable, distance };
    }
  }

  return nearest;
}

function doorId(connection: ConnectionDefinition): string {
  return `door.${connection.from}.${connection.to}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
