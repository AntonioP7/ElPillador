import { describe, expect, it } from "vitest";
import { parseTiledRoom, spawnTiledFromExitDirection, stepTiledMovement, tiledDoorContainingPose, tiledRoomColliders } from "./generic";

describe("generic Tiled room parsing", () => {
  it("spawns one tile inside the destination door side", () => {
    const room = { width: 384, height: 384, tileWidth: 16, tileHeight: 16 };

    expect(spawnTiledFromExitDirection(room, "down", { direction: "up", x: 176, y: 16, width: 32, height: 32 })).toEqual({
      x: 192,
      y: 64,
      facing: "down",
    });
    expect(spawnTiledFromExitDirection(room, "up", { direction: "down", x: 176, y: 336, width: 32, height: 32 })).toEqual({
      x: 192,
      y: 320,
      facing: "up",
    });
    expect(spawnTiledFromExitDirection(room, "left", { direction: "right", x: 336, y: 176, width: 32, height: 32 })).toEqual({
      x: 320,
      y: 192,
      facing: "left",
    });
    expect(spawnTiledFromExitDirection(room, "right", { direction: "left", x: 16, y: 176, width: 32, height: 32 })).toEqual({
      x: 64,
      y: 192,
      facing: "right",
    });
  });

  it("parses locked door objects from the Doors layer", () => {
    const room = parseTiledRoom("TEST", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Doors",
          type: "objectgroup",
          objects: [
            {
              id: 1,
              x: 160,
              y: 368,
              width: 64,
              height: 16,
              properties: [
                { name: "IsLocked", value: true },
                { name: "targetRoom", value: "SS1" },
              ],
            },
          ],
        },
      ],
    });

    expect(room.doors).toEqual([
      expect.objectContaining({
        id: "door.1",
        direction: "down",
        isLocked: true,
        targetRoom: "SS1",
      }),
    ]);
  });

  it("parses spike door objects from the Doors layer", () => {
    const room = parseTiledRoom("TEST", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Doors",
          type: "objectgroup",
          objects: [
            {
              id: 2,
              type: "Door",
              x: 0,
              y: 160,
              width: 16,
              height: 48,
              properties: [{ name: "IsSpike", value: true }],
            },
          ],
        },
      ],
    });

    expect(room.doors).toEqual([
      expect.objectContaining({
        id: "door.2",
        isSpike: true,
      }),
    ]);
  });

  it("normalizes point door objects at room edges to one tile", () => {
    const room = parseTiledRoom("DS-G1", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Doors",
          type: "objectgroup",
          objects: [
            { id: 10, type: "Door", x: 0, y: 160, width: 0, height: 0, properties: [{ name: "IsSpike", value: true }] },
            { id: 11, type: "Door", x: 384, y: 160, width: 0, height: 0, properties: [{ name: "IsSpike", value: true }] },
            { id: 12, type: "Door", x: 176, y: 384, width: 0, height: 0 },
          ],
        },
      ],
    });

    expect(room.doors).toEqual([
      expect.objectContaining({ id: "door.10", direction: "left", x: 0, y: 160, width: 16, height: 16, isSpike: true }),
      expect.objectContaining({ id: "door.11", direction: "right", x: 368, y: 160, width: 16, height: 16, isSpike: true }),
      expect.objectContaining({ id: "door.12", direction: "down", x: 176, y: 368, width: 16, height: 16 }),
    ]);
    expect(tiledDoorContainingPose(room, { x: 8, y: 168 })?.id).toBe("door.10");
    expect(tiledRoomColliders(room, (door) => Boolean(door.isSpike))).toEqual([
      { x: 0, y: 160, width: 16, height: 16 },
      { x: 368, y: 160, width: 16, height: 16 },
    ]);
  });

  it("parses block door objects from the Doors layer", () => {
    const room = parseTiledRoom("TEST", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Doors",
          type: "objectgroup",
          objects: [
            {
              id: 3,
              type: "Door",
              x: 0,
              y: 160,
              width: 16,
              height: 48,
              properties: [{ name: "IsBlock", value: true }],
            },
          ],
        },
      ],
    });

    expect(room.doors).toEqual([
      expect.objectContaining({
        id: "door.3",
        isBlock: true,
      }),
    ]);
  });

  it("parses secret door objects from the Doors layer", () => {
    const room = parseTiledRoom("TEST", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Doors",
          type: "objectgroup",
          objects: [
            {
              id: 4,
              type: "Door",
              x: 0,
              y: 160,
              width: 16,
              height: 48,
              properties: [{ name: "IsSecret", value: true }],
            },
          ],
        },
      ],
    });

    expect(room.doors).toEqual([
      expect.objectContaining({
        id: "door.4",
        isSecret: true,
      }),
    ]);
  });

  it("parses stairs objects from the Stairs layer", () => {
    const room = parseTiledRoom("TEST", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Stairs",
          type: "objectgroup",
          objects: [
            {
              id: 5,
              x: 176,
              y: 336,
              width: 32,
              height: 16,
              properties: [
                { name: "targetRoom", value: "PZ-P1" },
                { name: "direction", value: "down" },
              ],
            },
          ],
        },
      ],
    });

    expect(room.stairs).toEqual([
      expect.objectContaining({
        id: "stairs.5",
        direction: "down",
        targetRoom: "PZ-P1",
      }),
    ]);
  });

  it("adds locked doors to collision only while the door is blocked", () => {
    const room = parseTiledRoom("TEST", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Doors",
          type: "objectgroup",
          objects: [{ id: 1, x: 160, y: 176, width: 64, height: 16, properties: [{ name: "IsLocked", value: true }] }],
        },
      ],
    });

    expect(tiledRoomColliders(room, () => true)).toEqual([{ x: 160, y: 176, width: 64, height: 16 }]);
    expect(tiledRoomColliders(room, () => false)).toEqual([]);
  });

  it("prevents movement through a locked door collider", () => {
    const room = parseTiledRoom("TEST", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Doors",
          type: "objectgroup",
          objects: [{ id: 1, x: 184, y: 176, width: 32, height: 16, properties: [{ name: "IsLocked", value: true }] }],
        },
      ],
    });
    const blockedRoom = {
      ...room,
      colliders: tiledRoomColliders(room, () => true),
    };
    const state = {
      playerPose: { x: 192, y: 166, facing: "down" as const },
    };

    const result = stepTiledMovement(state as Parameters<typeof stepTiledMovement>[0], { down: true }, 100, blockedRoom);

    expect(result.state.playerPose.y).toBe(166);
    expect(result.moved).toBe(false);
  });

  it("parses enemy respawns from the Enemies object layer", () => {
    const room = parseTiledRoom("SR2", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Enemies",
          type: "objectgroup",
          objects: [
            {
              id: 42,
              name: "enemy.SR2.slime1",
              type: "slime1",
              x: 240,
              y: 208,
              width: 24,
              height: 16,
              properties: [
                { name: "hp", value: 4 },
                { name: "wave", value: 1 },
                { name: "respawnOnEntry", value: true },
              ],
            },
          ],
        },
      ],
    });

    expect(room.enemies).toEqual([
      expect.objectContaining({
        id: "enemy.SR2.slime1",
        species: "slime1",
        x: 252,
        y: 216,
        hp: 4,
        wave: 1,
        respawnOnEntry: true,
      }),
    ]);
  });

  it("can add normal doors to collision when room logic blocks them", () => {
    const room = parseTiledRoom("TEST", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Doors",
          type: "objectgroup",
          objects: [{ id: 1, x: 160, y: 176, width: 64, height: 16 }],
        },
      ],
    });

    expect(tiledRoomColliders(room, () => true)).toEqual([{ x: 160, y: 176, width: 64, height: 16 }]);
  });

  it("parses EnemyType from Tiled enemy spawns", () => {
    const room = parseTiledRoom("TEST", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Enemies",
          type: "objectgroup",
          objects: [
            {
              id: 2,
              x: 96,
              y: 128,
              width: 32,
              height: 32,
              properties: [
                { name: "EnemyType", value: "Slime3" },
                { name: "Wave", value: 0 },
              ],
            },
          ],
        },
      ],
    });

    expect(room.enemies).toEqual([
      expect.objectContaining({
        id: "enemy.TEST.2",
        species: "slime3",
        x: 112,
        y: 144,
        wave: 0,
      }),
    ]);
  });

  it("parses chests from Chest or Chests layers with open state", () => {
    const room = parseTiledRoom("SR2", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Chests",
          type: "objectgroup",
          objects: [
            {
              id: 9,
              name: "chest.SR2.bombs",
              x: 96,
              y: 128,
              width: 32,
              height: 32,
              properties: [
                { name: "item", value: "Bombas" },
                { name: "IsOpen", value: true },
                { name: "openedFlag", value: "chest.SR2.bombs.opened" },
              ],
            },
          ],
        },
      ],
    });

    expect(room.chests).toEqual([
      expect.objectContaining({
        id: "chest.SR2.bombs",
        item: "Bombas",
        isOpen: true,
        openedFlag: "chest.SR2.bombs.opened",
      }),
    ]);
  });

  it("uses Tiled Chest reward properties as item grants", () => {
    const room = parseTiledRoom("SR2", {
      width: 24,
      height: 24,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        {
          name: "Chest",
          type: "objectgroup",
          objects: [
            {
              id: 43,
              type: "Chest",
              x: 176,
              y: 176,
              width: 32,
              height: 32,
              properties: [{ name: "Reward", value: "Sword" }],
            },
          ],
        },
      ],
    });

    expect(room.chests).toEqual([
      expect.objectContaining({
        id: "chest.43",
        reward: "Sword",
        item: "Espada",
      }),
    ]);
  });
});
