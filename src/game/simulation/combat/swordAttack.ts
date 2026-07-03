import type { GameState } from "../state";
import { touchGameState } from "../state";
import { applyPlayerKnockback } from "./knockbackSystem";
import { circleRectOverlap, rectsOverlap, swordHitbox } from "./hitboxSystem";
import { damageEnemy } from "./damageSystem";
import { SWORD_CONFIG } from "./weaponConfig";
import type { CombatCollisionBounds, CombatEnemy, CombatResult } from "./types";

export function swingSword(
  state: GameState,
  enemies: CombatEnemy[],
  now = new Date(),
  bounds?: CombatCollisionBounds,
): CombatResult {
  if (state.equipment.weapon !== "Espada" || !state.inventory.includes("Espada")) {
    return {
      state: touchGameState(state, now),
      handled: false,
      changed: false,
      message: "Equipa la Espada para golpear",
      events: [],
    };
  }

  const hitbox = swordHitbox(state.playerPose, SWORD_CONFIG);
  const hitEnemies = enemies.filter((entry) => circleRectOverlap(entry.x, entry.y, entry.radius, hitbox));

  if (hitEnemies.length === 0) {
    const wallHit = bounds?.colliders.some((collider) => rectsOverlap(hitbox, collider)) ?? false;

    if (wallHit) {
      return {
        state: touchGameState(applyPlayerKnockback(state, {
          x: state.playerPose.x + facingWallOffsetX(state.playerPose.facing),
          y: state.playerPose.y + facingWallOffsetY(state.playerPose.facing),
        }, SWORD_CONFIG.recoilDistance, bounds, now), now),
        handled: true,
        changed: true,
        worldChanged: false,
        hit: true,
        message: "La Espada rebota contra la pared",
        events: [{ type: "impactFx", x: state.playerPose.x, y: state.playerPose.y, kind: "wall" }],
      };
    }

    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      worldChanged: false,
      hit: false,
      message: "La Espada corta el aire",
      events: [],
    };
  }

  return hitEnemies.reduce<CombatResult>(
    (current, enemy) => {
      const nextEnemy = enemies.find((entry) => entry.id === enemy.id) ?? enemy;
      const damaged = damageEnemy(current.state, nextEnemy, SWORD_CONFIG.damage, now, "Espada");

      return {
        state: damaged.state,
        handled: current.handled || damaged.handled,
        changed: current.changed || damaged.changed,
        worldChanged: Boolean(current.worldChanged || damaged.worldChanged),
        hit: Boolean(current.hit || damaged.hit),
        message: damaged.message || current.message,
        events: [...(current.events ?? []), ...(damaged.events ?? [])],
      };
    },
    {
      state,
      handled: true,
      changed: false,
      worldChanged: false,
      hit: false,
      message: "La Espada golpea",
      events: [],
    },
  );
}

function facingWallOffsetX(direction: string): number {
  return direction === "left" ? -1 : direction === "right" ? 1 : 0;
}

function facingWallOffsetY(direction: string): number {
  return direction === "up" ? -1 : direction === "down" ? 1 : 0;
}
