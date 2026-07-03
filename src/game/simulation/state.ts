import { FloorId } from "../content/maps/types";
import { Direction } from "../input/actions";
import type { EnemyAiState } from "../ai/types";

export type TimerState = {
  guilleCircuitOpen: boolean;
  guilleCircuitStatus: "idle" | "running" | "expired" | "completed";
  durationMs: number;
  remainingMs?: number;
  startedAt?: string;
  deadlineAt?: string;
  lastClosedAt?: string;
  reopenCount: number;
};

export type PlayerPose = {
  x: number;
  y: number;
  facing: Direction;
};

export type EquipmentState = {
  weapon?: string;
  activeItem?: string;
};

export type ActiveBombState = {
  roomId: string;
  x: number;
  y: number;
  placedAt: string;
};

export type ActiveProjectileState = {
  id: string;
  roomId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  range: number;
  travelled: number;
  owner: "player" | "enemy";
  createdAt: string;
};

export type ActiveAreaAttackState = {
  id: string;
  roomId: string;
  ownerId: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  startedAt: string;
  windupMs: number;
  activeFromMs: number;
  activeToMs: number;
  visualToMs?: number;
  hitPlayer: boolean;
};

export type PlayerCombatState = {
  maxHealth: number;
  health: number;
  invulnerableUntil?: string;
  knockbackUntil?: string;
  lastMagicShotAt?: string;
};

export type EnemyCombatState = {
  health?: number;
  invulnerableUntil?: string;
  stunnedUntil?: string;
  activeAttackId?: string;
  lastAttackAt?: string;
  aiState?: EnemyAiState;
  aiStateStartedAt?: string;
  targetX?: number;
  targetY?: number;
  lastDecisionAt?: string;
  recoverUntil?: string;
};

export type EnemyPositionState = {
  x: number;
  y: number;
};

export type GameState = {
  version: 1;
  currentRoomId: string;
  currentFloor: FloorId;
  currentZone: string;
  playerHealth: number;
  inventory: string[];
  rumors: number[];
  usedRumors: number[];
  flags: Record<string, boolean>;
  openGates: string[];
  companions: string[];
  discoveredRooms: string[];
  defeatedEnemies: string[];
  enemyHealth: Record<string, number>;
  enemyPositions: Record<string, EnemyPositionState>;
  enemyStunUntil: Record<string, string>;
  enemyInvulnerableUntil: Record<string, string>;
  playerCombat: PlayerCombatState;
  enemyCombat: Record<string, EnemyCombatState>;
  brokenWalls: string[];
  activeBomb?: ActiveBombState;
  activeBombs: ActiveBombState[];
  activeProjectiles: ActiveProjectileState[];
  activeAreaAttacks: ActiveAreaAttackState[];
  playerPose: PlayerPose;
  equipment: EquipmentState;
  timerState: TimerState;
  lastUpdatedAt: string;
};

export const INITIAL_ROOM_ID = "PZ-E1";
export const INITIAL_FLOOR: FloorId = "piso1";
export const INITIAL_ZONE = "Entrada";
export const MAX_PLAYER_HEALTH = 100;
export const INITIAL_PLAYER_POSE: PlayerPose = { x: 192, y: 192, facing: "down" };
export const STARTING_ITEMS = ["Reloj"] as const;
export const INITIAL_EQUIPMENT: EquipmentState = {};

export function createInitialGameState(now = new Date()): GameState {
  return {
    version: 1,
    currentRoomId: INITIAL_ROOM_ID,
    currentFloor: INITIAL_FLOOR,
    currentZone: INITIAL_ZONE,
    playerHealth: MAX_PLAYER_HEALTH,
    inventory: [...STARTING_ITEMS],
    rumors: [],
    usedRumors: [],
    flags: {},
    openGates: [],
    companions: [],
    discoveredRooms: [INITIAL_ROOM_ID],
    defeatedEnemies: [],
    enemyHealth: {},
    enemyPositions: {},
    enemyStunUntil: {},
    enemyInvulnerableUntil: {},
    playerCombat: {
      maxHealth: MAX_PLAYER_HEALTH,
      health: MAX_PLAYER_HEALTH,
    },
    enemyCombat: {},
    brokenWalls: [],
    activeBomb: undefined,
    activeBombs: [],
    activeProjectiles: [],
    activeAreaAttacks: [],
    playerPose: { ...INITIAL_PLAYER_POSE },
    equipment: { ...INITIAL_EQUIPMENT },
    timerState: {
      guilleCircuitOpen: true,
      guilleCircuitStatus: "idle",
      durationMs: 180000,
      remainingMs: 180000,
      reopenCount: 0,
    },
    lastUpdatedAt: now.toISOString(),
  };
}

