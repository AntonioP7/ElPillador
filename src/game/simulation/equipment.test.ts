import { describe, expect, it } from "vitest";
import { CLOCK_INSPECTION_RUMOR_ID, equipItem, inspectItemWithLupa, useEquippedItem } from "./equipment";
import { createInitialGameState } from "./state";

describe("equipment", () => {
  it("equips the sword as a free weapon and the lens as the active item", () => {
    const state = {
      ...createInitialGameState(),
      inventory: ["Reloj", "Espada", "Lupa"],
    };
    const sword = equipItem(state, "Espada");
    const lens = equipItem(sword.state, "Lupa");

    expect(lens.state.equipment).toEqual({ weapon: "Espada", activeItem: "Lupa" });
  });

  it("uses the active item before the weapon", () => {
    const state = {
      ...createInitialGameState(),
      inventory: ["Reloj", "Espada", "Lupa"],
      equipment: { weapon: "Espada", activeItem: "Lupa" },
    };
    const result = useEquippedItem(state);

    expect(result.handled).toBe(true);
    expect(result.message).toContain("Lupa");
  });

  it("does not equip items that are not in inventory", () => {
    const result = equipItem(createInitialGameState(), "Lupa");

    expect(result.handled).toBe(false);
    expect(result.message).toContain("aun no lo tienes");
  });

  it("reveals a rumor when the clock is inspected with the equipped lens", () => {
    const state = {
      ...createInitialGameState(),
      inventory: ["Reloj", "Lupa"],
      equipment: { activeItem: "Lupa" },
    };
    const result = inspectItemWithLupa(state, "Reloj");

    expect(result.handled).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.state.rumors).toContain(CLOCK_INSPECTION_RUMOR_ID);
  });

  it("does not reveal the clock rumor without the equipped lens", () => {
    const state = {
      ...createInitialGameState(),
      inventory: ["Reloj", "Lupa"],
      equipment: {},
    };
    const result = inspectItemWithLupa(state, "Reloj");

    expect(result.handled).toBe(false);
    expect(result.changed).toBe(false);
    expect(result.state.rumors).not.toContain(CLOCK_INSPECTION_RUMOR_ID);
  });

  it("does not duplicate the clock inspection rumor", () => {
    const state = {
      ...createInitialGameState(),
      inventory: ["Reloj", "Lupa"],
      rumors: [CLOCK_INSPECTION_RUMOR_ID],
      equipment: { activeItem: "Lupa" },
    };
    const result = inspectItemWithLupa(state, "Reloj");

    expect(result.handled).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.state.rumors.filter((rumor) => rumor === CLOCK_INSPECTION_RUMOR_ID)).toHaveLength(1);
  });
});
