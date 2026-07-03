import { Direction } from "../../input/actions";
import type { EnemySpawnDefinition, EnemySpecies } from "../enemies/types";
import { GameState, PlayerPose } from "../../simulation/state";
import { TOP_DOWN_PLAYER_SPEED, TopDownInputState } from "../../simulation/topDown";
import {
  parseTiledSpikeTraps,
  Rect,
  SpikeTrapHazard,
  TiledObject,
  TiledObjectLayer,
  TiledProperty,
} from "./hazards";

export const TILED_PLAYER_RADIUS = 8;
export const TILED_REQUIRED_TILE_LAYERS = ["Floor", "Walls", "Objects"] as const;
export const TILED_REQUIRED_OBJECT_LAYERS = ["Collision"] as const;
const DEFAULT_TILE_SIZE = 16;

export type { Rect, TiledObject, TiledProperty };

export type TiledRoomObject = TiledObject & {
  polygon?: Array<{ x: number; y: number }>;
};

export type TiledLayer = {
  name: string;
  type: "tilelayer" | "objectgroup";
  data?: number[];
  height?: number;
  objects?: TiledRoomObject[];
  width?: number;
};

export type TiledMapJson = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets?: Array<{ firstgid?: number; name?: string; source?: string; image?: string; tilecount?: number }>;
};

export type TiledDoorObject = Rect & {
  id: string;
  direction: Direction;
  isLocked: boolean;
  isBlock?: boolean;
  isSecret?: boolean;
  isSpike?: boolean;
  rotation: number;
  targetRoom?: string;
  targetSpawn?: string;
};

export type TiledChestObject = Rect & {
  id: string;
  item?: string;
  reward?: string;
  chestId?: string;
  isOpen: boolean;
  openedFlag?: string;
};

export type TiledInteractObject = Rect & {
  id: string;
  type?: string;
  dialogueId?: string;
  item?: string;
  flag?: string;
  message?: string;
};

export type TiledStairsObject = Rect & {
  id: string;
  direction: Direction;
  targetRoom?: string;
  targetSpawn?: string;
};

export type TiledEnemyObject = Omit<EnemySpawnDefinition, "roomId">;

export type TiledRoomDefinition = {
  id: string;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  missingLayers: string[];
  colliders: Rect[];
  doors: TiledDoorObject[];
  hazards: SpikeTrapHazard[];
  chests: TiledChestObject[];
  interacts: TiledInteractObject[];
  stairs: TiledStairsObject[];
  enemies: TiledEnemyObject[];
};

export type TiledMovementResult = {
  state: GameState;
  moved: boolean;
};

export function parseTiledRoom(roomId: string, map: TiledMapJson): TiledRoomDefinition {
  const missingLayers = [
    ...TILED_REQUIRED_TILE_LAYERS.filter((name) => !findLayer(map, name, "tilelayer")),
    ...TILED_REQUIRED_OBJECT_LAYERS.filter((name) => !findLayer(map, name, "objectgroup")),
  ];
  const collisionLayer = findLayer(map, "Collision", "objectgroup");
  const doorsLayer = findLayer(map, "Doors", "objectgroup");
  const hazardsLayer = findLayer(map, "Hazards", "objectgroup");
  const chestLayer = findLayer(map, "Chest", "objectgroup") ?? findLayer(map, "Chests", "objectgroup");
  const interactLayer = findLayer(map, "Interact", "objectgroup");
  const stairsLayer = findLayer(map, "Stairs", "objectgroup");
  const enemiesLayer = findLayer(map, "Enemies", "objectgroup") ?? findLayer(map, "Enemy", "objectgroup");
  const width = map.width * map.tilewidth;
  const height = map.height * map.tileheight;

  return {
    id: roomId,
    width,
    height,
    tileWidth: map.tilewidth,
    tileHeight: map.tileheight,
    missingLayers,
    colliders: (collisionLayer?.objects ?? [])
      .filter((object) => propertyValue(object, "IsWall") === true)
      .flatMap((object) => objectColliderRects(object, map.tilewidth, map.tileheight)),
    doors: (doorsLayer?.objects ?? []).map((object) => doorObject(object, width, height, map.tilewidth, map.tileheight)),
    hazards: parseTiledSpikeTraps(hazardsLayer as TiledObjectLayer | undefined),
    chests: (chestLayer?.objects ?? []).map((object) => ({
      id: stringProperty(object, "chestId") ?? object.name ?? objectId("chest", object),
      ...objectBounds(object),
      item: tiledRewardItem(object),
      reward: stringProperty(object, "reward"),
      chestId: stringProperty(object, "chestId"),
      isOpen: booleanProperty(object, "IsOpen", false) || booleanProperty(object, "isOpen", false),
      openedFlag: stringProperty(object, "openedFlag"),
    })),
    interacts: (interactLayer?.objects ?? []).map((object) => ({
      id: objectId("interact", object),
      ...objectBounds(object),
      type: object.type || stringProperty(object, "type"),
      dialogueId: stringProperty(object, "dialogueId"),
      item: stringProperty(object, "item"),
      flag: stringProperty(object, "flag"),
      message: stringProperty(object, "message"),
    })),
    stairs: (stairsLayer?.objects ?? []).map((object) => ({
      id: objectId("stairs", object),
      ...objectBounds(object),
      direction: directionProperty(object) ?? directionForRect(objectBounds(object), width, height),
      targetRoom: stringProperty(object, "targetRoom"),
      targetSpawn: stringProperty(object, "targetSpawn"),
    })),
    enemies: (enemiesLayer?.objects ?? [])
      .map((object) => enemyObject(roomId, object))
      .filter((enemy): enemy is TiledEnemyObject => Boolean(enemy)),
  };
}

