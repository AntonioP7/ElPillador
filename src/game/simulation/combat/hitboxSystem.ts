import type { Direction } from "../../input/actions";
import type { CombatCollisionRect, DirectedPose, DirectionVector } from "./types";

export function facingVector(direction: Direction): DirectionVector {
  return {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }[direction];
}

export function swordHitbox(
  pose: DirectedPose,
  config: { startDistance: number; range: number; width: number },
): CombatCollisionRect {
  const halfWidth = config.width / 2;

  if (pose.facing === "left") {
    return {
      x: pose.x - config.startDistance - config.range,
      y: pose.y - halfWidth,
      width: config.range,
      height: config.width,
    };
  }

  if (pose.facing === "right") {
    return {
      x: pose.x + config.startDistance,
      y: pose.y - halfWidth,
      width: config.range,
      height: config.width,
    };
  }

  if (pose.facing === "up") {
    return {
      x: pose.x - halfWidth,
      y: pose.y - config.startDistance - config.range,
      width: config.width,
      height: config.range,
    };
  }

  return {
    x: pose.x - halfWidth,
    y: pose.y + config.startDistance,
    width: config.width,
    height: config.range,
  };
}

export function circlesOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  return Math.hypot(ax - bx, ay - by) <= ar + br;
}

export function pointInRect(x: number, y: number, rect: Pick<CombatCollisionRect, "x" | "y" | "width" | "height">): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function rectsOverlap(
  a: Pick<CombatCollisionRect, "x" | "y" | "width" | "height">,
  b: Pick<CombatCollisionRect, "x" | "y" | "width" | "height">,
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function circleRectOverlap(cx: number, cy: number, radius: number, rect: Pick<CombatCollisionRect, "x" | "y" | "width" | "height">): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);

  return Math.hypot(cx - closestX, cy - closestY) <= radius;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
