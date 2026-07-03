import fs from "node:fs";
import path from "node:path";

const TILED_SOURCE_DIR = process.env.EL_PILLADOR_TILED_DIR || "H:\\Tiled\\ElPillador";
const TILED_WORLD_FILE = process.env.EL_PILLADOR_TILED_WORLD || "Mazmorra.world";
const CHARACTER_ANIMATION_SOURCE_DIR = process.env.EL_PILLADOR_CHARACTER_ANIMATION_DIR || "H:\\Tiled\\GameAssets\\AnimacionPersonaje";
const ENEMY_ASSET_SOURCE_DIR = process.env.EL_PILLADOR_ENEMY_ASSET_DIR || "H:\\Tiled\\GameAssets\\Enemies";
const HUD_HEALTHBAR_SOURCE_DIR = process.env.EL_PILLADOR_HUD_HEALTHBAR_DIR || "H:\\Tiled\\GameAssets\\HUD\\HealthBar";
const PUBLIC_ROOMS_DIR = path.resolve("public/assets/game/data/tiled/rooms");
const PUBLIC_WORLD_DIR = path.resolve("public/assets/game/data/tiled");
const PUBLIC_WORLD_PATH = path.join(PUBLIC_WORLD_DIR, "Mazmorra.world.json");
const GENERATED_MANIFEST_PATH = path.resolve("src/game/content/tiledRooms/worldManifest.generated.ts");
const PUBLIC_CHARACTER_DIR = path.resolve("public/assets/game/sprites/characters/main-character");
const PUBLIC_ENEMY_DIR = path.resolve("public/assets/game/sprites/enemies");
const PUBLIC_HUD_HEALTHBAR_DIR = path.resolve("public/assets/game/ui/healthbar");
const PUBLIC_TILESET_PREFIX = "../../../tilesets/";
const WATCH_MODE = process.argv.includes("--watch");
const PUBLIC_TILESET_IMAGES = {
  Water_coasts_animation: "Water_coasts_animation.png",
  cracked_tiles: "decorative_cracks_walls.png",
  cracked_tiles_grecia: "grecia_decorative_cracks_interior.png",
  cracked_tiles_floor: "decorative_cracks_floor.png",
  doors_lever_chest_animation: "doors_lever_chest_animation.png",
  fire_animation: "fire_animation.png",
  fire_animation2: "fire_animation2.png",
  Objects: "Objects.png",
  Objects_interior: "Objects_interior.png",
  Exterior_objects: "Exterior_objects.png",
  trap_animation: "trap_animation.png",
  walls_floor: "walls_floor.png",
  Walls_floor: "grecia_walls_floor.png",
  Cracked_tiles_interior: "grecia_decorative_cracks_interior.png",
  lattice: "grecia_lattice.png",
  pedestals: "grecia_pedestals.png",
  Water_coasts_animation_decorative_cracks: "decorative_cracks_coasts_animation.png",
  Water_detilazation: "water_details_animation.png",
  Spikes: "grecia_spikes.png",
  Effects: "effects.png",
  Correr_Tileset: "TileSet.png",
  Muros_Correr: "Wall_02.png",
  Muros_Correr_2: "Wall_03.png",
  Trails: "trail.png",
  Setas: "Setas.png",
  Arboles_Correr: "Props.png",
  Arboles_mitad: "Props_mitad.png",
};
const CHARACTER_ANIMATION_FILES = {
  "Sword_Idle_full.png": "character-sword-idle.png",
  "Sword_Walk_full.png": "character-sword-walk.png",
  "Sword_Run_full.png": "character-sword-run.png",
  "Sword_attack_full.png": "character-sword-slash.png",
  "Sword_Walk_Attack_full.png": "character-sword-walk-slash.png",
  "Sword_Run_Attack_full.png": "character-sword-run-slash.png",
  "Sword_Hurt_full.png": "character-sword-hurt.png",
  "Sword_Death_full.png": "character-sword-death.png",
  "Unarmed_Idle_full.png": "character-unarmed-idle.png",
  "Unarmed_Walk_full.png": "character-unarmed-walk.png",
  "Unarmed_Run_full.png": "character-unarmed-run.png",
  "Unarmed_Hurt_full.png": "character-unarmed-hurt.png",
  "Unarmed_Death_full.png": "character-unarmed-death.png",
};
const SLIME_VARIANTS = ["Slime1", "Slime2", "Slime3"];
const SLIME_ACTIONS = ["Attack", "Death", "Hurt", "Idle", "Run", "Walk"];
const HUD_HEALTHBAR_FILES = [
  "Full_HealthBar.png",
  "UI_StatusBar_Fill_HP.png",
  "Portrait_pillador.png",
];

