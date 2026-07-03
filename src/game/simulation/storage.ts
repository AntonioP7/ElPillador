import { GameState, isGameState, normalizeGameState } from "./state";

export const SAVE_KEY = "el-pillador.save.v1";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveGame(
  state: GameState,
  storage: StorageLike = window.localStorage,
): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(
  storage: StorageLike = window.localStorage,
): GameState | null {
  const raw = storage.getItem(SAVE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isGameState(parsed) ? normalizeGameState(parsed) : null;
  } catch {
    return null;
  }
}

export function clearSave(storage: StorageLike = window.localStorage): void {
  storage.removeItem(SAVE_KEY);
}
