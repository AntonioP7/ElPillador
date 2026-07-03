import { describe, expect, it } from "vitest";
import {
  canApplySpikeTrapDamage,
  isSpikeTrapActive,
  parseTiledSpikeTraps,
  playerOverlapsHazard,
} from "./hazards";

describe("Tiled hazards", () => {
  it("parses every SpikeTrap from a Hazards object layer with defaults", () => {
    const hazards = parseTiledSpikeTraps({
      name: "Hazards",
      type: "objectgroup",
      objects: [
        { id: 1, type: "SpikeTrap", x: 10, y: 20, width: 30, height: 40 },
        { id: 2, type: "Decoration", x: 0, y: 0, width: 16, height: 16 },
        { id: 3, type: "SpikeTrap", x: 50, y: 60, width: 16, height: 16 },
      ],
    });

    expect(hazards).toEqual([
      expect.objectContaining({
        id: "hazard.1",
        type: "SpikeTrap",
        x: 10,
        y: 20,
        width: 30,
        height: 40,
        damage: 1,
        damageCooldown: 1000,
        cycleMs: 1350,
        activeFromMs: 600,
        activeToMs: 1200,
      }),
      expect.objectContaining({ id: "hazard.3", x: 50, y: 60 }),
    ]);
  });

  it("uses custom Tiled properties when present", () => {
    const [hazard] = parseTiledSpikeTraps({
      name: "Hazards",
      type: "objectgroup",
      objects: [
        {
          id: 7,
          name: "fast-spikes",
          type: "SpikeTrap",
          x: 96,
          y: 112,
          width: 48,
          height: 16,
          properties: [
            { name: "damage", value: 3 },
            { name: "damageCooldown", value: 250 },
            { name: "cycleMs", value: 900 },
            { name: "activeFromMs", value: 100 },
            { name: "activeToMs", value: 700 },
          ],
        },
      ],
    });

    expect(hazard).toEqual(expect.objectContaining({
      id: "fast-spikes",
      damage: 3,
      damageCooldown: 250,
      cycleMs: 900,
      activeFromMs: 100,
      activeToMs: 700,
    }));
  });

  it("checks active windows, cooldowns and player overlap generically", () => {
    const [hazard] = parseTiledSpikeTraps({
      name: "Hazards",
      type: "objectgroup",
      objects: [{ id: 1, type: "SpikeTrap", x: 96, y: 112, width: 48, height: 16 }],
    });

    expect(isSpikeTrapActive(hazard, 599)).toBe(false);
    expect(isSpikeTrapActive(hazard, 600)).toBe(true);
    expect(isSpikeTrapActive(hazard, 1199)).toBe(true);
    expect(isSpikeTrapActive(hazard, 1200)).toBe(false);
    expect(canApplySpikeTrapDamage(hazard, 700, null)).toBe(true);
    expect(canApplySpikeTrapDamage(hazard, 800, 700)).toBe(false);
    expect(playerOverlapsHazard({ x: 100, y: 120 }, 8, hazard)).toBe(true);
    expect(playerOverlapsHazard({ x: 20, y: 20 }, 8, hazard)).toBe(false);
  });
});