runSync();

if (WATCH_MODE) {
  watchTiledSource();
}

function runSync() {
  if (!fs.existsSync(TILED_SOURCE_DIR)) {
    console.warn(`[sync-tiled-assets] Source folder not found: ${TILED_SOURCE_DIR}`);
  } else {
    syncMaps();
  }

  syncCharacterAnimations();
  syncSlimeAssets();
  syncHudHealthbarAssets();
}

function syncMaps() {
  fs.mkdirSync(PUBLIC_ROOMS_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_WORLD_DIR, { recursive: true });

  const existingTilesetsByRoom = loadExistingTilesetsByRoom(PUBLIC_ROOMS_DIR);
  const objectClassDefaults = loadTiledObjectClassDefaults();
  const world = loadTiledWorld();
  const roomEntries = world
    ? world.maps.map((entry) => ({ ...entry, sourcePath: path.resolve(TILED_SOURCE_DIR, entry.fileName) }))
    : listMapFiles(TILED_SOURCE_DIR).map((sourcePath) => ({
        fileName: path.relative(TILED_SOURCE_DIR, sourcePath).replaceAll(path.sep, "/"),
        height: 0,
        width: 0,
        x: 0,
        y: 0,
        sourcePath,
      }));
  const syncedRooms = [];

  for (const entry of roomEntries) {
    const sourcePath = entry.sourcePath;
    const file = path.basename(sourcePath);
    const roomId = roomIdFromWorldFile(entry.fileName);
    const targetPath = path.join(PUBLIC_ROOMS_DIR, `${roomId}.json`);

    if (!fs.existsSync(sourcePath)) {
      console.warn(`[sync-tiled-assets] World entry not found: ${entry.fileName}`);
      continue;
    }

    if (/\.(tmj|json)$/i.test(file)) {
      const map = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
      fs.writeFileSync(targetPath, `${JSON.stringify(normalizeJsonMap(map, sourcePath, existingTilesetsByRoom.get(roomId) ?? [], objectClassDefaults), null, 2)}\n`);
      console.info(`[sync-tiled-assets] ${sourcePath} -> ${targetPath}`);
    } else {
      const map = parseTmxMap(fs.readFileSync(sourcePath, "utf8"), path.dirname(sourcePath), existingTilesetsByRoom.get(roomId) ?? [], objectClassDefaults);
      fs.writeFileSync(targetPath, `${JSON.stringify(map, null, 2)}\n`);
      console.info(`[sync-tiled-assets] ${sourcePath} -> ${targetPath}`);
    }

    syncedRooms.push({
      id: roomId,
      fileName: entry.fileName.replaceAll("\\", "/"),
      mapPath: `/assets/game/data/tiled/rooms/${roomId}.json`,
      worldX: entry.x,
      worldY: entry.y,
      width: entry.width,
      height: entry.height,
    });
  }

  if (world) {
    const normalizedWorld = {
      ...world,
      maps: syncedRooms.map((room) => ({
        fileName: `rooms/${room.id}.json`,
        height: room.height,
        width: room.width,
        x: room.worldX,
        y: room.worldY,
      })),
    };
    fs.writeFileSync(PUBLIC_WORLD_PATH, `${JSON.stringify(normalizedWorld, null, 2)}\n`);
    console.info(`[sync-tiled-assets] ${path.join(TILED_SOURCE_DIR, TILED_WORLD_FILE)} -> ${PUBLIC_WORLD_PATH}`);
  }

  writeWorldManifest(syncedRooms);
}

