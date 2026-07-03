import { roomsById } from "../maps/dungeon";
import type { Direction } from "../../input/actions";
import type { FloorId } from "../maps/types";
import { npcDefinitions, roomRewards } from "../progression";
import { tiledWorldRooms, tiledWorldRoomsById } from "../tiledRooms/worldManifest.generated";
import type { TiledWorldRoomManifestEntry } from "../tiledRooms/worldManifest.generated";
import type {
  RoomContentDefinition,
  RoomContentType,
  RoomEnemyPlacement,
  RoomNpcPlacement,
  RoomRuntimeDefinition,
} from "./types";

const TILED_WORLD_ADJACENCY_EPSILON = 1;

export type {
  RoomContentDefinition,
  RoomContentType,
  RoomContentRect,
  RoomEnemyPlacement,
  RoomNpcPlacement,
  RoomObjectDefinition,
  RoomTriggerDefinition,
  RoomPuzzleDefinition,
  RoomLockDefinition,
  RoomLifecycleAction,
  RoomRuntimeDefinition,
} from "./types";

const roomContentOverrides: RoomContentDefinition[] = [
  roomContent({
    id: "PZ-E1",
    name: "Entrada de la Mazmorra",
    floor: "piso1",
    zone: "Entrada",
    type: "normal",
  }),
  roomContent({
    id: "PZ-E2",
    name: "Pasillo de Entrada",
    floor: "piso1",
    zone: "Entrada",
    type: "normal",
  }),
  roomContent({
    id: "PZ-E3",
    name: "Cruce de Entrada",
    floor: "piso1",
    zone: "Entrada",
    type: "puzzle",
  }),
  roomContent({
    id: "PZ-E4",
    name: "Sala Lateral de Entrada",
    floor: "piso1",
    zone: "Entrada",
    type: "normal",
  }),
  roomContent({
    id: "DS-E1",
    name: "Descenso de Entrada",
    floor: "piso1",
    zone: "Entrada",
    type: "normal",
  }),
  roomContent({
    id: "DS-E2",
    name: "Descenso Exterior de Entrada",
    floor: "piso1",
    zone: "Entrada",
    type: "normal",
  }),
  roomContent({
    id: "SS1",
    name: "Secreto del Interruptor Azul",
    floor: "piso1",
    zone: "Entrada",
    type: "secret",
  }),
  roomContent({
    id: "SS13",
    name: "Sala del Giratiempo",
    floor: "piso1",
    zone: "Entrada",
    type: "special",
  }),
  roomContent({
    id: "SR18",
    name: "Tienda de Mireia",
    floor: "piso1",
    zone: "Entrada",
    type: "shop",
  }),
  roomContent({
    id: "SR2",
    name: "Sala de Espada",
    floor: "piso1",
    zone: "Entrada",
    type: "combat",
    enemies: [
      {
        id: "enemy.SR2.slime1",
        species: "slime1",
        x: 252,
        y: 214,
      },
    ],
  }),
  roomContent({
    id: "CP-G1",
    name: "Combate Pokemon",
    floor: "piso1",
    zone: "Grecia",
    type: "boss",
    enemies: [
      {
        id: "enemy.CP-G1.legendary-beast",
        species: "legendary-beast",
        x: 400,
        y: 171,
        requiresFlag: "beast.CP-G1.summoned",
        excludedByFlag: "beast.CP-G1.defeated",
      },
    ],
  }),
];

const generatedWorldContent = tiledWorldRooms.map((room) => {
  const graph = roomsById.get(room.id);

  return roomContent({
    id: room.id,
    name: graph?.id ?? room.id,
    floor: graph?.floor ?? "piso1",
    zone: graph?.zone ?? "Entrada",
    type: contentTypeFromGraphKind(graph?.kind),
  });
});

export const roomContentDefinitions: RoomContentDefinition[] = mergeRoomContent([
  ...generatedWorldContent,
  ...roomContentOverrides,
]);

export const roomContentById = new Map(roomContentDefinitions.map((room) => [room.id, room] as const));

export function getRoomContent(roomId: string): RoomContentDefinition {
  const explicit = roomContentById.get(roomId);

  if (explicit) {
    return withAdaptedProgression(explicit);
  }

  const graph = roomsById.get(roomId);

  return withAdaptedProgression(roomContent({
    id: roomId,
    name: graph?.id ?? roomId,
    floor: graph?.floor ?? "piso1",
    zone: graph?.zone ?? "Desconocida",
    type: contentTypeFromGraphKind(graph?.kind),
  }));
}

export function getRoomRuntimeDefinition(roomId: string): RoomRuntimeDefinition {
  const graph = roomsById.get(roomId);
  const world = tiledWorldRoomsById[roomId];
  const content = getRoomContent(roomId);

  return {
    id: roomId,
    name: content.name,
    floor: content.floor,
    zone: content.zone,
    type: content.type,
    music: content.music,
    content,
    graph,
    world,
    graphKind: graph?.kind,
    hasTiledWorldMap: Boolean(world),
    usesFallbackView: !world,
    enemies: content.enemies,
    npcs: content.npcs,
    rewards: content.rewards,
  };
}

export function getRoomEnemyPlacements(roomId: string): RoomEnemyPlacement[] {
  return getRoomContent(roomId).enemies;
}

