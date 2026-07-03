import { dungeonMap, roomCenter, roomsById } from "../content/maps/dungeon";
import { ConnectionDefinition } from "../content/maps/types";
import {
  enemyDefinitions,
  genericEnemySpawnForRoom,
  LEGENDARY_BEAST_DEFEATED_FLAG,
  LEGENDARY_BEAST_ENEMY_ID,
  LEGENDARY_BEAST_REWARD_ITEM,
  roomEnemySpawns,
  SLIME1_MOVEMENT_CONFIG,
  SR2_SLIME_ENEMY_ID,
} from "../content/enemies";
import type { EnemySpecies, EnemySpawnDefinition } from "../content/enemies/types";
import { Direction } from "../input/actions";
import { ActiveBombState, GameState, touchGameState } from "./state";
import { TOP_DOWN_PLAYER_RADIUS, TOP_DOWN_ROOM_HEIGHT, TOP_DOWN_ROOM_WIDTH } from "./topDown";
import { grantProgress } from "./progression";
import { stepAreaAttacks } from "./combat/areaAttackSystem";
import { damagePlayerWithCombatRules } from "./combat/damageSystem";
import { stepRoomEnemies } from "../ai/EnemyAiSystem";
import { fireMagicProjectile, stepProjectiles } from "./combat/projectileSystem";
import type { AttackDefinition, CombatEvent } from "./combat/types";
import type { EnemyAiProfileId, EnemyAnimationMap, EnemyAnimationState, EnemyMovementDefinition } from "../ai/types";
import { filterRoomEncounterSpawns, isRoomEncounterActive, progressRoomEncounter } from "./roomEncounters";

export type { AttackDefinition, CombatEvent } from "./combat/types";
export type { EnemyAnimationState } from "../ai/types";
export { fireMagicProjectile } from "./combat/projectileSystem";

export const MAGIC_PROJECTILE_CONFIG = {
  speedPxPerSecond: 360,
  cooldownMs: 420,
  damage: 1,
  radius: 7,
  range: 520,
  spawnOffset: 26,
} as const;

export const SWORD_CONFIG = {
  damage: 1,
  range: 16,
  startDistance: 8,
  width: 16,
  durationMs: 100,
  cooldownMs: 120,
  impactDelayMs: 50,
  coneWidth: 16,
  recoilDistance: 14,
} as const;

export const BOMB_CONFIG = {
  fuseMs: 3000,
  radius: 92,
  damage: 2,
  playerDamage: 2,
  placedRadius: 12,
  maxActive: 1,
  warningMs: 3000,
} as const;

export const ENEMY_HURT_STUN_MS = 420;
export const ENEMY_HIT_INVULNERABILITY_MS = 650;
const ENEMY_DAMAGE_KNOCKBACK_DISTANCE = 10;

export type CombatEnemy = {
  id: string;
  roomId: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  kind: "minion" | "boss";
  species?: EnemySpecies;
  contactDamage?: EnemyDamageDefinition;
  attack?: EnemyAttackDefinition;
  attacks?: EnemyAttackDefinition[];
  aiProfile?: EnemyAiProfileId;
  movement?: EnemyMovementDefinition;
  animationMap?: EnemyAnimationMap;
  respawnOnEntry?: boolean;
};

export type EnemyDamageDefinition = {
  damage: number;
  cooldownMs: number;
  knockback?: number;
};

export type EnemyAttackDefinition = {
  animation: string;
  damage: number;
  hitFrames: number[];
  hitbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  knockback: number;
  cooldownMs: number;
  frameRate: number;
  areaRadius?: number;
  windupMs?: number;
  activeFromMs?: number;
  activeToMs?: number;
  visualAfterMs?: number;
};

