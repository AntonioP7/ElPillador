import { describe, expect, it } from "vitest";
import { enemyDefinitions } from "../enemies";
import { roomsById } from "../maps/dungeon";
import { npcDefinitions, roomRewards } from "../progression";
import { tiledWorldRooms, tiledWorldRoomsById } from "../tiledRooms/worldManifest.generated";
import {
  getAdjacentTiledWorldRoomId,
  getRoomContent,
  getRoomRuntimeDefinition,
  roomContentById,
  roomContentDefinitions,
} from ".";

describe("Room content definitions", () => {
  it("keeps room content ids unique", () => {
    const ids = roomContentDefinitions.map((room) => room.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("defines content only for rooms known by the graph or Tiled world", () => {
    const unknownRooms = roomContentDefinitions
      .filter((room) => !roomsById.has(room.id) && !tiledWorldRoomsById[room.id])
      .map((room) => room.id);

    expect(unknownRooms).toEqual([]);
  });

  it("allows every Tiled world room to resolve content", () => {
    for (const room of tiledWorldRooms) {
      const content = getRoomContent(room.id);

      expect(content.id).toBe(room.id);
      expect(content.enemies).toEqual(expect.any(Array));
      expect(content.npcs).toEqual(expect.any(Array));
      expect(content.rewards).toEqual(expect.any(Array));
    }
  });

  it("references valid enemy species", () => {
    const invalidEnemies = roomContentDefinitions.flatMap((room) =>
      room.enemies
        .filter((enemy) => !enemyDefinitions[enemy.species])
        .map((enemy) => `${room.id}:${enemy.id}:${enemy.species}`),
    );

    expect(invalidEnemies).toEqual([]);
  });

  it("combines world, graph and logical content for a Tiled room", () => {
    const runtime = getRoomRuntimeDefinition("PZ-E1");

    expect(runtime.id).toBe("PZ-E1");
    expect(runtime.content).toEqual(roomContentById.get("PZ-E1"));
    expect(runtime.graph?.id).toBe("PZ-E1");
    expect(runtime.world?.id).toBe("PZ-E1");
    expect(runtime.hasTiledWorldMap).toBe(true);
    expect(runtime.usesFallbackView).toBe(false);
  });

  it("keeps fallback runtime available for graph rooms missing from the Tiled world", () => {
    const runtime = getRoomRuntimeDefinition("SR20");

    expect(runtime.id).toBe("SR20");
    expect(runtime.graph?.id).toBe("SR20");
    expect(runtime.world).toBeUndefined();
    expect(runtime.hasTiledWorldMap).toBe(false);
    expect(runtime.usesFallbackView).toBe(true);
  });

  it("resolves neighboring Tiled world rooms by physical adjacency", () => {
    expect(getAdjacentTiledWorldRoomId("PZ-E3", "down")).toBe("SR2");
    expect(getAdjacentTiledWorldRoomId("DS-E2", "down")).toBe("PZ-G1");
    expect(getAdjacentTiledWorldRoomId("PZ-G1", "down")).toBe("PZ-G2");
    expect(getAdjacentTiledWorldRoomId("PZ-G2", "up")).toBe("PZ-G1");
    expect(getAdjacentTiledWorldRoomId("PZ-G2", "right")).toBe("SS12");
  });

  it("does not jump across gaps when resolving Tiled world neighbors", () => {
    expect(getAdjacentTiledWorldRoomId("Boss-P", "right")).toBeUndefined();
  });

  it("adapts legacy room rewards and NPCs into room content", () => {
    const sr18 = getRoomContent("SR18");
    const expectedRewards = roomRewards.filter((reward) => reward.roomId === "SR18").map((reward) => reward.id);
    const expectedNpcs = npcDefinitions.filter((npc) => npc.roomId === "SR18").map((npc) => npc.id);

    expect(sr18.rewards.map((reward) => reward.id)).toEqual(expect.arrayContaining(expectedRewards));
    expect(sr18.npcs.map((npc) => npc.id)).toEqual(expect.arrayContaining(expectedNpcs));
  });
});
