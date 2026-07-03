import Phaser from "phaser";
import { ConnectionKind } from "../../../game/content/maps/types";
import {
  TOP_DOWN_PLAYER_RADIUS,
  TOP_DOWN_ROOM_HEIGHT,
  TOP_DOWN_ROOM_WIDTH,
  isTopDownInputActive,
  TopDownInputState,
} from "../../../game/simulation/topDown";
import { SceneBridgeSnapshot } from "../../adapters/sceneBridge";
import {
  ensurePlayerAnimations,
  firstPlayerFrame,
  PLAYER_FRAME_HEIGHT,
  PLAYER_FRAME_WIDTH,
  PlayerAnimationAction,
  PlayerAnimationVariant,
  playerAnimationKey as buildPlayerAnimationKey,
  playerTextureKey,
  playerVariantForWeapon,
  PLAYER_SLASH_DURATION_MS,
} from "./playerAnimations";

export type TopDownPlayerView = {
  container: Phaser.GameObjects.Container;
  nose: Phaser.GameObjects.Arc;
  sprite?: Phaser.GameObjects.Sprite;
  lastAnimationKey?: string;
  isSlashing?: boolean;
};

export { PLAYER_SLASH_DURATION_MS };

const TOP_DOWN_PLAYER_ANIMATION_PREFIX = "topdown.player";
const PLAYER_VISUAL_SCALE = 1.5;

const zoneColors: Record<string, number> = {
  Entrada: 0xffe699,
  Cocina: 0xf4cccc,
  Grecia: 0xcfe2f3,
  Correr: 0xd9ead3,
  Catacumbas: 0xd9d2e9,
  "Magia Oscura": 0xb4a7d6,
  "Loteria": 0xf6b26b,
  "Lotería": 0xf6b26b,
  "Panaderia": 0x9fc5e8,
  "Panadería": 0x9fc5e8,
  Gym: 0x93c47d,
};

const doorColors: Record<ConnectionKind, number> = {
  normal: 0x61c17c,
  bloqueo: 0xc95050,
  secreto: 0x4f8fd8,
  escalera: 0xd7be7d,
};

export type TopDownRoomTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type Transform = TopDownRoomTransform;

export function renderTopDownRoom(scene: Phaser.Scene, snapshot: SceneBridgeSnapshot): TopDownPlayerView {
  const transform = getRoomTransform(scene);
  const graphics = scene.add.graphics();
  const roomRect = toScreenRect(0, 0, TOP_DOWN_ROOM_WIDTH, TOP_DOWN_ROOM_HEIGHT, transform);
  const fill = zoneColors[snapshot.room.zone] ?? 0x51616b;

  graphics.fillStyle(0x101217, 1);
  graphics.fillRect(0, 0, scene.scale.width, scene.scale.height);

  graphics.fillStyle(fill, 0.82);
  graphics.fillRoundedRect(roomRect.x, roomRect.y, roomRect.width, roomRect.height, 8);
  graphics.lineStyle(8, 0x1a2028, 1);
  graphics.strokeRoundedRect(roomRect.x, roomRect.y, roomRect.width, roomRect.height, 8);
  graphics.lineStyle(2, 0xf5f3e8, 0.2);
  graphics.strokeRoundedRect(roomRect.x + 8, roomRect.y + 8, roomRect.width - 16, roomRect.height - 16, 6);

  drawDoors(scene, graphics, snapshot, transform);
  drawBreakableWalls(graphics, snapshot, transform);
  drawCombatEnemies(scene, graphics, snapshot, transform);
  drawActiveBomb(scene, graphics, snapshot, transform);
  drawInteractables(scene, graphics, snapshot, transform);

  scene.add
    .text(scene.scale.width / 2, 24, roomTitle(snapshot.room.zone), {
      color: "#f5f3e8",
      fontFamily: "monospace",
      fontSize: "18px",
    })
    .setOrigin(0.5);

  return createTopDownPlayer(scene, snapshot, transform);
}