export type BreakableWall = {
  id: string;
  roomId: string;
  gateId: string;
  connectionId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CombatCollisionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CombatCollisionBounds = {
  width: number;
  height: number;
  playerRadius: number;
  colliders: CombatCollisionRect[];
};

export type CombatResult = {
  state: GameState;
  handled: boolean;
  changed: boolean;
  worldChanged?: boolean;
  hit?: boolean;
  message: string;
  events?: CombatEvent[];
  enemyAnimationState?: Record<string, EnemyAnimationState>;
};

export type ProjectileHitResult = CombatResult & {
  hit: boolean;
  hitX?: number;
  hitY?: number;
};

export { SLIME1_ATTACK_CONFIG, SLIME1_CONTACT_DAMAGE, SLIME1_MOVEMENT_CONFIG, SR2_SLIME_ENEMY_ID } from "../content/enemies";

export function getRoomEnemies(state: GameState, extraSpawns: EnemySpawnDefinition[] = []): CombatEnemy[] {
  return getEnemyDefinitionsForRoom(state, extraSpawns)
    .filter((enemy) => !state.defeatedEnemies.includes(enemy.id))
    .map((enemy) => ({
      ...enemy,
      ...state.enemyPositions[enemy.id],
      hp: state.enemyHealth[enemy.id] ?? enemy.hp,
    }));
}

export function resetRespawningEnemiesForRoom(state: GameState, roomId: string, extraSpawns: EnemySpawnDefinition[] = []): GameState {
  const encounterActive = isRoomEncounterActive(state, roomId);
  const waveSpawnIds = new Set(extraSpawns.filter((spawn) => spawn.roomId === roomId && spawn.wave !== undefined).map((spawn) => spawn.id));
  const respawnIds = getEnemyDefinitionsForRoom({ ...state, currentRoomId: roomId }, extraSpawns)
    .filter((enemy) => !encounterActive || !waveSpawnIds.has(enemy.id))
    .filter((enemy) => enemy.respawnOnEntry)
    .map((enemy) => enemy.id);

  if (respawnIds.length === 0) {
    return state;
  }

  return progressRoomEncounter({
    ...state,
    defeatedEnemies: state.defeatedEnemies.filter((enemyId) => !respawnIds.includes(enemyId)),
    enemyHealth: Object.fromEntries(Object.entries(state.enemyHealth).filter(([enemyId]) => !respawnIds.includes(enemyId))),
    enemyPositions: Object.fromEntries(Object.entries(state.enemyPositions).filter(([enemyId]) => !respawnIds.includes(enemyId))),
    enemyStunUntil: Object.fromEntries(Object.entries(state.enemyStunUntil).filter(([enemyId]) => !respawnIds.includes(enemyId))),
    enemyInvulnerableUntil: Object.fromEntries(Object.entries(state.enemyInvulnerableUntil).filter(([enemyId]) => !respawnIds.includes(enemyId))),
    enemyCombat: Object.fromEntries(Object.entries(state.enemyCombat).filter(([enemyId]) => !respawnIds.includes(enemyId))),
    activeAreaAttacks: state.activeAreaAttacks.filter((attack) => !respawnIds.includes(attack.ownerId)),
  }, extraSpawns);
}

export function getBreakableWalls(state: GameState): BreakableWall[] {
  const room = roomsById.get(state.currentRoomId);

  if (!room) {
    return [];
  }

  return dungeonMap.connections
    .filter((connection) => connection.kind === "bloqueo" && connection.gateId)
    .filter((connection) => connection.from === room.id || connection.to === room.id)
    .filter((connection) => !state.openGates.includes(connection.gateId ?? ""))
    .filter((connection) => !state.brokenWalls.includes(wallId(connection)))
    .map((connection) => connectionToBreakableWall(state.currentRoomId, connection));
}

export function getActiveBomb(state: GameState): ActiveBombState | undefined {
  return state.activeBomb?.roomId === state.currentRoomId ? state.activeBomb : undefined;
}

export function swingSword(
  state: GameState,
  now = new Date(),
  bounds?: CombatCollisionBounds,
  extraSpawns: EnemySpawnDefinition[] = [],
): CombatResult {
  if (state.equipment.weapon !== "Espada" || !state.inventory.includes("Espada")) {
    return {
      state: touchGameState(state, now),
      handled: false,
      changed: false,
      message: "Equipa la Espada para golpear",
    };
  }

  const enemies = getRoomEnemies(state, extraSpawns).filter((entry) => enemyInSwordArc(state, entry));

  if (enemies.length === 0) {
    const wallHit = bounds?.colliders.some((collider) => rectsOverlap(swordHitbox(state), collider)) ?? false;

    if (wallHit) {
      return {
        state: touchGameState(applySwordRecoil(state, bounds), now),
        handled: true,
        changed: true,
        worldChanged: false,
        hit: true,
        message: "La Espada rebota contra la pared",
      };
    }

    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      worldChanged: false,
      hit: false,
      message: "La Espada corta el aire",
    };
  }

  const result = enemies.reduce<CombatResult>(
    (current, enemy) => {
      const nextEnemy = getRoomEnemies(current.state, extraSpawns).find((entry) => entry.id === enemy.id) ?? enemy;
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

  return result;
}

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

  return touchGameState(
    movePlayerWithCollision(state, (dx / length) * distance, (dy / length) * distance, bounds),
    now,
  );
}

export type EnemyMotionState = "idle" | "walk" | "run" | "attack";

export type EnemyAiResult = {
  state: GameState;
  moved: boolean;
  enemyMotion: Record<string, EnemyMotionState>;
  enemyAnimationState: Record<string, EnemyAnimationState>;
};

export function stepSr2SlimeAi(
  state: GameState,
  deltaMs: number,
  bounds: CombatCollisionBounds,
  nowMs: number,
): EnemyAiResult {
  return stepRoomEnemies(state, getRoomEnemies(state), deltaMs, bounds, nowMs);
}

export function placeBomb(state: GameState, now = new Date()): CombatResult {
  if (state.equipment.activeItem !== "Bombas" || !state.inventory.includes("Bombas")) {
    return {
      state: touchGameState(state, now),
      handled: false,
      changed: false,
      message: "Equipa Bombas para colocar una",
    };
  }

  if (state.activeBomb) {
    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      message: "Ya hay una bomba colocada",
    };
  }

  return {
    state: touchGameState(
      {
        ...state,
        activeBomb: {
          roomId: state.currentRoomId,
          x: state.playerPose.x,
          y: state.playerPose.y,
          placedAt: now.toISOString(),
        },
        activeBombs: [
          {
            roomId: state.currentRoomId,
            x: state.playerPose.x,
            y: state.playerPose.y,
            placedAt: now.toISOString(),
          },
        ],
      },
      now,
    ),
    handled: true,
    changed: true,
    message: "Bomba colocada",
    events: [
      { type: "spawnBomb", bombId: `bomb.${state.currentRoomId}.${now.toISOString()}`, x: state.playerPose.x, y: state.playerPose.y },
      { type: "bombWarning", bombId: `bomb.${state.currentRoomId}.${now.toISOString()}`, x: state.playerPose.x, y: state.playerPose.y, radius: BOMB_CONFIG.radius },
    ],
  };
}

