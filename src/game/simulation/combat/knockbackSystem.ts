import type { GameState } from "../state";
import { TOP_DOWN_PLAYER_RADIUS, TOP_DOWN_ROOM_HEIGHT, TOP_DOWN_ROOM_WIDTH } from "../topDown";
import { circleRectOverlap, clamp, pointInRect } from "./hitboxSystem";
import type { CombatCollisionBounds, CombatEnemy } from "./types";

export function applyPlayerKnockback(
  state: GameState,
  source: { x: number; y: number },
  distance: number,
  bounds?: CombatCollisionBounds,
  now = new Date(),
): GameState {
  const dx = state.playerPose.x - source.x;
  const dy = state.playerPose.y - source.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    ...movePlayerWithCollision(state, (dx / length) * distance, (dy / length) * distance, bounds),
    playerCombat: {
      ...state.playerCombat,
      knockbackUntil: new Date(now.getTime() + 120).toISOString(),
    },
    lastUpdatedAt: now.toISOString(),
  };
}

export function moveEnemyToward(
  enemy: CombatEnemy,
  target: { x: number; y: number },
  distance: number,
  bounds: CombatCollisionBounds,
): { x: number; y: number } {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const length = Math.hypot(dx, dy);

  if (length < 1 || distance <= 0) {
    return { x: enemy.x, y: enemy.y };
  }

  const moveX = (dx / length) * Math.min(distance, length);
  const moveY = (dy / length) * Math.min(distance, length);
  const withoutPlayer = {
    ...bounds,
    playerRadius: enemy.radius,
    colliders: bounds.colliders.filter((collider) => !pointInRect(enemy.x, enemy.y, collider)),
  };
  const nextX = resolveRecoilAxis(enemy.x, enemy.y, moveX, 0, withoutPlayer).x;
  const nextY = resolveRecoilAxis(nextX, enemy.y, 0, moveY, withoutPlayer).y;

  return { x: nextX, y: nextY };
}

function movePlayerWithCollision(state: GameState, dx: number, dy: number, bounds?: CombatCollisionBounds): GameState {
  const roomBounds = bounds ?? defaultCollisionBounds();
  const nextX = resolveRecoilAxis(state.playerPose.x, state.playerPose.y, dx, 0, roomBounds).x;
  const nextY = resolveRecoilAxis(nextX, state.playerPose.y, 0, dy, roomBounds).y;

  return {
    ...state,
    playerPose: {
      ...state.playerPose,
      x: nextX,
      y: nextY,
    },
  };
}

function defaultCollisionBounds(): CombatCollisionBounds {
  return {
    width: TOP_DOWN_ROOM_WIDTH,
    height: TOP_DOWN_ROOM_HEIGHT,
    playerRadius: TOP_DOWN_PLAYER_RADIUS,
    colliders: [],
  };
}

function resolveRecoilAxis(
  x: number,
  y: number,
  dx: number,
  dy: number,
  bounds: CombatCollisionBounds,
): { x: number; y: number } {
  const candidate = {
    x: clamp(x + dx, bounds.playerRadius, bounds.width - bounds.playerRadius),
    y: clamp(y + dy, bounds.playerRadius, bounds.height - bounds.playerRadius),
  };

  return bounds.colliders.some((collider) => circleRectOverlap(candidate.x, candidate.y, bounds.playerRadius, collider))
    ? { x, y }
    : candidate;
}