function drawDoors(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  snapshot: SceneBridgeSnapshot,
  transform: Transform,
): void {
  for (const door of snapshot.topDownDoors) {
    const rect = toScreenRect(door.x, door.y, door.width, door.height, transform);
    const color = door.exit.access.open ? doorColors[door.exit.connection.kind] : 0x8d3333;

    graphics.fillStyle(color, door.exit.access.open ? 0.92 : 0.7);
    graphics.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 5);
    graphics.lineStyle(2, door.exit.access.open ? 0xf5f3e8 : 0xf0a3a3, 0.72);
    graphics.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 5);

    scene.add
      .text(rect.x + rect.width / 2, rect.y + rect.height / 2, door.exit.connection.kind === "escalera" ? "Escalera" : "Salida", {
        color: "#101217",
        fontFamily: "monospace",
        fontSize: "10px",
        fontStyle: "700",
      })
      .setOrigin(0.5);
  }
}

function drawBreakableWalls(
  graphics: Phaser.GameObjects.Graphics,
  snapshot: SceneBridgeSnapshot,
  transform: Transform,
): void {
  for (const wall of snapshot.breakableWalls) {
    const rect = toScreenRect(wall.x, wall.y, wall.width, wall.height, transform);

    graphics.fillStyle(0x6b5145, 0.95);
    graphics.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 4);
    graphics.lineStyle(2, 0xf0a3a3, 0.8);
    graphics.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 4);
    graphics.lineStyle(2, 0x2b1c18, 0.65);
    graphics.lineBetween(rect.x + 6, rect.y + rect.height - 6, rect.x + rect.width - 6, rect.y + 6);
    graphics.lineBetween(rect.x + rect.width * 0.3, rect.y + 5, rect.x + rect.width * 0.7, rect.y + rect.height - 5);
  }
}

function drawCombatEnemies(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  snapshot: SceneBridgeSnapshot,
  transform: Transform,
): void {
  for (const enemy of snapshot.combatEnemies) {
    const point = toScreenPoint(enemy.x, enemy.y, transform);
    const radius = enemy.radius * transform.scale;
    const color = enemy.kind === "boss" ? 0x8d3333 : 0x734f96;

    graphics.fillStyle(color, 0.96);
    graphics.fillCircle(point.x, point.y, radius);
    graphics.lineStyle(3, 0x101217, 0.92);
    graphics.strokeCircle(point.x, point.y, radius);

    scene.add
      .text(point.x, point.y - radius - 10, enemy.kind === "boss" ? "BOSS" : "EN", {
        color: "#f5f3e8",
        fontFamily: "monospace",
        fontSize: "10px",
        fontStyle: "700",
      })
      .setOrigin(0.5);
  }
}

function drawActiveBomb(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  snapshot: SceneBridgeSnapshot,
  transform: Transform,
): void {
  if (!snapshot.activeBomb) {
    return;
  }

  const point = toScreenPoint(snapshot.activeBomb.x, snapshot.activeBomb.y, transform);
  const radius = 12 * transform.scale;

  graphics.fillStyle(0x191b20, 1);
  graphics.fillCircle(point.x, point.y, radius);
  graphics.lineStyle(3, 0xd7be7d, 0.9);
  graphics.strokeCircle(point.x, point.y, radius);

  scene.add
    .text(point.x, point.y + radius + 10, "Bomba", {
      color: "#101217",
      fontFamily: "monospace",
      fontSize: "10px",
      fontStyle: "700",
    })
    .setOrigin(0.5);
}

function drawInteractables(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  snapshot: SceneBridgeSnapshot,
  transform: Transform,
): void {
  for (const interactable of snapshot.topDownInteractables) {
    const point = toScreenPoint(interactable.x, interactable.y, transform);
    const completed = interactable.status === "completed";
    const blocked = interactable.status === "blocked";
    const color = completed ? 0x667075 : blocked ? 0x8d3333 : interactable.kind === "npc" ? 0x4f8fd8 : 0xd7be7d;

    if (interactable.kind === "npc") {
      graphics.fillStyle(color, completed ? 0.48 : 0.9);
      graphics.fillCircle(point.x, point.y, 18 * transform.scale);
      graphics.lineStyle(2, 0x101217, 0.9);
      graphics.strokeCircle(point.x, point.y, 18 * transform.scale);
    } else {
      const size = 32 * transform.scale;
      graphics.fillStyle(color, completed ? 0.48 : 0.9);
      graphics.fillRoundedRect(point.x - size / 2, point.y - size / 2, size, size, 5);
      graphics.lineStyle(2, 0x101217, 0.9);
      graphics.strokeRoundedRect(point.x - size / 2, point.y - size / 2, size, size, 5);
    }

    scene.add
      .text(point.x, point.y + 28 * transform.scale, shortLabel(interactable.label), {
        color: "#101217",
        fontFamily: "monospace",
        fontSize: "10px",
        fontStyle: "700",
      })
      .setOrigin(0.5);
  }
}

