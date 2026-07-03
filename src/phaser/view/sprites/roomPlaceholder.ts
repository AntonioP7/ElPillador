import Phaser from "phaser";

export function renderRoomPlaceholder(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  const centerX = width / 2;
  const centerY = height / 2;

  scene.add.rectangle(centerX, centerY, 680, 360, 0x202833).setStrokeStyle(4, 0xd7be7d);
  scene.add.rectangle(centerX, centerY, 520, 240, 0x17202a).setStrokeStyle(2, 0x51616b);
  scene.add.circle(centerX, centerY, 18, 0xf5f3e8).setStrokeStyle(3, 0x111318);

  scene.add
    .text(centerX, centerY - 150, "PZ-E1", {
      color: "#f5f3e8",
      fontFamily: "monospace",
      fontSize: "28px",
    })
    .setOrigin(0.5);

  scene.add
    .text(centerX, centerY + 150, "Entrada", {
      color: "#d7be7d",
      fontFamily: "monospace",
      fontSize: "18px",
    })
    .setOrigin(0.5);
}
