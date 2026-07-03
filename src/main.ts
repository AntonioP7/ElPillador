import Phaser from "phaser";
import "./style.css";
import { BootScene } from "./phaser/scenes/BootScene";
import { GameplayScene } from "./phaser/scenes/GameplayScene";
import { MenuScene } from "./phaser/scenes/MenuScene";

const gameParent = document.querySelector<HTMLDivElement>("#game");

if (!gameParent) {
  throw new Error("Missing #game container");
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: gameParent,
  width: 960,
  height: 540,
  backgroundColor: "#111318",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameplayScene],
};

new Phaser.Game(config);
