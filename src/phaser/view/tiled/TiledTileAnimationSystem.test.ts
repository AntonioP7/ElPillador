import { describe, expect, it } from "vitest";
import {
  buildTiledTileAnimationIndex,
  getTiledTileAnimationFrameIndex,
  TiledTileAnimationSystem,
  TILED_ANIMATION_BASE_INDEX_PROPERTY,
  TILED_ANIMATION_CURRENT_INDEX_PROPERTY,
} from "./TiledTileAnimationSystem";

describe("TiledTileAnimationSystem", () => {
  it("builds global gids from firstgid and respects irregular frame durations", () => {
    const animations = buildTiledTileAnimationIndex([
      {
        name: "Fire",
        firstgid: 100,
        tileData: {
          3: {
            animation: [
              { tileid: 3, duration: 450 },
              { tileid: 4, duration: 150 },
              { tileid: 5, duration: 150 },
            ],
          },
        },
      },
    ]);
    const animation = animations.get(103);

    expect(animation).toEqual(expect.objectContaining({ baseIndex: 103, totalDurationMs: 750 }));
    expect(animation?.frames).toEqual([
      { index: 103, duration: 450, endAtMs: 450 },
      { index: 104, duration: 150, endAtMs: 600 },
      { index: 105, duration: 150, endAtMs: 750 },
    ]);
    expect(getTiledTileAnimationFrameIndex(animation!, 449)).toBe(103);
    expect(getTiledTileAnimationFrameIndex(animation!, 450)).toBe(104);
    expect(getTiledTileAnimationFrameIndex(animation!, 600)).toBe(105);
    expect(getTiledTileAnimationFrameIndex(animation!, 750)).toBe(103);
  });

  it("updates tile indexes while preserving the original animated base index", () => {
    const tile: { index: number; properties: Record<string, unknown> } = {
      index: 205,
      properties: { animated: true, tileRole: "trap" },
    };
    const layer = {
      forEachTile(callback: (tile: unknown) => void) {
        callback(tile);
        return this;
      },
    };
    const system = new TiledTileAnimationSystem(
      { time: { now: 150 } } as Phaser.Scene,
      {
        tilesets: [
          {
            name: "AnimatedTrap",
            firstgid: 200,
            tileData: {
              5: {
                animation: [
                  { tileid: 5, duration: 100 },
                  { tileid: 6, duration: 100 },
                ],
              },
            },
          },
        ],
      } as Phaser.Tilemaps.Tilemap,
      [layer as unknown as Phaser.Tilemaps.TilemapLayer],
    );

    system.update(150);

    expect(tile.index).toBe(206);
    expect(tile.properties.animated).toBe(true);
    expect(tile.properties.tileRole).toBe("trap");
    expect(tile.properties[TILED_ANIMATION_BASE_INDEX_PROPERTY]).toBe(205);
    expect(tile.properties[TILED_ANIMATION_CURRENT_INDEX_PROPERTY]).toBe(206);
  });

  it("does not animate intermediate frames placed directly on regular layers", () => {
    const tile: { index: number; properties: Record<string, unknown> } = {
      index: 1672,
      properties: {},
    };
    const layer = {
      forEachTile(callback: (tile: unknown) => void) {
        callback(tile);
        return this;
      },
    };
    const system = new TiledTileAnimationSystem(
      { time: { now: 150 } } as Phaser.Scene,
      {
        tilesets: [
          {
            name: "Effects",
            firstgid: 1000,
            tileData: {
              5: {
                animation: [
                  { tileid: 672, duration: 100 },
                  { tileid: 676, duration: 100 },
                ],
              },
            },
          },
        ],
      } as Phaser.Tilemaps.Tilemap,
      [layer as unknown as Phaser.Tilemaps.TilemapLayer],
    );

    system.update(150);

    expect(tile.index).toBe(1672);
    expect(tile.properties[TILED_ANIMATION_BASE_INDEX_PROPERTY]).toBeUndefined();
    expect(tile.properties[TILED_ANIMATION_CURRENT_INDEX_PROPERTY]).toBeUndefined();
  });
});
