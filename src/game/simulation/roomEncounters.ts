import type { EnemySpawnDefinition } from "../content/enemies/types";
import type { TiledDoorObject } from "../content/tiledRooms/generic";
import type { GameState } from "./state";

export type RoomEncounterDefinition = {
  id: string;
  roomId: string;
  triggerChestId?: string;
  closeDoorsWhileActive: boolean;
};

export const roomEncounterDefinitions: RoomEncounterDefinition[] = [
  {
    id: "SR2.chest-waves",
    roomId: "SR2",
    triggerChestId: "chest.43",
    closeDoorsWhileActive: true,
  },
];

export function roomEncounterForRoom(roomId: string): RoomEncounterDefinition | undefined {
  return roomEncounterDefinitions.find((definition) => definition.roomId === roomId);
}

export function roomEncounterForChest(roomId: string, chestId: string): RoomEncounterDefinition | undefined {
  return roomEncounterDefinitions.find((definition) => definition.roomId === roomId && definition.triggerChestId === chestId);
}

export function isRoomEncounterActive(state: GameState, roomId = state.currentRoomId): boolean {
  const encounter = roomEncounterForRoom(roomId);

  return Boolean(encounter && state.flags[startedFlag(encounter)] && !state.flags[completedFlag(encounter)]);
}

export function shouldRoomEncounterBlockDoor(state: GameState, door: Pick<TiledDoorObject, "isLocked"> | { isLocked?: boolean }, roomId = state.currentRoomId): boolean {
  const encounter = roomEncounterForRoom(roomId);

  return Boolean(encounter?.closeDoorsWhileActive && isRoomEncounterActive(state, roomId) && !door.isLocked);
}

export function startRoomEncounter(state: GameState, encounter: RoomEncounterDefinition, spawns: EnemySpawnDefinition[]): GameState {
  if (state.flags[startedFlag(encounter)] || state.flags[completedFlag(encounter)]) {
    return state;
  }

  const firstWave = firstWaveNumber(spawns);
  const waves = waveNumbers(spawns);

  return {
    ...state,
    flags: {
      ...withoutWaveFlags(state.flags, encounter, waves),
      [startedFlag(encounter)]: true,
      [waveFlag(encounter, firstWave)]: true,
    },
    defeatedEnemies: state.defeatedEnemies.filter((enemyId) => !spawns.some((spawn) => spawn.id === enemyId)),
  };
}

export function progressRoomEncounter(state: GameState, spawns: EnemySpawnDefinition[]): GameState {
  const encounter = roomEncounterForRoom(state.currentRoomId);

  if (!encounter || !isRoomEncounterActive(state, encounter.roomId)) {
    return state;
  }

  const waves = waveNumbers(spawns);
  const activeWave = activeWaveNumber(state, encounter, waves);

  if (activeWave === undefined) {
    return completeEncounterIfDone(state, encounter, waves);
  }

  const activeSpawns = spawns.filter((spawn) => spawn.wave === activeWave);
  const activeWaveDefeated = activeSpawns.length > 0 && activeSpawns.every((spawn) => state.defeatedEnemies.includes(spawn.id));

  if (!activeWaveDefeated) {
    return state;
  }

  const nextWave = waves.find((wave) => wave > activeWave);

  if (nextWave === undefined) {
    return {
      ...state,
      flags: {
        ...withoutWaveFlags(state.flags, encounter, waves),
        [startedFlag(encounter)]: true,
        [completedFlag(encounter)]: true,
      },
    };
  }

  return {
    ...state,
    flags: {
      ...withoutWaveFlags(state.flags, encounter, waves),
      [startedFlag(encounter)]: true,
      [waveFlag(encounter, nextWave)]: true,
    },
  };
}

export function filterRoomEncounterSpawns(state: GameState, spawns: EnemySpawnDefinition[]): EnemySpawnDefinition[] {
  const encounter = roomEncounterForRoom(state.currentRoomId);

  if (!encounter) {
    return spawns;
  }

  const waveSpawns = spawns.filter((spawn) => spawn.wave !== undefined);

  if (waveSpawns.length === 0) {
    return isRoomEncounterActive(state, encounter.roomId) ? spawns : [];
  }

  if (!isRoomEncounterActive(state, encounter.roomId)) {
    return [];
  }

  const waves = waveNumbers(waveSpawns);
  const activeWave = activeWaveNumber(state, encounter, waves);

  if (activeWave === undefined) {
    return [];
  }

  return waveSpawns.filter((spawn) => spawn.wave === activeWave);
}

function completeEncounterIfDone(state: GameState, encounter: RoomEncounterDefinition, waves: number[]): GameState {
  if (waves.length === 0) {
    return {
      ...state,
      flags: {
        ...state.flags,
        [completedFlag(encounter)]: true,
      },
    };
  }

  return state;
}

function activeWaveNumber(state: GameState, encounter: RoomEncounterDefinition, waves: number[]): number | undefined {
  return [...waves].reverse().find((wave) => state.flags[waveFlag(encounter, wave)]);
}

function firstWaveNumber(spawns: EnemySpawnDefinition[]): number {
  return waveNumbers(spawns)[0] ?? 1;
}

function waveNumbers(spawns: EnemySpawnDefinition[]): number[] {
  return [...new Set(spawns.map((spawn) => spawn.wave).filter((wave): wave is number => Number.isFinite(wave)))]
    .sort((a, b) => a - b);
}

function startedFlag(encounter: RoomEncounterDefinition): string {
  return `encounter.${encounter.id}.started`;
}

function completedFlag(encounter: RoomEncounterDefinition): string {
  return `encounter.${encounter.id}.completed`;
}

function waveFlag(encounter: RoomEncounterDefinition, wave: number): string {
  return `encounter.${encounter.id}.wave.${wave}`;
}

function withoutWaveFlags(flags: GameState["flags"], encounter: RoomEncounterDefinition, waves: number[]): GameState["flags"] {
  const waveFlags = new Set(waves.map((wave) => waveFlag(encounter, wave)));

  return Object.fromEntries(Object.entries(flags).filter(([key]) => !waveFlags.has(key)));
}
