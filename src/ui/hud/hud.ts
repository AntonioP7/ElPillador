import { guilleTimerLabel } from "../../game/simulation/timer";
import { companionDefinitions } from "../../game/content/companions";
import { SceneBridgeSnapshot } from "../../phaser/adapters/sceneBridge";

export type HudRenderOptions = {
  menuOpen?: boolean;
  mapOpen?: boolean;
};

export function renderHud(
  container: HTMLElement,
  snapshot: SceneBridgeSnapshot,
  options: HudRenderOptions = {},
): void {
  const { state, room, interactions, message } = snapshot;
  const timerClass = state.timerState.guilleCircuitOpen ? "hud__timer" : "hud__timer hud__timer--closed";
  const availableInteractions = interactions.filter((interaction) => interaction.status === "available");
  const blockedInteractions = interactions.filter((interaction) => interaction.status === "blocked");
  const hasCompanion = companionDefinitions.some((companion) => state.inventory.includes(companion.itemName));
  const prompt =
    availableInteractions.length > 0
      ? "Hay algo interesante cerca"
      : blockedInteractions.length > 0
        ? "Algo de esta sala aun se resiste"
        : "Explora la sala y busca una salida";

  setStableHtml(container, `
    <div class="hud__header">
      <h1 class="hud__title">El Pillador</h1>
      <button class="hud__icon-button hud__icon-button--danger" type="button" data-game-action="reset" title="Reiniciar partida" aria-label="Reiniciar partida">R</button>
    </div>
    <nav class="hud__actions" aria-label="Menu de partida">
      <button class="${options.menuOpen ? "hud__button hud__button--active" : "hud__button"}" type="button" data-menu-tab="items">Items</button>
      <button class="hud__button" type="button" data-menu-tab="important">Import.</button>
      <button class="hud__button" type="button" data-menu-tab="diary">Diario</button>
      ${hasCompanion ? `<button class="hud__button" type="button" data-menu-tab="companions">Comp.</button>` : ""}
      <button class="${options.mapOpen ? "hud__button hud__button--active" : "hud__button"}" type="button" data-map-toggle>Mapa</button>
    </nav>
    <div class="hud__place">
      <span>${escapeHtml(floorLabel(state.currentFloor))}</span>
      <strong>${escapeHtml(zoneLabel(room.zone))}</strong>
      <em>${escapeHtml(prompt)}</em>
    </div>
    <div class="${timerClass}">
      <span>Circuito Guille</span>
      <strong>${escapeHtml(guilleTimerLabel(state.timerState))}</strong>
    </div>
    <p class="hud__message">${escapeHtml(message)}</p>
  `);
}

export function renderStatusHud(
  container: HTMLElement,
  snapshot: SceneBridgeSnapshot,
  now = new Date(),
): void {
  const hasClock = snapshot.state.inventory.includes("Reloj");
  const weapon = snapshot.state.equipment.weapon ?? "Sin arma";
  const actionItem = snapshot.state.equipment.activeItem ?? "Sin item";
  const usableItem = snapshot.state.equipment.activeItem ?? snapshot.state.equipment.weapon;
  const health = Math.max(0, Math.min(100, Math.round(snapshot.state.playerHealth)));
  const maxHealth = Math.max(1, Math.round(snapshot.state.playerCombat.maxHealth || 100));
  const combatHealth = Math.max(0, Math.min(maxHealth, Math.round(snapshot.state.playerCombat.health ?? health)));
  const healthUnits = Math.min(health, combatHealth);
  const healthFillWidth = Math.floor(319 * (healthUnits / maxHealth));
  const frameSrc = assetUrl("assets/game/ui/healthbar/Full_HealthBar.png");
  const portraitSrc = assetUrl("assets/game/ui/healthbar/Portrait_pillador.png");
  const fillSrc = assetUrl("assets/game/ui/healthbar/UI_StatusBar_Fill_HP.png");

  setStableHtml(container, `
    <div class="status-hud__vitals" aria-label="Vida del jugador: ${healthUnits} de ${maxHealth}">
      <img class="status-hud__vitals-frame" src="${frameSrc}" alt="" aria-hidden="true" />
      <img class="status-hud__portrait" src="${portraitSrc}" alt="" aria-hidden="true" />
      <div class="status-hud__hp-track" aria-hidden="true">
        <div class="status-hud__hp-fill" style="width: ${healthFillWidth}px">
          <img src="${fillSrc}" alt="" />
        </div>
      </div>
      <span class="status-hud__hp-label">${healthUnits}/${maxHealth}</span>
    </div>
    <div class="status-hud__cluster">
      <div class="status-hud__clock">
        <span>Hora</span>
        <strong>${hasClock ? formatClock(now) : "--:--"}</strong>
      </div>
      <div class="status-hud__equipment">
        <span>Arma</span>
        <strong>${escapeHtml(weapon)}</strong>
        <span>Accion</span>
        <strong>${escapeHtml(actionItem)}</strong>
      </div>
      <button class="status-hud__action" type="button" data-game-action="use-equipped-item" ${usableItem ? "" : "disabled"}>
        Usar ${escapeHtml(usableItem ?? "item")}
      </button>
    </div>
  `);
}

function setStableHtml(container: HTMLElement, html: string): void {
  if (container.innerHTML === html) {
    return;
  }

  container.innerHTML = html;
}

function floorLabel(floor: string): string {
  return {
    piso1: "Piso 1",
    piso2: "Piso 2",
    sabios: "Sabios",
  }[floor] ?? floor;
}

function zoneLabel(zone: string): string {
  return {
    "Lotería": "Loteria",
    "Panadería": "Panaderia",
  }[zone] ?? zone;
}

function formatClock(now: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
}

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}${path.startsWith("/") ? path.slice(1) : path}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
