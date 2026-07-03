import Phaser from "phaser";
import { assetManifest } from "../../game/assets/manifest";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    for (const asset of assetManifest) {
      if (asset.kind === "spritesheet") {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        });
      } else if (asset.kind === "tilemapTiledJSON") {
        this.load.tilemapTiledJSON(asset.key, asset.path);
      } else if (asset.kind === "json") {
        this.load.json(asset.key, asset.path);
      } else if (asset.domain === "audio") {
        this.load.audio(asset.key, asset.path);
      } else if (asset.domain === "data") {
        this.load.text(asset.key, asset.path);
      } else {
        this.load.image(asset.key, asset.path);
      }
    }
  }

  create(): void {
    this.scene.start("GameplayScene");
  }
}
