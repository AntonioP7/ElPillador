import { companionDefinitions } from "../../game/content/companions";
import { itemDefinitions, ItemDefinition } from "../../game/content/items";
import { buildRumorJournal, rumorDefinitions, RumorJournalEntry } from "../../game/content/rumors";
import { GameState } from "../../game/simulation/state";

export type InventoryTab = "items" | "important" | "diary" | "companions" | "gallery";
export type InventorySelection = Record<InventoryTab, number>;

export const INVENTORY_TABS: InventoryTab[] = ["items", "important", "diary", "companions", "gallery"];
export const DEFAULT_INVENTORY_SELECTION: InventorySelection = {
  items: 0,
  important: 0,
  diary: 0,
  companions: 0,
  gallery: 0,
};

const EQUIPABLE_ITEM_NAMES = ["Reloj", "Lupa", "Varita", "Bombas"] as const;
const BAG_ITEM_NAMES = ["Pocion", "Item Resurreccion", "Item Hermano", "Item NPC6", "Item NPC7"] as const;
const TRIFORCE_ITEM_NAMES = ["Fragmento Trifuerza 1", "Fragmento Trifuerza 2", "Fragmento Trifuerza 3"] as const;
const INGREDIENT_ITEM_NAMES = [
  "Ingrediente legendario 1",
  "Ingrediente legendario 2",
  "Ingrediente legendario 3",
  "Ingrediente legendario 4",
  "Ingrediente legendario 5",
] as const;
const BLOCKADE_ITEM_NAMES = [
  "Interruptor Azul",
  "Codigo numerico",
  "Valvula remota",
  "Interruptor sala control",
  "Interruptor sellado 1",
  "Interruptor sellado 2",
  "Interruptor sellado 3",
  "Palabra secreta",
] as const;
const LEGENDARY_ITEM_NAMES = [
  "Reliquia de Tuto",
  "Reliquia del Pintor",
  "Reliquia de Guille",
  "Reliquia de Carlos",
  "Reliquia de Antonio",
  "Reliquia de Mascle",
  "Reliquia de Xavi",
  "Reliquia de Enric",
] as const;
const SPECIAL_BOSS_ITEM_NAMES = [
  "Objeto Xavi",
  "Dedos Magicos",
  "Zapatillas Guillem",
  "Varita de Sauco",
  "Cebo especial",
  "Pista Loteria 1",
  "Pista Loteria 2",
] as const;

type GalleryEntry = {
  id: string;
  title: string;
  description: string;
  unlockFlag?: (state: GameState) => boolean;
};

const galleryEntries: GalleryEntry[] = [
  {
    id: "entrada",
    title: "Entrada",
    description: "El primer umbral de la mazmorra.",
    unlockFlag: (state) => state.discoveredRooms.length > 1,
  },
  {
    id: "giratiempo",
    title: "Giratiempo",
    description: "Un eco detenido en SS13. No se guarda en la mochila.",
    unlockFlag: (state) => state.rumors.includes(13),
  },
  {
    id: "correr",
    title: "Circuito de Guille",
    description: "La zona donde el tiempo aprieta y las salidas se sellan.",
    unlockFlag: (state) => state.timerState.guilleCircuitStatus !== "idle",
  },
  {
    id: "companeros",
    title: "Companeros",
    description: "Retratos de aliados encontrados durante la aventura.",
    unlockFlag: (state) => companionDefinitions.some((companion) => state.inventory.includes(companion.itemName)),
  },
  {
    id: "sabios",
    title: "Sabios",
    description: "Recuerdos de las salas superiores.",
    unlockFlag: (state) => state.currentFloor === "sabios",
  },
  {
    id: "trifuerza",
    title: "Fragmentos",
    description: "La promesa de una reliquia reconstruida.",
    unlockFlag: (state) => state.inventory.some((item) => item.startsWith("Fragmento Trifuerza")),
  },
];

