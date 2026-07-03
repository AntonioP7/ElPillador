import Phaser from "phaser";
import { TILED_ROOM_ASSET_KEYS, tiledTilesetImageKeys, tiledWorldRoomAssetKey } from "../../../game/assets/manifest";
import { tiledWorldRoomsById } from "../../../game/content/tiledRooms/worldManifest.generated";
import {
  parseTiledRoom,
  Rect,
  TILED_PLAYER_RADIUS,
  TiledMapJson,
  TiledRoomDefinition,
  tiledDoorContainingPose,
  tiledStairsContainingPose,
} from "../../../game/content/tiledRooms/generic";
import { TopDownInputState } from "../../../game/simulation/topDown";
import type { CombatCollisionBounds } from "../../../game/simulation/combat";
import { shouldRoomEncounterBlockDoor } from "../../../game/simulation/roomEncounters";
import type { SceneBridge, SceneBridgeSnapshot } from "../../adapters/sceneBridge";
import {
  ensurePlayerAnimations,
  firstPlayerFrame,
  normalizeDirection,
  PlayerAnimationAction,
  PLAYER_DEATH_DURATION_MS,
  PLAYER_FRAME_HEIGHT,
  PLAYER_FRAME_WIDTH,
  PLAYER_HURT_DURATION_MS,
  PLAYER_SLASH_DURATION_MS,
  playerAnimationKey as buildPlayerAnimationKey,
  playerTextureKey,
  playerVariantForWeapon,
} from "../sprites/playerAnimations";
import { TiledTileAnimationSystem } from "./TiledTileAnimationSystem";

type TiledWorldTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type { TiledWorldTransform };

export type TiledWorldRoomView = {
  roomId: string;
  room: TiledRoomDefinition;
  transform: TiledWorldTransform;
  playerSprite: Phaser.GameObjects.Sprite;
  lastPlayerAnimation?: string;
  tileAnimationSystem: TiledTileAnimationSystem;
  playerTransientAnimation?: "slash" | "runSlash" | "hurt" | "death";
};

export type TiledDoorVisualState = Map<string, boolean>;

export type TiledWorldUpdateResult = {
  worldChanged: boolean;
  uiDirty: boolean;
};

const TILED_WORLD_PLAYER_ANIMATION_PREFIX = "tiled-world.player";
const DOOR_ANIMATION_LAYER_NAME = "DoorAnimation";
const BLOCK_WALL_LAYER_NAME = "BlockWall";
const SECRET_DOOR_LAYER_NAME = "SecretDoor";
const STAIRS_LAYER_NAME = "Stairs";
const CHEST_LAYER_NAME = "Chest";
const CHEST_CLOSED_FRAME = 0;
const CHEST_OPEN_FRAME = 4;
const FLIPPED_TILE_FLAGS = 0xf0000000;
const FLIPPED_HORIZONTAL_FLAG = 0x80000000;
const FLIPPED_VERTICAL_FLAG = 0x40000000;
const FLIPPED_ANTI_DIAGONAL_FLAG = 0x20000000;
const PLAYER_DEPTH = 1000;

type TiledDoorAnimationFrame = {
  index: number;
  duration: number;
};

type TiledTilesetTileData = Record<string, { animation?: Array<{ tileid: number; duration: number }> }>;
type DoorTileSnapshot = Map<string, DoorTileRecord[]>;
type DoorTileRecord = {
  index: number;
  flipX: boolean;
  rotation: number;
  x: number;
  y: number;
};

const pendingDoorTileAnimationEvents = new WeakMap<Phaser.Scene, Phaser.Time.TimerEvent[]>();

export function isTiledWorldSnapshot(snapshot: SceneBridgeSnapshot): boolean {
  return Boolean(tiledWorldRoomsById[snapshot.state.currentRoomId]);
}