export function touchGameState(state: GameState, now = new Date()): GameState {
  return {
    ...state,
    inventory: [...state.inventory],
    rumors: [...state.rumors],
    usedRumors: normalizeNumberArray((state as Partial<GameState>).usedRumors),
    flags: { ...state.flags },
    playerHealth: normalizePlayerHealth((state as Partial<GameState>).playerHealth),
    openGates: [...state.openGates],
    companions: [...state.companions],
    discoveredRooms: normalizeDiscoveredRooms(state.discoveredRooms, state.currentRoomId),
    defeatedEnemies: [...state.defeatedEnemies],
    enemyHealth: normalizeNumberRecord((state as Partial<GameState>).enemyHealth),
    enemyPositions: normalizeEnemyPositions((state as Partial<GameState>).enemyPositions),
    enemyStunUntil: normalizeStringRecord((state as Partial<GameState>).enemyStunUntil),
    enemyInvulnerableUntil: normalizeStringRecord((state as Partial<GameState>).enemyInvulnerableUntil),
    playerCombat: normalizePlayerCombat((state as Partial<GameState>).playerCombat, normalizePlayerHealth((state as Partial<GameState>).playerHealth)),
    enemyCombat: normalizeEnemyCombat((state as Partial<GameState>).enemyCombat),
    brokenWalls: [...state.brokenWalls],
    activeBomb: state.activeBomb ? { ...state.activeBomb } : undefined,
    activeBombs: normalizeActiveBombs((state as Partial<GameState>).activeBombs, state.activeBomb),
    activeProjectiles: normalizeActiveProjectiles((state as Partial<GameState>).activeProjectiles),
    activeAreaAttacks: normalizeActiveAreaAttacks((state as Partial<GameState>).activeAreaAttacks),
    playerPose: { ...state.playerPose },
    equipment: { ...state.equipment },
    timerState: { ...state.timerState },
    lastUpdatedAt: now.toISOString(),
  };
}

export function normalizeGameState(state: GameState): GameState {
  const inventory = normalizeInventory((state as Partial<GameState>).inventory);

  return {
    ...state,
    playerHealth: normalizePlayerHealth((state as Partial<GameState>).playerHealth),
    inventory,
    rumors: normalizeNumberArray((state as Partial<GameState>).rumors),
    usedRumors: normalizeNumberArray((state as Partial<GameState>).usedRumors),
    discoveredRooms: normalizeDiscoveredRooms((state as Partial<GameState>).discoveredRooms, state.currentRoomId),
    defeatedEnemies: normalizeStringArray((state as Partial<GameState>).defeatedEnemies),
    enemyHealth: normalizeNumberRecord((state as Partial<GameState>).enemyHealth),
    enemyPositions: normalizeEnemyPositions((state as Partial<GameState>).enemyPositions),
    enemyStunUntil: normalizeStringRecord((state as Partial<GameState>).enemyStunUntil),
    enemyInvulnerableUntil: normalizeStringRecord((state as Partial<GameState>).enemyInvulnerableUntil),
    playerCombat: normalizePlayerCombat((state as Partial<GameState>).playerCombat, normalizePlayerHealth((state as Partial<GameState>).playerHealth)),
    enemyCombat: normalizeEnemyCombat((state as Partial<GameState>).enemyCombat),
    brokenWalls: normalizeStringArray((state as Partial<GameState>).brokenWalls),
    activeBomb: normalizeActiveBomb((state as Partial<GameState>).activeBomb),
    activeBombs: normalizeActiveBombs((state as Partial<GameState>).activeBombs, (state as Partial<GameState>).activeBomb),
    activeProjectiles: normalizeActiveProjectiles((state as Partial<GameState>).activeProjectiles),
    activeAreaAttacks: normalizeActiveAreaAttacks((state as Partial<GameState>).activeAreaAttacks),
    playerPose: normalizePlayerPose((state as Partial<GameState>).playerPose),
    equipment: normalizeEquipment((state as Partial<GameState>).equipment, inventory),
  };
}

export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GameState>;

  return (
    candidate.version === 1 &&
    typeof candidate.currentRoomId === "string" &&
    typeof candidate.currentFloor === "string" &&
    typeof candidate.currentZone === "string" &&
    Array.isArray(candidate.inventory) &&
    Array.isArray(candidate.rumors) &&
    Array.isArray(candidate.openGates) &&
    Array.isArray(candidate.companions) &&
    typeof candidate.flags === "object" &&
    typeof candidate.timerState === "object"
  );
}

