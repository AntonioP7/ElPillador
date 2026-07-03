import Phaser from "phaser";
import { Direction } from "../../game/input/actions";
import { actionForCode } from "../../game/input/bindings";
import type { ItemDefinition } from "../../game/content/items";
import { facingVector, MAGIC_PROJECTILE_CONFIG } from "../../game/simulation/combat";
import { isTopDownInputActive, TopDownInputState } from "../../game/simulation/topDown";
import { renderDungeonMap } from "../view/sprites/dungeonMapView";
import {
  getRoomTransform,
  renderTopDownRoom,
  playTopDownPlayerSlash,
  PLAYER_SLASH_DURATION_MS,
  type TopDownRoomTransform,
  TopDownPlayerView,
  updateTopDownPlayerView,
  worldToScreenPoint,
} from "../view/sprites/topDownRoomView";
import {
  isTiledWorldSnapshot,
  playTiledWorldPlayerDamageAnimation,
  playTiledWorldPlayerSlash,
  renderTiledWorldRoom,
  type TiledDoorVisualState,
  type TiledWorldRoomView,
  tickTiledWorldRoomAnimations,
  updateTiledWorldRoomView,
} from "../view/tiled/tiledWorldRoomView";
import { getDefaultSceneBridge, SceneBridge } from "../adapters/sceneBridge";
import type { SceneBridgeActionResult } from "../adapters/sceneBridge";
import { renderHud, renderStatusHud } from "../../ui/hud/hud";
import {
  clearMapOverlay,
  defaultMapFloorForState,
  nextMapFloor,
  renderMapOverlay,
} from "../../ui/map/mapOverlay";
import type { MapFloorId } from "../../ui/map/mapOverlay";
import {
  availableInventoryTabs,
  clearInventoryOverlay,
  DEFAULT_INVENTORY_SELECTION,
  getSelectableInventoryItems,
  inventoryTabColumns,
  inventoryTabItemCount,
  INVENTORY_TABS,
  normalizeInventoryTab,
  renderInventoryOverlay,
} from "../../ui/menu/inventoryOverlay";
import type { InventorySelection, InventoryTab } from "../../ui/menu/inventoryOverlay";
import { CombatViewAdapter, SLIME_DEATH_ANIMATION_MS } from "../view/combat/CombatViewAdapter";

const HUD_REFRESH_MS = 1000;
const MOVE_COOLDOWN_MS = 90;
const SWORD_IMPACT_DELAY_MS = Math.round(PLAYER_SLASH_DURATION_MS * 0.5);
const TILED_DOOR_TEST_TOGGLE_MS = 5000;

type ViewMode = "topdown" | "graph";

type MagicProjectileView = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sprite: Phaser.GameObjects.Arc;
};

export class GameplayScene extends Phaser.Scene {
  private bridge!: SceneBridge;
  private nextTimedRefresh = 0;
  private uiDirty = true;
  private nextMoveAt = 0;
  private activeMenuTab: InventoryTab | null = null;
  private inventorySelection: InventorySelection = { ...DEFAULT_INVENTORY_SELECTION };
  private mapOpen = false;
  private mapFloor: MapFloorId = "piso1";
  private viewMode: ViewMode = "topdown";
  private topDownPlayerView: TopDownPlayerView | null = null;
  private tiledWorldRoomView: TiledWorldRoomView | null = null;
  private combatView: CombatViewAdapter | null = null;
  private readonly tiledDoorVisualState: TiledDoorVisualState = new Map();
  private magicProjectiles: MagicProjectileView[] = [];
  private lastMagicShotAt = -Infinity;
  private playerMovementLockedUntil = -Infinity;
  private swordSlashLockedUntil = -Infinity;
  private pendingMenuScrollFrame: number | null = null;
  private tiledDoorTestEnabled = false;
  private tiledDoorTestOpen = false;
  private readonly pressedDirections = new Set<Direction>();
  private readonly onKeyboardDown = (event: KeyboardEvent): void => {
    this.handleKeyDown(event);
  };
  private readonly onKeyboardUp = (event: KeyboardEvent): void => {
    this.handleKeyUp(event);
  };
  private readonly onPointerDown = (): void => {
    this.handlePointerDown();
  };

