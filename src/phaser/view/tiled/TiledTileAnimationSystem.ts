import Phaser from "phaser";

export const TILED_ANIMATION_BASE_INDEX_PROPERTY = "__tiledBaseIndex";
export const TILED_ANIMATION_CURRENT_INDEX_PROPERTY = "__tiledAnimationIndex";

export type TiledAnimationFrameDefinition = {
  tileid: number;
  duration: number;
};

export type TiledTileDataDefinition = {
  animation?: TiledAnimationFrameDefinition[];
};

export type TiledTilesetAnimationSource = {
  name: string;
  firstgid: number;
  tileData?: Record<string, TiledTileDataDefinition>;
};

export type TiledTileAnimationFrame = {
  index: number;
  duration: number;
  endAtMs: number;
};

export type TiledTileAnimationDefinition = {
  baseIndex: number;
  tilesetName: string;
  totalDurationMs: number;
  frames: TiledTileAnimationFrame[];
};

type TileWithAnimationData = Phaser.Tilemaps.Tile & {
  data?: Record<string, unknown>;
};

export class TiledTileAnimationSystem {
  private readonly animationsByBaseIndex: Map<number, TiledTileAnimationDefinition>;
  private readonly animatedBaseIndexes: Set<number>;
  private readonly layers: Phaser.Tilemaps.TilemapLayer[];
  private warnedNoLayers = false;

  constructor(
    private readonly scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    layers: Phaser.Tilemaps.TilemapLayer[],
  ) {
    this.layers = layers.filter((layer): layer is Phaser.Tilemaps.TilemapLayer => Boolean(layer));
    this.animationsByBaseIndex = buildTiledTileAnimationIndex(map.tilesets as unknown as TiledTilesetAnimationSource[]);
    this.animatedBaseIndexes = new Set(this.animationsByBaseIndex.keys());

    if (this.animationsByBaseIndex.size === 0) {
      console.info("[TiledTileAnimationSystem] No tile animations found in Tiled tilesets");
      return;
    }

    if (this.layers.length === 0) {
      this.warnNoLayers();
      return;
    }

    this.markAnimatedTiles();
    console.info(`[TiledTileAnimationSystem] Loaded ${this.animationsByBaseIndex.size} animated tile definitions`);
  }

  update(nowMs = this.scene.time.now): void {
    if (this.animationsByBaseIndex.size === 0) {
      return;
    }

    if (this.layers.length === 0) {
      this.warnNoLayers();
      return;
    }

    for (const layer of this.layers) {
      layer.forEachTile((tile) => this.updateTile(tile, nowMs));
    }
  }

  private markAnimatedTiles(): void {
    for (const layer of this.layers) {
      layer.forEachTile((tile) => {
        const baseIndex = this.animationBaseIndexForTileIndex(tile.index);

        if (baseIndex === undefined) {
          return;
        }

        preserveTileBaseIndex(tile, baseIndex);
      });
    }
  }

  private updateTile(tile: Phaser.Tilemaps.Tile, nowMs: number): void {
    if (tile.index < 0) {
      return;
    }

    const baseIndex = getTileBaseIndex(tile) ?? this.animationBaseIndexForTileIndex(tile.index);

    if (baseIndex === undefined) {
      return;
    }

    const animation = this.animationsByBaseIndex.get(baseIndex);

    if (!animation) {
      return;
    }

    const nextIndex = getTiledTileAnimationFrameIndex(animation, nowMs);

    if (tile.index !== nextIndex) {
      tile.index = nextIndex;
      preserveTileBaseIndex(tile, baseIndex);
      tile.properties[TILED_ANIMATION_CURRENT_INDEX_PROPERTY] = nextIndex;
    }
  }

  private animationBaseIndexForTileIndex(tileIndex: number): number | undefined {
    if (tileIndex < 0) {
      return undefined;
    }

    if (this.animatedBaseIndexes.has(tileIndex)) {
      return tileIndex;
    }

    return undefined;
  }

  private warnNoLayers(): void {
    if (this.warnedNoLayers) {
      return;
    }

    this.warnedNoLayers = true;
    console.warn("[TiledTileAnimationSystem] No tilemap layers supplied for animated tiles");
  }
}

export function buildTiledTileAnimationIndex(
  tilesets: TiledTilesetAnimationSource[],
): Map<number, TiledTileAnimationDefinition> {
  const animations = new Map<number, TiledTileAnimationDefinition>();

  for (const tileset of tilesets) {
    const tileData = tileset.tileData ?? {};

    for (const [localIdText, data] of Object.entries(tileData)) {
      const localId = Number(localIdText);
      const frames = data.animation ?? [];

      if (!Number.isInteger(localId) || frames.length === 0) {
        continue;
      }

      const animationFrames = buildAnimationFrames(tileset.firstgid, frames);
      const totalDurationMs = animationFrames.at(-1)?.endAtMs ?? 0;

      if (totalDurationMs <= 0) {
        continue;
      }

      const baseIndex = tileset.firstgid + localId;
      animations.set(baseIndex, {
        baseIndex,
        tilesetName: tileset.name,
        totalDurationMs,
        frames: animationFrames,
      });
    }
  }

  return animations;
}

export function getTiledTileAnimationFrameIndex(
  animation: TiledTileAnimationDefinition,
  nowMs: number,
): number {
  const elapsed = positiveModulo(nowMs, animation.totalDurationMs);

  return animation.frames.find((frame) => elapsed < frame.endAtMs)?.index ?? animation.frames[animation.frames.length - 1].index;
}

function buildAnimationFrames(firstgid: number, frames: TiledAnimationFrameDefinition[]): TiledTileAnimationFrame[] {
  let elapsed = 0;

  return frames
    .filter((frame) => Number.isFinite(frame.tileid) && Number.isFinite(frame.duration) && frame.duration > 0)
    .map((frame) => {
      elapsed += frame.duration;

      return {
        index: firstgid + frame.tileid,
        duration: frame.duration,
        endAtMs: elapsed,
      };
    });
}

function getTileBaseIndex(tile: Phaser.Tilemaps.Tile): number | undefined {
  const storedBaseIndex = tile.properties?.[TILED_ANIMATION_BASE_INDEX_PROPERTY];

  return typeof storedBaseIndex === "number" ? storedBaseIndex : undefined;
}

function preserveTileBaseIndex(tile: Phaser.Tilemaps.Tile, baseIndex: number): void {
  const animatedTile = tile as TileWithAnimationData;
  tile.properties ??= {};
  tile.properties[TILED_ANIMATION_BASE_INDEX_PROPERTY] = baseIndex;
  animatedTile.data ??= {};
  animatedTile.data.tiledBaseIndex = baseIndex;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
