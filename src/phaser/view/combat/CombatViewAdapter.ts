import Phaser from "phaser";
import { ENEMY_ASSET_KEYS } from "../../../game/assets/manifest";
import { SlimeEnemy } from "../../../game/content/enemies";
import type { EnemyAnimationState } from "../../../game/ai/types";
import type { Direction } from "../../../game/input/actions";
import { BOMB_CONFIG } from "../../../game/simulation/combat";
import type { CombatEvent } from "../../../game/simulation/combat";
import type { SceneBridgeSnapshot } from "../../adapters/sceneBridge";
import type { TopDownRoomTransform } from "../sprites/topDownRoomView";
import { worldToScreenPoint } from "../sprites/topDownRoomView";

type EnemyView = {
  body: Phaser.GameObjects.Sprite;
  lastAnimation?: string;
  lastWorldX?: number;
  lastWorldY?: number;
  facing?: Direction;
  species?: SceneBridgeSnapshot["combatEnemies"][number]["species"];
  dyingUntil?: number;
};

export class CombatViewAdapter {
  private readonly enemyViews = new Map<string, EnemyView>();
  private readonly projectileViews = new Map<string, Phaser.GameObjects.Arc>();
  private readonly areaWarningViews = new Map<string, Phaser.GameObjects.Arc>();
  private readonly bombWarningViews = new Map<string, Phaser.GameObjects.Arc>();

  constructor(private readonly scene: Phaser.Scene) {}

  sync(snapshot: SceneBridgeSnapshot, transform: TopDownRoomTransform, options: { enemies?: boolean } = {}): void {
    if (options.enemies) {
      this.syncEnemies(snapshot, transform);
    }
    this.syncProjectiles(snapshot, transform);
    this.syncAreaAttacks(snapshot, transform);
    this.syncBombWarning(snapshot, transform);
  }

  destroy(): void {
    for (const view of this.enemyViews.values()) {
      view.body.destroy();
    }
    for (const view of this.projectileViews.values()) {
      view.destroy();
    }
    for (const view of this.areaWarningViews.values()) {
      view.destroy();
    }
    for (const view of this.bombWarningViews.values()) {
      view.destroy();
    }
    this.enemyViews.clear();
    this.projectileViews.clear();
    this.areaWarningViews.clear();
    this.bombWarningViews.clear();
  }

  renderEvents(snapshot: SceneBridgeSnapshot, transform: TopDownRoomTransform, events: CombatEvent[]): void {
    let damageNumberIndex = 0;

    for (const event of events) {
      if (event.type === "death" && event.target === "enemy") {
        this.playEnemyDeath(event.targetId);
        continue;
      }

      if (event.type !== "damage" || event.amount <= 0) {
        continue;
      }

      this.createDamageNumber(snapshot, transform, event, damageNumberIndex);
      damageNumberIndex += 1;
    }
  }

  private playEnemyDeath(enemyId: string): void {
    const view = this.enemyViews.get(enemyId);

    if (!view || !(view.body instanceof Phaser.GameObjects.Sprite) || !isSlimeSpecies(view.species)) {
      return;
    }

    const deathAnimation = slimeAnimationKey(view.species, "death", view.facing ?? "down");
    view.body.clearTint();
    view.body.play(deathAnimation, true);
    view.lastAnimation = deathAnimation;
    view.dyingUntil = Date.now() + SLIME_DEATH_ANIMATION_MS;
  }

  private syncEnemies(snapshot: SceneBridgeSnapshot, transform: TopDownRoomTransform): void {
    const activeIds = new Set(snapshot.combatEnemies.map((enemy) => enemy.id));

    for (const [id, view] of this.enemyViews) {
      if (!activeIds.has(id)) {
        if (snapshot.state.defeatedEnemies.includes(id) && view.body instanceof Phaser.GameObjects.Sprite && isSlimeSpecies(view.species)) {
          if (!view.dyingUntil) {
            const deathAnimation = slimeAnimationKey(view.species, "death", view.facing ?? "down");
            view.body.play(deathAnimation, true);
            view.lastAnimation = deathAnimation;
            view.dyingUntil = Date.now() + SLIME_DEATH_ANIMATION_MS;
          }

          if (Date.now() < view.dyingUntil) {
            continue;
          }
        }

        view.body.destroy();
        this.enemyViews.delete(id);
      }
    }

    for (const enemy of snapshot.combatEnemies) {
      const point = worldToScreenPoint(enemy.x, enemy.y, transform);
      const radius = enemy.radius * transform.scale;
      const view = this.enemyViews.get(enemy.id) ?? this.createEnemy(enemy);

      if (!view) {
        continue;
      }

      view.body.setPosition(point.x, point.y);
      view.body.setDisplaySize(Math.max(28, radius * 2.6), Math.max(28, radius * 2.6));
      this.syncEnemyAnimation(view, enemy.id, enemy.species, enemy.x, enemy.y, snapshot);
      this.syncEnemyDamageTint(view.body, enemy.id, snapshot);

      view.lastWorldX = enemy.x;
      view.lastWorldY = enemy.y;
    }
  }

