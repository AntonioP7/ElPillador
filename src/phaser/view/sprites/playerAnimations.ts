import Phaser from "phaser";
import { PLAYER_ASSET_KEYS } from "../../../game/assets/manifest";

export type PlayerDirection = "left" | "right" | "up" | "down";
export type PlayerAnimationAction = "idle" | "walk" | "run" | "slash" | "walkSlash" | "runSlash" | "hurt" | "death";
export type PlayerAnimationVariant = "sword" | "unarmed";

export const PLAYER_FRAME_WIDTH = 64;
export const PLAYER_FRAME_HEIGHT = 64;
export const PLAYER_SLASH_DURATION_MS = 260;
export const PLAYER_HURT_DURATION_MS = 280;
export const PLAYER_DEATH_DURATION_MS = 1200;

const PLAYER_ANIMATION_FRAMES: Record<PlayerAnimationAction, Record<PlayerDirection, number[]>> = {
  idle: {
    down: range(0, 12),
    left: range(12, 12),
    right: range(24, 12),
    up: range(36, 4),
  },
  walk: {
    down: range(0, 6),
    left: range(6, 6),
    right: range(12, 6),
    up: range(18, 6),
  },
  run: {
    down: range(0, 8),
    left: range(8, 8),
    right: range(16, 8),
    up: range(24, 8),
  },
  slash: {
    down: range(0, 8),
    left: range(8, 8),
    right: range(16, 8),
    up: range(24, 8),
  },
  walkSlash: {
    down: range(0, 6),
    left: range(6, 6),
    right: range(12, 6),
    up: range(18, 6),
  },
  runSlash: {
    down: range(0, 8),
    left: range(8, 8),
    right: range(16, 8),
    up: range(24, 8),
  },
  hurt: {
    down: range(0, 5),
    left: range(5, 5),
    right: range(10, 5),
    up: range(15, 5),
  },
  death: {
    down: range(0, 7),
    left: range(7, 7),
    right: range(14, 7),
    up: range(21, 7),
  },
};

const PLAYER_ANIMATION_TEXTURES: Record<PlayerAnimationVariant, Partial<Record<PlayerAnimationAction, string>>> = {
  sword: {
    idle: PLAYER_ASSET_KEYS.idle,
    walk: PLAYER_ASSET_KEYS.walk,
    run: PLAYER_ASSET_KEYS.run,
    slash: PLAYER_ASSET_KEYS.slash,
    walkSlash: PLAYER_ASSET_KEYS.walkSlash,
    runSlash: PLAYER_ASSET_KEYS.runSlash,
    hurt: PLAYER_ASSET_KEYS.hurt,
    death: PLAYER_ASSET_KEYS.death,
  },
  unarmed: {
    idle: PLAYER_ASSET_KEYS.unarmedIdle,
    walk: PLAYER_ASSET_KEYS.unarmedWalk,
    run: PLAYER_ASSET_KEYS.unarmedRun,
    hurt: PLAYER_ASSET_KEYS.unarmedHurt,
    death: PLAYER_ASSET_KEYS.unarmedDeath,
  },
};

const PLAYER_ANIMATION_DURATIONS: Record<PlayerAnimationAction, number> = {
  idle: 2800,
  walk: 950,
  run: 900,
  slash: PLAYER_SLASH_DURATION_MS,
  walkSlash: PLAYER_SLASH_DURATION_MS,
  runSlash: PLAYER_SLASH_DURATION_MS,
  hurt: PLAYER_HURT_DURATION_MS,
  death: PLAYER_DEATH_DURATION_MS,
};

const PLAYER_ANIMATION_REPEATS: Record<PlayerAnimationAction, number> = {
  idle: -1,
  walk: -1,
  run: -1,
  slash: 0,
  walkSlash: 0,
  runSlash: 0,
  hurt: 0,
  death: 0,
};

export function ensurePlayerAnimations(scene: Phaser.Scene, keyPrefix: string): void {
  for (const variant of Object.keys(PLAYER_ANIMATION_TEXTURES) as PlayerAnimationVariant[]) {
    for (const action of Object.keys(PLAYER_ANIMATION_FRAMES) as PlayerAnimationAction[]) {
      createDirectionalAnimations(scene, keyPrefix, variant, action);
    }
  }
}

export function playerAnimationKey(
  keyPrefix: string,
  variant: PlayerAnimationVariant,
  action: PlayerAnimationAction,
  direction: string,
): string {
  return `${keyPrefix}.${variant}.${action}.${normalizeDirection(direction)}`;
}

export function firstPlayerFrame(action: PlayerAnimationAction, direction: string): number {
  return PLAYER_ANIMATION_FRAMES[action][normalizeDirection(direction)][0];
}

export function playerTextureKey(variant: PlayerAnimationVariant, action: PlayerAnimationAction): string {
  return PLAYER_ANIMATION_TEXTURES[variant][action] ?? PLAYER_ANIMATION_TEXTURES.sword[action] ?? PLAYER_ASSET_KEYS.idle;
}

export function playerVariantForWeapon(weapon: string | undefined): PlayerAnimationVariant {
  return weapon === "Espada" ? "sword" : "unarmed";
}

export function normalizeDirection(direction: string): PlayerDirection {
  if (direction === "left" || direction === "right" || direction === "up" || direction === "down") {
    return direction;
  }

  return "down";
}

function createDirectionalAnimations(
  scene: Phaser.Scene,
  keyPrefix: string,
  variant: PlayerAnimationVariant,
  action: PlayerAnimationAction,
): void {
  const textureKey = PLAYER_ANIMATION_TEXTURES[variant][action];

  if (!textureKey || !scene.textures.exists(textureKey)) {
    return;
  }

  for (const direction of ["left", "right", "up", "down"] as const) {
    const key = playerAnimationKey(keyPrefix, variant, action, direction);

    if (scene.anims.exists(key)) {
      continue;
    }

    scene.anims.create({
      key,
      frames: PLAYER_ANIMATION_FRAMES[action][direction].map((frame) => ({ key: textureKey, frame })),
      duration: PLAYER_ANIMATION_DURATIONS[action],
      repeat: PLAYER_ANIMATION_REPEATS[action],
    });
  }
}

function range(start: number, length: number): number[] {
  return Array.from({ length }, (_, index) => start + index);
}
