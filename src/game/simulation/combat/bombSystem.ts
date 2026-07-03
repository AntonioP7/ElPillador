import type { ActiveBombState, GameState } from "../state";
import { touchGameState } from "../state";
import { damagePlayerWithCombatRules, damageEnemyState } from "./damageSystem";
import { circleRectOverlap, circlesOverlap } from "./hitboxSystem";
import { BOMB_CONFIG } from "./weaponConfig";
import type { CombatEnemy, CombatResult } from "./types";

type BreakableWall = {
  id: string;
  roomId: string;
  gateId: string;
  connectionId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getActiveBomb(state: GameState): ActiveBombState | undefined {
  return state.activeBomb?.roomId === state.currentRoomId
    ? state.activeBomb
    : state.activeBombs.find((bomb) => bomb.roomId === state.currentRoomId);
}

export function placeBomb(state: GameState, now = new Date()): CombatResult {
  if (state.equipment.activeItem !== "Bombas" || !state.inventory.includes("Bombas")) {
    return {
      state: touchGameState(state, now),
      handled: false,
      changed: false,
      message: "Equipa Bombas para colocar una",
      events: [],
    };
  }

  if (state.activeBomb || state.activeBombs.length >= BOMB_CONFIG.maxActive) {
    return {
      state: touchGameState(state, now),
      handled: true,
      changed: false,
      message: "Ya hay una bomba colocada",
      events: [],
    };
  }

  const bomb: ActiveBombState = {
    roomId: state.currentRoomId,
    x: state.playerPose.x,
    y: state.playerPose.y,
    placedAt: now.toISOString(),
  };

  return {
    state: touchGameState(
      {
        ...state,
        activeBomb: bomb,
        activeBombs: [bomb],
      },
      now,
    ),
    handled: true,
    changed: true,
    message: "Bomba colocada",
    events: [
      { type: "spawnBomb", bombId: bombId(bomb), x: bomb.x, y: bomb.y },
      { type: "bombWarning", bombId: bombId(bomb), x: bomb.x, y: bomb.y, radius: BOMB_CONFIG.radius },
    ],
  };
}

export function resolveBombFuse(
  state: GameState,
  enemies: CombatEnemy[],
  walls: BreakableWall[],
  now = new Date(),
): CombatResult {
  const bomb = state.activeBomb ?? state.activeBombs[0];

  if (!bomb) {
    return { state, handled: false, changed: false, message: "", events: [] };
  }

  const elapsed = now.getTime() - new Date(bomb.placedAt).getTime();

  if (elapsed < BOMB_CONFIG.fuseMs) {
    return { state, handled: false, changed: false, message: "", events: [] };
  }

  return explodeBomb(state, bomb, enemies, walls, now);
}

function explodeBomb(
  state: GameState,
  bomb: ActiveBombState,
  enemies: CombatEnemy[],
  walls: BreakableWall[],
  now: Date,
): CombatResult {
  const hitEnemies = enemies.filter((enemy) => circlesOverlap(bomb.x, bomb.y, BOMB_CONFIG.radius, enemy.x, enemy.y, enemy.radius));
  const damagedState = hitEnemies.reduce(
    (currentState, enemy) => damageEnemyState(currentState, enemy, BOMB_CONFIG.damage, now).state,
    state,
  );
  const defeated = hitEnemies.filter((enemy) => enemy.hp - BOMB_CONFIG.damage <= 0);
  const broken = walls.filter((wall) => circleRectOverlap(bomb.x, bomb.y, BOMB_CONFIG.radius, wall));
  const playerHit = circlesOverlap(
    bomb.x,
    bomb.y,
    BOMB_CONFIG.radius,
    damagedState.playerPose.x,
    damagedState.playerPose.y,
    14,
  );
  const playerDamaged = playerHit
    ? damagePlayerWithCombatRules(damagedState, BOMB_CONFIG.playerDamage, "Explosion de bomba", now, 0).state
    : damagedState;
  const defeatedIds = defeated.map((enemy) => enemy.id);
  const brokenIds = broken.map((wall) => wall.id);
  const openedGateIds = broken.map((wall) => wall.gateId);
  const brokenWallFlags = Object.fromEntries(openedGateIds.map((gateId) => [`wall.${gateId}.destroyed`, true]));

  return {
    state: touchGameState(
      {
        ...playerDamaged,
        activeBomb: undefined,
        activeBombs: [],
        defeatedEnemies: addUnique(playerDamaged.defeatedEnemies, defeatedIds),
        brokenWalls: addUnique(playerDamaged.brokenWalls, brokenIds),
        flags: {
          ...playerDamaged.flags,
          ...brokenWallFlags,
        },
        openGates: addUnique(playerDamaged.openGates, openedGateIds),
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
      { type: "bombExplosion", bombId: bombId(bomb), x: bomb.x, y: bomb.y, radius: BOMB_CONFIG.radius },
      ...hitEnemies.map((enemy) => ({ type: "damage" as const, target: "enemy" as const, targetId: enemy.id, amount: BOMB_CONFIG.damage, source: "Bomba", x: enemy.x, y: enemy.y })),
      ...(playerHit ? [{ type: "damage" as const, target: "player" as const, targetId: "player", amount: BOMB_CONFIG.playerDamage, source: "Bomba" }] : []),
    ],
  };
}

function bombId(bomb: ActiveBombState): string {
  return `bomb.${bomb.roomId}.${bomb.placedAt}`;
}

function addUnique<T>(current: T[], added: T[]): T[] {
  return [...current, ...added.filter((item) => !current.includes(item))];
}
