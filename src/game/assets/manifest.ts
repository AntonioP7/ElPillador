import { tiledWorldRooms } from "../content/tiledRooms/worldManifest.generated";

export type AssetDomain = "characters" | "tiles" | "environment" | "ui" | "fx" | "audio" | "data";

export type ImageAssetManifestEntry = {
  key: string;
  domain: AssetDomain;
  path: string;
  kind?: "image";
};

export type SpritesheetAssetManifestEntry = {
  key: string;
  domain: AssetDomain;
  path: string;
  kind: "spritesheet";
  frameWidth: number;
  frameHeight: number;
};

export type TilemapTiledJsonAssetManifestEntry = {
  key: string;
  domain: "data";
  path: string;
  kind: "tilemapTiledJSON";
};

export type JsonAssetManifestEntry = {
  key: string;
  domain: "data";
  path: string;
  kind: "json";
};

export type AssetManifestEntry =
  | ImageAssetManifestEntry
  | SpritesheetAssetManifestEntry
  | TilemapTiledJsonAssetManifestEntry
  | JsonAssetManifestEntry;

export const PLAYER_ASSET_KEYS = {
  idle: "player.main.idle",
  walk: "player.main.walk",
  run: "player.main.run",
  slash: "player.main.slash",
  walkSlash: "player.main.walkSlash",
  runSlash: "player.main.runSlash",
  hurt: "player.main.hurt",
  death: "player.main.death",
  unarmedIdle: "player.main.unarmed.idle",
  unarmedWalk: "player.main.unarmed.walk",
  unarmedRun: "player.main.unarmed.run",
  unarmedHurt: "player.main.unarmed.hurt",
  unarmedDeath: "player.main.unarmed.death",
} as const;

export const TILED_ROOM_ASSET_KEYS = {
  sr2Map: "room.SR2.tilemap",
  chest: "room.SR2.chest",
  door: "room.SR2.door",
  tilesets: {
    Water_coasts_animation: "tileset.Water_coasts_animation",
    cracked_tiles: "tileset.cracked_tiles",
    cracked_tiles_grecia: "tileset.cracked_tiles_grecia",
    cracked_tiles_floor: "tileset.cracked_tiles_floor",
    doors_lever_chest_animation: "tileset.doors_lever_chest_animation",
    fire_animation: "tileset.fire_animation",
    fire_animation2: "tileset.fire_animation2",
    Objects: "tileset.Objects",
    Objects_interior: "tileset.Objects_interior",
    Exterior_objects: "tileset.Exterior_objects",
    trap_animation: "tileset.trap_animation",
    walls_floor: "tileset.walls_floor",
    Walls_floor: "tileset.Walls_floor",
    Cracked_tiles_interior: "tileset.Cracked_tiles_interior",
    lattice: "tileset.lattice",
    pedestals: "tileset.pedestals",
    Water_coasts_animation_decorative_cracks: "tileset.Water_coasts_animation_decorative_cracks",
    Water_detilazation: "tileset.Water_detilazation",
    Spikes: "tileset.Spikes",
    Effects: "tileset.Effects",
    Correr_Tileset: "tileset.Correr_Tileset",
    Muros_Correr: "tileset.Muros_Correr",
    Muros_Correr_2: "tileset.Muros_Correr_2",
    Trails: "tileset.Trails",
    Setas: "tileset.Setas",
    Arboles_Correr: "tileset.Arboles_Correr",
    Arboles_mitad: "tileset.Arboles_mitad",
  },
} as const;

export const ENEMY_ASSET_KEYS = {
  slime1Idle: "enemy.slime1.idle",
  slime1IdleMeta: "enemy.slime1.idle.meta",
  slime1Walk: "enemy.slime1.walk",
  slime1WalkMeta: "enemy.slime1.walk.meta",
  slime1Run: "enemy.slime1.run",
  slime1RunMeta: "enemy.slime1.run.meta",
  slime1Attack: "enemy.slime1.attack",
  slime1AttackMeta: "enemy.slime1.attack.meta",
  slime1Hurt: "enemy.slime1.hurt",
  slime1HurtMeta: "enemy.slime1.hurt.meta",
  slime1Death: "enemy.slime1.death",
  slime1DeathMeta: "enemy.slime1.death.meta",
  slime2Idle: "enemy.slime2.idle",
  slime2IdleMeta: "enemy.slime2.idle.meta",
  slime2Walk: "enemy.slime2.walk",
  slime2WalkMeta: "enemy.slime2.walk.meta",
  slime2Run: "enemy.slime2.run",
  slime2RunMeta: "enemy.slime2.run.meta",
  slime2Attack: "enemy.slime2.attack",
  slime2AttackMeta: "enemy.slime2.attack.meta",
  slime2Hurt: "enemy.slime2.hurt",
  slime2HurtMeta: "enemy.slime2.hurt.meta",
  slime2Death: "enemy.slime2.death",
  slime2DeathMeta: "enemy.slime2.death.meta",
  slime3Idle: "enemy.slime3.idle",
  slime3IdleMeta: "enemy.slime3.idle.meta",
  slime3Walk: "enemy.slime3.walk",
  slime3WalkMeta: "enemy.slime3.walk.meta",
  slime3Run: "enemy.slime3.run",
  slime3RunMeta: "enemy.slime3.run.meta",
  slime3Attack: "enemy.slime3.attack",
  slime3AttackMeta: "enemy.slime3.attack.meta",
  slime3Hurt: "enemy.slime3.hurt",
  slime3HurtMeta: "enemy.slime3.hurt.meta",
  slime3Death: "enemy.slime3.death",
  slime3DeathMeta: "enemy.slime3.death.meta",
} as const;