export function inventoryTabItemCount(tab: InventoryTab, state?: GameState): number {
  if (tab === "items") {
    return getSelectableInventoryItems(state).length;
  }

  if (tab === "important") {
    return getSelectableImportantItems(state).length;
  }

  if (tab === "diary") {
    return discoveredRumors(state).length;
  }

  if (tab === "companions") {
    return discoveredCompanions(state).length;
  }

  return discoveredGalleryEntries(state).length;
}

export function inventoryTabColumns(tab: InventoryTab): number {
  if (tab === "diary" || tab === "companions") {
    return 3;
  }

  return 4;
}

export function nextInventoryTab(current: InventoryTab, direction: -1 | 1): InventoryTab {
  const index = INVENTORY_TABS.indexOf(current);
  const nextIndex = (index + direction + INVENTORY_TABS.length) % INVENTORY_TABS.length;

  return INVENTORY_TABS[nextIndex];
}

export function availableInventoryTabs(state: GameState): InventoryTab[] {
  return hasDiscoveredCompanion(state)
    ? INVENTORY_TABS
    : INVENTORY_TABS.filter((tab) => tab !== "companions");
}

export function normalizeInventoryTab(tab: InventoryTab, state: GameState): InventoryTab {
  return availableInventoryTabs(state).includes(tab) ? tab : "items";
}

export function getSelectableInventoryItems(state?: GameState): ItemDefinition[] {
  const candidates = [
    "Espada",
    ...EQUIPABLE_ITEM_NAMES,
    ...BAG_ITEM_NAMES,
  ];

  return itemDefinitionsByNames(candidates).filter((item) => !state || isOwned(state, item.name));
}

export function renderInventoryOverlay(
  container: HTMLElement,
  state: GameState,
  activeTab: InventoryTab,
  selection: InventorySelection,
): void {
  const normalizedTab = normalizeInventoryTab(activeTab, state);
  const selectedIndex = clampIndex(selection[normalizedTab], inventoryTabItemCount(normalizedTab, state));
  const tabTitle = tabLabel(normalizedTab);
  const tabs = availableInventoryTabs(state);

  container.hidden = false;
  setStableHtml(container, `
    <section class="menu-screen" aria-label="Menu del Pillador">
      <div class="menu-screen__frame">
        <header class="menu-screen__header">
          <span class="menu-screen__emblem" aria-hidden="true"></span>
          <div>
            <h2>Diario del Pillador</h2>
            <p>${escapeHtml(tabTitle)} - reliquias, pistas y recuerdos</p>
          </div>
          <button class="menu-screen__close" type="button" data-menu-close aria-label="Cerrar menu">X</button>
        </header>
        <div class="menu-screen__tabs" role="tablist" aria-label="Secciones del menu">
          ${tabs.map((tab) => renderTabButton(tab, normalizedTab)).join("")}
        </div>
        <div class="menu-screen__body">
          <div class="menu-screen__content">
            ${renderTabContent(state, normalizedTab, selectedIndex)}
          </div>
          <aside class="menu-screen__detail">
            ${renderSelectedDetail(state, normalizedTab, selectedIndex)}
          </aside>
        </div>
        <footer class="menu-screen__footer">
          <span>I Items - K Importantes - J Diario${hasDiscoveredCompanion(state) ? " - C Companeros" : ""} - Esc cerrar</span>
          <span>Flechas seleccionar - Enter equipar - E inspeccionar</span>
        </footer>
      </div>
    </section>
  `);
}

export function clearInventoryOverlay(container: HTMLElement): void {
  if (container.hidden && container.innerHTML === "") {
    return;
  }

  container.hidden = true;
  container.innerHTML = "";
}

function setStableHtml(container: HTMLElement, html: string): void {
  if (container.innerHTML === html) {
    return;
  }

  container.innerHTML = html;
}