export function resolveBombFuse(state: GameState, now = new Date(), extraSpawns: EnemySpawnDefinition[] = []): CombatResult {
  if (!state.activeBomb) {
    return { state, handled: false, changed: false, message: "" };
  }

  const elapsed = now.getTime() - new Date(state.activeBomb.placedAt).getTime();

  if (elapsed < BOMB_CONFIG.fuseMs) {
    return { state, handled: false, changed: false, message: "" };
  }

  return explodeBomb(state, now, extraSpawns);
}

export function resolveProjectileHit(
  state: GameState,
  x: number,
  y: number,
  now = new Date(),
  extraSpawns: EnemySpawnDefinition[] = [],
): ProjectileHitResult {
  const enemy = getRoomEnemies(state, extraSpawns).find((entry) => circlesOverlap(x, y, MAGIC_PROJECTILE_CONFIG.radius, entry.x, entry.y, entry.radius));

  if (enemy) {
    const result = damageEnemy(state, enemy, MAGIC_PROJECTILE_CONFIG.damage, now, "Varita");

    return {
      ...result,
      hit: true,
      hitX: enemy.x,
      hitY: enemy.y,
    };
  }

  const wall = getBreakableWalls(state).find((entry) => pointInRect(x, y, entry));

  if (wall) {
    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      hit: true,
      hitX: x,
      hitY: y,
      message: "La magia golpea el muro agrietado",
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
    };
  }

  return {
    state,
    handled: false,
    changed: false,
    hit: false,
    message: "",
  };
}

