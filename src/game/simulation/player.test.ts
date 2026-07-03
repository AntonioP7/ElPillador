import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./state";
import { damagePlayer } from "./player";

describe("player damage", () => {
  it("subtracts health without going below zero", () => {
    const state = createInitialGameState();
    const hit = damagePlayer(state, 1, "Pinchos de SR2");
    const lethal = damagePlayer(
      { ...hit.state, playerHealth: 1, playerCombat: { ...hit.state.playerCombat, health: 1 } },
      5,
      "Pinchos de SR2",
      new Date(Date.now() + 1000),
    );

    expect(hit.state.playerHealth).toBe(99);
    expect(lethal.state.playerHealth).toBe(0);
  });
});
