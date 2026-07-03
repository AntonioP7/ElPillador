import { rawDungeonDocuments } from "./rawDocuments";
import { buildDungeonMapFromRawDocuments } from "./parser";
import { DungeonMapDefinition } from "./types";

export const removedStairRoomIds = ["PZ-C4", "DS-K1", "PZ-L1", "PZ-P2"] as const;

export const dungeonMap: DungeonMapDefinition = {
  ...buildDungeonMapFromRawDocuments(rawDungeonDocuments),
  removedStairRoomIds,
};

export const roomsById = new Map(dungeonMap.rooms.map((room) => [room.id, room] as const));
export const connectionsById = new Map(
  dungeonMap.connections.map((connection) => [connection.id, connection] as const),
);
export const gatesById = new Map(dungeonMap.gates.map((gate) => [gate.id, gate] as const));

export function secretRumorForRoom(roomId: string): number | null {
  if (roomId === "CP-G1") {
    return 16;
  }

  const match = /^SS(\d+)$/.exec(roomId);
  return match ? Number(match[1]) : null;
}

export function roomCenter(roomId: string): { x: number; y: number } {
  const room = roomsById.get(roomId);

  if (!room) {
    throw new Error(`Unknown room: ${roomId}`);
  }

  return {
    x: room.layout.x + room.layout.width / 2,
    y: room.layout.y + room.layout.height / 2,
  };
}