export function updateTopDownPlayerView(
  scene: Phaser.Scene,
  view: TopDownPlayerView | null,
  snapshot: SceneBridgeSnapshot,
  input: TopDownInputState = {},
): TopDownPlayerView {
  const transform = getRoomTransform(scene);

  if (!view || !view.container.active) {
    return createTopDownPlayer(scene, snapshot, transform, input);
  }

  const pose = snapshot.state.playerPose;
  const point = toScreenPoint(pose.x, pose.y, transform);
  const radius = TOP_DOWN_PLAYER_RADIUS * transform.scale;
  const nose = facingOffset(pose.facing, radius + 8);
  const variant = playerVariantForWeapon(snapshot.state.equipment.weapon);
  const animationKey = playerAnimationKey(variant, playerActionForSnapshot(snapshot, input), pose.facing);

  view.container.setPosition(point.x, point.y);
  view.nose.setPosition(nose.x, nose.y);
  setPlayerDisplaySize(view.sprite, transform.scale);

  if (!view.isSlashing) {
    view.lastAnimationKey = playPlayerAnimation(view.sprite, animationKey, view.lastAnimationKey);
  }

  return view;
}

function createTopDownPlayer(
  scene: Phaser.Scene,
  snapshot: SceneBridgeSnapshot,
  transform: Transform,
  input: TopDownInputState = {},
): TopDownPlayerView {
  ensurePlayerAnimations(scene, TOP_DOWN_PLAYER_ANIMATION_PREFIX);
  const pose = snapshot.state.playerPose;
  const point = toScreenPoint(pose.x, pose.y, transform);
  const radius = TOP_DOWN_PLAYER_RADIUS * transform.scale;
  const nose = facingOffset(pose.facing, radius + 8);
  const container = scene.add.container(point.x, point.y);
  const variant = playerVariantForWeapon(snapshot.state.equipment.weapon);
  const body = createPlayerBody(scene, radius, pose.facing, variant);
  const noseMarker = scene.add.circle(nose.x, nose.y, 5 * transform.scale, 0xd7be7d, 1);
  const animationKey = playerAnimationKey(variant, playerActionForSnapshot(snapshot, input), pose.facing);

  container.add([body, noseMarker]);

  return {
    container,
    nose: noseMarker,
    sprite: body instanceof Phaser.GameObjects.Sprite ? body : undefined,
    lastAnimationKey: playPlayerAnimation(body instanceof Phaser.GameObjects.Sprite ? body : undefined, animationKey),
  };
}

function createPlayerBody(
  scene: Phaser.Scene,
  radius: number,
  facing: string,
  variant: PlayerAnimationVariant,
): Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite {
  const textureKey = playerTextureKey(variant, "idle");

  if (!scene.textures.exists(textureKey)) {
    return scene.add.circle(0, 0, radius, 0xf5f3e8, 0.98).setStrokeStyle(3, 0x111318);
  }

  return scene.add
    .sprite(0, 0, textureKey, firstPlayerFrame("idle", facing))
    .setOrigin(0.5)
    .setDisplaySize(
      PLAYER_FRAME_WIDTH * PLAYER_VISUAL_SCALE * (radius / TOP_DOWN_PLAYER_RADIUS),
      PLAYER_FRAME_HEIGHT * PLAYER_VISUAL_SCALE * (radius / TOP_DOWN_PLAYER_RADIUS),
    );
}

