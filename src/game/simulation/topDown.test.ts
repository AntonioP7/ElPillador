import { describe, expect, it } from "vitest";
import { Direction } from "../input/actions";
import { getRoomExits } from "./navigation";
import { createInitialGameState, GameState, PlayerPose } from "./state";
import {
  getTopDownDoors,
  getTopDownInteractables,
  interactWithNearestTopDownObject,
  stepTopDownMovement,
  TOP_DOWN_PLAYER_RADIUS,
  tryTopDownDoorTransition,
} from "./topDown";

describe("top-down exploration", () => {
  it("clamps movement inside the room bounds", () => {
    const state = {
      ...createInitialGameState(),
      playerPose: { x: 20, y: 20, facing: "left" as const },
    };
    const result = stepTopDownMovement(state, { up: true, left: true }, 1000);

    expect(result.moved).toBe(true);
    expect(result.state.playerPose.x).toBe(TOP_DOWN_PLAYER_RADIUS);
    expect(result.state.playerPose.y).toBe(TOP_DOWN_PLAYER_RADIUS);
    expect(result.state.playerPose.facing).toBe("up");
  });

  it("uses the graph access rules for top-down doors", () => {
    const state = {
      ...createInitialGameState(),
      currentRoomId: "SR2",
      currentFloor: "piso1" as const,
      currentZone: "Entrada",
    };
    const graphExit = getRoomExits(state).find((exit) => exit.target.id === "SS1");
    const topDownDoor = getTopDownDoors(state).find((door) => door.exit.target.id === "SS1");

    expect(topDownDoor?.exit.access).toEqual(graphExit?.access);
    expect(topDownDoor?.exit.access.open).toBe(false);
  });

  it("moves through an open door and spawns by the opposite side", () => {
    const state = withPoseAtDoor(createInitialGameState(), "PZ-E2");
    const result = tryTopDownDoorTransition(state, new Date("2026-06-17T00:00:00.000Z"));

    expect(result.transitioned).toBe(true);
    expect(result.state.currentRoomId).toBe("PZ-E2");
    expect(result.state.discoveredRooms).toEqual(expect.arrayContaining(["PZ-E1", "PZ-E2"]));
    expect(result.state.playerPose.x).toBeLessThan(100);
    expect(result.message).toContain("PZ-E2");
  });

  it("blocks a closed gate without changing room", () => {
    const state = withPoseAtDoor(
      {
        ...createInitialGameState(),
        currentRoomId: "MG-R1",
        currentFloor: "piso1" as const,
        currentZone: "Correr",
      },
      "SR17",
    );
    const result = tryTopDownDoorTransition(state, new Date("2026-06-17T00:00:00.000Z"));

    expect(result.blocked).toBe(true);
    expect(result.state.currentRoomId).toBe("MG-R1");
    expect(result.message).toContain("B7");
  });

  it("blocks a secret room if the rumor is unknown", () => {
    const state = withPoseAtDoor(
      {
        ...createInitialGameState(),
        currentRoomId: "SR2",
        currentFloor: "piso1" as const,
        currentZone: "Entrada",
      },
      "SS1",
    );
    const result = tryTopDownDoorTransition(state, new Date("2026-06-17T00:00:00.000Z"));

    expect(result.blocked).toBe(true);
    expect(result.state.currentRoomId).toBe("SR2");
    expect(result.message).toContain("Rumor 1");
  });

  it("marks the rumor as done after crossing into SS1 through opened B1", () => {
    const state = withPoseAtDoor(
      {
        ...createInitialGameState(),
        currentRoomId: "SR2",
        currentFloor: "piso1" as const,
        currentZone: "Entrada",
        rumors: [1],
        openGates: ["B1"],
      },
      "SS1",
    );
    const result = tryTopDownDoorTransition(state, new Date("2026-06-17T00:00:00.000Z"));

    expect(result.transitioned).toBe(true);
    expect(result.state.currentRoomId).toBe("SS1");
    expect(result.state.usedRumors).toContain(1);
  });

  it("interacts with room content only when the player is close enough", () => {
    const roomState = {
      ...createInitialGameState(),
      currentRoomId: "SR2",
      currentFloor: "piso1" as const,
      currentZone: "Entrada",
    };
    const interactable = getTopDownInteractables(roomState)[0];
    const closeState = {
      ...roomState,
      playerPose: { x: interactable.x, y: interactable.y, facing: "down" as const },
    };
    const farState = {
      ...roomState,
      playerPose: { x: 40, y: 40, facing: "down" as const },
    };

    const close = interactWithNearestTopDownObject(closeState);
    const far = interactWithNearestTopDownObject(farState);

    expect(close.changed).toBe(true);
    expect(close.state.inventory).toContain("Espada");
    expect(close.state.rumors).toContain(9);
    expect(far.changed).toBe(false);
    expect(far.state.inventory).not.toContain("Espada");
  });
});

function withPoseAtDoor(state: GameState, targetRoomId: string): GameState {
  const door = getTopDownDoors(state).find((entry) => entry.exit.target.id === targetRoomId);

  if (!door) {
    throw new Error(`Missing door to ${targetRoomId}`);
  }

  return {
    ...state,
    playerPose: {
      x: door.x + door.width / 2,
      y: door.y + door.height / 2,
      facing: door.direction,
    } satisfies PlayerPose & { facing: Direction },
  };
}