  private syncProjectiles(snapshot: SceneBridgeSnapshot, transform: TopDownRoomTransform): void {
    const activeIds = new Set(snapshot.activeProjectiles.map((projectile) => projectile.id));

    for (const [id, view] of this.projectileViews) {
      if (!activeIds.has(id)) {
        view.destroy();
        this.projectileViews.delete(id);
      }
    }

    for (const projectile of snapshot.activeProjectiles) {
      const point = worldToScreenPoint(projectile.x, projectile.y, transform);
      const radius = projectile.radius * transform.scale;
      const view = this.projectileViews.get(projectile.id) ?? this.createProjectile(projectile.id);

      view.setPosition(point.x, point.y);
      view.setRadius(radius);
    }
  }

  private syncAreaAttacks(snapshot: SceneBridgeSnapshot, transform: TopDownRoomTransform): void {
    const activeIds = new Set(snapshot.activeAreaAttacks.map((attack) => attack.id));

    for (const [id, view] of this.areaWarningViews) {
      if (!activeIds.has(id)) {
        view.destroy();
        this.areaWarningViews.delete(id);
      }
    }

    for (const attack of snapshot.activeAreaAttacks) {
      const point = worldToScreenPoint(attack.x, attack.y, transform);
      const radius = attack.radius * transform.scale;
      const started = Date.parse(attack.startedAt);
      const elapsed = Number.isFinite(started) ? Date.now() - started : 0;
      const active = elapsed >= attack.activeFromMs && elapsed < attack.activeToMs;
      const lingering = elapsed >= attack.activeToMs;
      const view = this.areaWarningViews.get(attack.id) ?? this.createAreaWarning(attack.id);

      view.setPosition(point.x, point.y);
      view.setRadius(radius);
      view.setStrokeStyle(3, active ? 0xfff1a8 : lingering ? 0x8d6f6f : 0xf0a3a3, active ? 0.9 : lingering ? 0.28 : 0.72);
      view.setFillStyle(active ? 0xffd966 : 0x8d3333, active ? 0.14 : lingering ? 0.03 : 0.08);
    }
  }

  private syncBombWarning(snapshot: SceneBridgeSnapshot, transform: TopDownRoomTransform): void {
    const activeBomb = snapshot.activeBomb;
    const activeId = activeBomb ? `bomb.${activeBomb.roomId}.${activeBomb.placedAt}` : "";

    for (const [id, view] of this.bombWarningViews) {
      if (id !== activeId) {
        view.destroy();
        this.bombWarningViews.delete(id);
      }
    }

    if (!activeBomb) {
      return;
    }

    const point = worldToScreenPoint(activeBomb.x, activeBomb.y, transform);
    const view = this.bombWarningViews.get(activeId) ?? this.createBombWarning(activeId);

    view.setPosition(point.x, point.y);
    view.setRadius(BOMB_CONFIG.radius * transform.scale);
  }