export function getAdjacentTiledWorldRoomId(roomId: string, direction: Direction): string | undefined {
  const current = tiledWorldRoomsById[roomId];

  if (!current) {
    return undefined;
  }

  const candidate = tiledWorldRooms
    .filter((room) => room.id !== roomId)
    .map((room) => adjacentCandidate(current, room, direction))
    .filter((entry): entry is { id: string; gap: number; overlap: number } => Boolean(entry))
    .sort((a, b) => a.gap - b.gap || b.overlap - a.overlap || a.id.localeCompare(b.id))[0];

  return candidate?.id;
}

function withAdaptedProgression(content: RoomContentDefinition): RoomContentDefinition {
  const adaptedNpcs: RoomNpcPlacement[] = npcDefinitions
    .filter((npc) => npc.roomId === content.id)
    .map((npc) => ({
      id: npc.id,
      name: npc.name,
      requirement: npc.requirement,
      grants: npc.grants,
      sourceNpcId: npc.id,
    }));

  return {
    ...content,
    npcs: mergeById(content.npcs, adaptedNpcs),
    rewards: mergeById(content.rewards, roomRewards.filter((reward) => reward.roomId === content.id)),
  };
}

function roomContent(input: Partial<RoomContentDefinition> & Pick<RoomContentDefinition, "id">): RoomContentDefinition {
  return {
    id: input.id,
    name: input.name ?? input.id,
    floor: input.floor ?? "piso1",
    zone: input.zone ?? "Desconocida",
    type: input.type ?? "normal",
    music: input.music,
    enemies: input.enemies ?? [],
    npcs: input.npcs ?? [],
    items: input.items ?? [],
    objects: input.objects ?? [],
    triggers: input.triggers ?? [],
    puzzles: input.puzzles ?? [],
    locks: input.locks ?? [],
    rewards: input.rewards ?? [],
    flags: input.flags ?? [],
    entryConditions: input.entryConditions ?? [],
    exitConditions: input.exitConditions ?? [],
    onEnter: input.onEnter ?? [],
    onExit: input.onExit ?? [],
  };
}

function mergeRoomContent(rooms: RoomContentDefinition[]): RoomContentDefinition[] {
  const merged = new Map<string, RoomContentDefinition>();

  for (const room of rooms) {
    const current = merged.get(room.id);

    merged.set(room.id, current ? mergeSingleRoomContent(current, room) : room);
  }

  return [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function mergeSingleRoomContent(base: RoomContentDefinition, override: RoomContentDefinition): RoomContentDefinition {
  return {
    ...base,
    ...override,
    enemies: mergeById(base.enemies, override.enemies),
    npcs: mergeById(base.npcs, override.npcs),
    items: mergeById(base.items, override.items),
    objects: mergeById(base.objects, override.objects),
    triggers: mergeById(base.triggers, override.triggers),
    puzzles: mergeById(base.puzzles, override.puzzles),
    locks: mergeById(base.locks, override.locks),
    rewards: mergeById(base.rewards, override.rewards),
    flags: [...new Set([...base.flags, ...override.flags])],
    entryConditions: [...base.entryConditions, ...override.entryConditions],
    exitConditions: [...base.exitConditions, ...override.exitConditions],
    onEnter: [...base.onEnter, ...override.onEnter],
    onExit: [...base.onExit, ...override.onExit],
  };
}

function mergeById<T extends { id: string }>(base: T[], override: T[]): T[] {
  const values = new Map<string, T>();

  for (const entry of base) {
    values.set(entry.id, entry);
  }

  for (const entry of override) {
    values.set(entry.id, entry);
  }

  return [...values.values()];
}

function contentTypeFromGraphKind(kind: string | undefined): RoomContentType {
  if (kind === "boss") {
    return "boss";
  }

  if (kind === "secret") {
    return "secret";
  }

  if (kind === "special") {
    return "special";
  }

  return "normal";
}

function adjacentCandidate(
  current: TiledWorldRoomManifestEntry,
  candidate: TiledWorldRoomManifestEntry,
  direction: Direction,
): { id: string; gap: number; overlap: number } | undefined {
  const currentRight = current.worldX + current.width;
  const currentBottom = current.worldY + current.height;
  const candidateRight = candidate.worldX + candidate.width;
  const candidateBottom = candidate.worldY + candidate.height;

  if (direction === "left") {
    const overlap = axisOverlap(current.worldY, currentBottom, candidate.worldY, candidateBottom);
    const gap = current.worldX - candidateRight;
    return isAdjacentWorldGap(gap) && overlap > 0 ? { id: candidate.id, gap, overlap } : undefined;
  }

  if (direction === "right") {
    const overlap = axisOverlap(current.worldY, currentBottom, candidate.worldY, candidateBottom);
    const gap = candidate.worldX - currentRight;
    return isAdjacentWorldGap(gap) && overlap > 0 ? { id: candidate.id, gap, overlap } : undefined;
  }

  if (direction === "up") {
    const overlap = axisOverlap(current.worldX, currentRight, candidate.worldX, candidateRight);
    const gap = current.worldY - candidateBottom;
    return isAdjacentWorldGap(gap) && overlap > 0 ? { id: candidate.id, gap, overlap } : undefined;
  }

  const overlap = axisOverlap(current.worldX, currentRight, candidate.worldX, candidateRight);
  const gap = candidate.worldY - currentBottom;
  return isAdjacentWorldGap(gap) && overlap > 0 ? { id: candidate.id, gap, overlap } : undefined;
}

function axisOverlap(startA: number, endA: number, startB: number, endB: number): number {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function isAdjacentWorldGap(gap: number): boolean {
  return gap >= -TILED_WORLD_ADJACENCY_EPSILON && gap <= TILED_WORLD_ADJACENCY_EPSILON;
}
