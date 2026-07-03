import Phaser from "phaser";
import {
  canApplySpikeTrapDamage,
  playerOverlapsHazard,
  SpikeTrapHazard,
} from "../../../game/content/tiledRooms/hazards";
import { PlayerPose } from "../../../game/simulation/state";

export type HazardDamageEvent = {
  hazard: SpikeTrapHazard;
  message: string;
};

export class HazardObjectSystem {
  private readonly lastDamageAtByHazardId = new Map<string, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly hazards: SpikeTrapHazard[],
    private readonly playerRadius: number,
  ) {
    if (hazards.length === 0) {
      console.info("[HazardObjectSystem] No SpikeTrap objects found in Hazards layer");
    } else {
      console.info(`[HazardObjectSystem] Loaded ${hazards.length} SpikeTrap object(s)`);
    }
  }

  update(playerPose: PlayerPose): HazardDamageEvent | null {
    const now = this.scene.time.now;

    for (const hazard of this.hazards) {
      if (!playerOverlapsHazard(playerPose, this.playerRadius, hazard)) {
        continue;
      }

      const lastDamageAt = this.lastDamageAtByHazardId.get(hazard.id) ?? null;

      if (!canApplySpikeTrapDamage(hazard, now, lastDamageAt)) {
        continue;
      }

      this.lastDamageAtByHazardId.set(hazard.id, now);

      return {
        hazard,
        message: "Pinchos",
      };
    }

    return null;
  }

  destroy(): void {
    this.lastDamageAtByHazardId.clear();
  }
}