function syncCharacterAnimations() {
  if (!fs.existsSync(CHARACTER_ANIMATION_SOURCE_DIR)) {
    console.warn(`[sync-tiled-assets] Character animation folder not found: ${CHARACTER_ANIMATION_SOURCE_DIR}`);
    return;
  }

  fs.mkdirSync(PUBLIC_CHARACTER_DIR, { recursive: true });

  for (const [sourceFile, targetFile] of Object.entries(CHARACTER_ANIMATION_FILES)) {
    const sourcePath = path.join(CHARACTER_ANIMATION_SOURCE_DIR, sourceFile);

    if (!fs.existsSync(sourcePath)) {
      console.warn(`[sync-tiled-assets] Missing character animation: ${sourcePath}`);
      continue;
    }

    fs.copyFileSync(sourcePath, path.join(PUBLIC_CHARACTER_DIR, targetFile));
  }

  console.info(`[sync-tiled-assets] Character animations synced from ${CHARACTER_ANIMATION_SOURCE_DIR}`);
}

function syncSlimeAssets() {
  for (const variant of SLIME_VARIANTS) {
    const sourceDir = path.join(ENEMY_ASSET_SOURCE_DIR, variant);
    const publicDir = path.join(PUBLIC_ENEMY_DIR, variant.toLowerCase());

    if (!fs.existsSync(sourceDir)) {
      console.warn(`[sync-tiled-assets] ${variant} asset folder not found: ${sourceDir}`);
      continue;
    }

    fs.mkdirSync(publicDir, { recursive: true });

    for (const action of SLIME_ACTIONS) {
      for (const extension of ["json", "png"]) {
        const file = `${variant}_${action}_full.${extension}`;
        const sourcePath = path.join(sourceDir, file);

        if (!fs.existsSync(sourcePath)) {
          console.warn(`[sync-tiled-assets] Missing ${variant} asset: ${sourcePath}`);
          continue;
        }

        fs.copyFileSync(sourcePath, path.join(publicDir, file));
      }
    }

    const summaryPath = path.join(sourceDir, "_summary.json");
    if (fs.existsSync(summaryPath)) {
      fs.copyFileSync(summaryPath, path.join(publicDir, "_summary.json"));
    }

    console.info(`[sync-tiled-assets] ${variant} assets synced from ${sourceDir}`);
  }
}

function syncHudHealthbarAssets() {
  if (!fs.existsSync(HUD_HEALTHBAR_SOURCE_DIR)) {
    console.warn(`[sync-tiled-assets] HUD healthbar folder not found: ${HUD_HEALTHBAR_SOURCE_DIR}`);
    return;
  }

  fs.mkdirSync(PUBLIC_HUD_HEALTHBAR_DIR, { recursive: true });

  for (const file of HUD_HEALTHBAR_FILES) {
    const sourcePath = path.join(HUD_HEALTHBAR_SOURCE_DIR, file);

    if (!fs.existsSync(sourcePath)) {
      console.warn(`[sync-tiled-assets] Missing HUD healthbar asset: ${sourcePath}`);
      continue;
    }

    fs.copyFileSync(sourcePath, path.join(PUBLIC_HUD_HEALTHBAR_DIR, file));
  }

  console.info(`[sync-tiled-assets] HUD healthbar assets synced from ${HUD_HEALTHBAR_SOURCE_DIR}`);
}

function normalizeJsonMap(map, sourcePath, fallbackTilesets, objectClassDefaults) {
  return normalizeDuplicateTilesets({
    ...map,
    properties: upsertArrayProperty(map.properties, "sourcePath", sourcePath),
    layers: normalizeMapLayers(map.layers ?? [], objectClassDefaults),
    tilesets: normalizeThemeTilesets(
      normalizeJsonTilesets(map.tilesets ?? [], path.dirname(sourcePath), fallbackTilesets),
      sourcePath,
    ),
  });
}

function loadTiledObjectClassDefaults() {
  const projectPath = path.join(TILED_SOURCE_DIR, "ElPillador.tiled-project");

  if (!fs.existsSync(projectPath)) {
    return new Map();
  }

  try {
    const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
    const classTypes = Array.isArray(project.propertyTypes)
      ? project.propertyTypes.filter((entry) => entry?.type === "class" && typeof entry.name === "string")
      : [];

    return new Map(classTypes.map((entry) => [
      entry.name,
      (entry.members ?? []).map((member) => ({
        name: member.name,
        type: member.type ?? "string",
        value: member.value ?? "",
      })),
    ]));
  } catch (error) {
    console.warn(`[sync-tiled-assets] Could not read Tiled project class defaults: ${error.message}`);
    return new Map();
  }
}

