export type Direction = "up" | "down" | "left" | "right";

export type GameAction =
  | { type: "move"; direction: Direction }
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "pause" }
  | { type: "interact" }
  | { type: "equip-item"; itemName: string }
  | { type: "inspect-item"; itemName: string }
  | { type: "swing-sword" }
  | { type: "place-bomb" }
  | { type: "use-equipped-item" }
  | { type: "save" }
  | { type: "load" }
  | { type: "reset" };

export type ActionResult = {
  handled: boolean;
  message?: string;
  worldChanged?: boolean;
};