  constructor() {
    super("GameplayScene");
  }

  create(): void {
    this.cameras.main.roundPixels = true;
    this.bridge = getDefaultSceneBridge();
    this.applyDebugStartRoom();
    this.viewMode = initialViewMode();
    this.configureTiledDoorTestMode();
    this.mapFloor = defaultMapFloorForState(this.bridge.getSnapshot().state);

    this.renderAll();
    this.bindHudEvents();

    this.input.keyboard?.on("keydown", this.onKeyboardDown);
    this.input.keyboard?.on("keyup", this.onKeyboardUp);
    this.input.on("pointerdown", this.onPointerDown);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.onKeyboardDown);
      this.input.keyboard?.off("keyup", this.onKeyboardUp);
      this.input.off("pointerdown", this.onPointerDown);
      this.clearPendingMenuScroll();
      this.clearTransientSceneObjects();
      this.bridge.setTiledDoorTestOpenOverride(null);
    });
  }

  update(time: number, delta: number): void {
    if (this.isGameOver()) {
      if (this.uiDirty) {
        this.renderUi();
      }
      return;
    }

    const timerResult = this.bridge.refreshTimedSystems();

    if (timerResult.worldChanged) {
      this.pressedDirections.clear();
      this.renderAll();
      return;
    }

    if (timerResult.handled) {
      this.markUiDirty();
    }

    if (this.activeMenuTab || this.mapOpen) {
      this.syncCombatView();

      if (this.tiledWorldRoomView) {
        tickTiledWorldRoomAnimations(this.tiledWorldRoomView);
      }

      if (this.uiDirty) {
        this.renderUi();
      }
      return;
    }

    const combatResult = this.bridge.stepCombat(delta, this.currentCombatBounds());

    if (this.tiledWorldRoomView && combatResult.events.some((event) => event.type === "damage" && event.target === "player")) {
      playTiledWorldPlayerDamageAnimation(this.tiledWorldRoomView, this.bridge.getSnapshot(), this.currentTopDownInput());
    }

    this.renderCombatEvents(combatResult.events);

    if (combatResult.worldChanged) {
      this.renderAll();
      return;
    }

    if (combatResult.handled) {
      this.markUiDirty();
    }

    this.syncCombatView();

    if (this.tiledWorldRoomView) {
      tickTiledWorldRoomAnimations(this.tiledWorldRoomView);
    }

    if (
      this.viewMode === "topdown" &&
      this.tiledWorldRoomView &&
      !this.activeMenuTab &&
      !this.mapOpen
    ) {
      const input = time >= this.playerMovementLockedUntil ? this.currentTopDownInput() : {};
      const result = updateTiledWorldRoomView(this.tiledWorldRoomView, this.bridge, input, delta);

      if (result.worldChanged) {
        this.renderAll();
        return;
      }

      if (result.uiDirty) {
        this.markUiDirty();
      }
    } else if (this.viewMode === "topdown" && !this.activeMenuTab && !this.mapOpen && time >= this.playerMovementLockedUntil) {
      const input = this.currentTopDownInput();

      if (isTopDownInputActive(input)) {
        const movement = this.bridge.stepTopDown(input, delta);
        const transition = this.bridge.tryTopDownDoorTransition();

        if (transition.worldChanged) {
          this.renderAll();
          return;
        }

        if (movement.worldChanged) {
          this.updateTopDownPlayerOnly();
        }

        if (transition.handled) {
          this.markUiDirty();
        }
      }
    }

    if (time < this.nextTimedRefresh) {
      if (this.uiDirty) {
        this.renderUi();
      }
      return;
    }

    this.nextTimedRefresh = time + HUD_REFRESH_MS;
    if (this.uiDirty) {
      this.renderUi();
    } else {
      this.renderStatusOnly();
    }
  }

  private renderAll(): void {
    const snapshot = this.bridge.getSnapshot();

    this.clearTransientSceneObjects();
    this.topDownPlayerView = null;
    this.tiledWorldRoomView = null;
    this.magicProjectiles = [];
    this.combatView = null;

    if (this.viewMode === "graph") {
      renderDungeonMap(this, snapshot);
    } else if (isTiledWorldSnapshot(snapshot)) {
      this.tiledWorldRoomView = renderTiledWorldRoom(this, snapshot, this.tiledDoorVisualState);
      this.bridge.registerTiledRoomDefinition(this.tiledWorldRoomView.room);
      this.combatView = new CombatViewAdapter(this);
      this.combatView.sync(this.bridge.getSnapshot(), this.tiledWorldRoomView.transform, { enemies: true });
    } else {
      this.topDownPlayerView = renderTopDownRoom(this, snapshot);
      this.combatView = new CombatViewAdapter(this);
      this.combatView.sync(snapshot, getRoomTransform(this));
    }

    this.renderUi(snapshot);
  }

  private renderUi(snapshot = this.bridge.getSnapshot()): void {
    const hud = document.querySelector<HTMLElement>("#hud");
    const statusHud = document.querySelector<HTMLElement>("#status-hud");
    const menuRoot = document.querySelector<HTMLElement>("#menu-root");
    const mapRoot = document.querySelector<HTMLElement>("#map-root");
    const gameOverRoot = document.querySelector<HTMLElement>("#game-over-root");

    if (hud) {
      renderHud(hud, snapshot, {
        menuOpen: Boolean(this.activeMenuTab),
        mapOpen: this.mapOpen,
      });
    }

    if (statusHud) {
      this.syncStatusHudPlayfield(statusHud);
      renderStatusHud(statusHud, snapshot, new Date());
    }

    if (mapRoot) {
      if (this.mapOpen) {
        renderMapOverlay(mapRoot, snapshot.state, this.mapFloor);
      } else {
        clearMapOverlay(mapRoot);
      }
    }

    if (menuRoot) {
      if (this.activeMenuTab) {
        this.activeMenuTab = normalizeInventoryTab(this.activeMenuTab, snapshot.state);
        renderInventoryOverlay(menuRoot, snapshot.state, this.activeMenuTab, this.inventorySelection);
        this.scrollActiveMenuSelection(menuRoot);
      } else {
        clearInventoryOverlay(menuRoot);
      }
    }

    if (gameOverRoot) {
      this.renderGameOver(gameOverRoot, snapshot.state.playerHealth <= 0);
    }

    this.uiDirty = false;
  }

  private renderStatusOnly(snapshot = this.bridge.getSnapshot()): void {
    const statusHud = document.querySelector<HTMLElement>("#status-hud");

    if (statusHud) {
      this.syncStatusHudPlayfield(statusHud);
      renderStatusHud(statusHud, snapshot, new Date());
    }
  }

  private syncStatusHudPlayfield(statusHud: HTMLElement): void {
    const playfield = this.currentPlayfieldRect();

    statusHud.style.setProperty("--playfield-left", `${playfield.x}px`);
    statusHud.style.setProperty("--playfield-top", `${playfield.y}px`);
    statusHud.style.setProperty("--playfield-width", `${playfield.width}px`);
    statusHud.style.setProperty("--playfield-height", `${playfield.height}px`);
  }

  private currentPlayfieldRect(): { x: number; y: number; width: number; height: number } {
    if (this.tiledWorldRoomView) {
      return transformToPlayfieldRect(
        this.tiledWorldRoomView.transform,
        this.tiledWorldRoomView.room.width,
        this.tiledWorldRoomView.room.height,
      );
    }

    if (this.viewMode === "topdown") {
      return transformToPlayfieldRect(getRoomTransform(this), 800, 450);
    }

    return {
      x: 0,
      y: 0,
      width: this.scale.width,
      height: this.scale.height,
    };
  }

  private updateTopDownPlayerOnly(): void {
    if (this.viewMode !== "topdown" || this.tiledWorldRoomView) {
      return;
    }

    this.topDownPlayerView = updateTopDownPlayerView(
      this,
      this.topDownPlayerView,
      this.bridge.getSnapshot(),
      this.currentTopDownInput(),
    );
  }

  private syncCombatView(): void {
    if (this.viewMode !== "topdown" || !this.combatView) {
      return;
    }

    if (this.tiledWorldRoomView) {
      this.combatView.sync(this.bridge.getSnapshot(), this.tiledWorldRoomView.transform, { enemies: true });
      return;
    }

    this.combatView.sync(this.bridge.getSnapshot(), getRoomTransform(this));
  }

  private renderCombatEvents(events: SceneBridgeActionResult["events"] = []): void {
    if (this.viewMode !== "topdown" || !this.combatView || events.length === 0) {
      return;
    }

    if (this.tiledWorldRoomView) {
      this.combatView.renderEvents(this.bridge.getSnapshot(), this.tiledWorldRoomView.transform, events);
      return;
    }

    this.combatView.renderEvents(this.bridge.getSnapshot(), getRoomTransform(this), events);
  }

  private currentCombatBounds(): import("../../game/simulation/combat").CombatCollisionBounds {
    if (this.tiledWorldRoomView) {
      return this.bridge.getTiledWorldCombatCollisionBounds(this.tiledWorldRoomView.room);
    }

    return {
      width: 800,
      height: 450,
      playerRadius: 14,
      colliders: this.bridge.getSnapshot().breakableWalls,
    };
  }

  private bindHudEvents(): void {
    const hud = document.querySelector<HTMLElement>("#ui-root");

    if (!hud) {
      return;
    }

    hud.addEventListener("click", this.handleHudClick);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      hud.removeEventListener("click", this.handleHudClick);
    });
  }

  private handleHudClick = (event: MouseEvent): void => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const button = target?.closest<HTMLButtonElement>("button");

    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (button.hasAttribute("data-menu-close")) {
      this.closeInventoryMenu();
      return;
    }

    if (button.hasAttribute("data-map-close")) {
      this.closeMap();
      return;
    }

    if (button.dataset.mapToggle !== undefined) {
      this.toggleMap();
      return;
    }

    const mapFloor = button.dataset.mapFloor as MapFloorId | undefined;

    if (mapFloor) {
      this.mapFloor = mapFloor;
      this.mapOpen = true;
      this.activeMenuTab = null;
      this.pressedDirections.clear();
      this.markUiDirty();
      return;
    }

    const menuRow = button.dataset.menuRow as InventoryTab | undefined;

    if (menuRow && isInventoryTab(menuRow)) {
      const snapshot = this.bridge.getSnapshot();

      if (!availableInventoryTabs(snapshot.state).includes(menuRow)) {
        return;
      }

      this.mapOpen = false;
      this.activeMenuTab = menuRow;
      this.inventorySelection[menuRow] = this.clampInventoryIndex(menuRow, Number(button.dataset.menuIndex ?? 0));
      this.pressedDirections.clear();
      this.markUiDirty();
      return;
    }

    const menuTab = button.dataset.menuTab as InventoryTab | undefined;

    if (menuTab && isInventoryTab(menuTab)) {
      if (!availableInventoryTabs(this.bridge.getSnapshot().state).includes(menuTab)) {
        return;
      }

      if (this.activeMenuTab === menuTab) {
        this.closeInventoryMenu();
      } else {
        this.openInventoryMenu(menuTab);
      }
      return;
    }

    const gameAction = button.dataset.gameAction;

    if (gameAction === "retry-game-over") {
      this.retryAfterGameOver();
      return;
    }

    if (gameAction === "reset" && window.confirm("Reiniciar partida y borrar el progreso actual?")) {
      this.resetGame();
      return;
    }

    if (gameAction === "equip-item" && button.dataset.itemName) {
      const result = this.bridge.dispatch({ type: "equip-item", itemName: button.dataset.itemName });
      this.renderResult(result);
      return;
    }

    if (gameAction === "inspect-item" && button.dataset.itemName) {
      const result = this.bridge.dispatch({ type: "inspect-item", itemName: button.dataset.itemName });
      this.renderResult(result);
      return;
    }

    if (gameAction === "use-equipped-item") {
      this.useEquippedAction();
    }
  };

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === "F8") {
      event.preventDefault();
      this.resetGame();
      return;
    }

    if (this.isGameOver()) {
      event.preventDefault();
      this.retryAfterGameOver();
      return;
    }

    if (event.code === "F2") {
      event.preventDefault();
      this.mapOpen = false;
      this.activeMenuTab = null;
      this.toggleViewMode();
      return;
    }

    if (this.handleMapHotkey(event)) {
      return;
    }

    if (this.handleInventoryHotkey(event)) {
      return;
    }

    const action = actionForCode(event.code);

    if (!action) {
      return;
    }

    event.preventDefault();

    if (this.activeMenuTab || this.mapOpen) {
      return;
    }

    if (this.viewMode === "topdown" && action.type === "use-equipped-item") {
      this.useEquippedAction();
      return;
    }

    if (this.viewMode === "topdown" && action.type === "move") {
      this.pressedDirections.add(action.direction);
      return;
    }

    if (this.viewMode === "topdown" && action.type === "interact" && this.tiledWorldRoomView) {
      const result = this.bridge.interactWithTiledRoom(this.tiledWorldRoomView.room);
      this.renderResult(result);
      return;
    }

    if (this.viewMode === "graph" && action.type === "move" && this.time.now < this.nextMoveAt) {
      return;
    }

    if (this.viewMode === "graph" && action.type === "move") {
      this.nextMoveAt = this.time.now + MOVE_COOLDOWN_MS;
    }

    const result = this.bridge.dispatch(action, { viewMode: this.viewMode });

    if (result.worldChanged) {
      this.renderAll();
      return;
    }

    this.markUiDirty();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const action = actionForCode(event.code);

    if (action?.type === "move") {
      this.pressedDirections.delete(action.direction);
      this.updateTopDownPlayerOnly();
    }
  }

  private handlePointerDown(): void {
    if (this.isGameOver()) {
      this.retryAfterGameOver();
      return;
    }

    if (this.viewMode !== "topdown" || this.activeMenuTab || this.mapOpen) {
      return;
    }

    if (this.isPlayerCombatAnimationActive() || this.time.now < this.swordSlashLockedUntil) {
      return;
    }

    const snapshot = this.bridge.getSnapshot();

    if (snapshot.state.equipment.weapon !== "Espada") {
      return;
    }

    this.playerMovementLockedUntil = this.time.now + PLAYER_SLASH_DURATION_MS;
    this.swordSlashLockedUntil = this.time.now + PLAYER_SLASH_DURATION_MS;
    this.showSwordSlash({});
    this.time.delayedCall(SWORD_IMPACT_DELAY_MS, () => this.resolveSwordImpact());
  }

  private resolveSwordImpact(): void {
    if (!this.sys.settings.active || this.viewMode !== "topdown") {
      return;
    }

    const result = this.tiledWorldRoomView
      ? this.bridge.swingSwordInTiledRoom(this.bridge.getTiledWorldCombatCollisionBounds(this.tiledWorldRoomView.room))
      : this.bridge.dispatch({ type: "swing-sword" });

    this.renderCombatEvents(result.events);

    if (result.worldChanged) {
      this.markUiDirty();
      const enemyDeathDelayMs = result.events?.some((event) => event.type === "death" && event.target === "enemy")
        ? SLIME_DEATH_ANIMATION_MS
        : 0;

      this.time.delayedCall(Math.max(enemyDeathDelayMs, PLAYER_SLASH_DURATION_MS - SWORD_IMPACT_DELAY_MS), () => {
        if (this.sys.settings.active) {
          this.renderAll();
        }
      });
      return;
    }

    if (!this.tiledWorldRoomView) {
      this.updateTopDownPlayerOnly();
    }

    this.markUiDirty();
  }

  private handleInventoryHotkey(event: KeyboardEvent): boolean {
    if (event.code === "Escape" && this.activeMenuTab) {
      event.preventDefault();
      this.closeInventoryMenu();
      return true;
    }

    const tabByKey: Partial<Record<string, InventoryTab>> = {
      KeyI: "items",
      KeyK: "important",
      KeyC: "companions",
      KeyJ: "diary",
    };
    const tab = tabByKey[event.code];

    if (tab) {
      event.preventDefault();

      if (!availableInventoryTabs(this.bridge.getSnapshot().state).includes(tab)) {
        return true;
      }

      if (this.activeMenuTab === tab) {
        this.closeInventoryMenu();
      } else {
        this.openInventoryMenu(tab);
      }

      return true;
    }

    if (!this.activeMenuTab) {
      return false;
    }

    const activeTab = this.activeMenuTab;
    const previous = this.inventorySelection[activeTab];
    const columns = inventoryTabColumns(activeTab);
    const count = inventoryTabItemCount(activeTab, this.bridge.getSnapshot().state);

    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      event.preventDefault();
      this.inventorySelection[activeTab] = this.clampInventoryIndex(activeTab, previous - 1);
      this.markUiDirty();
      return true;
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      event.preventDefault();
      this.inventorySelection[activeTab] = this.clampInventoryIndex(activeTab, previous + 1);
      this.markUiDirty();
      return true;
    }

    if (event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      this.inventorySelection[activeTab] = this.clampInventoryIndex(activeTab, previous - columns);
      this.markUiDirty();
      return true;
    }

    if (event.code === "ArrowDown" || event.code === "KeyS") {
      event.preventDefault();
      this.inventorySelection[activeTab] = this.clampInventoryIndex(activeTab, previous + columns);
      this.markUiDirty();
      return true;
    }

    if (event.code === "Home") {
      event.preventDefault();
      this.inventorySelection[activeTab] = 0;
      this.markUiDirty();
      return true;
    }

    if (event.code === "End") {
      event.preventDefault();
      this.inventorySelection[activeTab] = Math.max(0, count - 1);
      this.markUiDirty();
      return true;
    }

    if (event.code === "Enter" || event.code === "Space") {
      event.preventDefault();
      this.equipSelectedInventoryItem();
      return true;
    }

    if (event.code === "KeyE") {
      event.preventDefault();
      this.inspectSelectedInventoryItem();
      return true;
    }

    if (event.code !== "F2") {
      event.preventDefault();
      return true;
    }

    return false;
  }

  private handleMapHotkey(event: KeyboardEvent): boolean {
    if (event.code === "KeyM") {
      event.preventDefault();
      this.toggleMap();
      return true;
    }

    if (!this.mapOpen) {
      return false;
    }

    if (event.code === "Escape") {
      event.preventDefault();
      this.closeMap();
      return true;
    }

    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      event.preventDefault();
      this.mapFloor = nextMapFloor(this.mapFloor, -1);
      this.markUiDirty();
      return true;
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      event.preventDefault();
      this.mapFloor = nextMapFloor(this.mapFloor, 1);
      this.markUiDirty();
      return true;
    }

    event.preventDefault();
    return true;
  }

  private equipSelectedInventoryItem(): void {
    const item = this.getSelectedInventoryItem();

    if (!item?.equipSlot) {
      this.markUiDirty();
      return;
    }

    const result = this.bridge.dispatch({ type: "equip-item", itemName: item.name });
    this.renderResult(result);
  }

  private inspectSelectedInventoryItem(): void {
    const item = this.getSelectedInventoryItem();

    if (!item) {
      this.markUiDirty();
      return;
    }

    const result = this.bridge.dispatch({ type: "inspect-item", itemName: item.name });
    this.renderResult(result);
  }

  private useEquippedAction(): void {
    if (this.isPlayerCombatAnimationActive()) {
      return;
    }

    const snapshot = this.bridge.getSnapshot();
    const activeItem = snapshot.state.equipment.activeItem;

    if (this.viewMode === "topdown" && activeItem === "Varita") {
      this.fireMagicProjectile();
      return;
    }

    if (this.viewMode === "topdown" && activeItem === "Bombas") {
      const result = this.bridge.dispatch({ type: "place-bomb" });
      this.renderResult(result);
      return;
    }

    const result = this.bridge.dispatch({ type: "use-equipped-item" });
    this.renderResult(result);
  }

  private fireMagicProjectile(): void {
    const snapshot = this.bridge.getSnapshot();

    if (snapshot.state.equipment.activeItem !== "Varita" || !snapshot.state.inventory.includes("Varita")) {
      this.markUiDirty();
      return;
    }

    if (this.time.now - this.lastMagicShotAt < MAGIC_PROJECTILE_CONFIG.cooldownMs) {
      this.markUiDirty();
      return;
    }

    const result = this.bridge.fireMagicProjectile();
    this.lastMagicShotAt = this.time.now;
    this.renderResult(result);
    this.syncCombatView();
  }

  private updateMagicProjectiles(deltaMs: number): void {
    if (this.magicProjectiles.length === 0 || this.viewMode !== "topdown") {
      return;
    }

    const transform = getRoomTransform(this);
    const seconds = Math.max(0, deltaMs / 1000);
    const remaining: MagicProjectileView[] = [];
    let needsFullRender = false;
    let needsUiRender = false;

    for (const projectile of this.magicProjectiles) {
      projectile.x += projectile.vx * seconds;
      projectile.y += projectile.vy * seconds;

      const result = this.bridge.resolveMagicProjectileHit(projectile.x, projectile.y);

      if (result.handled) {
        this.renderCombatEvents(result.events);
        projectile.sprite.destroy();
        needsFullRender ||= Boolean(result.worldChanged);
        needsUiRender = true;
        continue;
      }

      const screen = worldToScreenPoint(projectile.x, projectile.y, transform);
      projectile.sprite.setPosition(screen.x, screen.y);
      projectile.sprite.setRadius(MAGIC_PROJECTILE_CONFIG.radius * transform.scale);
      remaining.push(projectile);
    }

    this.magicProjectiles = remaining;

    if (needsFullRender) {
      this.renderAll();
      return;
    }

    if (needsUiRender) {
      this.markUiDirty();
    }
  }

  private showSwordSlash(input = this.currentTopDownInput()): void {
    const snapshot = this.bridge.getSnapshot();

    if (this.tiledWorldRoomView) {
      playTiledWorldPlayerSlash(this.tiledWorldRoomView, snapshot, input);
      return;
    }

    playTopDownPlayerSlash(this, this.topDownPlayerView, snapshot, input);
  }

  private getSelectedInventoryItem(): ItemDefinition | undefined {
    if (this.activeMenuTab !== "items") {
      return undefined;
    }

    const state = this.bridge.getSnapshot().state;
    const items = getSelectableInventoryItems(state);

    return items[this.clampInventoryIndex("items", this.inventorySelection.items)];
  }

  private isPlayerCombatAnimationActive(): boolean {
    return Boolean(this.topDownPlayerView?.isSlashing || this.tiledWorldRoomView?.playerTransientAnimation);
  }

  private currentTopDownInput(): TopDownInputState {
    return {
      up: this.pressedDirections.has("up"),
      down: this.pressedDirections.has("down"),
      left: this.pressedDirections.has("left"),
      right: this.pressedDirections.has("right"),
    };
  }

  private toggleViewMode(): void {
    this.viewMode = this.viewMode === "topdown" ? "graph" : "topdown";
    this.activeMenuTab = null;
    this.pressedDirections.clear();
    this.renderAll();
  }

  private toggleMap(): void {
    const snapshot = this.bridge.getSnapshot();

    this.mapOpen = !this.mapOpen;
    this.activeMenuTab = null;
    this.pressedDirections.clear();

    if (this.mapOpen) {
      this.mapFloor = defaultMapFloorForState(snapshot.state);
    }

    this.markUiDirty();
  }

  private closeMap(): void {
    this.mapOpen = false;
    this.pressedDirections.clear();
    this.markUiDirty();
  }

  private openInventoryMenu(tab: InventoryTab): void {
    this.activeMenuTab = normalizeInventoryTab(tab, this.bridge.getSnapshot().state);
    this.mapOpen = false;
    this.pressedDirections.clear();
    this.clampCurrentInventorySelection();
    this.markUiDirty();
  }

  private closeInventoryMenu(): void {
    this.activeMenuTab = null;
    this.pressedDirections.clear();
    this.markUiDirty();
  }

  private clampCurrentInventorySelection(): void {
    if (!this.activeMenuTab) {
      return;
    }

    this.inventorySelection[this.activeMenuTab] = this.clampInventoryIndex(
      this.activeMenuTab,
      this.inventorySelection[this.activeMenuTab],
    );
  }

  private clampInventoryIndex(tab: InventoryTab, index: number): number {
    const count = inventoryTabItemCount(tab, this.bridge.getSnapshot().state);

    if (count <= 0 || !Number.isFinite(index)) {
      return 0;
    }

    return Math.min(count - 1, Math.max(0, index));
  }

  private renderResult(result: { worldChanged?: boolean }): void {
    if (result.worldChanged) {
      this.renderAll();
      return;
    }

    this.markUiDirty();
  }

  private markUiDirty(): void {
    this.uiDirty = true;
  }

  private isGameOver(): boolean {
    return this.bridge.getSnapshot().state.playerHealth <= 0;
  }

  private resetGame(): void {
    this.activeMenuTab = null;
    this.mapOpen = false;
    this.pressedDirections.clear();
    this.playerMovementLockedUntil = -Infinity;
    this.swordSlashLockedUntil = -Infinity;
    this.tiledDoorVisualState.clear();
    const result = this.bridge.dispatch({ type: "reset" });
    this.renderResult(result);
  }

  private renderGameOver(root: HTMLElement, visible: boolean): void {
    root.hidden = !visible;

    if (!visible) {
      root.replaceChildren();
      return;
    }

    root.innerHTML = `
      <div class="game-over" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <h2 id="game-over-title">GAME OVER</h2>
        <p>Has perdido toda la vida.</p>
        <button type="button" data-game-action="retry-game-over">Volver a intentar</button>
      </div>
    `;
  }

  private retryAfterGameOver(): void {
    this.resetGame();
  }

  private clearTransientSceneObjects(): void {
    this.tweens.killAll();
    this.clearPendingMenuScroll();
    this.combatView?.destroy();

    for (const projectile of this.magicProjectiles) {
      projectile.sprite.destroy();
    }

    this.magicProjectiles = [];
    this.topDownPlayerView?.sprite?.removeAllListeners();
    this.tiledWorldRoomView = null;
    this.children.removeAll(true);
  }

  private scrollActiveMenuSelection(menuRoot: HTMLElement): void {
    this.clearPendingMenuScroll();
    this.pendingMenuScrollFrame = window.requestAnimationFrame(() => {
      this.pendingMenuScrollFrame = null;
      menuRoot.querySelector<HTMLElement>(".menu-tile--selected")?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    });
  }

  private clearPendingMenuScroll(): void {
    if (this.pendingMenuScrollFrame === null) {
      return;
    }

    window.cancelAnimationFrame(this.pendingMenuScrollFrame);
    this.pendingMenuScrollFrame = null;
  }

  private applyDebugStartRoom(): void {
    const roomId = new URLSearchParams(window.location.search).get("room");

    if (roomId) {
      this.bridge.startAtRoom(roomId);
    }
  }

  private configureTiledDoorTestMode(): void {
    this.tiledDoorTestEnabled = new URLSearchParams(window.location.search).get("doorTest") === "1";

    if (!this.tiledDoorTestEnabled) {
      this.bridge.setTiledDoorTestOpenOverride(null);
      return;
    }

    this.tiledDoorTestOpen = false;
    this.bridge.setTiledDoorTestOpenOverride(this.tiledDoorTestOpen);
    this.time.addEvent({
      delay: TILED_DOOR_TEST_TOGGLE_MS,
      loop: true,
      callback: () => {
        this.tiledDoorTestOpen = !this.tiledDoorTestOpen;
        this.bridge.setTiledDoorTestOpenOverride(this.tiledDoorTestOpen);
        this.pressedDirections.clear();
        this.renderAll();
      },
    });
  }
}

function initialViewMode(): ViewMode {
  return new URLSearchParams(window.location.search).get("view") === "graph" ? "graph" : "topdown";
}

function transformToPlayfieldRect(
  transform: TopDownRoomTransform,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round(transform.offsetX),
    y: Math.round(transform.offsetY),
    width: Math.round(width * transform.scale),
    height: Math.round(height * transform.scale),
  };
}

function isInventoryTab(value: string): value is InventoryTab {
  return INVENTORY_TABS.includes(value as InventoryTab);
}