function doorObject(
  object: TiledRoomObject,
  roomWidth: number,
  roomHeight: number,
  tileWidth: number,
  tileHeight: number,
): TiledDoorObject {
  const rawBounds = objectBounds(object);
  const direction = directionProperty(object) ?? directionForRect(rawBounds, roomWidth, roomHeight);

  return {
    id: objectId("door", object),
    ...normalizeDoorBounds(rawBounds, direction, roomWidth, roomHeight, tileWidth, tileHeight),
    direction,
    isLocked: booleanProperty(object, "IsLocked", false),
    isBlock: booleanProperty(object, "IsBlock", false),
    isSecret: booleanProperty(object, "IsSecret", false),
    isSpike: booleanProperty(object, "IsSpike", false),
    rotation: object.rotation ?? 0,
    targetRoom: stringProperty(object, "targetRoom"),
    targetSpawn: stringProperty(object, "targetSpawn"),
  };
}

function normalizeDoorBounds(
  bounds: Rect,
  direction: Direction,
  roomWidth: number,
  roomHeight: number,
  tileWidth: number,
  tileHeight: number,
): Rect {
  if (bounds.width > 0 && bounds.height > 0) {
    return bounds;
  }

  if (direction === "left") {
    return {
      x: clamp(bounds.x, 0, roomWidth - tileWidth),
      y: clamp(bounds.y, 0, roomHeight - tileHeight),
      width: tileWidth,
      height: tileHeight,
    };
  }

  if (direction === "right") {
    return {
      x: clamp(bounds.x - tileWidth, 0, roomWidth - tileWidth),
      y: clamp(bounds.y, 0, roomHeight - tileHeight),
      width: tileWidth,
      height: tileHeight,
    };
  }

  if (direction === "up") {
    return {
      x: clamp(bounds.x, 0, roomWidth - tileWidth),
      y: clamp(bounds.y, 0, roomHeight - tileHeight),
      width: tileWidth,
      height: tileHeight,
    };
  }

  return {
    x: clamp(bounds.x, 0, roomWidth - tileWidth),
    y: clamp(bounds.y - tileHeight, 0, roomHeight - tileHeight),
    width: tileWidth,
    height: tileHeight,
  };
}

export function stepTiledMovement(
  state: GameState,
  input: TopDownInputState,
  deltaMs: number,
  room: Pick<TiledRoomDefinition, "width" | "height" | "colliders">,
): TiledMovementResult {
  const vector = inputVector(input);

  if (vector.x === 0 && vector.y === 0) {
    return { state, moved: false };
  }

  const distance = TOP_DOWN_PLAYER_SPEED * Math.max(0, deltaMs / 1000);
  const nextPose = moveWithCollision(state.playerPose, vector.x * distance, vector.y * distance, room);

  return {
    state: {
      ...state,
      playerPose: nextPose,
    },
    moved: nextPose.x !== state.playerPose.x || nextPose.y !== state.playerPose.y,
  };
}

export function tiledDoorContainingPose(room: Pick<TiledRoomDefinition, "doors">, pose: Pick<PlayerPose, "x" | "y">): TiledDoorObject | undefined {
  return room.doors.find((door) => rectContainsPoint(door, pose.x, pose.y));
}