export const tiledTilesetImageKeys: Record<string, string> = {
  Water_coasts_animation: TILED_ROOM_ASSET_KEYS.tilesets.Water_coasts_animation,
  cracked_tiles: TILED_ROOM_ASSET_KEYS.tilesets.cracked_tiles,
  cracked_tiles_grecia: TILED_ROOM_ASSET_KEYS.tilesets.cracked_tiles_grecia,
  cracked_tiles_floor: TILED_ROOM_ASSET_KEYS.tilesets.cracked_tiles_floor,
  doors_lever_chest_animation: TILED_ROOM_ASSET_KEYS.tilesets.doors_lever_chest_animation,
  fire_animation: TILED_ROOM_ASSET_KEYS.tilesets.fire_animation,
  fire_animation2: TILED_ROOM_ASSET_KEYS.tilesets.fire_animation2,
  Objects: TILED_ROOM_ASSET_KEYS.tilesets.Objects,
  Objects_interior: TILED_ROOM_ASSET_KEYS.tilesets.Objects_interior,
  Exterior_objects: TILED_ROOM_ASSET_KEYS.tilesets.Exterior_objects,
  trap_animation: TILED_ROOM_ASSET_KEYS.tilesets.trap_animation,
  walls_floor: TILED_ROOM_ASSET_KEYS.tilesets.walls_floor,
  Walls_floor: TILED_ROOM_ASSET_KEYS.tilesets.Walls_floor,
  Cracked_tiles_interior: TILED_ROOM_ASSET_KEYS.tilesets.Cracked_tiles_interior,
  lattice: TILED_ROOM_ASSET_KEYS.tilesets.lattice,
  pedestals: TILED_ROOM_ASSET_KEYS.tilesets.pedestals,
  Water_coasts_animation_decorative_cracks: TILED_ROOM_ASSET_KEYS.tilesets.Water_coasts_animation_decorative_cracks,
  Water_detilazation: TILED_ROOM_ASSET_KEYS.tilesets.Water_detilazation,
  Spikes: TILED_ROOM_ASSET_KEYS.tilesets.Spikes,
  Effects: TILED_ROOM_ASSET_KEYS.tilesets.Effects,
  Correr_Tileset: TILED_ROOM_ASSET_KEYS.tilesets.Correr_Tileset,
  Muros_Correr: TILED_ROOM_ASSET_KEYS.tilesets.Muros_Correr,
  Muros_Correr_2: TILED_ROOM_ASSET_KEYS.tilesets.Muros_Correr_2,
  Trails: TILED_ROOM_ASSET_KEYS.tilesets.Trails,
  Setas: TILED_ROOM_ASSET_KEYS.tilesets.Setas,
  Arboles_Correr: TILED_ROOM_ASSET_KEYS.tilesets.Arboles_Correr,
  Arboles_mitad: TILED_ROOM_ASSET_KEYS.tilesets.Arboles_mitad,
};

export function tiledWorldRoomAssetKey(roomId: string): string {
  return `room.${roomId}.tilemap`;
}

const tiledWorldRoomAssets: TilemapTiledJsonAssetManifestEntry[] = tiledWorldRooms.map((room) => ({
  key: tiledWorldRoomAssetKey(room.id),
  domain: "data",
  path: room.mapPath,
  kind: "tilemapTiledJSON",
}));

type SlimeVariantAssetKeys = {
  idle: string;
  idleMeta: string;
  attack: string;
  attackMeta: string;
  walk: string;
  walkMeta: string;
  run: string;
  runMeta: string;
  hurt: string;
  hurtMeta: string;
  death: string;
  deathMeta: string;
};

