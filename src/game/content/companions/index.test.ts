import { describe, expect, it } from "vitest";
import { companionDefinitions } from ".";

describe("companion definitions", () => {
  it("defines the four M3.5 companions", () => {
    expect(companionDefinitions.map((companion) => companion.itemName)).toEqual([
      "Trufa",
      "TostaRica1",
      "TostaRica2",
      "Choco",
    ]);
  });

  it("keeps editable placeholder stats on every companion", () => {
    for (const companion of companionDefinitions) {
      expect(companion.ability).toBeTruthy();
      expect(companion.stats.vida).toBeGreaterThan(0);
      expect(companion.stats.fuerza).toBeGreaterThan(0);
      expect(companion.stats.magia).toBeGreaterThan(0);
      expect(companion.stats.velocidad).toBeGreaterThan(0);
    }
  });
});