export function tiledStairsContainingPose(room: Pick<TiledRoomDefinition, "stairs">, pose: Pick<PlayerPose, "x" | "y">): TiledStairsObject | undefined {
  return room.stairs.find((stairs) => rectContainsPoint(stairs, pose.x, pose.y));
}

export function tiledRoomColliders(
  room: Pick<TiledRoomDefinition, "colliders" | "doors">,
  blocksDoor: (door: TiledDoorObject) => boolean,
): Rect[] {
  return [
    ...room.colliders,
    ...room.doors
      .filter((door) => blocksDoor(door))
      .map((door) => ({ x: door.x, y: door.y, width: door.width, height: door.height })),
  ];
}

export function spawnTiledFromExitDirection(
  room: Pick<TiledRoomDefinition, "width" | "height"> & Partial<Pick<TiledRoomDefinition, "tileWidth" | "tileHeight" | "colliders">>,
  direction: Direction,
  door?: Pick<Rect, "x" | "y" | "width" | "height"> & { direction?: Direction },
): PlayerPose {
  const doorCenterX = door ? door.x + door.width / 2 : room.width / 2;
  const doorCenterY = door ? door.y + door.height / 2 : room.height / 2;
  const tileWidth = room.tileWidth ?? DEFAULT_TILE_SIZE;
  const tileHeight = room.tileHeight ?? DEFAULT_TILE_SIZE;
  const spawnDirection = door?.direction ?? oppositeDirection(direction);
  const hasDestinationDoor = Boolean(door?.direction);
  let pose: PlayerPose;

  if (spawnDirection === "left") {
    pose = {
      x: clamp(hasDestinationDoor ? (door?.x ?? 0) + (door?.width ?? 0) + tileWidth : tileWidth, TILED_PLAYER_RADIUS, room.width - TILED_PLAYER_RADIUS),
      y: clamp(hasDestinationDoor ? doorCenterY : room.height / 2, TILED_PLAYER_RADIUS, room.height - TILED_PLAYER_RADIUS),
      facing: "right",
    };
    return safeSpawnPose(pose, room, { x: 1, y: 0 }, tileWidth, tileHeight);
  }

  if (spawnDirection === "right") {
    pose = {
      x: clamp(hasDestinationDoor ? (door?.x ?? room.width) - tileWidth : room.width - tileWidth, TILED_PLAYER_RADIUS, room.width - TILED_PLAYER_RADIUS),
      y: clamp(hasDestinationDoor ? doorCenterY : room.height / 2, TILED_PLAYER_RADIUS, room.height - TILED_PLAYER_RADIUS),
      facing: "left",
    };
    return safeSpawnPose(pose, room, { x: -1, y: 0 }, tileWidth, tileHeight);
  }

  if (spawnDirection === "up") {
    pose = {
      x: clamp(hasDestinationDoor ? doorCenterX : room.width / 2, TILED_PLAYER_RADIUS, room.width - TILED_PLAYER_RADIUS),
      y: clamp(hasDestinationDoor ? (door?.y ?? 0) + (door?.height ?? 0) + tileHeight : tileHeight, TILED_PLAYER_RADIUS, room.height - TILED_PLAYER_RADIUS),
      facing: "down",
    };
    return safeSpawnPose(pose, room, { x: 0, y: 1 }, tileWidth, tileHeight);
  }

  pose = {
    x: clamp(hasDestinationDoor ? doorCenterX : room.width / 2, TILED_PLAYER_RADIUS, room.width - TILED_PLAYER_RADIUS),
    y: clamp(hasDestinationDoor ? (door?.y ?? room.height) - tileHeight : room.height - tileHeight, TILED_PLAYER_RADIUS, room.height - TILED_PLAYER_RADIUS),
    facing: "up",
  };
  return safeSpawnPose(pose, room, { x: 0, y: -1 }, tileWidth, tileHeight);
}

function safeSpawnPose(
  pose: PlayerPose,
  room: Pick<TiledRoomDefinition, "width" | "height"> & Partial<Pick<TiledRoomDefinition, "colliders">>,
  nudge: { x: number; y: number },
  tileWidth: number,
  tileHeight: number,
): PlayerPose {
  if (!spawnOverlapsCollider(pose, room)) {
    return pose;
  }

  const step = Math.max(tileWidth, tileHeight);

  for (let index = 1; index <= 8; index += 1) {
    const candidate = {
      ...pose,
      x: clamp(pose.x + nudge.x * step * index, TILED_PLAYER_RADIUS, room.width - TILED_PLAYER_RADIUS),
      y: clamp(pose.y + nudge.y * step * index, TILED_PLAYER_RADIUS, room.height - TILED_PLAYER_RADIUS),
    };

    if (!spawnOverlapsCollider(candidate, room)) {
      return candidate;
    }
  }

  return pose;
}

