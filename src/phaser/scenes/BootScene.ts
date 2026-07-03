import Phaser from "phaser";
import { assetManifest } from "../../game/assets/manifest";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    for (const asset of assetManifest) {
      const path = assetUrl(asset.path);

      if (asset.kind === "spritesheet") {
        this.load.spritesheet(asset.key, path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        });
      } else if (asset.kind === "tilemapTiledJSON") {
        this.load.tilemapTiledJSON(asset.key, path);
      } else if (asset.kind === "json") {
        this.load.json(asset.key, path);
      } else if (asset.domain === "audio") {
        this.load.audio(asset.key, path);
      } else if (asset.domain === "data") {
        this.load.text(asset.key, path);
      } else {
        this.load.image(asset.key, path);
      }
    }
  }

  create(): void {
    this.scene.start("GameplayScene");
  }
}

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;

  if (!path.startsWith("/")) {
    return `${base}${path}`;
  }

  return `${base}${path.slice(1)}`;
}