export function canFireMagic(state: GameState): boolean {
  return state.equipment.activeItem === "Varita" && state.inventory.includes("Varita");
}

export function stepCombatSystems(
  state: GameState,
  deltaMs: number,
  bounds: CombatCollisionBounds,
  now = new Date(),
  extraSpawns: EnemySpawnDefinition[] = [],
): CombatResult {
  const roomEnemies = getRoomEnemies(state, extraSpawns);
  const projectileResult = stepProjectiles(state, deltaMs, roomEnemies, getBreakableWalls(state), now);
  const afterProjectiles = projectileResult.state;
  const bombResult = resolveBombFuse(afterProjectiles, now, extraSpawns);
  const afterBomb = bombResult.state;
  const areaResult = stepAreaAttacks(afterBomb, now.getTime(), bounds.playerRadius);
  const aiEnemies = getRoomEnemies(areaResult.state, extraSpawns);
  const aiResult = stepRoomEnemies(areaResult.state, aiEnemies, deltaMs, bounds, now.getTime());
  const contactEnemies = getRoomEnemies(aiResult.state, extraSpawns);
  const contactResult = resolveEnemyContactDamage(aiResult.state, contactEnemies, bounds, now);

  return {
    state: contactResult.state,
    handled: projectileResult.handled || bombResult.handled || areaResult.handled || aiResult.moved || aiResult.events.length > 0 || contactResult.handled || Object.keys(aiResult.enemyAnimationState).length > 0,
    changed: projectileResult.changed || bombResult.changed || areaResult.changed || aiResult.moved || aiResult.events.length > 0 || contactResult.changed,
    worldChanged: Boolean(projectileResult.worldChanged || bombResult.worldChanged || areaResult.worldChanged || contactResult.worldChanged),
    message: contactResult.message || areaResult.message || bombResult.message || projectileResult.message,
    events: [
      ...(projectileResult.events ?? []),
      ...(bombResult.events ?? []),
      ...(areaResult.events ?? []),
      ...aiResult.events,
      ...(contactResult.events ?? []),
    ],
    enemyAnimationState: aiResult.enemyAnimationState,
  };
}

function resolveEnemyContactDamage(
  state: GameState,
  enemies: CombatEnemy[],
  bounds: CombatCollisionBounds,
  now: Date,
): CombatResult {
  const enemy = enemies.find((entry) =>
    entry.contactDamage &&
    circlesOverlap(entry.x, entry.y, entry.radius, state.playerPose.x, state.playerPose.y, bounds.playerRadius),
  );

  if (!enemy?.contactDamage) {
    return { state, handled: false, changed: false, worldChanged: false, message: "", events: [] };
  }

  const damaged = damagePlayerWithCombatRules(state, enemy.contactDamage.damage, "Contacto de slime", now, enemy.contactDamage.cooldownMs);

  if (!damaged.hit) {
    return damaged;
  }

  return {
    ...damaged,
    worldChanged: false,
  };
}