function spawnOverlapsCollider(
  pose: Pick<PlayerPose, "x" | "y">,
  room: Partial<Pick<TiledRoomDefinition, "colliders">>,
): boolean {
  return (room.colliders ?? []).some((collider) => circleRectOverlap(pose.x, pose.y, TILED_PLAYER_RADIUS, collider));
}

function oppositeDirection(direction: Direction): Direction {
  if (direction === "left") {
    return "right";
  }

  if (direction === "right") {
    return "left";
  }

  if (direction === "up") {
    return "down";
  }

  return "up";
}

function findLayer(map: TiledMapJson, name: string, type: TiledLayer["type"]): TiledLayer | undefined {
  return map.layers.find((layer) => layer.name === name && layer.type === type);
}

function objectBounds(object: TiledRoomObject): Rect {
  return boundsForPoints(objectPoints(object));
}

function objectColliderRects(object: TiledRoomObject, tileWidth: number, tileHeight: number): Rect[] {
  if (!object.polygon?.length) {
    return [objectBounds(object)];
  }

  const points = objectPoints(object);
  const bounds = boundsForPoints(points);
  const startX = Math.floor(bounds.x / tileWidth) * tileWidth;
  const startY = Math.floor(bounds.y / tileHeight) * tileHeight;
  const endX = Math.ceil((bounds.x + bounds.width) / tileWidth) * tileWidth;
  const endY = Math.ceil((bounds.y + bounds.height) / tileHeight) * tileHeight;
  const rects: Rect[] = [];

  for (let y = startY; y < endY; y += tileHeight) {
    for (let x = startX; x < endX; x += tileWidth) {
      if (pointInPolygon(x + tileWidth / 2, y + tileHeight / 2, points)) {
        rects.push({ x, y, width: tileWidth, height: tileHeight });
      }
    }
  }

  return rects.length > 0 ? rects : [objectBounds(object)];
}

