import { describe, expect, it } from "vitest";
import { buildMapModel, defaultMapFloorForState, nextMapFloor } from "./mapOverlay";
import { createInitialGameState } from "../../game/simulation/state";

describe("game map overlay model", () => {
  it("uses the current floor and marks the current room without exposing it as text data", () => {
    const state = createInitialGameState();
    const model = buildMapModel(state, defaultMapFloorForState(state));
    const current = model.rooms.find((room) => room.current);

    expect(model.floor).toBe("piso1");
    expect(model.currentZone).toBe("Entrada");
    expect(model.currentVisible).toBe(true);
    expect(current?.id).toBe("PZ-E1");
    expect(current?.discovered).toBe(true);
  });

  it("only reveals rooms that have been visited", () => {
    const hidden = buildMapModel(createInitialGameState(), "piso1").rooms.find((room) => room.id === "SS1");
    const discovered = buildMapModel({ ...createInitialGameState(), discoveredRooms: ["PZ-E1", "SS1"] }, "piso1").rooms.find(
      (room) => room.id === "SS1",
    );

    expect(hidden?.discovered).toBe(false);
    expect(discovered?.discovered).toBe(true);
  });

  it("marks discovered rooms that contain stairs", () => {
    const model = buildMapModel({ ...createInitialGameState(), discoveredRooms: ["PZ-E1", "DS-C2"] }, "piso1");
    const stairRoom = model.rooms.find((room) => room.id === "DS-C2");

    expect(stairRoom?.discovered).toBe(true);
    expect(stairRoom?.hasStair).toBe(true);
  });

  it("cycles map floors for keyboard navigation", () => {
    expect(nextMapFloor("piso1", 1)).toBe("piso2");
    expect(nextMapFloor("piso1", -1)).toBe("sabios");
  });

  it("knows when the viewed floor is not the player's current floor", () => {
    const model = buildMapModel(createInitialGameState(), "piso2");

    expect(model.currentVisible).toBe(false);
  });
});