function explodeBomb(state: GameState, now: Date, extraSpawns: EnemySpawnDefinition[] = []): CombatResult {
  const bomb = state.activeBomb;

  if (!bomb) {
    return { state, handled: false, changed: false, message: "" };
  }

  const hitEnemies = getRoomEnemies({ ...state, currentRoomId: bomb.roomId }, extraSpawns).filter((enemy) =>
    circlesOverlap(bomb.x, bomb.y, BOMB_CONFIG.radius, enemy.x, enemy.y, enemy.radius),
  );
  const damagedState = hitEnemies.reduce(
    (currentState, enemy) => damageEnemyState(currentState, enemy, BOMB_CONFIG.damage, now).state,
    state,
  );
  const defeated = hitEnemies.filter((enemy) => enemy.hp - BOMB_CONFIG.damage <= 0);
  const broken = getBreakableWalls({ ...state, currentRoomId: bomb.roomId }).filter((wall) =>
    circleRectOverlap(bomb.x, bomb.y, BOMB_CONFIG.radius, wall),
  );
  const defeatedIds = defeated.map((enemy) => enemy.id);
  const brokenIds = broken.map((wall) => wall.id);
  const openedGateIds = broken.map((wall) => wall.gateId);
  const brokenWallFlags = Object.fromEntries(openedGateIds.map((gateId) => [`wall.${gateId}.destroyed`, true]));
  const playerHit = circlesOverlap(bomb.x, bomb.y, BOMB_CONFIG.radius, damagedState.playerPose.x, damagedState.playerPose.y, TOP_DOWN_PLAYER_RADIUS);
  const playerDamagedState = playerHit
    ? damagePlayerWithCombatRules(damagedState, BOMB_CONFIG.playerDamage, "Explosion de bomba", now, 0).state
    : damagedState;

  return {
    state: touchGameState(
      {
        ...playerDamagedState,
        activeBomb: undefined,
        activeBombs: [],
        defeatedEnemies: addUnique(playerDamagedState.defeatedEnemies, defeatedIds),
        brokenWalls: addUnique(playerDamagedState.brokenWalls, brokenIds),
        flags: {
          ...playerDamagedState.flags,
          ...brokenWallFlags,
        },
        openGates: addUnique(playerDamagedState.openGates, openedGateIds),
      },
      now,
    ),
    handled: true,
    changed: hitEnemies.length > 0 || brokenIds.length > 0 || playerHit || Boolean(state.activeBomb),
    worldChanged: defeatedIds.length > 0 || brokenIds.length > 0 || Boolean(state.activeBomb),
    message:
      brokenIds.length > 0
        ? "La bomba rompe el muro agrietado"
        : defeatedIds.length > 0
          ? "La bomba alcanza a un enemigo"
          : "La bomba explota",
    events: [
      { type: "bombExplosion", bombId: `bomb.${bomb.roomId}.${bomb.placedAt}`, x: bomb.x, y: bomb.y, radius: BOMB_CONFIG.radius },
      ...hitEnemies.map((enemy) => ({ type: "damage" as const, target: "enemy" as const, targetId: enemy.id, amount: BOMB_CONFIG.damage, source: "Bomba", x: enemy.x, y: enemy.y })),
      ...(playerHit ? [{ type: "damage" as const, target: "player" as const, targetId: "player", amount: BOMB_CONFIG.playerDamage, source: "Bomba" }] : []),
    ],
  };
}

function damageEnemy(state: GameState, enemy: CombatEnemy, damage: number, now: Date, source: string): CombatResult {
  if (isEnemyInvulnerable(state, enemy.id, now.getTime())) {
    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      worldChanged: false,
      hit: false,
      message: `${source}: enemigo protegido`,
    };
  }

  const result = damageEnemyState(state, enemy, damage, now);

  if (result.defeated) {
    return defeatEnemy(result.state, enemy, now, source);
  }

  return {
    state: touchGameState(result.state, now),
    handled: true,
    changed: true,
    worldChanged: false,
    hit: true,
    message: `${source}: enemigo golpeado`,
    events: [
      { type: "damage", target: "enemy", targetId: enemy.id, amount: damage, source, x: enemy.x, y: enemy.y },
      { type: "playAnimation", targetId: enemy.id, animation: "hurt" },
      { type: "impactFx", x: enemy.x, y: enemy.y, kind: source === "Varita" ? "magic" : source === "Bomba" ? "bomb" : "sword" },
    ],
  };
}

