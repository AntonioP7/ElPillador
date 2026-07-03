import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.add
      .text(480, 260, "El Pillador", {
        color: "#f5f3e8",
        fontFamily: "serif",
        fontSize: "42px",
      })
      .setOrigin(0.5);
  }
}
