import { Direction, GameAction } from "./actions";

export type KeyBinding = {
  code: string;
  action: GameAction;
};

const directionBindings: Array<[string, Direction]> = [
  ["ArrowUp", "up"],
  ["KeyW", "up"],
  ["ArrowDown", "down"],
  ["KeyS", "down"],
  ["ArrowLeft", "left"],
  ["KeyA", "left"],
  ["ArrowRight", "right"],
  ["KeyD", "right"],
];

export const keyBindings: KeyBinding[] = [
  ...directionBindings.map(([code, direction]) => ({
    code,
    action: { type: "move", direction } satisfies GameAction,
  })),
  { code: "Enter", action: { type: "confirm" } },
  { code: "Escape", action: { type: "cancel" } },
  { code: "Space", action: { type: "interact" } },
  { code: "KeyE", action: { type: "use-equipped-item" } },
  { code: "KeyP", action: { type: "pause" } },
  { code: "KeyG", action: { type: "save" } },
  { code: "KeyL", action: { type: "load" } },
  { code: "F5", action: { type: "save" } },
  { code: "F9", action: { type: "load" } },
];

export function actionForCode(code: string): GameAction | null {
  return keyBindings.find((binding) => binding.code === code)?.action ?? null;
}
