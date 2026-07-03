import type { ActiveProjectileState, GameState } from "../state";
import { touchGameState } from "../state";
import { TOP_DOWN_ROOM_HEIGHT, TOP_DOWN_ROOM_WIDTH } from "../topDown";
import { facingVector, circlesOverlap, pointInRect } from "./hitboxSystem";
import { damageEnemy } from "./damageSystem";
import { MAGIC_PROJECTILE_CONFIG } from "./weaponConfig";
import type { CombatEnemy, CombatResult, ProjectileHitResult } from "./types";

export function fireMagicProjectile(state: GameState, now = new Date()): CombatResult {
  if (state.equipment.activeItem !== "Varita" || !state.inventory.includes("Varita")) {
    return {
      state: touchGameState(state, now),
      handled: false,
      changed: false,
      message: "Equipa la Varita para disparar",
      events: [],
    };
  }

  const lastShot = Date.parse(state.playerCombat.lastMagicShotAt ?? "");
  if (Number.isFinite(lastShot) && now.getTime() - lastShot < MAGIC_PROJECTILE_CONFIG.cooldownMs) {
    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      message: "La Varita necesita recargarse",
      events: [],
    };
  }

  const facing = facingVector(state.playerPose.facing);
  const projectile: ActiveProjectileState = {
    id: `projectile.${now.getTime()}.${state.activeProjectiles.length}`,
    roomId: state.currentRoomId,
    x: state.playerPose.x + facing.x * MAGIC_PROJECTILE_CONFIG.spawnOffset,
    y: state.playerPose.y + facing.y * MAGIC_PROJECTILE_CONFIG.spawnOffset,
    vx: facing.x * MAGIC_PROJECTILE_CONFIG.speedPxPerSecond,
    vy: facing.y * MAGIC_PROJECTILE_CONFIG.speedPxPerSecond,
    radius: MAGIC_PROJECTILE_CONFIG.radius,
    damage: MAGIC_PROJECTILE_CONFIG.damage,
    range: MAGIC_PROJECTILE_CONFIG.range,
    travelled: 0,
    owner: "player",
    createdAt: now.toISOString(),
  };

  return {
    state: touchGameState(
      {
        ...state,
        activeProjectiles: [...state.activeProjectiles, projectile],
        playerCombat: {
          ...state.playerCombat,
          lastMagicShotAt: now.toISOString(),
        },
      },
      now,
    ),
    handled: true,
    changed: true,
    worldChanged: false,
    message: "La Varita dispara",
    events: [{ type: "spawnProjectile", projectileId: projectile.id }],
  };
}

export function stepProjectiles(
  state: GameState,
  deltaMs: number,
  enemies: CombatEnemy[],
  walls: { x: number; y: number; width: number; height: number }[],
  now = new Date(),
): CombatResult {
  if (state.activeProjectiles.length === 0) {
    return { state, handled: false, changed: false, worldChanged: false, message: "", events: [] };
  }

  const seconds = Math.max(0, deltaMs / 1000);
  let nextState = state;
  const remaining: ActiveProjectileState[] = [];
  const events: CombatResult["events"] = [];
  let changed = false;
  let worldChanged = false;
  let message = "";

  for (const projectile of state.activeProjectiles) {
    if (projectile.roomId !== state.currentRoomId) {
      changed = true;
      continue;
    }

    const distance = Math.hypot(projectile.vx * seconds, projectile.vy * seconds);
    const nextProjectile = {
      ...projectile,
      x: projectile.x + projectile.vx * seconds,
      y: projectile.y + projectile.vy * seconds,
      travelled: projectile.travelled + distance,
    };
    const hitEnemy = enemies.find((enemy) =>
      circlesOverlap(nextProjectile.x, nextProjectile.y, nextProjectile.radius, enemy.x, enemy.y, enemy.radius),
    );

    if (hitEnemy) {
      const damageResult = damageEnemy(nextState, hitEnemy, nextProjectile.damage, now, "Varita");
      nextState = damageResult.state;
      events?.push(...(damageResult.events ?? []), {
        type: "destroyProjectile",
        projectileId: projectile.id,
        x: hitEnemy.x,
        y: hitEnemy.y,
        reason: "enemy",
      });
      message = damageResult.message;
      changed = true;
      worldChanged ||= Boolean(damageResult.worldChanged);
      continue;
    }

    const wallHit = walls.some((wall) => pointInRect(nextProjectile.x, nextProjectile.y, wall));
    const boundsHit =
      nextProjectile.x <= nextProjectile.radius ||
      nextProjectile.y <= nextProjectile.radius ||
      nextProjectile.x >= TOP_DOWN_ROOM_WIDTH - nextProjectile.radius ||
      nextProjectile.y >= TOP_DOWN_ROOM_HEIGHT - nextProjectile.radius;

    if (wallHit || boundsHit) {
      events?.push({
        type: "destroyProjectile",
        projectileId: projectile.id,
        x: nextProjectile.x,
        y: nextProjectile.y,
        reason: "wall",
      });
      message = wallHit ? "La magia golpea el muro agrietado" : "La magia se disipa contra la pared";
      changed = true;
      continue;
    }

    if (nextProjectile.travelled >= nextProjectile.range) {
      events?.push({
        type: "destroyProjectile",
        projectileId: projectile.id,
        x: nextProjectile.x,
        y: nextProjectile.y,
        reason: "range",
      });
      changed = true;
      continue;
    }

    remaining.push(nextProjectile);
  }

  return {
    state: touchGameState({ ...nextState, activeProjectiles: remaining }, now),
    handled: changed || remaining.length !== state.activeProjectiles.length || remaining.some((entry, index) => entry !== state.activeProjectiles[index]),
    changed: true,
    worldChanged,
    message,
    events,
  };
}

export function resolveProjectileHit(
  state: GameState,
  x: number,
  y: number,
  enemies: CombatEnemy[],
  walls: { x: number; y: number; width: number; height: number }[],
  now = new Date(),
): ProjectileHitResult {
  const enemy = enemies.find((entry) => circlesOverlap(x, y, MAGIC_PROJECTILE_CONFIG.radius, entry.x, entry.y, entry.radius));

  if (enemy) {
    const result = damageEnemy(state, enemy, MAGIC_PROJECTILE_CONFIG.damage, now, "Varita");

    return {
      ...result,
      hit: true,
      hitX: enemy.x,
      hitY: enemy.y,
    };
  }

  const wall = walls.find((entry) => pointInRect(x, y, entry));

  if (wall) {
    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      hit: true,
      hitX: x,
      hitY: y,
      message: "La magia golpea el muro agrietado",
      events: [{ type: "impactFx", x, y, kind: "wall" }],
    };
  }

  if (
    x <= MAGIC_PROJECTILE_CONFIG.radius ||
    y <= MAGIC_PROJECTILE_CONFIG.radius ||
    x >= TOP_DOWN_ROOM_WIDTH - MAGIC_PROJECTILE_CONFIG.radius ||
    y >= TOP_DOWN_ROOM_HEIGHT - MAGIC_PROJECTILE_CONFIG.radius
  ) {
    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      hit: true,
      hitX: x,
      hitY: y,
      message: "La magia se disipa contra la pared",
      events: [{ type: "impactFx", x, y, kind: "wall" }],
    };
  }

  return {
    state,
    handled: false,
    changed: false,
    hit: false,
    message: "",
    events: [],
  };
}