function objectPoints(object: TiledRoomObject): Array<{ x: number; y: number }> {
  const points = object.polygon?.length
    ? object.polygon
    : [
        { x: 0, y: 0 },
        { x: object.width ?? 0, y: 0 },
        { x: object.width ?? 0, y: object.height ?? 0 },
        { x: 0, y: object.height ?? 0 },
      ];
  const rotation = ((object.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return points.map((point) => ({
    x: object.x + point.x * cos - point.y * sin,
    y: object.y + point.x * sin + point.y * cos,
  }));
}

function boundsForPoints(points: Array<{ x: number; y: number }>): Rect {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function pointInPolygon(x: number, y: number, polygon: Array<{ x: number; y: number }>): boolean {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.y > y !== previousPoint.y > y &&
      x < ((previousPoint.x - currentPoint.x) * (y - currentPoint.y)) / (previousPoint.y - currentPoint.y) + currentPoint.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function directionForRect(rect: Rect, width: number, height: number): Direction {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const distances: Record<Direction, number> = {
    left: centerX,
    right: width - centerX,
    up: centerY,
    down: height - centerY,
  };

  return (Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0] as Direction) ?? "down";
}

function directionProperty(object: TiledObject): Direction | undefined {
  const value = stringProperty(object, "direction");
  return value === "up" || value === "down" || value === "left" || value === "right" ? value : undefined;
}

function enemyObject(roomId: string, object: TiledRoomObject): TiledEnemyObject | null {
  const species = enemySpeciesProperty(object);

  if (!species) {
    return null;
  }

  const bounds = objectBounds(object);
  const x = bounds.width > 0 ? bounds.x + bounds.width / 2 : object.x;
  const y = bounds.height > 0 ? bounds.y + bounds.height / 2 : object.y;

  return {
    id: stringProperty(object, "enemyId") ?? object.name ?? `enemy.${roomId}.${object.id}`,
    species,
    x,
    y,
    hp: numberProperty(object, "hp"),
    radius: numberProperty(object, "radius"),
    kind: enemyKindProperty(object),
    respawnOnEntry: booleanProperty(object, "respawnOnEntry", true),
    wave: enemyWaveProperty(roomId, object, species),
    requiresFlag: stringProperty(object, "requiresFlag"),
    excludedByFlag: stringProperty(object, "excludedByFlag"),
  };
}

function enemyWaveProperty(roomId: string, object: TiledObject, species: EnemySpecies): number | undefined {
  const wave = numberProperty(object, "wave") ?? numberProperty(object, "Wave");

  if (wave !== undefined && Number.isFinite(wave) && wave >= 0) {
    return wave;
  }

  if (roomId === "SR2") {
    if (species === "slime1") {
      return 1;
    }

    if (species === "slime2") {
      return 2;
    }

    if (species === "slime3") {
      return 3;
    }
  }

  return undefined;
}

function enemySpeciesProperty(object: TiledObject): EnemySpecies | undefined {
  const value = (stringProperty(object, "EnemyType") ?? stringProperty(object, "enemyType") ?? stringProperty(object, "species") ?? object.type)?.toLowerCase();
  return value === "slime1" || value === "slime2" || value === "slime3" || value === "legendary-beast" || value === "generic-minion" || value === "generic-boss"
    ? value
    : undefined;
}

function enemyKindProperty(object: TiledObject): "minion" | "boss" | undefined {
  const value = stringProperty(object, "kind");
  return value === "minion" || value === "boss" ? value : undefined;
}

function inputVector(input: TopDownInputState): { x: number; y: number } {
  const x = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const y = Number(Boolean(input.down)) - Number(Boolean(input.up));
  const length = Math.hypot(x, y);

  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}

function moveWithCollision(
  pose: PlayerPose,
  dx: number,
  dy: number,
  room: Pick<TiledRoomDefinition, "width" | "height" | "colliders">,
): PlayerPose {
  const facing = vectorToFacing({ x: dx, y: dy }, pose.facing);
  const nextX = resolveAxis({ ...pose, facing }, dx, 0, room).x;
  const nextY = resolveAxis({ ...pose, x: nextX, facing }, 0, dy, room).y;

  return {
    x: clamp(nextX, TILED_PLAYER_RADIUS, room.width - TILED_PLAYER_RADIUS),
    y: clamp(nextY, TILED_PLAYER_RADIUS, room.height - TILED_PLAYER_RADIUS),
    facing,
  };
}

function resolveAxis(
  pose: PlayerPose,
  dx: number,
  dy: number,
  room: Pick<TiledRoomDefinition, "width" | "height" | "colliders">,
): PlayerPose {
  const candidate = {
    ...pose,
    x: clamp(pose.x + dx, TILED_PLAYER_RADIUS, room.width - TILED_PLAYER_RADIUS),
    y: clamp(pose.y + dy, TILED_PLAYER_RADIUS, room.height - TILED_PLAYER_RADIUS),
  };

  return room.colliders.some((collider) => circleRectOverlap(candidate.x, candidate.y, TILED_PLAYER_RADIUS, collider))
    ? pose
    : candidate;
}

function vectorToFacing(vector: { x: number; y: number }, fallback: Direction): Direction {
  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    return vector.x > 0 ? "right" : "left";
  }

  if (vector.y !== 0) {
    return vector.y > 0 ? "down" : "up";
  }

  return fallback;
}

function rectContainsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function circleRectOverlap(cx: number, cy: number, radius: number, rect: Rect): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  return Math.hypot(cx - closestX, cy - closestY) <= radius;
}

function propertyValue(object: TiledObject, name: string): unknown {
  const normalizedName = name.toLowerCase();
  return object.properties?.find((property) => property.name.toLowerCase() === normalizedName)?.value;
}

function stringProperty(object: TiledObject, name: string): string | undefined {
  const value = propertyValue(object, name);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function tiledRewardItem(object: TiledObject): string | undefined {
  const item = stringProperty(object, "item");

  if (item) {
    return item;
  }

  return normalizeTiledReward(stringProperty(object, "reward"));
}

function normalizeTiledReward(reward?: string): string | undefined {
  if (!reward) {
    return undefined;
  }

  const normalized = reward.toLowerCase();
  const aliases: Record<string, string> = {
    sword: "Espada",
    espada: "Espada",
    wand: "Varita",
    varita: "Varita",
    bombs: "Bombas",
    bombas: "Bombas",
  };

  return aliases[normalized] ?? reward;
}

function numberProperty(object: TiledObject, name: string): number | undefined {
  const value = propertyValue(object, name);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanProperty(object: TiledObject, name: string, fallback: boolean): boolean {
  const value = propertyValue(object, name);
  return typeof value === "boolean" ? value : fallback;
}

function objectId(prefix: string, object: TiledObject): string {
  return `${prefix}.${object.id}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