export function renderTiledWorldRoom(
  scene: Phaser.Scene,
  snapshot: SceneBridgeSnapshot,
  doorVisualState?: TiledDoorVisualState,
): TiledWorldRoomView {
  ensurePlayerAnimations(scene, TILED_WORLD_PLAYER_ANIMATION_PREFIX);
  cancelPendingDoorTileAnimationEvents(scene);

  const roomId = snapshot.state.currentRoomId;
  const rawMap = getTiledWorldMapJson(scene, roomId);
  const room = parseTiledRoom(roomId, rawMap);
  const transform = getTiledWorldTransform(scene, room);
  const graphics = scene.add.graphics();

  if (room.missingLayers.length > 0) {
    console.warn(`[TiledRoom ${roomId}] Missing layers: ${room.missingLayers.join(", ")}`);
  }

  graphics.fillStyle(0x101217, 1);
  graphics.fillRect(0, 0, scene.scale.width, scene.scale.height);

  const tilemap = scene.make.tilemap({ key: tiledWorldRoomAssetKey(roomId) });
  const tileLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  const animatedTileLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  const tilesets = tilemap.tilesets
    .map((tileset) => {
      const imageKey = tiledTilesetImageKeys[tileset.name];

      if (!imageKey) {
        console.warn(`[TiledRoom ${roomId}] Missing manifest key for tileset ${tileset.name}`);
        return null;
      }

      const phaserTileset = tilemap.addTilesetImage(tileset.name, imageKey);

      if (!phaserTileset) {
        console.warn(`[TiledRoom ${roomId}] Could not add tileset image ${tileset.name}`);
      }

      scene.textures.get(imageKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

      return phaserTileset;
    })
    .filter((tileset): tileset is Phaser.Tilemaps.Tileset => Boolean(tileset));

  const tileLayerByName = new Map<string, Phaser.Tilemaps.TilemapLayer>();
  const blockWallTilesByDoorKey = buildDoorTileSnapshot(rawMap, room, BLOCK_WALL_LAYER_NAME);
  const secretDoorTilesByDoorKey = buildDoorTileSnapshot(rawMap, room, SECRET_DOOR_LAYER_NAME);
  const isRoomComplete = isTiledRoomComplete(snapshot);
  const doorAnimationTilesByDoorKey = hasTileLayer(rawMap, DOOR_ANIMATION_LAYER_NAME)
    ? buildDoorTileSnapshot(rawMap, room, DOOR_ANIMATION_LAYER_NAME)
    : new Map();
  const chestTilesByChestKey = hasTileLayer(rawMap, CHEST_LAYER_NAME)
    ? buildChestTileSnapshot(rawMap, room, CHEST_LAYER_NAME)
    : new Map();

  const tiledTileLayerNames = rawMap.layers.filter((entry) => entry.type === "tilelayer").map((entry) => entry.name);

  for (const [layerDepth, layerName] of tiledTileLayerNames.entries()) {
    const layer = tilemap.createLayer(layerName, tilesets, transform.offsetX, transform.offsetY);

    if (!layer) {
      continue;
    }

    if (layerName === "Doors") {
      clearOpenDoorTiles(layer, room, snapshot, doorAnimationTilesByDoorKey);
    }

    if (
      layerName === BLOCK_WALL_LAYER_NAME ||
      layerName === SECRET_DOOR_LAYER_NAME ||
      isDoorAnimationLayer(layerName) ||
      layerName === CHEST_LAYER_NAME
    ) {
      clearLayerTiles(layer);
    }

    if (layerName === STAIRS_LAYER_NAME && !isRoomComplete) {
      clearLayerTiles(layer);
    }

    layer.setScale(transform.scale);
    layer.setDepth(layerDepth);
    tileLayers.push(layer);
    tileLayerByName.set(layerName, layer);

    if (usesGlobalTileAnimations(layerName)) {
      animatedTileLayers.push(layer);
    }
  }

  applyOptionalDoorTileLayers(
    scene,
    tilemap,
    room,
    snapshot,
    doorVisualState,
    tileLayerByName,
    blockWallTilesByDoorKey,
    secretDoorTilesByDoorKey,
    doorAnimationTilesByDoorKey,
  );
  updateTiledDoorVisualState(room, snapshot, doorVisualState);
  const usesTiledChestLayer = applyTiledChestLayer(tilemap, room, snapshot, tileLayerByName, chestTilesByChestKey);

  if (!usesTiledChestLayer) {
    drawTiledChests(scene, room, transform, snapshot);
  }

  const playerPoint = toScreenPoint(snapshot.state.playerPose.x, snapshot.state.playerPose.y, transform);
  const playerVariant = playerVariantForWeapon(snapshot.state.equipment.weapon);
  const playerSprite = scene.add
    .sprite(playerPoint.x, playerPoint.y, playerTextureKey(playerVariant, "idle"), firstPlayerFrame("idle", snapshot.state.playerPose.facing))
    .setOrigin(0.5)
    .setDisplaySize(PLAYER_FRAME_WIDTH * transform.scale, PLAYER_FRAME_HEIGHT * transform.scale)
    .setDepth(PLAYER_DEPTH);
  const view: TiledWorldRoomView = {
    roomId,
    room,
    transform,
    playerSprite,
    tileAnimationSystem: new TiledTileAnimationSystem(scene, tilemap, animatedTileLayers),
  };

  updateTiledWorldPlayerSprite(view, snapshot, {});

  return view;
}

function usesGlobalTileAnimations(layerName: string): boolean {
  return layerName !== "Doors" && !isDoorAnimationLayer(layerName) && layerName !== CHEST_LAYER_NAME;
}

function isTiledRoomComplete(snapshot: SceneBridgeSnapshot): boolean {
  return snapshot.combatEnemies.length === 0;
}

function isDoorAnimationLayer(layerName: string): boolean {
  return layerName === DOOR_ANIMATION_LAYER_NAME;
}

function updateTiledDoorVisualState(
  room: TiledRoomDefinition,
  snapshot: SceneBridgeSnapshot,
  doorVisualState?: TiledDoorVisualState,
): void {
  for (const door of room.doors) {
    const isOpen = isDoorOpen(door, snapshot);
    const stateKey = `${room.id}:${door.id}`;
    doorVisualState?.set(stateKey, isOpen);
  }
}

function applyOptionalDoorTileLayers(
  scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
  room: TiledRoomDefinition,
  snapshot: SceneBridgeSnapshot,
  doorVisualState: TiledDoorVisualState | undefined,
  tileLayerByName: Map<string, Phaser.Tilemaps.TilemapLayer>,
  blockWallTilesByDoorKey: DoorTileSnapshot,
  secretDoorTilesByDoorKey: DoorTileSnapshot,
  doorAnimationTilesByDoorKey: DoorTileSnapshot,
): void {
  const blockWallLayer = tileLayerByName.get(BLOCK_WALL_LAYER_NAME);
  const secretDoorLayer = tileLayerByName.get(SECRET_DOOR_LAYER_NAME);
  const doorAnimationLayer = tileLayerByName.get(DOOR_ANIMATION_LAYER_NAME);

  for (const door of room.doors) {
    const isOpen = isDoorOpen(door, snapshot);
    const stateKey = `${room.id}:${door.id}`;
    const previousIsOpen = doorVisualState?.get(stateKey);

    if (blockWallLayer && door.isBlock && !isOpen) {
      restoreDoorTiles(blockWallLayer, blockWallTilesByDoorKey.get(stateKey) ?? []);
    }

    if (secretDoorLayer && door.isSecret && isOpen) {
      restoreDoorTiles(secretDoorLayer, secretDoorTilesByDoorKey.get(stateKey) ?? []);
    }

    if (!doorAnimationLayer) {
      continue;
    }

    const animationTileRecords = doorAnimationTilesByDoorKey.get(stateKey) ?? [];

    if (animationTileRecords.length === 0) {
      continue;
    }

    const shouldAnimate = previousIsOpen !== undefined && previousIsOpen !== isOpen;

    if (!isOpen) {
      restoreDoorTiles(doorAnimationLayer, animationTileRecords);

      if (shouldAnimate) {
        setDoorAnimationTilesToFinalFrame(tilemap, doorAnimationLayer, door, room);
        playDoorTileAnimation(scene, tilemap, liveDoorAnimationTiles(doorAnimationLayer, door, room), true);
      } else {
        setDoorAnimationTilesToFirstFrame(tilemap, doorAnimationLayer, door, room);
      }
      continue;
    }

    if (shouldAnimate) {
      restoreDoorTiles(doorAnimationLayer, animationTileRecords);
      playDoorTileAnimation(scene, tilemap, liveDoorAnimationTiles(doorAnimationLayer, door, room), false);
      continue;
    }

    restoreDoorTiles(doorAnimationLayer, animationTileRecords);

    setDoorAnimationTilesToFinalFrame(tilemap, doorAnimationLayer, door, room);
  }
}

function isDoorOpen(
  door: TiledRoomDefinition["doors"][number],
  snapshot: SceneBridgeSnapshot,
): boolean {
  if (snapshot.tiledDoorTestOpenOverride !== null) {
    return snapshot.tiledDoorTestOpenOverride;
  }

  const access = doorAccessForSnapshot(door, snapshot);
  if (door.isBlock) {
    return !shouldRoomEncounterBlockDoor(snapshot.state, door) && isBlockDoorAccessOpen(access);
  }

  if (door.isSecret) {
    return !shouldRoomEncounterBlockDoor(snapshot.state, door) && access?.access.open === true;
  }

  return !shouldRoomEncounterBlockDoor(snapshot.state, door) && (!door.isLocked || access?.access.open === true);
}

function isBlockDoorAccessOpen(access: SceneBridgeSnapshot["exits"][number] | undefined): boolean {
  return Boolean(access?.connection.gateId && access.access.open);
}

function playDoorTileAnimation(
  scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
  tiles: Phaser.Tilemaps.Tile[],
  reverse: boolean,
): void {
  for (const tile of tiles) {
    const frames = reverse
      ? [...doorAnimationFrames(tilemap, tile.index)].reverse()
      : doorAnimationFrames(tilemap, tile.index);

    if (frames.length === 0) {
      continue;
    }

    let elapsedMs = 0;

    frames.forEach((frame) => {
      scheduleDoorTileAnimationEvent(scene, elapsedMs, () => {
        tile.index = frame.index;
      });
      elapsedMs += frame.duration;
    });

    scheduleDoorTileAnimationEvent(scene, elapsedMs, () => {
      tile.index = frames[frames.length - 1].index;
    });
  }
}

function scheduleDoorTileAnimationEvent(scene: Phaser.Scene, delayMs: number, callback: () => void): void {
  const event = scene.time.delayedCall(delayMs, callback);
  const pending = pendingDoorTileAnimationEvents.get(scene) ?? [];
  pending.push(event);
  pendingDoorTileAnimationEvents.set(scene, pending);
}

function cancelPendingDoorTileAnimationEvents(scene: Phaser.Scene): void {
  const pending = pendingDoorTileAnimationEvents.get(scene) ?? [];

  for (const event of pending) {
    event.remove(false);
  }

  pendingDoorTileAnimationEvents.set(scene, []);
}

function finalDoorAnimationTileIndex(tilemap: Phaser.Tilemaps.Tilemap, tileIndex: number): number {
  return doorAnimationFrames(tilemap, tileIndex).at(-1)?.index ?? tileIndex;
}

function firstDoorAnimationTileIndex(tilemap: Phaser.Tilemaps.Tilemap, tileIndex: number): number {
  return doorAnimationFrames(tilemap, tileIndex)[0]?.index ?? tileIndex;
}

function setDoorAnimationTilesToFirstFrame(
  tilemap: Phaser.Tilemaps.Tilemap,
  layer: Phaser.Tilemaps.TilemapLayer,
  rect: Rect,
  room: TiledRoomDefinition,
): void {
  for (const tile of liveDoorAnimationTiles(layer, rect, room)) {
    tile.index = firstDoorAnimationTileIndex(tilemap, tile.index);
  }
}

function setDoorAnimationTilesToFinalFrame(
  tilemap: Phaser.Tilemaps.Tilemap,
  layer: Phaser.Tilemaps.TilemapLayer,
  rect: Rect,
  room: TiledRoomDefinition,
): void {
  for (const tile of liveDoorAnimationTiles(layer, rect, room)) {
    tile.index = finalDoorAnimationTileIndex(tilemap, tile.index);
  }
}

function liveDoorAnimationTiles(
  layer: Phaser.Tilemaps.TilemapLayer,
  rect: Rect,
  room: TiledRoomDefinition,
): Phaser.Tilemaps.Tile[] {
  return rectTiles(rect, room)
    .map((tile) => layer.getTileAt(tile.x, tile.y))
    .filter((tile): tile is Phaser.Tilemaps.Tile => Boolean(tile));
}

function doorAnimationFrames(tilemap: Phaser.Tilemaps.Tilemap, tileIndex: number): TiledDoorAnimationFrame[] {
  const normalizedTileIndex = tileIndex & ~FLIPPED_TILE_FLAGS;
  const tileset = tilemap.tilesets.find((entry) => normalizedTileIndex >= entry.firstgid && normalizedTileIndex < entry.firstgid + entry.total);

  if (!tileset) {
    return [{ index: tileIndex, duration: 0 }];
  }

  const localTileId = normalizedTileIndex - tileset.firstgid;
  const tileData = tileset.tileData as TiledTilesetTileData | undefined;
  const animation = animationForTiledDoorTile(tileData, localTileId);
  const frames = animation
    ?.filter((frame) => Number.isFinite(frame.tileid) && Number.isFinite(frame.duration) && frame.duration >= 0)
    .map((frame) => ({
      index: tileset.firstgid + frame.tileid,
      duration: frame.duration,
    })) ?? [];

  return frames.length > 0 ? frames : [{ index: tileIndex, duration: 0 }];
}

function animationForTiledDoorTile(
  tileData: TiledTilesetTileData | undefined,
  localTileId: number,
): Array<{ tileid: number; duration: number }> | undefined {
  const direct = tileData?.[String(localTileId)]?.animation;

  if (direct?.length) {
    return direct;
  }

  return Object.values(tileData ?? {}).find((data) => data.animation?.some((frame) => frame.tileid === localTileId))?.animation;
}

function removeDoorTiles(
  layer: Phaser.Tilemaps.TilemapLayer,
  door: TiledRoomDefinition["doors"][number],
  room: TiledRoomDefinition,
): void {
  for (const tile of rectTiles(door, room)) {
    layer.removeTileAt(tile.x, tile.y);
  }
}

function restoreDoorTiles(layer: Phaser.Tilemaps.TilemapLayer, tiles: DoorTileRecord[]): void {
  for (const tile of tiles) {
    const restoredTile = layer.putTileAt(tile.index, tile.x, tile.y);

    if (restoredTile) {
      restoredTile.flipX = tile.flipX;
      restoredTile.flipY = false;
      restoredTile.rotation = tile.rotation;
    }
  }
}

function clearLayerTiles(layer: Phaser.Tilemaps.TilemapLayer): void {
  layer.forEachTile((tile) => {
    layer.removeTileAt(tile.x, tile.y);
  });
}

function buildDoorTileSnapshot(
  map: TiledMapJson,
  room: TiledRoomDefinition,
  layerName: string,
): DoorTileSnapshot {
  const layer = map.layers.find((entry) => entry.name === layerName && entry.type === "tilelayer");
  const data = layer?.data ?? [];
  const width = layer?.width ?? map.width;
  const height = layer?.height ?? map.height;
  const snapshot: DoorTileSnapshot = new Map();

  if (data.length === 0 || width <= 0 || height <= 0) {
    return snapshot;
  }

  for (const door of room.doors) {
    const snapshotTiles = doorLayerSnapshotTiles(door, room, layerName, data, width, height);
    const tiles = snapshotTiles.flatMap((tile): DoorTileRecord[] => {
      const gid = data[tile.y * width + tile.x] ?? 0;

      return gid > 0
        ? [{ ...parseTiledTileGid(map, gid), x: tile.x, y: tile.y }]
        : [];
    });

    if (tiles.length > 0) {
      snapshot.set(`${room.id}:${door.id}`, tiles);
    }
  }

  return snapshot;
}

function buildChestTileSnapshot(
  map: TiledMapJson,
  room: TiledRoomDefinition,
  layerName: string,
): DoorTileSnapshot {
  const layer = map.layers.find((entry) => entry.name === layerName && entry.type === "tilelayer");
  const data = layer?.data ?? [];
  const width = layer?.width ?? map.width;
  const height = layer?.height ?? map.height;
  const snapshot: DoorTileSnapshot = new Map();

  if (data.length === 0 || width <= 0 || height <= 0) {
    return snapshot;
  }

  for (const chest of room.chests) {
    const tiles = rectTiles(chest, room).flatMap((tile): DoorTileRecord[] => {
      const gid = data[tile.y * width + tile.x] ?? 0;

      return gid > 0
        ? [{ ...parseTiledTileGid(map, gid), x: tile.x, y: tile.y }]
        : [];
    });

    if (tiles.length > 0) {
      snapshot.set(`${room.id}:${chest.id}`, tiles);
    }
  }

  return snapshot;
}

function hasTileLayer(
  map: TiledMapJson,
  layerName: string,
): boolean {
  return map.layers.some((entry) => entry.name === layerName && entry.type === "tilelayer");
}

function doorLayerSnapshotTiles(
  door: TiledRoomDefinition["doors"][number],
  room: TiledRoomDefinition,
  layerName: string,
  data: number[],
  width: number,
  height: number,
): Array<{ x: number; y: number }> {
  if ((layerName === BLOCK_WALL_LAYER_NAME && door.isBlock) || (layerName === SECRET_DOOR_LAYER_NAME && door.isSecret)) {
    const connectedTiles = connectedNonEmptyTiles(data, width, height, rectTiles(door, room));

    if (connectedTiles.length > 0) {
      return connectedTiles;
    }
  }

  return rectTiles(door, room);
}

function connectedNonEmptyTiles(
  data: number[],
  width: number,
  height: number,
  seeds: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  const queued = new Set<string>();
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [];
  const tiles: Array<{ x: number; y: number }> = [];

  for (const seed of seeds) {
    if (!isNonEmptyTile(data, width, height, seed.x, seed.y)) {
      continue;
    }

    const key = `${seed.x}:${seed.y}`;
    if (queued.has(key)) {
      continue;
    }

    queued.add(key);
    queue.push(seed);
  }

  while (queue.length > 0) {
    const tile = queue.shift()!;
    const key = `${tile.x}:${tile.y}`;

    if (visited.has(key)) {
      continue;
    }

    visited.add(key);
    tiles.push(tile);

    for (const neighbor of [
      { x: tile.x + 1, y: tile.y },
      { x: tile.x - 1, y: tile.y },
      { x: tile.x, y: tile.y + 1 },
      { x: tile.x, y: tile.y - 1 },
    ]) {
      const neighborKey = `${neighbor.x}:${neighbor.y}`;

      if (visited.has(neighborKey) || queued.has(neighborKey) || !isNonEmptyTile(data, width, height, neighbor.x, neighbor.y)) {
        continue;
      }

      queued.add(neighborKey);
      queue.push(neighbor);
    }
  }

  return tiles;
}

function isNonEmptyTile(
  data: number[],
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  return x >= 0 && y >= 0 && x < width && y < height && (data[y * width + x] ?? 0) > 0;
}

function parseTiledTileGid(
  map: TiledMapJson,
  gid: number,
): Pick<DoorTileRecord, "index" | "flipX" | "rotation"> {
  const flippedHorizontal = Boolean(gid & FLIPPED_HORIZONTAL_FLAG);
  const flippedVertical = Boolean(gid & FLIPPED_VERTICAL_FLAG);
  const flippedAntiDiagonal = Boolean(gid & FLIPPED_ANTI_DIAGONAL_FLAG);
  const index = canonicalTiledTileIndex(map, gid & ~FLIPPED_TILE_FLAGS);
  let rotation = 0;
  let flipX = false;

  if (flippedHorizontal && flippedVertical && flippedAntiDiagonal) {
    rotation = Math.PI / 2;
    flipX = true;
  } else if (flippedHorizontal && flippedVertical && !flippedAntiDiagonal) {
    rotation = Math.PI;
  } else if (flippedHorizontal && !flippedVertical && flippedAntiDiagonal) {
    rotation = Math.PI / 2;
  } else if (flippedHorizontal && !flippedVertical && !flippedAntiDiagonal) {
    flipX = true;
  } else if (!flippedHorizontal && flippedVertical && flippedAntiDiagonal) {
    rotation = (3 * Math.PI) / 2;
  } else if (!flippedHorizontal && flippedVertical && !flippedAntiDiagonal) {
    rotation = Math.PI;
    flipX = true;
  } else if (!flippedHorizontal && !flippedVertical && flippedAntiDiagonal) {
    rotation = (3 * Math.PI) / 2;
    flipX = true;
  }

  return { index, flipX, rotation };
}

function canonicalTiledTileIndex(map: TiledMapJson, index: number): number {
  const tilesets = [...(map.tilesets ?? [])]
    .filter((tileset): tileset is Required<Pick<NonNullable<TiledMapJson["tilesets"]>[number], "firstgid">> & NonNullable<TiledMapJson["tilesets"]>[number] =>
      Number.isFinite(tileset.firstgid),
    )
    .sort((a, b) => a.firstgid - b.firstgid);
  const sourceTileset = [...tilesets].reverse().find((tileset) => tileset.firstgid <= index);

  if (!sourceTileset) {
    return index;
  }

  const canonicalTileset = tilesets.find((tileset) =>
    tileset !== sourceTileset &&
    tileset.firstgid < sourceTileset.firstgid &&
    sameTiledTilesetSource(tileset, sourceTileset),
  );

  if (!canonicalTileset) {
    return index;
  }

  return canonicalTileset.firstgid + (index - sourceTileset.firstgid);
}

function sameTiledTilesetSource(
  a: NonNullable<TiledMapJson["tilesets"]>[number],
  b: NonNullable<TiledMapJson["tilesets"]>[number],
): boolean {
  return Boolean(
    (a.source && a.source === b.source) ||
    (a.image && a.image === b.image) ||
    (a.name && a.name === b.name),
  );
}

function rectTiles(
  rect: Rect,
  room: TiledRoomDefinition,
): Array<{ x: number; y: number }> {
  const startTileX = Math.floor(rect.x / room.tileWidth);
  const startTileY = Math.floor(rect.y / room.tileHeight);
  const endTileX = Math.ceil((rect.x + rect.width) / room.tileWidth);
  const endTileY = Math.ceil((rect.y + rect.height) / room.tileHeight);
  const tiles: Array<{ x: number; y: number }> = [];

  for (let tileY = startTileY; tileY < endTileY; tileY += 1) {
    for (let tileX = startTileX; tileX < endTileX; tileX += 1) {
      tiles.push({ x: tileX, y: tileY });
    }
  }

  return tiles;
}

function applyTiledChestLayer(
  tilemap: Phaser.Tilemaps.Tilemap,
  room: TiledRoomDefinition,
  snapshot: SceneBridgeSnapshot,
  tileLayerByName: Map<string, Phaser.Tilemaps.TilemapLayer>,
  chestTilesByChestKey: DoorTileSnapshot,
): boolean {
  const chestLayer = tileLayerByName.get(CHEST_LAYER_NAME);

  if (!chestLayer) {
    return false;
  }

  for (const chest of room.chests) {
    const stateKey = `${room.id}:${chest.id}`;
    const tiles = chestTilesByChestKey.get(stateKey) ?? [];

    restoreDoorTiles(chestLayer, tiles);

    if (isTiledChestOpen(chest, snapshot)) {
      setDoorAnimationTilesToFinalFrame(tilemap, chestLayer, chest, room);
    } else {
      setDoorAnimationTilesToFirstFrame(tilemap, chestLayer, chest, room);
    }
  }

  return true;
}

function clearOpenDoorTiles(
  layer: Phaser.Tilemaps.TilemapLayer,
  room: TiledRoomDefinition,
  snapshot: SceneBridgeSnapshot,
  doorAnimationTilesByDoorKey: DoorTileSnapshot,
): void {
  for (const door of room.doors) {
    if (!isDoorOpen(door, snapshot)) {
      continue;
    }

    if (!(doorAnimationTilesByDoorKey.get(`${room.id}:${door.id}`)?.length)) {
      continue;
    }

    removeDoorTiles(layer, door, room);
  }
}

function drawTiledChests(
  scene: Phaser.Scene,
  room: TiledRoomDefinition,
  transform: TiledWorldTransform,
  snapshot: SceneBridgeSnapshot,
): void {
  ensureChestAnimations(scene);

  for (const chest of room.chests) {
    const screen = toScreenRect(chest, transform);
    const isOpen = isTiledChestOpen(chest, snapshot);
    const sprite = scene.add
      .sprite(
        screen.x + screen.width / 2,
        screen.y + screen.height / 2,
        TILED_ROOM_ASSET_KEYS.chest,
        isOpen ? CHEST_OPEN_FRAME : CHEST_CLOSED_FRAME,
      )
      .setOrigin(0.5)
      .setDepth(PLAYER_DEPTH - 1);

    sprite.setDisplaySize(Math.max(24, screen.width), Math.max(24, screen.height));
  }
}

function isTiledChestOpen(
  chest: TiledRoomDefinition["chests"][number],
  snapshot: SceneBridgeSnapshot,
): boolean {
  return chest.isOpen || Boolean(snapshot.state.flags[chest.openedFlag ?? `chest.${chest.id}.opened`]);
}

function ensureChestAnimations(scene: Phaser.Scene): void {
  if (!scene.anims.exists("environment.chest.open")) {
    scene.anims.create({
      key: "environment.chest.open",
      frames: scene.anims.generateFrameNumbers(TILED_ROOM_ASSET_KEYS.chest, { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });
  }
}

function doorAccessForSnapshot(
  door: TiledRoomDefinition["doors"][number],
  snapshot: SceneBridgeSnapshot,
): SceneBridgeSnapshot["exits"][number] | undefined {
  if (door.targetRoom) {
    return snapshot.exits.find((exit) => exit.target.id === door.targetRoom);
  }

  return snapshot.exits.find((exit) => exit.direction === door.direction);
}

function registerTiledDoorDestinationRoom(
  scene: Phaser.Scene,
  bridge: SceneBridge,
  snapshot: SceneBridgeSnapshot,
  door: TiledRoomDefinition["doors"][number],
): void {
  const targetRoomId = door.targetRoom ?? doorAccessForSnapshot(door, snapshot)?.target.id;

  if (!targetRoomId || !tiledWorldRoomsById[targetRoomId]) {
    return;
  }

  try {
    bridge.registerTiledRoomDefinition(parseTiledRoom(targetRoomId, getTiledWorldMapJson(scene, targetRoomId)));
  } catch (error) {
    console.warn(`[TiledRoom ${snapshot.state.currentRoomId}] Could not prepare destination room ${targetRoomId}`, error);
  }
}

export function updateTiledWorldRoomView(
  view: TiledWorldRoomView,
  bridge: SceneBridge,
  input: TopDownInputState,
  deltaMs: number,
): TiledWorldUpdateResult {
  const movement = bridge.stepTiledWorldRoom(input, deltaMs, view.room);
  const snapshot = bridge.getSnapshot();

  updateTiledWorldPlayerSprite(view, snapshot, input);

  const door = tiledDoorContainingPose(view.room, snapshot.state.playerPose);

  if (door) {
    registerTiledDoorDestinationRoom(view.playerSprite.scene, bridge, snapshot, door);

    const transition = bridge.tryTiledWorldDoorTransition(door.direction, door);

    if (transition.handled || transition.worldChanged) {
      return { worldChanged: Boolean(transition.worldChanged), uiDirty: true };
    }
  }

  if (isTiledRoomComplete(snapshot)) {
    const stairs = tiledStairsContainingPose(view.room, snapshot.state.playerPose);

    if (stairs) {
      const transition = bridge.tryTiledWorldStairsTransition(stairs);

      if (transition.handled || transition.worldChanged) {
        return { worldChanged: Boolean(transition.worldChanged), uiDirty: true };
      }
    }
  }

  return { worldChanged: false, uiDirty: Boolean(movement.handled) };
}

export function tickTiledWorldRoomAnimations(view: TiledWorldRoomView): void {
  view.tileAnimationSystem.update();
}

export function playTiledWorldPlayerSlash(
  view: TiledWorldRoomView,
  snapshot: SceneBridgeSnapshot,
  input: TopDownInputState,
): void {
  if (view.playerTransientAnimation) {
    return;
  }

  const moving = Boolean(input.up || input.down || input.left || input.right);
  const variant = playerVariantForWeapon(snapshot.state.equipment.weapon);
  const action: PlayerAnimationAction = moving ? "runSlash" : "slash";
  const animation = buildPlayerAnimationKey(TILED_WORLD_PLAYER_ANIMATION_PREFIX, variant, action, snapshot.state.playerPose.facing);

  view.playerTransientAnimation = action;
  view.playerSprite.play(animation, true);
  finishTiledWorldPlayerTransient(view, action, snapshot, input, PLAYER_SLASH_DURATION_MS);
}

export function playTiledWorldPlayerDamageAnimation(
  view: TiledWorldRoomView,
  snapshot: SceneBridgeSnapshot,
  input: TopDownInputState,
): void {
  if (view.playerTransientAnimation === "hurt" || view.playerTransientAnimation === "death") {
    return;
  }

  const variant = playerVariantForWeapon(snapshot.state.equipment.weapon);
  const action: PlayerAnimationAction = snapshot.state.playerHealth <= 0 ? "death" : "hurt";
  const animation = buildPlayerAnimationKey(TILED_WORLD_PLAYER_ANIMATION_PREFIX, variant, action, snapshot.state.playerPose.facing);

  view.playerTransientAnimation = action;
  view.playerSprite.play(animation, true);
  finishTiledWorldPlayerTransient(
    view,
    action,
    snapshot,
    input,
    action === "death" ? PLAYER_DEATH_DURATION_MS : PLAYER_HURT_DURATION_MS,
  );
}

function finishTiledWorldPlayerTransient(
  view: TiledWorldRoomView,
  action: TiledWorldRoomView["playerTransientAnimation"],
  snapshot: SceneBridgeSnapshot,
  input: TopDownInputState,
  durationMs: number,
): void {
  const finish = () => {
    if (!view.playerSprite.active || view.playerTransientAnimation !== action) {
      return;
    }

    view.playerTransientAnimation = undefined;
    view.lastPlayerAnimation = undefined;
    updateTiledWorldPlayerSprite(view, snapshot, input);
  };

  view.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
  view.playerSprite.scene.time.delayedCall(durationMs + 40, finish);
}

export function tiledWorldCombatCollisionBounds(view: TiledWorldRoomView): CombatCollisionBounds {
  return {
    width: view.room.width,
    height: view.room.height,
    playerRadius: TILED_PLAYER_RADIUS,
    colliders: view.room.colliders,
  };
}

function updateTiledWorldPlayerSprite(
  view: TiledWorldRoomView,
  snapshot: SceneBridgeSnapshot,
  input: TopDownInputState,
): void {
  const point = toScreenPoint(snapshot.state.playerPose.x, snapshot.state.playerPose.y, view.transform);
  const moving = Boolean(input.up || input.down || input.left || input.right);
  const variant = playerVariantForWeapon(snapshot.state.equipment.weapon);
  const action: PlayerAnimationAction = snapshot.state.playerHealth <= 0 ? "death" : moving ? "run" : "idle";
  const animation = buildPlayerAnimationKey(TILED_WORLD_PLAYER_ANIMATION_PREFIX, variant, action, normalizeDirection(snapshot.state.playerPose.facing));

  view.playerSprite.setPosition(point.x, point.y);

  if (view.playerTransientAnimation) {
    return;
  }

  if (view.lastPlayerAnimation !== animation) {
    view.playerSprite.play(animation, true);
    view.lastPlayerAnimation = animation;
  }
}

function getTiledWorldMapJson(scene: Phaser.Scene, roomId: string): TiledMapJson {
  const cached = scene.cache.tilemap.get(tiledWorldRoomAssetKey(roomId)) as unknown;
  const data = cached && typeof cached === "object" && "data" in cached
    ? (cached as { data?: TiledMapJson }).data
    : cached as TiledMapJson | undefined;

  if (!data) {
    throw new Error(`[TiledRoom ${roomId}] Tilemap cache entry missing`);
  }

  return data;
}

function getTiledWorldTransform(
  scene: Phaser.Scene,
  room: Pick<TiledRoomDefinition, "width" | "height" | "tileHeight">,
): TiledWorldTransform {
  const availableWidth = scene.scale.width;
  const availableHeight = scene.scale.height;
  const containScale = Math.min(availableWidth / room.width, availableHeight / room.height);
  const tileHeight = Math.max(1, room.tileHeight);
  const scale = Math.ceil(containScale * tileHeight) / tileHeight;
  const scaledWidth = room.width * scale;
  const scaledHeight = room.height * scale;

  return {
    scale,
    offsetX: Math.round((scene.scale.width - scaledWidth) / 2),
    offsetY: Math.round((scene.scale.height - scaledHeight) / 2),
  };
}

function toScreenPoint(x: number, y: number, transform: TiledWorldTransform): { x: number; y: number } {
  return {
    x: transform.offsetX + x * transform.scale,
    y: transform.offsetY + y * transform.scale,
  };
}

export function toScreenRect(rect: Rect, transform: TiledWorldTransform): Rect {
  return {
    x: transform.offsetX + rect.x * transform.scale,
    y: transform.offsetY + rect.y * transform.scale,
    width: rect.width * transform.scale,
    height: rect.height * transform.scale,
  };
}
