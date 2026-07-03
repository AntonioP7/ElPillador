import { describe, expect, it } from "vitest";
import { npcDefinitions, roomRewards } from "../progression";
import { itemDefinitions } from ".";

describe("item definitions", () => {
  it("lists every item granted by progression content", () => {
    const grantedItems = new Set<string>();

    for (const reward of roomRewards) {
      for (const item of reward.grants.items ?? []) {
        grantedItems.add(item);
      }
    }

    for (const npc of npcDefinitions) {
      for (const item of npc.grants.items ?? []) {
        grantedItems.add(item);
      }
    }

    expect(itemDefinitions.map((item) => item.name)).toEqual(expect.arrayContaining([...grantedItems]));
  });

  it("does not duplicate item rows", () => {
    const ids = itemDefinitions.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes the starting clock and excludes Giratiempo as inventory", () => {
    const names = itemDefinitions.map((item) => item.name);

    expect(names).toContain("Reloj");
    expect(names).not.toContain("Giratiempo");
  });

  it("marks equipment slots for action items", () => {
    expect(itemDefinitions.find((item) => item.name === "Espada")?.equipSlot).toBe("weapon");
    expect(itemDefinitions.find((item) => item.name === "Lupa")?.equipSlot).toBe("active");
    expect(itemDefinitions.find((item) => item.name === "Varita")?.equipSlot).toBe("active");
    expect(itemDefinitions.every((item) => item.description.length > 0)).toBe(true);
  });
});