function damageEnemyState(
  state: GameState,
  enemy: CombatEnemy,
  damage: number,
  now: Date,
): { state: GameState; defeated: boolean } {
  const nextHp = Math.max(0, enemy.hp - damage);
  const enemyHealth = { ...state.enemyHealth };
  const enemyStunUntil = { ...state.enemyStunUntil };
  const enemyInvulnerableUntil = { ...state.enemyInvulnerableUntil };
  const enemyPositions = { ...state.enemyPositions };
  const baseTime = now.getTime();

  if (nextHp > 0) {
    enemyHealth[enemy.id] = nextHp;
    enemyPositions[enemy.id] = knockEnemyAwayFromPlayer(state, enemy, ENEMY_DAMAGE_KNOCKBACK_DISTANCE);
    enemyStunUntil[enemy.id] = new Date(baseTime + ENEMY_HURT_STUN_MS).toISOString();
    enemyInvulnerableUntil[enemy.id] = new Date(baseTime + ENEMY_HIT_INVULNERABILITY_MS).toISOString();
  } else {
    delete enemyHealth[enemy.id];
    delete enemyStunUntil[enemy.id];
    delete enemyInvulnerableUntil[enemy.id];
  }

  return {
    state: {
      ...state,
      enemyHealth,
      enemyStunUntil,
      enemyInvulnerableUntil,
      enemyPositions,
    },
    defeated: nextHp <= 0,
  };
}

function knockEnemyAwayFromPlayer(state: GameState, enemy: CombatEnemy, distance: number): { x: number; y: number } {
  const dx = enemy.x - state.playerPose.x;
  const dy = enemy.y - state.playerPose.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: enemy.x + (dx / length) * distance,
    y: enemy.y + (dy / length) * distance,
  };
}

function defeatEnemy(state: GameState, enemy: CombatEnemy, now: Date, source: string): CombatResult {
  const defeatedState = {
    ...state,
    defeatedEnemies: addUnique(state.defeatedEnemies, [enemy.id]),
    enemyHealth: Object.fromEntries(Object.entries(state.enemyHealth).filter(([enemyId]) => enemyId !== enemy.id)),
    enemyStunUntil: Object.fromEntries(Object.entries(state.enemyStunUntil).filter(([enemyId]) => enemyId !== enemy.id)),
    enemyInvulnerableUntil: Object.fromEntries(Object.entries(state.enemyInvulnerableUntil).filter(([enemyId]) => enemyId !== enemy.id)),
    activeAreaAttacks: state.activeAreaAttacks.filter((attack) => attack.ownerId !== enemy.id),
  };
  const rewardedState =
    enemy.id === LEGENDARY_BEAST_ENEMY_ID
      ? grantProgress(defeatedState, {
          items: [LEGENDARY_BEAST_REWARD_ITEM],
          flags: [LEGENDARY_BEAST_DEFEATED_FLAG],
        })
      : defeatedState;

  return {
    state: touchGameState(rewardedState, now),
    handled: true,
    changed: true,
    worldChanged: true,
    hit: true,
    message:
      enemy.id === LEGENDARY_BEAST_ENEMY_ID
        ? `${source}: bestia legendaria derrotada, ${LEGENDARY_BEAST_REWARD_ITEM} obtenido`
        : `${source}: enemigo derrotado`,
    events: [
      { type: "damage", target: "enemy", targetId: enemy.id, amount: enemy.hp, source, x: enemy.x, y: enemy.y },
      { type: "death", target: "enemy", targetId: enemy.id, source, x: enemy.x, y: enemy.y },
    ],
  };
}

