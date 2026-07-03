import { describe, expect, it } from "vitest";
import { parseTiledSpikeTraps } from "../../../game/content/tiledRooms/hazards";
import { HazardObjectSystem } from "./HazardObjectSystem";

describe("HazardObjectSystem", () => {
  it("applies SpikeTrap damage only while active and after cooldown", () => {
    const hazards = parseTiledSpikeTraps({
      name: "Hazards",
      type: "objectgroup",
      objects: [
        {
          id: 1,
          type: "SpikeTrap",
          x: 96,
          y: 112,
          width: 48,
          height: 16,
          properties: [
            { name: "damage", value: 2 },
            { name: "damageCooldown", value: 1000 },
            { name: "cycleMs", value: 1350 },
            { name: "activeFromMs", value: 600 },
            { name: "activeToMs", value: 1200 },
          ],
        },
        { id: 2, type: "SpikeTrap", x: 200, y: 200, width: 16, height: 16 },
      ],
    });
    const scene = { time: { now: 599 } } as Phaser.Scene;
    const system = new HazardObjectSystem(scene, hazards, 8);

    expect(system.update({ x: 100, y: 120, facing: "down" })).toBeNull();

    scene.time.now = 600;
    expect(system.update({ x: 100, y: 120, facing: "down" })?.hazard).toEqual(expect.objectContaining({ id: "hazard.1", damage: 2 }));

    scene.time.now = 800;
    expect(system.update({ x: 100, y: 120, facing: "down" })).toBeNull();

    scene.time.now = 2050;
    expect(system.update({ x: 100, y: 120, facing: "down" })?.hazard.id).toBe("hazard.1");
  });
});
