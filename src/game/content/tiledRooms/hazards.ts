import { PlayerPose } from "../../simulation/state";

export type TiledProperty = {
  name: string;
  type?: string;
  value: unknown;
};

export type TiledObject = {
  class?: string;
  id: number;
  name?: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  visible?: boolean;
  properties?: TiledProperty[];
};

export type TiledObjectLayer = {
  name: string;
  type: "objectgroup";
  objects?: TiledObject[];
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SpikeTrapHazard = Rect & {
  id: string;
  type: "SpikeTrap";
  damage: number;
  damageCooldown: number;
  cycleMs: number;
  activeFromMs: number;
  activeToMs: number;
};

export const DEFAULT_SPIKE_TRAP = {
  damage: 1,
  damageCooldown: 1000,
  cycleMs: 1350,
  activeFromMs: 600,
  activeToMs: 1200,
} as const;

export function parseTiledSpikeTraps(layer?: TiledObjectLayer): SpikeTrapHazard[] {
  return (layer?.objects ?? [])
    .filter((object) => object.type === "SpikeTrap")
    .map((object) => ({
      id: hazardObjectId(object),
      type: "SpikeTrap" as const,
      x: object.x,
      y: object.y,
      width: object.width ?? 0,
      height: object.height ?? 0,
      damage: numberProperty(object, "damage", DEFAULT_SPIKE_TRAP.damage),
      damageCooldown: numberProperty(object, "damageCooldown", DEFAULT_SPIKE_TRAP.damageCooldown),
      cycleMs: numberProperty(object, "cycleMs", DEFAULT_SPIKE_TRAP.cycleMs),
      activeFromMs: numberProperty(object, "activeFromMs", DEFAULT_SPIKE_TRAP.activeFromMs),
      activeToMs: numberProperty(object, "activeToMs", DEFAULT_SPIKE_TRAP.activeToMs),
    }))
    .filter((hazard) => hazard.width > 0 && hazard.height > 0 && hazard.cycleMs > 0);
}

export function isSpikeTrapActive(hazard: Pick<SpikeTrapHazard, "cycleMs" | "activeFromMs" | "activeToMs">, timeMs: number): boolean {
  const t = positiveModulo(timeMs, hazard.cycleMs);
  return t >= hazard.activeFromMs && t < hazard.activeToMs;
}

export function canApplySpikeTrapDamage(
  hazard: Pick<SpikeTrapHazard, "cycleMs" | "activeFromMs" | "activeToMs" | "damageCooldown">,
  timeMs: number,
  lastDamageAt: number | null,
): boolean {
  return isSpikeTrapActive(hazard, timeMs) && (lastDamageAt === null || timeMs - lastDamageAt >= hazard.damageCooldown);
}

export function playerOverlapsHazard(pose: Pick<PlayerPose, "x" | "y">, radius: number, hazard: Rect): boolean {
  const closestX = clamp(pose.x, hazard.x, hazard.x + hazard.width);
  const closestY = clamp(pose.y, hazard.y, hazard.y + hazard.height);
  return Math.hypot(pose.x - closestX, pose.y - closestY) <= radius;
}

function propertyValue(object: TiledObject, name: string): unknown {
  const normalizedName = name.toLowerCase();
  return object.properties?.find((property) => property.name.toLowerCase() === normalizedName)?.value;
}

function numberProperty(object: TiledObject, name: string, fallback: number): number {
  const value = propertyValue(object, name);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function hazardObjectId(object: TiledObject): string {
  return object.name || `hazard.${object.id}`;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