function getEnemyDefinitionsForRoom(state: GameState, extraSpawns: EnemySpawnDefinition[] = []): CombatEnemy[] {
  const roomId = state.currentRoomId;
  const room = roomsById.get(roomId);

  if (!room) {
    return [];
  }

  const explicitSpawns = filterRoomEncounterSpawns(state, mergeSpawns([
    ...roomEnemySpawns.filter((spawn) => spawn.roomId === roomId),
    ...extraSpawns.filter((spawn) => spawn.roomId === roomId),
  ]))
    .filter((spawn) => !spawn.requiresFlag || state.flags[spawn.requiresFlag])
    .filter((spawn) => !spawn.excludedByFlag || !state.flags[spawn.excludedByFlag]);

  if (room.zone === "Entrada" || room.kind === "secret") {
    return explicitSpawns.map(enemyFromSpawn).filter((enemy): enemy is CombatEnemy => Boolean(enemy));
  }

  const kind: CombatEnemy["kind"] = room.kind === "boss" ? "boss" : "minion";

  return [...explicitSpawns, genericEnemySpawnForRoom(roomId, kind)]
    .map(enemyFromSpawn)
    .filter((enemy): enemy is CombatEnemy => Boolean(enemy));
}

function mergeSpawns(spawns: EnemySpawnDefinition[]): EnemySpawnDefinition[] {
  const values = new Map<string, EnemySpawnDefinition>();

  for (const spawn of spawns) {
    values.set(spawn.id, spawn);
  }

  return [...values.values()];
}

function enemyFromSpawn(spawn: EnemySpawnDefinition): CombatEnemy | null {
  const definition = enemyDefinitions[spawn.species];

  if (!definition) {
    return null;
  }

  return {
    id: spawn.id,
    roomId: spawn.roomId,
    x: spawn.x,
    y: spawn.y,
    radius: spawn.radius ?? definition.radius,
    hp: spawn.hp ?? definition.hp,
    kind: spawn.kind ?? definition.kind,
    species: definition.species,
    contactDamage: spawn.contactDamage ?? definition.contactDamage,
    attack: spawn.attack ?? definition.attack,
    attacks: spawn.attacks ?? definition.attacks,
    aiProfile: spawn.aiProfile ?? definition.aiProfile,
    movement: spawn.movement ?? definition.movement,
    animationMap: spawn.animationMap ?? definition.animationMap,
    respawnOnEntry: spawn.respawnOnEntry ?? definition.respawnOnEntry,
  };
}

function applySwordRecoil(state: GameState, bounds?: CombatCollisionBounds): GameState {
  const backward = facingVector(state.playerPose.facing);
  const dx = -backward.x * SWORD_CONFIG.recoilDistance;
  const dy = -backward.y * SWORD_CONFIG.recoilDistance;

  return movePlayerWithCollision(state, dx, dy, bounds);
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

function connectionToBreakableWall(roomId: string, connection: ConnectionDefinition): BreakableWall {
  const direction = directionToTarget(roomId, connection.from === roomId ? connection.to : connection.from);
  const gateId = connection.gateId ?? "gate";
  const thickness = 20;
  const length = 92;
  const centerX = TOP_DOWN_ROOM_WIDTH / 2;
  const centerY = TOP_DOWN_ROOM_HEIGHT / 2;

  if (direction === "left") {
    return { id: wallId(connection), roomId, gateId, connectionId: connection.id, x: 10, y: centerY - length / 2, width: thickness, height: length };
  }

  if (direction === "right") {
    return { id: wallId(connection), roomId, gateId, connectionId: connection.id, x: TOP_DOWN_ROOM_WIDTH - 30, y: centerY - length / 2, width: thickness, height: length };
  }

  if (direction === "up") {
    return { id: wallId(connection), roomId, gateId, connectionId: connection.id, x: centerX - length / 2, y: 10, width: length, height: thickness };
  }

  return { id: wallId(connection), roomId, gateId, connectionId: connection.id, x: centerX - length / 2, y: TOP_DOWN_ROOM_HEIGHT - 30, width: length, height: thickness };
}

function directionToTarget(from: string, to: string): Direction {
  const origin = safeRoomCenter(from);
  const target = safeRoomCenter(to);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }

  return dy >= 0 ? "down" : "up";
}