export function playTopDownPlayerSlash(
  scene: Phaser.Scene,
  view: TopDownPlayerView | null,
  snapshot: SceneBridgeSnapshot,
  input: TopDownInputState = {},
): void {
  ensurePlayerAnimations(scene, TOP_DOWN_PLAYER_ANIMATION_PREFIX);

  const variant = playerVariantForWeapon(snapshot.state.equipment.weapon);
  const slashTexture = playerTextureKey(variant, isTopDownInputActive(input) ? "runSlash" : "slash");

  if (!view?.sprite || view.isSlashing || !scene.textures.exists(slashTexture)) {
    return;
  }

  const pose = snapshot.state.playerPose;
  const moving = isTopDownInputActive(input);
  const nextAnimation = playerAnimationKey(variant, moving ? "walk" : "idle", pose.facing);

  view.isSlashing = true;
  view.lastAnimationKey = playerAnimationKey(variant, moving ? "runSlash" : "slash", pose.facing);
  view.sprite.play(view.lastAnimationKey, true);
  const finishSlash = () => {
    if (!view.sprite?.active || !view.isSlashing) {
      return;
    }

    view.isSlashing = false;
    view.lastAnimationKey = playPlayerAnimation(view.sprite, nextAnimation);
  };

  view.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, finishSlash);
  scene.time.delayedCall(PLAYER_SLASH_DURATION_MS + 40, finishSlash);
}

function playPlayerAnimation(
  sprite: Phaser.GameObjects.Sprite | undefined,
  animationKey: string,
  previousKey?: string,
): string | undefined {
  if (!sprite || previousKey === animationKey) {
    return previousKey;
  }

  sprite.play(animationKey, true);
  return animationKey;
}

function setPlayerDisplaySize(sprite: Phaser.GameObjects.Sprite | undefined, roomScale: number): void {
  sprite?.setDisplaySize(
    PLAYER_FRAME_WIDTH * PLAYER_VISUAL_SCALE * roomScale,
    PLAYER_FRAME_HEIGHT * PLAYER_VISUAL_SCALE * roomScale,
  );
}

function playerAnimationKey(variant: PlayerAnimationVariant, action: PlayerAnimationAction, direction: string): string {
  return buildPlayerAnimationKey(TOP_DOWN_PLAYER_ANIMATION_PREFIX, variant, action, direction);
}

function playerActionForSnapshot(snapshot: SceneBridgeSnapshot, input: TopDownInputState): PlayerAnimationAction {
  if (snapshot.state.playerHealth <= 0) {
    return "death";
  }

  return isTopDownInputActive(input) ? "walk" : "idle";
}

export function getRoomTransform(scene: Phaser.Scene): TopDownRoomTransform {
  const availableWidth = scene.scale.width;
  const availableHeight = scene.scale.height;
  const scale = Math.min(availableWidth / TOP_DOWN_ROOM_WIDTH, availableHeight / TOP_DOWN_ROOM_HEIGHT);

  return {
    scale,
    offsetX: (availableWidth - TOP_DOWN_ROOM_WIDTH * scale) / 2,
    offsetY: (availableHeight - TOP_DOWN_ROOM_HEIGHT * scale) / 2,
  };
}

function toScreenRect(x: number, y: number, width: number, height: number, transform: Transform): Phaser.Geom.Rectangle {
  return new Phaser.Geom.Rectangle(
    transform.offsetX + x * transform.scale,
    transform.offsetY + y * transform.scale,
    width * transform.scale,
    height * transform.scale,
  );
}

function toScreenPoint(x: number, y: number, transform: Transform): { x: number; y: number } {
  return {
    x: transform.offsetX + x * transform.scale,
    y: transform.offsetY + y * transform.scale,
  };
}

export function worldToScreenPoint(x: number, y: number, transform: TopDownRoomTransform): { x: number; y: number } {
  return toScreenPoint(x, y, transform);
}

export function screenToWorldPoint(x: number, y: number, transform: TopDownRoomTransform): { x: number; y: number } {
  return {
    x: (x - transform.offsetX) / transform.scale,
    y: (y - transform.offsetY) / transform.scale,
  };
}

function facingOffset(direction: string, amount: number): { x: number; y: number } {
  return {
    up: { x: 0, y: -amount },
    down: { x: 0, y: amount },
    left: { x: -amount, y: 0 },
    right: { x: amount, y: 0 },
  }[direction] ?? { x: 0, y: amount };
}

function shortLabel(label: string): string {
  return label.replace(/^Cofre:\s*/, "").replace(/^Secreto:\s*/, "").slice(0, 18);
}

function roomTitle(zone: string): string {
  return {
    "LoterÃ­a": "Loteria",
    "PanaderÃ­a": "Panaderia",
  }[zone] ?? zone;
}