function slimeVariantAssets(folder: string, prefix: string, keys: SlimeVariantAssetKeys): AssetManifestEntry[] {
  const basePath = `/assets/game/sprites/enemies/${folder}`;
  const spritesheet = (key: string, action: string): SpritesheetAssetManifestEntry => ({
    key,
    domain: "characters",
    path: `${basePath}/${prefix}_${action}_full.png`,
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  });
  const json = (key: string, action: string): JsonAssetManifestEntry => ({
    key,
    domain: "data",
    path: `${basePath}/${prefix}_${action}_full.json`,
    kind: "json",
  });

  return [
    spritesheet(keys.idle, "Idle"),
    json(keys.idleMeta, "Idle"),
    spritesheet(keys.attack, "Attack"),
    json(keys.attackMeta, "Attack"),
    spritesheet(keys.walk, "Walk"),
    json(keys.walkMeta, "Walk"),
    spritesheet(keys.run, "Run"),
    json(keys.runMeta, "Run"),
    spritesheet(keys.hurt, "Hurt"),
    json(keys.hurtMeta, "Hurt"),
    spritesheet(keys.death, "Death"),
    json(keys.deathMeta, "Death"),
  ];
}

export const assetManifest: AssetManifestEntry[] = [
  {
    key: PLAYER_ASSET_KEYS.idle,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-sword-idle.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.walk,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-sword-walk.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.slash,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-sword-slash.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.run,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-sword-run.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.runSlash,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-sword-run-slash.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.walkSlash,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-sword-walk-slash.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.hurt,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-sword-hurt.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.death,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-sword-death.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.unarmedIdle,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-unarmed-idle.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.unarmedWalk,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-unarmed-walk.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.unarmedRun,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-unarmed-run.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.unarmedHurt,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-unarmed-hurt.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: PLAYER_ASSET_KEYS.unarmedDeath,
    domain: "characters",
    path: "/assets/game/sprites/characters/main-character/character-unarmed-death.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  ...tiledWorldRoomAssets,
  {
    key: ENEMY_ASSET_KEYS.slime1Idle,
    domain: "characters",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Idle_full.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: ENEMY_ASSET_KEYS.slime1IdleMeta,
    domain: "data",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Idle_full.json",
    kind: "json",
  },
  {
    key: ENEMY_ASSET_KEYS.slime1Attack,
    domain: "characters",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Attack_full.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: ENEMY_ASSET_KEYS.slime1AttackMeta,
    domain: "data",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Attack_full.json",
    kind: "json",
  },
  {
    key: ENEMY_ASSET_KEYS.slime1Walk,
    domain: "characters",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Walk_full.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: ENEMY_ASSET_KEYS.slime1WalkMeta,
    domain: "data",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Walk_full.json",
    kind: "json",
  },
  {
    key: ENEMY_ASSET_KEYS.slime1Run,
    domain: "characters",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Run_full.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: ENEMY_ASSET_KEYS.slime1RunMeta,
    domain: "data",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Run_full.json",
    kind: "json",
  },
  {
    key: ENEMY_ASSET_KEYS.slime1Hurt,
    domain: "characters",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Hurt_full.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: ENEMY_ASSET_KEYS.slime1HurtMeta,
    domain: "data",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Hurt_full.json",
    kind: "json",
  },
  {
    key: ENEMY_ASSET_KEYS.slime1Death,
    domain: "characters",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Death_full.png",
    kind: "spritesheet",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: ENEMY_ASSET_KEYS.slime1DeathMeta,
    domain: "data",
    path: "/assets/game/sprites/enemies/slime1/Slime1_Death_full.json",
    kind: "json",
  },
  ...slimeVariantAssets("slime2", "Slime2", {
    idle: ENEMY_ASSET_KEYS.slime2Idle,
    idleMeta: ENEMY_ASSET_KEYS.slime2IdleMeta,
    attack: ENEMY_ASSET_KEYS.slime2Attack,
    attackMeta: ENEMY_ASSET_KEYS.slime2AttackMeta,
    walk: ENEMY_ASSET_KEYS.slime2Walk,
    walkMeta: ENEMY_ASSET_KEYS.slime2WalkMeta,
    run: ENEMY_ASSET_KEYS.slime2Run,
    runMeta: ENEMY_ASSET_KEYS.slime2RunMeta,
    hurt: ENEMY_ASSET_KEYS.slime2Hurt,
    hurtMeta: ENEMY_ASSET_KEYS.slime2HurtMeta,
    death: ENEMY_ASSET_KEYS.slime2Death,
    deathMeta: ENEMY_ASSET_KEYS.slime2DeathMeta,
  }),
  ...slimeVariantAssets("slime3", "Slime3", {
    idle: ENEMY_ASSET_KEYS.slime3Idle,
    idleMeta: ENEMY_ASSET_KEYS.slime3IdleMeta,
    attack: ENEMY_ASSET_KEYS.slime3Attack,
    attackMeta: ENEMY_ASSET_KEYS.slime3AttackMeta,
    walk: ENEMY_ASSET_KEYS.slime3Walk,
    walkMeta: ENEMY_ASSET_KEYS.slime3WalkMeta,
    run: ENEMY_ASSET_KEYS.slime3Run,
    runMeta: ENEMY_ASSET_KEYS.slime3RunMeta,
    hurt: ENEMY_ASSET_KEYS.slime3Hurt,
    hurtMeta: ENEMY_ASSET_KEYS.slime3HurtMeta,
    death: ENEMY_ASSET_KEYS.slime3Death,
    deathMeta: ENEMY_ASSET_KEYS.slime3DeathMeta,
  }),
  {
    key: TILED_ROOM_ASSET_KEYS.chest,
    domain: "environment",
    path: "/assets/game/sprites/environment/chest-animation.png",
    kind: "spritesheet",
    frameWidth: 32,
    frameHeight: 32,
  },
  {
    key: TILED_ROOM_ASSET_KEYS.door,
    domain: "environment",
    path: "/assets/game/sprites/environment/door-animation.png",
    kind: "spritesheet",
    frameWidth: 32,
    frameHeight: 32,
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Water_coasts_animation,
    domain: "tiles",
    path: "/assets/game/tilesets/Water_coasts_animation.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.cracked_tiles,
    domain: "tiles",
    path: "/assets/game/tilesets/decorative_cracks_walls.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.cracked_tiles_grecia,
    domain: "tiles",
    path: "/assets/game/tilesets/grecia_decorative_cracks_interior.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.cracked_tiles_floor,
    domain: "tiles",
    path: "/assets/game/tilesets/decorative_cracks_floor.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.doors_lever_chest_animation,
    domain: "tiles",
    path: "/assets/game/tilesets/doors_lever_chest_animation.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.fire_animation,
    domain: "tiles",
    path: "/assets/game/tilesets/fire_animation.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.fire_animation2,
    domain: "tiles",
    path: "/assets/game/tilesets/fire_animation2.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Objects,
    domain: "tiles",
    path: "/assets/game/tilesets/Objects.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Objects_interior,
    domain: "tiles",
    path: "/assets/game/tilesets/Objects_interior.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Exterior_objects,
    domain: "tiles",
    path: "/assets/game/tilesets/Exterior_objects.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.trap_animation,
    domain: "tiles",
    path: "/assets/game/tilesets/trap_animation.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.walls_floor,
    domain: "tiles",
    path: "/assets/game/tilesets/walls_floor.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Walls_floor,
    domain: "tiles",
    path: "/assets/game/tilesets/grecia_walls_floor.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Cracked_tiles_interior,
    domain: "tiles",
    path: "/assets/game/tilesets/grecia_decorative_cracks_interior.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.lattice,
    domain: "tiles",
    path: "/assets/game/tilesets/grecia_lattice.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.pedestals,
    domain: "tiles",
    path: "/assets/game/tilesets/grecia_pedestals.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Water_coasts_animation_decorative_cracks,
    domain: "tiles",
    path: "/assets/game/tilesets/decorative_cracks_coasts_animation.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Water_detilazation,
    domain: "tiles",
    path: "/assets/game/tilesets/water_details_animation.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Spikes,
    domain: "tiles",
    path: "/assets/game/tilesets/grecia_spikes.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Effects,
    domain: "tiles",
    path: "/assets/game/tilesets/effects.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Correr_Tileset,
    domain: "tiles",
    path: "/assets/game/tilesets/TileSet.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Muros_Correr,
    domain: "tiles",
    path: "/assets/game/tilesets/Wall_02.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Muros_Correr_2,
    domain: "tiles",
    path: "/assets/game/tilesets/Wall_03.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Trails,
    domain: "tiles",
    path: "/assets/game/tilesets/trail.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Setas,
    domain: "tiles",
    path: "/assets/game/tilesets/Setas.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Arboles_Correr,
    domain: "tiles",
    path: "/assets/game/tilesets/Props.png",
  },
  {
    key: TILED_ROOM_ASSET_KEYS.tilesets.Arboles_mitad,
    domain: "tiles",
    path: "/assets/game/tilesets/Props_mitad.png",
  },
];