function renderTabButton(tab: InventoryTab, activeTab: InventoryTab): string {
  const active = tab === activeTab;

  return `
    <button class="${active ? "menu-screen__tab menu-screen__tab--active" : "menu-screen__tab"}" type="button" role="tab" aria-selected="${active}" data-menu-tab="${tab}">
      <span class="menu-screen__tab-icon menu-screen__tab-icon--${tab}" aria-hidden="true"></span>
      ${escapeHtml(tabLabel(tab))}
    </button>
  `;
}

function renderTabContent(state: GameState, tab: InventoryTab, selectedIndex: number): string {
  if (tab === "items") {
    return renderItemsTab(state, selectedIndex);
  }

  if (tab === "important") {
    return renderImportantTab(state, selectedIndex);
  }

  if (tab === "diary") {
    return renderDiaryPages(state, selectedIndex);
  }

  if (tab === "companions") {
    return renderCompanionCards(state, selectedIndex);
  }

  return renderGallery(state, selectedIndex);
}

function renderItemsTab(state: GameState, selectedIndex: number): string {
  const selectable = getSelectableInventoryItems(state);
  const indexByName = new Map(selectable.map((item, index) => [item.name, index]));

  return `
    <div class="inventory-layout">
      <section class="inventory-panel inventory-panel--sword">
        <h3>Arma</h3>
        ${renderInventorySlot(state, "Espada", indexByName.get("Espada"), selectedIndex, "Fija", "items", "reserved")}
      </section>
      <section class="inventory-panel inventory-panel--equipables">
        <h3>Equipables</h3>
        <div class="inventory-grid inventory-grid--equipables">
          ${EQUIPABLE_ITEM_NAMES.map((name) => renderInventorySlot(state, name, indexByName.get(name), selectedIndex, "Ranura", "items", "reserved")).join("")}
        </div>
      </section>
      <section class="inventory-panel inventory-panel--bag">
        <h3>Bolsa</h3>
        <div class="inventory-grid inventory-grid--bag">
          ${BAG_ITEM_NAMES.filter((name) => isOwned(state, name)).map((name) => renderInventorySlot(state, name, indexByName.get(name), selectedIndex, "Intercambio", "items", "hidden")).join("") || renderSilentEmpty()}
        </div>
      </section>
      <section class="inventory-panel inventory-panel--triforce">
        <h3>Fragmentos</h3>
        <div class="triforce-layout">
          ${TRIFORCE_ITEM_NAMES.map((name, index) => renderTriforcePiece(state, name, index)).join("")}
        </div>
      </section>
      <section class="inventory-panel inventory-panel--ingredients">
        <h3>Ingredientes</h3>
        <div class="ingredient-circle">
          ${INGREDIENT_ITEM_NAMES.map((name, index) => renderIngredientOrb(state, name, index)).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderImportantTab(state: GameState, selectedIndex: number): string {
  const selectable = getSelectableImportantItems(state);
  const indexByName = new Map(selectable.map((item, index) => [item.name, index]));

  return `
    <div class="inventory-layout inventory-layout--important">
      <section class="inventory-panel inventory-panel--wide">
        <h3>Llaves de bloqueo</h3>
        <div class="inventory-grid inventory-grid--important">
          ${BLOCKADE_ITEM_NAMES.filter((name) => isOwned(state, name)).map((name) => renderInventorySlot(state, name, indexByName.get(name), selectedIndex, "Sello", "important", "hidden")).join("") || renderSilentEmpty()}
        </div>
      </section>
      <section class="inventory-panel inventory-panel--wide">
        <h3>Objetos legendarios</h3>
        <div class="inventory-grid inventory-grid--legendary">
          ${LEGENDARY_ITEM_NAMES.filter((name) => isOwned(state, name)).map((name) => renderInventorySlot(state, name, indexByName.get(name), selectedIndex, "Jefe", "important", "hidden")).join("") || renderSilentEmpty()}
        </div>
      </section>
      <section class="inventory-panel inventory-panel--wide">
        <h3>Items especiales</h3>
        <div class="inventory-grid inventory-grid--important">
          ${SPECIAL_BOSS_ITEM_NAMES.filter((name) => isOwned(state, name)).map((name) => renderInventorySlot(state, name, indexByName.get(name), selectedIndex, "Especial", "important", "hidden")).join("") || renderSilentEmpty()}
        </div>
      </section>
    </div>
  `;
}

function renderInventorySlot(
  state: GameState,
  name: string,
  selectableIndex: number | undefined,
  selectedIndex: number,
  label: string,
  row: InventoryTab,
  emptyMode: "reserved" | "hidden",
): string {
  const item = itemByName(name);
  const owned = isOwned(state, name);
  const selected = owned && selectableIndex === selectedIndex;
  const equipped = state.equipment.weapon === name || state.equipment.activeItem === name;
  const visibleName = owned ? item?.name ?? name : "";
  const iconClass = owned ? `menu-tile__icon menu-tile__icon--${itemIconClass(name)}` : "menu-tile__icon menu-tile__icon--empty";
  const emptyClass = !owned && emptyMode === "reserved" ? " menu-tile--empty-slot" : "";

  return `
    <button class="${menuTileClass("item", selected, owned, equipped)}${emptyClass}" type="button" data-menu-row="${row}" data-menu-index="${selectableIndex ?? 0}" aria-selected="${selected}" ${owned ? "" : "disabled"}>
      <span class="${iconClass}" aria-hidden="true"></span>
      ${owned ? `<strong>${escapeHtml(visibleName)}</strong><em>${equipped ? "Equipado" : label}</em>` : ""}
    </button>
  `;
}

function renderTriforcePiece(state: GameState, name: string, index: number): string {
  const owned = isOwned(state, name);
  const label = owned ? name : `Fragmento ${index + 1} oculto`;

  return `
    <span class="triforce-piece triforce-piece--${index + 1} ${owned ? "triforce-piece--filled" : ""}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>
  `;
}

function renderIngredientOrb(state: GameState, name: string, index: number): string {
  const owned = isOwned(state, name);
  const label = owned ? name : `Ingrediente ${index + 1} oculto`;

  return `
    <span class="ingredient-orb ingredient-orb--${index + 1} ${owned ? "ingredient-orb--filled" : ""}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>
  `;
}

function renderSilentEmpty(): string {
  return `<div class="inventory-silent-empty" aria-hidden="true"></div>`;
}

function renderDiaryPages(state: GameState, selectedIndex: number): string {
  const rumors = discoveredRumors(state);

  if (rumors.length === 0) {
    return renderEmptyPanel("Diario sin rumores", "Las paginas se iran escribiendo al escuchar pistas o examinar objetos.");
  }

  return `
    <div class="menu-grid menu-grid--diary">
      ${rumors.map((rumor, index) => {
        const selected = index === selectedIndex;
        const used = state.usedRumors.includes(rumor.id);

        return `
          <button class="${menuTileClass("page", selected, true, used)}" type="button" data-menu-row="diary" data-menu-index="${index}" aria-selected="${selected}">
            <span class="menu-tile__page-number">${rumor.id}</span>
            <strong>${escapeHtml(rumor.title)}</strong>
            <em>${used ? "Hecho" : "Pendiente"}</em>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderCompanionCards(state: GameState, selectedIndex: number): string {
  const companions = discoveredCompanions(state);

  if (companions.length === 0) {
    return renderEmptyPanel("Sin companeros", "Las cartas apareceran cuando alguien se una al grupo.");
  }

  return `
    <div class="menu-grid menu-grid--companions">
      ${companions.map((companion, index) => {
        const selected = index === selectedIndex;

        return `
          <button class="${menuTileClass("companion", selected, true)}" type="button" data-menu-row="companions" data-menu-index="${index}" aria-selected="${selected}">
            <span class="menu-tile__portrait" aria-hidden="true"></span>
            <strong>${escapeHtml(companion.name)}</strong>
            <em>${escapeHtml(companion.role)}</em>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderGallery(state: GameState, selectedIndex: number): string {
  const entries = discoveredGalleryEntries(state);

  if (entries.length === 0) {
    return renderEmptyPanel("Galeria vacia", "Los recuerdos apareceran al descubrir lugares, pistas y momentos clave.");
  }

  return `
    <div class="menu-grid menu-grid--gallery">
      ${entries.map((entry, index) => {
        const selected = index === selectedIndex;

        return `
          <button class="${menuTileClass("gallery", selected, true)}" type="button" data-menu-row="gallery" data-menu-index="${index}" aria-selected="${selected}">
            <span class="menu-tile__art" aria-hidden="true"></span>
            <strong>${escapeHtml(entry.title)}</strong>
            <em>Desbloqueado</em>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderSelectedDetail(state: GameState, tab: InventoryTab, selectedIndex: number): string {
  if (tab === "items") {
    return renderItemDetail(state, getSelectableInventoryItems(state)[clampIndex(selectedIndex, inventoryTabItemCount("items", state))]);
  }

  if (tab === "important") {
    return renderItemDetail(state, getSelectableImportantItems(state)[clampIndex(selectedIndex, inventoryTabItemCount("important", state))]);
  }

  if (tab === "diary") {
    return renderDiaryDetail(state, selectedIndex);
  }

  if (tab === "companions") {
    return renderCompanionDetail(state, selectedIndex);
  }

  return renderGalleryDetail(state, selectedIndex);
}

function renderItemDetail(state: GameState, item: ItemDefinition | undefined): string {
  if (!item) {
    return emptyDetail("Mochila", "Todavia no hay objetos nuevos.");
  }

  const owned = isOwned(state, item.name);
  const equipped = state.equipment.weapon === item.name || state.equipment.activeItem === item.name;
  const canEquip = owned && Boolean(item.equipSlot);
  const canInspect = owned && state.equipment.activeItem === "Lupa";

  return detailShell(
    item.name,
    item.description,
    `
      <div class="menu-detail__runes">
        <span>${owned ? "Obtenido" : "No descubierto"}</span>
        <span>${item.equipSlot ? slotLabel(item.equipSlot) : "Reservado"}</span>
      </div>
      <div class="menu-detail__actions">
        ${canEquip ? `<button class="menu-detail__primary" type="button" data-game-action="equip-item" data-item-name="${escapeHtml(item.name)}">${equipped ? "Equipado" : "Equipar"}</button>` : ""}
        ${canInspect ? `<button class="menu-detail__secondary" type="button" data-game-action="inspect-item" data-item-name="${escapeHtml(item.name)}">Inspeccionar con Lupa</button>` : ""}
      </div>
    `,
  );
}

function renderDiaryDetail(state: GameState, selectedIndex: number): string {
  const rumors = discoveredRumors(state);
  const rumor = rumors[clampIndex(selectedIndex, rumors.length)];

  if (!rumor) {
    return emptyDetail("Diario", "Aun no has descubierto ningun rumor.");
  }

  const used = state.usedRumors.includes(rumor.id);

  return detailShell(
    rumor.title,
    rumor.text,
    `
      <div class="menu-detail__runes">
        <span>${escapeHtml(rumor.key)}</span>
        <span>${used ? "Secreto encontrado" : "Pendiente"}</span>
        <span>Origen: ${escapeHtml(rumor.source)}</span>
        <span>Destino: ${escapeHtml(rumor.targetRoomId)}</span>
      </div>
    `,
  );
}

function renderCompanionDetail(state: GameState, selectedIndex: number): string {
  const companions = discoveredCompanions(state);
  const companion = companions[clampIndex(selectedIndex, companions.length)];

  if (!companion) {
    return emptyDetail("Companeros", "Todavia no hay nadie en el grupo.");
  }

  return detailShell(
    companion.name,
    `${companion.role}. ${companion.ability}.`,
    `
      <div class="menu-detail__stats">
        <span>VID ${companion.stats.vida}</span>
        <span>FUE ${companion.stats.fuerza}</span>
        <span>MAG ${companion.stats.magia}</span>
        <span>VEL ${companion.stats.velocidad}</span>
      </div>
    `,
  );
}

function renderGalleryDetail(state: GameState, selectedIndex: number): string {
  const entries = discoveredGalleryEntries(state);
  const entry = entries[clampIndex(selectedIndex, entries.length)];

  if (!entry) {
    return emptyDetail("Galeria", "Aun no se ha guardado ningun recuerdo.");
  }

  return detailShell(
    entry.title,
    entry.description,
    `
      <div class="menu-detail__art-large" aria-hidden="true"></div>
    `,
  );
}

function detailShell(title: string, text: string, body: string): string {
  return `
    <div class="menu-detail__portrait" aria-hidden="true"><span></span></div>
    <article class="menu-detail__copy">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
      ${body}
    </article>
  `;
}

function renderEmptyPanel(title: string, text: string): string {
  return `
    <div class="menu-empty">
      <span aria-hidden="true"></span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function emptyDetail(title: string, text: string): string {
  return detailShell(title, text, `<div class="menu-detail__runes"><span>Sin hallazgos</span></div>`);
}

function getSelectableImportantItems(state?: GameState): ItemDefinition[] {
  const candidates = [
    ...BLOCKADE_ITEM_NAMES,
    ...LEGENDARY_ITEM_NAMES,
    ...SPECIAL_BOSS_ITEM_NAMES,
  ];

  return itemDefinitionsByNames(candidates).filter((item) => !state || isOwned(state, item.name));
}

function discoveredRumors(state?: GameState): RumorJournalEntry[] {
  if (!state) {
    return rumorDefinitions.map((rumor) => ({
      ...rumor,
      discovered: false,
      used: false,
    }));
  }

  return buildRumorJournal(state).filter((rumor) => rumor.discovered);
}

function discoveredCompanions(state?: GameState): typeof companionDefinitions {
  if (!state) {
    return companionDefinitions;
  }

  return companionDefinitions.filter((companion) => state.inventory.includes(companion.itemName));
}

function discoveredGalleryEntries(state?: GameState): GalleryEntry[] {
  if (!state) {
    return galleryEntries;
  }

  return galleryEntries.filter((entry) => entry.unlockFlag?.(state) ?? false);
}

function hasDiscoveredCompanion(state: GameState): boolean {
  return discoveredCompanions(state).length > 0;
}

function itemDefinitionsByNames(names: readonly string[]): ItemDefinition[] {
  return names.map(itemByName).filter((item): item is ItemDefinition => Boolean(item));
}

function itemByName(name: string): ItemDefinition | undefined {
  return itemDefinitions.find((item) => item.name === name);
}

function isOwned(state: GameState, name: string): boolean {
  return state.inventory.includes(name);
}

function menuTileClass(kind: string, selected: boolean, available: boolean, equipped = false): string {
  return [
    "menu-tile",
    `menu-tile--${kind}`,
    selected ? "menu-tile--selected" : "",
    available ? "menu-tile--available" : "menu-tile--locked",
    equipped ? "menu-tile--equipped" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function tabLabel(tab: InventoryTab): string {
  return {
    items: "Items",
    important: "Importantes",
    diary: "Diario",
    companions: "Companeros",
    gallery: "Galeria",
  }[tab];
}

function slotLabel(slot: string): string {
  return {
    weapon: "Arma fija",
    active: "Ranura de accion",
  }[slot] ?? slot;
}

function itemIconClass(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }

  return Math.min(length - 1, Math.max(0, index));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