function loadTiledWorld() {
  const worldPath = path.resolve(TILED_SOURCE_DIR, TILED_WORLD_FILE);

  if (!fs.existsSync(worldPath)) {
    console.warn(`[sync-tiled-assets] World file not found, falling back to recursive map scan: ${worldPath}`);
    return undefined;
  }

  const world = JSON.parse(fs.readFileSync(worldPath, "utf8"));

  if (!Array.isArray(world.maps)) {
    throw new Error(`[sync-tiled-assets] Invalid Tiled world: ${worldPath}`);
  }

  return {
    ...world,
    maps: world.maps.filter((entry) => entry?.fileName && /\.(tmx|tmj|json)$/i.test(entry.fileName)),
  };
}

function listMapFiles(rootDir) {
  const files = [];

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listMapFiles(fullPath));
      continue;
    }

    if (/\.(tmx|tmj|json)$/i.test(entry.name) && !/\.tiled-(project|session)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function roomIdFromWorldFile(fileName) {
  return path.basename(fileName, path.extname(fileName));
}

function writeWorldManifest(rooms) {
  const sortedRooms = [...rooms].sort((a, b) => a.id.localeCompare(b.id));
  const content = `// Generated by scripts/sync-tiled-assets.mjs. Do not edit by hand.\n\nexport type TiledWorldRoomManifestEntry = {\n  id: string;\n  fileName: string;\n  mapPath: string;\n  worldX: number;\n  worldY: number;\n  width: number;\n  height: number;\n};\n\nexport const TILED_WORLD_SOURCE = ${JSON.stringify(path.join(TILED_SOURCE_DIR, TILED_WORLD_FILE).replaceAll("\\", "/"))} as const;\n\nexport const tiledWorldRooms = ${JSON.stringify(sortedRooms, null, 2)} as const satisfies readonly TiledWorldRoomManifestEntry[];\n\nexport const tiledWorldRoomsById: Record<string, TiledWorldRoomManifestEntry> = Object.fromEntries(\n  tiledWorldRooms.map((room) => [room.id, room]),\n);\n`;

  fs.writeFileSync(GENERATED_MANIFEST_PATH, content);
  console.info(`[sync-tiled-assets] Wrote ${GENERATED_MANIFEST_PATH}`);
}

function watchTiledSource() {
  console.info(`[sync-tiled-assets] Watching ${TILED_SOURCE_DIR}`);
  let pending = undefined;

  fs.watch(TILED_SOURCE_DIR, { recursive: true }, (_eventType, fileName) => {
    if (!fileName || !/\.(world|tmx|tmj|json|tsx)$/i.test(fileName)) {
      return;
    }

    clearTimeout(pending);
    pending = setTimeout(() => {
      try {
        runSync();
      } catch (error) {
        console.error(error);
      }
    }, 150);
  });
}

function normalizeJsonTilesets(tilesets, sourceDir, fallbackTilesets) {
  const fallbackByName = new Map(fallbackTilesets.map((tileset) => [tileset.name, tileset]));

  return tilesets.flatMap((tileset) => {
    if (tileset.source?.startsWith(":/")) {
      console.warn(`[sync-tiled-assets] Ignoring virtual tileset ${tileset.source}`);
      return [];
    }

    if (!tileset.source) {
      return [normalizeTilesetImagePath(tileset)];
    }

    const sourcePath = path.resolve(sourceDir, tileset.source);

    if (fs.existsSync(sourcePath)) {
      const parsed = parseTsxTileset(fs.readFileSync(sourcePath, "utf8"), tileset.firstgid ?? 1);
      return parsed ? [normalizeTilesetImagePath(parsed)] : [];
    }

    const fallbackName = path.basename(tileset.source, path.extname(tileset.source));
    const fallback = fallbackByName.get(fallbackName);

    if (fallback) {
      console.warn(`[sync-tiled-assets] Reusing existing embedded tileset for missing source: ${tileset.source}`);
      return [{ ...fallback, firstgid: tileset.firstgid ?? fallback.firstgid }];
    }

    console.warn(`[sync-tiled-assets] Skipping unresolved tileset: ${tileset.source}`);
    return [];
  });
}

function parseTmxMap(xml, sourceDir, fallbackTilesets, objectClassDefaults) {
  const mapOpen = xml.match(/<map\b([^>]*)>/s);

  if (!mapOpen) {
    throw new Error("[sync-tiled-assets] TMX map root not found");
  }

  const mapAttrs = attrs(mapOpen[1]);
  const map = {
    compressionlevel: -1,
    height: numberAttr(mapAttrs, "height", 0),
    infinite: mapAttrs.infinite === "1",
    layers: [],
    nextlayerid: numberAttr(mapAttrs, "nextlayerid", 0),
    nextobjectid: numberAttr(mapAttrs, "nextobjectid", 0),
    orientation: mapAttrs.orientation ?? "orthogonal",
    renderorder: mapAttrs.renderorder ?? "right-down",
    tiledversion: mapAttrs.tiledversion,
    tileheight: numberAttr(mapAttrs, "tileheight", 16),
    tilesets: normalizeThemeTilesets(parseMapTilesets(xml, sourceDir, fallbackTilesets), sourceDir),
    tilewidth: numberAttr(mapAttrs, "tilewidth", 16),
    type: "map",
    version: mapAttrs.version,
    width: numberAttr(mapAttrs, "width", 0),
  };

  for (const layerMatch of xml.matchAll(/<layer\b([^>]*)>([\s\S]*?)<\/layer>/g)) {
    const layerAttrs = attrs(layerMatch[1]);
    const dataMatch = layerMatch[2].match(/<data\b([^>]*)>([\s\S]*?)<\/data>/);
    const dataAttrs = dataMatch ? attrs(dataMatch[1]) : {};

    if (dataAttrs.encoding && dataAttrs.encoding !== "csv") {
      console.warn(`[sync-tiled-assets] Layer ${layerAttrs.name} uses unsupported encoding: ${dataAttrs.encoding}`);
    }

    map.layers.push({
      data: parseCsvTileData(dataMatch?.[2] ?? ""),
      height: numberAttr(layerAttrs, "height", map.height),
      id: numberAttr(layerAttrs, "id", map.layers.length + 1),
      name: layerAttrs.name ?? `Layer ${map.layers.length + 1}`,
      opacity: numberAttr(layerAttrs, "opacity", 1),
      type: "tilelayer",
      visible: layerAttrs.visible !== "0",
      width: numberAttr(layerAttrs, "width", map.width),
      x: 0,
      y: 0,
    });
  }

  for (const groupMatch of xml.matchAll(/<objectgroup\b([^>]*?)(?:\/>|>([\s\S]*?)<\/objectgroup>)/g)) {
    const groupAttrs = attrs(groupMatch[1]);

    map.layers.push({
      draworder: groupAttrs.draworder ?? "topdown",
      id: numberAttr(groupAttrs, "id", map.layers.length + 1),
      name: groupAttrs.name ?? `Object Layer ${map.layers.length + 1}`,
      objects: applyObjectClassDefaults(parseObjects(groupMatch[2] ?? ""), objectClassDefaults),
      opacity: numberAttr(groupAttrs, "opacity", 1),
      type: "objectgroup",
      visible: groupAttrs.visible !== "0",
      x: 0,
      y: 0,
    });
  }

  return normalizeDuplicateTilesets(map);
}

function normalizeThemeTilesets(tilesets, sourcePath) {
  if (!isGreekMapSource(sourcePath)) {
    return tilesets;
  }

  return tilesets.map((tileset) => {
    if (tileset.name !== "cracked_tiles") {
      return tileset;
    }

    return normalizeTilesetImagePath({
      ...tileset,
      name: "cracked_tiles_grecia",
    });
  });
}

function isGreekMapSource(sourcePath) {
  return sourcePath
    .replaceAll("\\", "/")
    .split("/")
    .some((segment) => segment.toLowerCase() === "grecia");
}

function normalizeDuplicateTilesets(map) {
  const tilesets = [...(map.tilesets ?? [])].sort((a, b) => (a.firstgid ?? 0) - (b.firstgid ?? 0));
  const keptByKey = new Map();
  const remaps = [];
  const normalizedTilesets = [];

  for (const tileset of tilesets) {
    const key = duplicateTilesetKey(tileset);

    if (!key) {
      normalizedTilesets.push(tileset);
      continue;
    }

    const kept = keptByKey.get(key);

    if (!kept) {
      keptByKey.set(key, tileset);
      normalizedTilesets.push(tileset);
      continue;
    }

    remaps.push({
      fromFirstgid: tileset.firstgid,
      toFirstgid: kept.firstgid,
      tilecount: Math.min(tileset.tilecount ?? kept.tilecount ?? 0, kept.tilecount ?? tileset.tilecount ?? 0),
      name: tileset.name ?? key,
    });
  }

  if (remaps.length === 0) {
    return map;
  }

  for (const remap of remaps) {
    console.info(`[sync-tiled-assets] Removed duplicate tileset ${remap.name}: ${remap.fromFirstgid} -> ${remap.toFirstgid}`);
  }

  return {
    ...map,
    layers: remapLayerTileGids(map.layers ?? [], remaps),
    tilesets: normalizedTilesets.sort((a, b) => (a.firstgid ?? 0) - (b.firstgid ?? 0)),
  };
}

function duplicateTilesetKey(tileset) {
  return tileset.image
    ? `image:${tileset.image}`
    : tileset.source
      ? `source:${tileset.source}`
      : tileset.name
        ? `name:${tileset.name}`
        : "";
}

function remapLayerTileGids(layers, remaps) {
  return layers.map((layer) => {
    if (layer.type === "tilelayer") {
      return {
        ...layer,
        data: remapTileData(layer.data, remaps),
        chunks: Array.isArray(layer.chunks)
          ? layer.chunks.map((chunk) => ({ ...chunk, data: remapTileData(chunk.data, remaps) }))
          : layer.chunks,
      };
    }

    if (layer.type === "objectgroup") {
      return {
        ...layer,
        objects: (layer.objects ?? []).map((object) => object.gid
          ? { ...object, gid: remapTileGid(object.gid, remaps) }
          : object),
      };
    }

    return layer;
  });
}

function remapTileData(data, remaps) {
  return Array.isArray(data)
    ? data.map((gid) => remapTileGid(gid, remaps))
    : data;
}

function remapTileGid(gid, remaps) {
  if (!Number.isFinite(gid) || gid <= 0) {
    return gid;
  }

  const flags = gid & 0xf0000000;
  const index = gid & ~0xf0000000;
  const remap = remaps.find((entry) =>
    entry.tilecount > 0 &&
    index >= entry.fromFirstgid &&
    index < entry.fromFirstgid + entry.tilecount,
  );

  return remap
    ? flags + remap.toFirstgid + (index - remap.fromFirstgid)
    : gid;
}

function normalizeMapLayers(layers, objectClassDefaults) {
  return layers.map((layer) => {
    if (layer?.type !== "objectgroup") {
      return layer;
    }

    return {
      ...layer,
      objects: applyObjectClassDefaults(layer.objects ?? [], objectClassDefaults),
    };
  });
}

function applyObjectClassDefaults(objects, objectClassDefaults) {
  return objects.map((object) => {
    const className = object.class ?? object.type;
    const defaults = className ? objectClassDefaults.get(className) : undefined;

    if (!defaults?.length) {
      return object;
    }

    const currentProperties = object.properties ?? [];
    const currentNames = new Set(currentProperties.map((property) => property.name.toLowerCase()));
    const inheritedProperties = defaults.filter((property) => !currentNames.has(property.name.toLowerCase()));

    if (inheritedProperties.length === 0) {
      return object;
    }

    return {
      ...object,
      properties: [...currentProperties, ...inheritedProperties],
    };
  });
}

function parseMapTilesets(xml, sourceDir, fallbackTilesets) {
  const fallbackByName = new Map(fallbackTilesets.map((tileset) => [tileset.name, tileset]));
  const tilesets = [];

  for (const match of xml.matchAll(/<tileset\b([^>]*?)(?:\/>|>([\s\S]*?)<\/tileset>)/g)) {
    const tilesetAttrs = attrs(match[1]);
    const firstgid = numberAttr(tilesetAttrs, "firstgid", 1);

    if (tilesetAttrs.source?.startsWith(":/")) {
      console.warn(`[sync-tiled-assets] Ignoring virtual tileset ${tilesetAttrs.source}`);
      continue;
    }

    const sourcePath = tilesetAttrs.source ? path.resolve(sourceDir, tilesetAttrs.source) : undefined;
    const embeddedXml = match[2];
    const parsed = sourcePath && fs.existsSync(sourcePath)
      ? parseTsxTileset(fs.readFileSync(sourcePath, "utf8"), firstgid)
      : embeddedXml
        ? parseTsxTileset(`<tileset ${match[1]}>${embeddedXml}</tileset>`, firstgid)
        : undefined;

    if (parsed) {
      tilesets.push(normalizeTilesetImagePath(parsed));
      continue;
    }

    const fallbackName = path.basename(tilesetAttrs.source ?? "", path.extname(tilesetAttrs.source ?? ""));
    const fallback = fallbackByName.get(fallbackName);

    if (fallback) {
      console.warn(`[sync-tiled-assets] Reusing existing embedded tileset for missing source: ${tilesetAttrs.source}`);
      tilesets.push({ ...fallback, firstgid });
      continue;
    }

    console.warn(`[sync-tiled-assets] Skipping unresolved tileset: ${tilesetAttrs.source ?? "(embedded)"}`);
  }

  return tilesets;
}

function parseTsxTileset(xml, firstgid) {
  const tilesetMatch = xml.match(/<tileset\b([^>]*)>/s);

  if (!tilesetMatch) {
    return undefined;
  }

  const tilesetAttrs = attrs(tilesetMatch[1]);
  const tilesetBody = xml.slice(tilesetMatch.index + tilesetMatch[0].length);
  const topLevelBody = tilesetBody.slice(0, Math.max(0, tilesetBody.search(/<tile\b/)));
  const imageMatch = topLevelBody.match(/<image\b([^>]*)\/>/s);
  const imageAttrs = imageMatch ? attrs(imageMatch[1]) : {};
  const tilewidth = numberAttr(tilesetAttrs, "tilewidth", 16);
  const tileheight = numberAttr(tilesetAttrs, "tileheight", 16);
  const tilecount = numberAttr(tilesetAttrs, "tilecount", 0);
  const columns = numberAttr(tilesetAttrs, "columns", 0);
  const tileset = {
    columns,
    firstgid,
    image: imageAttrs.source,
    imageheight: numberAttr(imageAttrs, "height", columns > 0 ? Math.ceil(tilecount / columns) * tileheight : 0),
    imagewidth: numberAttr(imageAttrs, "width", columns * tilewidth),
    margin: numberAttr(tilesetAttrs, "margin", 0),
    name: tilesetAttrs.name,
    spacing: numberAttr(tilesetAttrs, "spacing", 0),
    tilecount,
    tileheight,
    tilewidth,
    tiles: parseTilesetTiles(xml),
  };

  if (!tileset.image) {
    delete tileset.image;
  }

  if (tileset.tiles.length === 0) {
    delete tileset.tiles;
  }

  return tileset;
}

function parseTilesetTiles(xml) {
  const tiles = [];

  for (const match of xml.matchAll(/<tile\b([^>]*)>([\s\S]*?)<\/tile>/g)) {
    const tileAttrs = attrs(match[1]);
    const body = match[2];
    const tile = {
      id: numberAttr(tileAttrs, "id", 0),
      properties: parseProperties(body),
      animation: parseTileAnimation(body),
    };

    if (tile.properties.length === 0) {
      delete tile.properties;
    }

    if (tile.animation.length === 0) {
      delete tile.animation;
    }

    if (tile.properties || tile.animation) {
      tiles.push(tile);
    }
  }

  return tiles;
}

function parseTileAnimation(xml) {
  const animationMatch = xml.match(/<animation>([\s\S]*?)<\/animation>/);

  if (!animationMatch) {
    return [];
  }

  return [...animationMatch[1].matchAll(/<frame\b([^>]*)\/>/g)].map((match) => {
    const frameAttrs = attrs(match[1]);
    return {
      duration: numberAttr(frameAttrs, "duration", 0),
      tileid: numberAttr(frameAttrs, "tileid", 0),
    };
  });
}

function parseObjects(xml) {
  const objects = [];

  for (const match of xml.matchAll(/<object\b([^>]*?)(?:\/>|>([\s\S]*?)<\/object>)/g)) {
    const objectAttrs = attrs(match[1]);
    const body = match[2] ?? "";
    const object = {
      class: objectAttrs.class,
      height: numberAttr(objectAttrs, "height", 0),
      id: numberAttr(objectAttrs, "id", 0),
      name: objectAttrs.name ?? "",
      properties: parseProperties(body),
      rotation: numberAttr(objectAttrs, "rotation", 0),
      type: objectAttrs.type ?? "",
      visible: objectAttrs.visible !== "0",
      width: numberAttr(objectAttrs, "width", 0),
      x: numberAttr(objectAttrs, "x", 0),
      y: numberAttr(objectAttrs, "y", 0),
    };
    const polygon = parsePolygon(body);

    if (polygon) {
      object.polygon = polygon;
    }

    if (!object.name) {
      delete object.name;
    }

    if (!object.class) {
      delete object.class;
    }

    if (!object.type) {
      delete object.type;
    }

    if (object.properties.length === 0) {
      delete object.properties;
    }

    objects.push(object);
  }

  return objects;
}

function parsePolygon(xml) {
  const polygonMatch = xml.match(/<polygon\b([^>]*)\/>/);

  if (!polygonMatch) {
    return undefined;
  }

  const polygonAttrs = attrs(polygonMatch[1]);
  return (polygonAttrs.points ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((point) => {
      const [x, y] = point.split(",").map(Number);
      return { x, y };
    });
}

function parseProperties(xml) {
  const propertiesMatch = xml.match(/<properties>([\s\S]*?)<\/properties>/);

  if (!propertiesMatch) {
    return [];
  }

  return [...propertiesMatch[1].matchAll(/<property\b([^>]*?)(?:\/>|>([\s\S]*?)<\/property>)/g)].map((match) => {
    const propertyAttrs = attrs(match[1]);
    const rawValue = propertyAttrs.value ?? match[2] ?? "";
    return {
      name: propertyAttrs.name,
      type: propertyAttrs.type ?? "string",
      value: parsePropertyValue(rawValue, propertyAttrs.type),
    };
  });
}

function parsePropertyValue(value, type) {
  if (type === "bool") {
    return value === "true" || value === "1";
  }

  if (type === "int" || type === "float") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return value;
}

function parseCsvTileData(text) {
  return text
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
}

function normalizeTilesetImagePath(tileset) {
  if (!tileset.image && tileset.name && PUBLIC_TILESET_IMAGES[tileset.name]) {
    return { ...tileset, image: `${PUBLIC_TILESET_PREFIX}${PUBLIC_TILESET_IMAGES[tileset.name]}` };
  }

  if (tileset.name && PUBLIC_TILESET_IMAGES[tileset.name]) {
    return { ...tileset, image: `${PUBLIC_TILESET_PREFIX}${PUBLIC_TILESET_IMAGES[tileset.name]}` };
  }

  if (tileset.image && !/^(?:\.\.\/|\/|[A-Za-z]:)/.test(tileset.image)) {
    return { ...tileset, image: `${PUBLIC_TILESET_PREFIX}${path.basename(tileset.image)}` };
  }

  return tileset;
}

function loadExistingTilesetsByRoom(roomsDir) {
  const result = new Map();

  if (!fs.existsSync(roomsDir)) {
    return result;
  }

  for (const file of fs.readdirSync(roomsDir).filter((entry) => entry.endsWith(".json"))) {
    const roomId = path.basename(file, ".json");

    try {
      const map = JSON.parse(fs.readFileSync(path.join(roomsDir, file), "utf8"));
      result.set(roomId, map.tilesets ?? []);
    } catch {
      result.set(roomId, []);
    }
  }

  return result;
}

function upsertArrayProperty(properties, name, value) {
  const next = Array.isArray(properties) ? properties.filter((property) => property.name !== name) : [];
  return [...next, { name, type: "string", value }];
}

function attrs(text) {
  const result = {};

  for (const match of text.matchAll(/([:\w-]+)="([^"]*)"/g)) {
    result[match[1]] = decodeXml(match[2]);
  }

  return result;
}

function numberAttr(values, name, fallback) {
  const parsed = Number(values[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function decodeXml(value) {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}