function normalizePlayerPose(pose: Partial<PlayerPose> | undefined): PlayerPose {
  return {
    x: typeof pose?.x === "number" ? pose.x : INITIAL_PLAYER_POSE.x,
    y: typeof pose?.y === "number" ? pose.y : INITIAL_PLAYER_POSE.y,
    facing: isDirection(pose?.facing) ? pose.facing : INITIAL_PLAYER_POSE.facing,
  };
}

function normalizePlayerHealth(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(MAX_PLAYER_HEALTH, Math.max(0, value))
    : MAX_PLAYER_HEALTH;
}

function isDirection(value: unknown): value is Direction {
  return value === "up" || value === "down" || value === "left" || value === "right";
}

function normalizeInventory(inventory: unknown): string[] {
  const values = normalizeStringArray(inventory);

  return [...STARTING_ITEMS, ...values.filter((item) => !STARTING_ITEMS.includes(item as (typeof STARTING_ITEMS)[number]))];
}

export function discoverRoom(state: GameState, roomId: string): GameState {
  return {
    ...state,
    discoveredRooms: normalizeDiscoveredRooms([...state.discoveredRooms, roomId], roomId),
  };
}

export function markRumorUsedForRoom(state: GameState, roomId: string): GameState {
  if (roomId === "CP-G1") {
    return markRumorUsed(state, 16);
  }

  const match = /^SS(\d+)$/.exec(roomId);

  if (!match) {
    return state;
  }

  return markRumorUsed(state, Number(match[1]));
}

function markRumorUsed(state: GameState, rumorId: number): GameState {
  const usedRumors = normalizeNumberArray((state as Partial<GameState>).usedRumors);

  if (!state.rumors.includes(rumorId) || usedRumors.includes(rumorId)) {
    return state;
  }

  return {
    ...state,
    usedRumors: [...usedRumors, rumorId].sort((a, b) => a - b),
  };
}

function normalizeDiscoveredRooms(discoveredRooms: unknown, currentRoomId: string): string[] {
  const values = normalizeStringArray(discoveredRooms);

  return [...new Set([INITIAL_ROOM_ID, currentRoomId, ...values])];
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function normalizeNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is number => Number.isInteger(entry)))].sort((a, b) => a - b)
    : [];
}

function normalizeNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] > 0,
    ),
  );
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0,
    ),
  );
}

function normalizeEnemyPositions(value: unknown): Record<string, EnemyPositionState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([enemyId, position]) => {
      if (!position || typeof position !== "object") {
        return [];
      }

      const candidate = position as Partial<EnemyPositionState>;

      return typeof candidate.x === "number" &&
        Number.isFinite(candidate.x) &&
        typeof candidate.y === "number" &&
        Number.isFinite(candidate.y)
        ? [[enemyId, { x: candidate.x, y: candidate.y }]]
        : [];
    }),
  );
}

function normalizeActiveBomb(value: unknown): ActiveBombState | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<ActiveBombState>;

  if (
    typeof candidate.roomId !== "string" ||
    typeof candidate.x !== "number" ||
    typeof candidate.y !== "number" ||
    typeof candidate.placedAt !== "string"
  ) {
    return undefined;
  }

  return {
    roomId: candidate.roomId,
    x: candidate.x,
    y: candidate.y,
    placedAt: candidate.placedAt,
  };
}

function normalizeActiveBombs(value: unknown, legacyBomb?: ActiveBombState): ActiveBombState[] {
  const values = Array.isArray(value)
    ? value.map(normalizeActiveBomb).filter((bomb): bomb is ActiveBombState => Boolean(bomb))
    : [];

  if (values.length > 0) {
    return values;
  }

  return legacyBomb ? [{ ...legacyBomb }] : [];
}

