import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../../game/simulation/state";
import { availableInventoryTabs, inventoryTabItemCount, normalizeInventoryTab } from "./inventoryOverlay";

describe("inventory overlay model", () => {
  it("hides companions until the first companion is discovered", () => {
    const initial = createInitialGameState();
    const withCompanion = {
      ...initial,
      inventory: [...initial.inventory, "Trufa"],
    };

    expect(availableInventoryTabs(initial)).toEqual(["items", "important", "diary", "gallery"]);
    expect(normalizeInventoryTab("companions", initial)).toBe("items");
    expect(availableInventoryTabs(withCompanion)).toEqual(["items", "important", "diary", "companions", "gallery"]);
  });

  it("only counts discovered companions and gallery memories", () => {
    const initial = createInitialGameState();
    const progressed = {
      ...initial,
      inventory: [...initial.inventory, "Trufa"],
      discoveredRooms: ["PZ-E1", "PZ-E2"],
    };

    expect(inventoryTabItemCount("companions", initial)).toBe(0);
    expect(inventoryTabItemCount("items", initial)).toBe(1);
    expect(inventoryTabItemCount("important", initial)).toBe(0);
    expect(inventoryTabItemCount("gallery", initial)).toBe(0);
    expect(inventoryTabItemCount("companions", progressed)).toBe(1);
    expect(inventoryTabItemCount("gallery", progressed)).toBeGreaterThan(0);
  });
});