  private createDamageNumber(snapshot: SceneBridgeSnapshot, transform: TopDownRoomTransform, event: CombatEvent, index: number): void {
    if (event.type !== "damage") {
      return;
    }

    const lane = index % 5;
    const row = Math.floor(index / 5);
    const offsetX = (lane - 2) * 13;
    const offsetY = row * -8 + Math.abs(lane - 2) * 3;
    const worldPoint = event.x !== undefined && event.y !== undefined
      ? { x: event.x, y: event.y }
      : { x: snapshot.state.playerPose.x, y: snapshot.state.playerPose.y - 18 };
    const point = worldToScreenPoint(worldPoint.x, worldPoint.y, transform);
    const text = this.scene.add
      .text(point.x + offsetX, point.y - 22 + offsetY, `-${event.amount}`, {
        color: event.target === "player" ? "#ffdf8a" : "#fff4d6",
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        fontStyle: "700",
        stroke: "#2a1111",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(80);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 26,
      alpha: 0,
      duration: 650,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  private createProjectile(id: string): Phaser.GameObjects.Arc {
    const view = this.scene.add
      .circle(0, 0, 7, 0x7dd7ff, 0.95)
      .setStrokeStyle(2, 0xf5f3e8, 0.9)
      .setDepth(35);

    this.projectileViews.set(id, view);
    return view;
  }

  private createEnemy(enemy: SceneBridgeSnapshot["combatEnemies"][number]): EnemyView | null {
    if (isSlimeSpecies(enemy.species)) {
      ensureSlimeAnimations(this.scene, enemy.species);
      const body = this.scene.add
        .sprite(0, 0, slimeAssetKeys(enemy.species).idle, 0)
        .setOrigin(0.5)
        .setDepth(18);
      const view = { body, species: enemy.species };

      this.enemyViews.set(enemy.id, view);
      return view;
    }

    return null;
  }

  private syncEnemyAnimation(
    view: EnemyView,
    enemyId: string,
    species: SceneBridgeSnapshot["combatEnemies"][number]["species"],
    enemyX: number,
    enemyY: number,
    snapshot: SceneBridgeSnapshot,
  ): void {
    if (!isSlimeSpecies(species)) {
      return;
    }

    const aiState = snapshot.state.enemyCombat[enemyId]?.aiState;
    const animationState = snapshot.enemyAnimationState[enemyId] ?? SlimeEnemy.animationForAiState(aiState);
    const facing = slimeFacingFromMotion(view, enemyX, enemyY);
    const animation = slimeAnimationKey(species, animationState, facing);

    if (view.lastAnimation !== animation) {
      view.body.play(animation, true);
      view.lastAnimation = animation;
    }
  }

  private syncEnemyDamageTint(
    sprite: Phaser.GameObjects.Sprite,
    enemyId: string,
    snapshot: SceneBridgeSnapshot,
  ): void {
    const combat = snapshot.state.enemyCombat[enemyId];
    const redUntil = Math.max(
      finiteTimestamp(combat?.invulnerableUntil),
      finiteTimestamp(combat?.stunnedUntil),
    );

    if (Number.isFinite(redUntil) && Date.now() < redUntil) {
      sprite.setTint(0xff5b5b);
      return;
    }

    sprite.clearTint();
  }

  private createAreaWarning(id: string): Phaser.GameObjects.Arc {
    const view = this.scene.add
      .circle(0, 0, 32, 0x8d3333, 0.08)
      .setStrokeStyle(3, 0xf0a3a3, 0.72)
      .setDepth(13);

    this.areaWarningViews.set(id, view);
    return view;
  }

  private createBombWarning(id: string): Phaser.GameObjects.Arc {
    const view = this.scene.add
      .circle(0, 0, 32, 0xd7be7d, 0.08)
      .setStrokeStyle(2, 0xd7be7d, 0.65)
      .setDepth(12);

    this.bombWarningViews.set(id, view);
    return view;
  }
}

function ensureSlimeAnimations(scene: Phaser.Scene, species: SlimeSpecies): void {
  const keys = slimeAssetKeys(species);
  createSlimeDirectionalAnimations(scene, species, "idle", keys.idle, keys.idleMeta, 6, 7, -1);
  createSlimeDirectionalAnimations(scene, species, "walk", keys.walk, keys.walkMeta, 8, 10, -1);
  createSlimeDirectionalAnimations(scene, species, "run", keys.run, keys.runMeta, 8, 12, -1);
  createSlimeDirectionalAnimations(scene, species, "area_attack", keys.attack, keys.attackMeta, 10, 10, 0);
  createSlimeDirectionalAnimations(scene, species, "hurt", keys.hurt, keys.hurtMeta, 5, 24, 0);
  createSlimeDirectionalAnimations(scene, species, "death", keys.death, keys.deathMeta, 10, 6, 0);
}

export const SLIME_DEATH_ANIMATION_MS = 1700;

function createSlimeDirectionalAnimations(
  scene: Phaser.Scene,
  species: SlimeSpecies,
  state: EnemyAnimationState,
  textureKey: string,
  metadataKey: string,
  framesPerDirection: number,
  frameRate: number,
  repeat: number,
): void {
  const rows = slimeAnimationRows(scene, metadataKey, framesPerDirection);

  for (const row of rows) {
    const direction = tiledDirectionToDirection(row.name);
    const key = slimeAnimationKey(species, state, direction);

    if (scene.anims.exists(key)) {
      continue;
    }

    scene.anims.create({
      key,
      frames: row.frames.map((frame) => ({ key: textureKey, frame })),
      frameRate,
      repeat,
    });
  }
}

type SlimeAnimationMetadata = {
  rows?: Array<{
    name?: string;
    frames?: number[];
  }>;
};

type SlimeAnimationRow = {
  name: string;
  frames: number[];
};

function slimeAnimationRows(scene: Phaser.Scene, metadataKey: string, fallbackFramesPerDirection: number): SlimeAnimationRow[] {
  const metadata = parseSlimeAnimationMetadata(scene.cache.json.get(metadataKey));

  if (metadata.length > 0) {
    return metadata;
  }

  const fallbackDirections = ["down", "top", "left", "right"];
  return fallbackDirections.map((name, row) => ({
    name,
    frames: Array.from({ length: fallbackFramesPerDirection }, (_, index) => row * fallbackFramesPerDirection + index),
  }));
}

function parseSlimeAnimationMetadata(value: unknown): SlimeAnimationRow[] {
  const metadata = value as SlimeAnimationMetadata | undefined;

  return (metadata?.rows ?? [])
    .map((row) => ({
      name: typeof row.name === "string" ? row.name : "",
      frames: Array.isArray(row.frames) ? row.frames.filter((frame): frame is number => Number.isInteger(frame)) : [],
    }))
    .filter((row) => row.name.length > 0 && row.frames.length > 0);
}

function tiledDirectionToDirection(direction: string): Direction {
  return direction === "top" ? "up" : direction as Direction;
}

function finiteTimestamp(value: string | undefined): number {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function slimeFacingFromMotion(view: EnemyView, enemyX: number, enemyY: number): Direction {
  const dx = enemyX - (view.lastWorldX ?? enemyX);
  const dy = enemyY - (view.lastWorldY ?? enemyY);
  const deadZone = 0.25;

  if (Math.abs(dx) > deadZone || Math.abs(dy) > deadZone) {
    view.facing = Math.abs(dx) > Math.abs(dy)
      ? dx > 0 ? "right" : "left"
      : dy > 0 ? "down" : "up";
  }

  view.facing ??= "down";
  return view.facing;
}

type SlimeSpecies = "slime1" | "slime2" | "slime3";

function isSlimeSpecies(species: SceneBridgeSnapshot["combatEnemies"][number]["species"]): species is SlimeSpecies {
  return species === "slime1" || species === "slime2" || species === "slime3";
}

function slimeAssetKeys(species: SlimeSpecies) {
  if (species === "slime2") {
    return {
      idle: ENEMY_ASSET_KEYS.slime2Idle,
      idleMeta: ENEMY_ASSET_KEYS.slime2IdleMeta,
      walk: ENEMY_ASSET_KEYS.slime2Walk,
      walkMeta: ENEMY_ASSET_KEYS.slime2WalkMeta,
      run: ENEMY_ASSET_KEYS.slime2Run,
      runMeta: ENEMY_ASSET_KEYS.slime2RunMeta,
      attack: ENEMY_ASSET_KEYS.slime2Attack,
      attackMeta: ENEMY_ASSET_KEYS.slime2AttackMeta,
      hurt: ENEMY_ASSET_KEYS.slime2Hurt,
      hurtMeta: ENEMY_ASSET_KEYS.slime2HurtMeta,
      death: ENEMY_ASSET_KEYS.slime2Death,
      deathMeta: ENEMY_ASSET_KEYS.slime2DeathMeta,
    };
  }

  if (species === "slime3") {
    return {
      idle: ENEMY_ASSET_KEYS.slime3Idle,
      idleMeta: ENEMY_ASSET_KEYS.slime3IdleMeta,
      walk: ENEMY_ASSET_KEYS.slime3Walk,
      walkMeta: ENEMY_ASSET_KEYS.slime3WalkMeta,
      run: ENEMY_ASSET_KEYS.slime3Run,
      runMeta: ENEMY_ASSET_KEYS.slime3RunMeta,
      attack: ENEMY_ASSET_KEYS.slime3Attack,
      attackMeta: ENEMY_ASSET_KEYS.slime3AttackMeta,
      hurt: ENEMY_ASSET_KEYS.slime3Hurt,
      hurtMeta: ENEMY_ASSET_KEYS.slime3HurtMeta,
      death: ENEMY_ASSET_KEYS.slime3Death,
      deathMeta: ENEMY_ASSET_KEYS.slime3DeathMeta,
    };
  }

  return {
    idle: ENEMY_ASSET_KEYS.slime1Idle,
    idleMeta: ENEMY_ASSET_KEYS.slime1IdleMeta,
    walk: ENEMY_ASSET_KEYS.slime1Walk,
    walkMeta: ENEMY_ASSET_KEYS.slime1WalkMeta,
    run: ENEMY_ASSET_KEYS.slime1Run,
    runMeta: ENEMY_ASSET_KEYS.slime1RunMeta,
    attack: ENEMY_ASSET_KEYS.slime1Attack,
    attackMeta: ENEMY_ASSET_KEYS.slime1AttackMeta,
    hurt: ENEMY_ASSET_KEYS.slime1Hurt,
    hurtMeta: ENEMY_ASSET_KEYS.slime1HurtMeta,
    death: ENEMY_ASSET_KEYS.slime1Death,
    deathMeta: ENEMY_ASSET_KEYS.slime1DeathMeta,
  };
}

function slimeAnimationKey(species: SlimeSpecies, state: EnemyAnimationState, direction: Direction): string {
  return `enemy.${species}.${state}.${direction}`;
}