function normalizePlayerCombat(value: unknown, legacyHealth: number): PlayerCombatState {
  if (!value || typeof value !== "object") {
    return {
      maxHealth: MAX_PLAYER_HEALTH,
      health: legacyHealth,
    };
  }

  const candidate = value as Partial<PlayerCombatState>;
  const maxHealth =
    typeof candidate.maxHealth === "number" && Number.isFinite(candidate.maxHealth) && candidate.maxHealth > 0
      ? Math.floor(candidate.maxHealth)
      : MAX_PLAYER_HEALTH;
  const health =
    typeof candidate.health === "number" && Number.isFinite(candidate.health)
      ? Math.min(maxHealth, Math.max(0, Math.floor(candidate.health)))
      : legacyHealth;

  return {
    maxHealth,
    health,
    invulnerableUntil: typeof candidate.invulnerableUntil === "string" ? candidate.invulnerableUntil : undefined,
    knockbackUntil: typeof candidate.knockbackUntil === "string" ? candidate.knockbackUntil : undefined,
    lastMagicShotAt: typeof candidate.lastMagicShotAt === "string" ? candidate.lastMagicShotAt : undefined,
  };
}

function normalizeEnemyCombat(value: unknown): Record<string, EnemyCombatState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([enemyId, combat]) => {
      if (!combat || typeof combat !== "object") {
        return [];
      }

      const candidate = combat as Partial<EnemyCombatState>;
      return [[
        enemyId,
        {
          health: typeof candidate.health === "number" && Number.isFinite(candidate.health) && candidate.health > 0 ? candidate.health : undefined,
          invulnerableUntil: typeof candidate.invulnerableUntil === "string" ? candidate.invulnerableUntil : undefined,
          stunnedUntil: typeof candidate.stunnedUntil === "string" ? candidate.stunnedUntil : undefined,
          activeAttackId: typeof candidate.activeAttackId === "string" ? candidate.activeAttackId : undefined,
          lastAttackAt: typeof candidate.lastAttackAt === "string" ? candidate.lastAttackAt : undefined,
          aiState: isEnemyAiState(candidate.aiState) ? candidate.aiState : undefined,
          aiStateStartedAt: typeof candidate.aiStateStartedAt === "string" ? candidate.aiStateStartedAt : undefined,
          targetX: typeof candidate.targetX === "number" && Number.isFinite(candidate.targetX) ? candidate.targetX : undefined,
          targetY: typeof candidate.targetY === "number" && Number.isFinite(candidate.targetY) ? candidate.targetY : undefined,
          lastDecisionAt: typeof candidate.lastDecisionAt === "string" ? candidate.lastDecisionAt : undefined,
          recoverUntil: typeof candidate.recoverUntil === "string" ? candidate.recoverUntil : undefined,
        },
      ]];
    }),
  );
}

function isEnemyAiState(value: unknown): value is EnemyAiState {
  return (
    value === "idle" ||
    value === "wander" ||
    value === "chase" ||
    value === "attackWindup" ||
    value === "attackActive" ||
    value === "recover" ||
    value === "hurt" ||
    value === "stunned" ||
    value === "dead"
  );
}

function normalizeActiveProjectiles(value: unknown): ActiveProjectileState[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((projectile): projectile is ActiveProjectileState => {
    const candidate = projectile as Partial<ActiveProjectileState>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.roomId === "string" &&
      typeof candidate.x === "number" &&
      typeof candidate.y === "number" &&
      typeof candidate.vx === "number" &&
      typeof candidate.vy === "number" &&
      typeof candidate.radius === "number" &&
      typeof candidate.damage === "number" &&
      typeof candidate.range === "number" &&
      typeof candidate.travelled === "number" &&
      (candidate.owner === "player" || candidate.owner === "enemy") &&
      typeof candidate.createdAt === "string"
    );
  });
}

function normalizeActiveAreaAttacks(value: unknown): ActiveAreaAttackState[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((attack): attack is ActiveAreaAttackState => {
    const candidate = attack as Partial<ActiveAreaAttackState>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.roomId === "string" &&
      typeof candidate.ownerId === "string" &&
      typeof candidate.x === "number" &&
      typeof candidate.y === "number" &&
      typeof candidate.radius === "number" &&
      typeof candidate.damage === "number" &&
      typeof candidate.startedAt === "string" &&
      typeof candidate.windupMs === "number" &&
      typeof candidate.activeFromMs === "number" &&
      typeof candidate.activeToMs === "number" &&
      (candidate.visualToMs === undefined || typeof candidate.visualToMs === "number") &&
      typeof candidate.hitPlayer === "boolean"
    );
  });
}

function normalizeEquipment(equipment: Partial<EquipmentState> | undefined, inventory: string[]): EquipmentState {
  return {
    weapon: typeof equipment?.weapon === "string" && inventory.includes(equipment.weapon) ? equipment.weapon : undefined,
    activeItem:
      typeof equipment?.activeItem === "string" && inventory.includes(equipment.activeItem)
        ? equipment.activeItem
        : undefined,
  };
}