function safeRoomCenter(roomId: string): { x: number; y: number } {
  try {
    return roomCenter(roomId);
  } catch {
    return { x: TOP_DOWN_ROOM_WIDTH / 2, y: TOP_DOWN_ROOM_HEIGHT / 2 };
  }
}

function enemyInSwordArc(state: GameState, enemy: CombatEnemy): boolean {
  return circleRectOverlap(enemy.x, enemy.y, enemy.radius, swordHitbox(state));
}

function swordHitbox(state: GameState): CombatCollisionRect {
  const pose = state.playerPose;
  const halfWidth = SWORD_CONFIG.width / 2;

  if (pose.facing === "left") {
    return {
      x: pose.x - SWORD_CONFIG.startDistance - SWORD_CONFIG.range,
      y: pose.y - halfWidth,
      width: SWORD_CONFIG.range,
      height: SWORD_CONFIG.width,
    };
  }

  if (pose.facing === "right") {
    return {
      x: pose.x + SWORD_CONFIG.startDistance,
      y: pose.y - halfWidth,
      width: SWORD_CONFIG.range,
      height: SWORD_CONFIG.width,
    };
  }

  if (pose.facing === "up") {
    return {
      x: pose.x - halfWidth,
      y: pose.y - SWORD_CONFIG.startDistance - SWORD_CONFIG.range,
      width: SWORD_CONFIG.width,
      height: SWORD_CONFIG.range,
    };
  }

  return {
    x: pose.x - halfWidth,
    y: pose.y + SWORD_CONFIG.startDistance,
    width: SWORD_CONFIG.width,
    height: SWORD_CONFIG.range,
  };
}

function patrolTargetForSlime(nowMs: number): { x: number; y: number; motion: "walk" } {
  const angle = (nowMs / 1800) % (Math.PI * 2);

  return {
    x: SLIME1_MOVEMENT_CONFIG.homeX + Math.cos(angle) * SLIME1_MOVEMENT_CONFIG.patrolRadius,
    y: SLIME1_MOVEMENT_CONFIG.homeY + Math.sin(angle) * SLIME1_MOVEMENT_CONFIG.patrolRadius,
    motion: "walk",
  };
}

function moveEnemyToward(
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

function isEnemyStunned(state: GameState, enemyId: string, nowMs: number): boolean {
  const until = Date.parse(state.enemyStunUntil[enemyId] ?? "");

  return Number.isFinite(until) && nowMs < until;
}

function isEnemyInvulnerable(state: GameState, enemyId: string, nowMs: number): boolean {
  const until = Date.parse(state.enemyInvulnerableUntil[enemyId] ?? "");

  return Number.isFinite(until) && nowMs < until;
}

export function facingVector(direction: Direction): { x: number; y: number } {
  return {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }[direction];
}

function wallId(connection: ConnectionDefinition): string {
  return `wall.${connection.gateId ?? connection.id}`;
}

function circlesOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  return Math.hypot(ax - bx, ay - by) <= ar + br;
}

function pointInRect(x: number, y: number, rect: Pick<BreakableWall, "x" | "y" | "width" | "height">): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function rectsOverlap(
  a: Pick<BreakableWall, "x" | "y" | "width" | "height">,
  b: Pick<BreakableWall, "x" | "y" | "width" | "height">,
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function circleRectOverlap(cx: number, cy: number, radius: number, rect: Pick<BreakableWall, "x" | "y" | "width" | "height">): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);

  return Math.hypot(cx - closestX, cy - closestY) <= radius;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function addUnique<T>(current: T[], added: T[]): T[] {
  return [...current, ...added.filter((item) => !current.includes(item))];
}
