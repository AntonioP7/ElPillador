import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./state";
import { clearSave, loadGame, saveGame, SAVE_KEY, StorageLike } from "./storage";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("save storage", () => {
  it("saves and loads a versioned game state", () => {
    const storage = new MemoryStorage();
    const state = createInitialGameState(new Date("2026-06-17T00:00:00.000Z"));

    saveGame(state, storage);

    expect(storage.getItem(SAVE_KEY)).toContain("PZ-E1");
    expect(loadGame(storage)).toEqual(state);
  });

  it("normalizes legacy saves without a top-down pose", () => {
    const storage = new MemoryStorage();
    const {
      playerPose: _playerPose,
      equipment: _equipment,
      inventory: _inventory,
      ...legacyState
    } = createInitialGameState(new Date("2026-06-17T00:00:00.000Z"));

    storage.setItem(SAVE_KEY, JSON.stringify({ ...legacyState, inventory: [] }));

    expect(loadGame(storage)?.playerPose).toEqual({ x: 192, y: 192, facing: "down" });
    expect(loadGame(storage)?.equipment).toEqual({});
    expect(loadGame(storage)?.inventory).toEqual(["Reloj"]);
  });

  it("ignores malformed saves", () => {
    const storage = new MemoryStorage();

    storage.setItem(SAVE_KEY, "{bad json");

    expect(loadGame(storage)).toBeNull();
  });

  it("clears existing saves", () => {
    const storage = new MemoryStorage();

    saveGame(createInitialGameState(), storage);
    clearSave(storage);

    expect(loadGame(storage)).toBeNull();
  });
});
