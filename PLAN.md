# Plan de desarrollo: El Pillador

## Resumen

El Pillador se construira como un RPG top-down 2D en Phaser 3, TypeScript y
Vite. La prioridad es llegar rapido a una mazmorra navegable y persistente antes
de invertir en combate completo, assets finales o pulido audiovisual.

La carpeta `H:/Codex/Game/Doc` es la fuente local del proyecto. La documentacion
Markdown es la fuente de verdad de gameplay. Los `.drawio` solo aportan layout
visual. Las escaleras marcadas como eliminadas en Markdown no deben recuperarse
desde etiquetas antiguas del layout.

## M0: scaffold y base tecnica

Estado: implementado.

Objetivo: crear una app minima mantenible.

- Crear proyecto Vite + TypeScript.
- Instalar Phaser 3 y configurar `npm run dev`, `npm run build` y `npm run test`.
- Crear la estructura `src/game`, `src/phaser` y `src/ui`.
- Crear escenas iniciales `BootScene`, `MenuScene` y `GameplayScene`.
- Definir `sceneBridge` como frontera entre Phaser y simulacion.
- Crear shell HTML/CSS con canvas y capa DOM para HUD/menus.
- Crear storage adapter para `localStorage` con clave `el-pillador.save.v1`.
- Crear una primera carpeta de datos para transcribir despues el contenido de
  `Doc` sin hardcodearlo en escenas.

Criterios de aceptacion:

- La app abre en navegador.
- Phaser renderiza una escena vacia o placeholder.
- `npm run build` pasa.
- Hay una prueba minima que valida que el estado inicial se puede crear.

## M1: MVP mazmorra navegable

Estado: implementado.

Objetivo: poder recorrer la estructura de la mazmorra sin combate completo.

- Modelar pisos, zonas, salas y conexiones como datos versionados.
- Cargar Piso 1 y Piso 2 desde `piso1_conexiones_simple_actualizado.md` y
  `piso2_conexiones_simple_actualizado.md`.
- Usar `documentacion_mazmorra_rpg_completa.md` para contenido, dependencias,
  rutas recomendadas y reglas anti-softlock.
- Importar coordenadas de `.drawio` solo como layout visual.
- Ignorar como activas las escaleras obsoletas `PZ-C4`, `DS-K1`, `PZ-L1` y
  `PZ-P2`.
- Representar `Sabios 1..4` como destinos de escalera o nodos de contenido; no
  inventar conexiones internas de Sabios hasta tener documentacion dedicada.
- Implementar acciones `move`, `confirm`, `cancel`, `pause` y `interact`.
- Representar conexiones normales, bloqueos, secretos y escaleras.
- Implementar guardado/carga de sala actual, inventario, rumores, flags y
  bloqueos abiertos.
- Crear HUD DOM minimo con piso, zona, sala, inventario, rumores y mensajes.

Criterios de aceptacion:

- Todas las salas referenciadas existen.
- Las salas `SS` son terminales.
- Las conexiones bloqueadas no se cruzan sin requisito.
- Las escaleras activas conectan los pisos correctos.
- `Sabios 1..4` son accesibles como destinos, sin mapa interno inventado.
- La partida se puede cerrar, abrir y continuar desde la sala guardada.

## M2: items, rumores, NPCs y dependencias

Estado: implementado.

Objetivo: convertir la navegacion en progresion jugable.

- Implementar inventario y recompensas de sala.
- Implementar RumorJournal rico `rumor_01..rumor_16`, compatible con `rumors: number[]` y `usedRumors: number[]`.
- Implementar secretos con regla `Rumor + flag` para puzzles/minijuegos pendientes: `1..15` desbloquean `SS1..SS15` y Rumor 16 desbloquea `CP-G1`.
- Implementar NPCs con requisito y recompensa.
- Implementar gates principales `B2..B11` y bloqueos locales.
- Modelar como referencias pendientes de Sabios: `SR3` / Varita, `SR8` /
  Fragmento Trifuerza 2, `SR10` / Bombas y `SR15` / Choco.
- Validar cadenas clave:
  - Bombas -> Rumor 1 -> romper `B1` -> `SS1` -> Interruptor Azul -> `B7`;
  - Codigo numerico -> `B6` -> Loteria;
  - Interruptores sellados 1, 2 y 3 -> `B8`;
  - Cualquier companero -> `B4`;
  - Interruptor sala control -> `B9`.
- `SS14` -> Cebo especial + Rumor 16 -> `CP-G1` -> bestia legendaria -> Ingrediente legendario 4.
- Rumor 3: Mireia/NPC3 en `SR18`; Rumor 4: NPC4 en `SR16`; NPC6 en `SR19` solo da Pista Loteria 2.
- Rumor 7: Lupa en `PZ-C3`; Rumor 13: Lupa sobre Reloj y luego Lupa en `SR18`.
- `B11`: precio de 1M de monedas para `Ingrediente legendario 5`, marcado al resolver `BOSS-Mascle`.
- `B10`: pendiente en `PZ-E3`, sin sala/recompensa hasta definirlo.

Criterios de aceptacion:

- El jugador puede desbloquear secretos solo si conoce el rumor correcto.
- Los NPCs no entregan recompensas si falta su requisito.
- Los gates se abren de forma persistente.
- Las rutas recomendadas del documento pueden reproducirse en el juego.

## M3: cronometro de Guille, Giratiempo y anti-softlock

Estado: implementado.

Objetivo: implementar las reglas temporales sin romper la progresion.

- Crear estado serializable del circuito cronometrado de Correr.
- Permitir que los accesos de entrada/salida de la zona cronometrada se cierren
  temporalmente.
- Mantener Cocina -> Magia Oscura como acceso seguro.
- Implementar `SS13` y Giratiempo como interactuable no obtenible para reiniciar
  o reabrir el circuito.
- Agregar validaciones automaticas anti-softlock.

Criterios de aceptacion:

- El circuito cronometrado nunca queda cerrado permanentemente.
- Al agotarse el crono, el jugador vuelve a `PZ-R2`.
- `SS13` recupera el circuito si el jugador queda fuera de tiempo.
- La ruta hacia Magia Oscura sigue existiendo por Cocina.
- Las pruebas detectan si una escalera eliminada vuelve por accidente.

Implementado:

- Estado `timerState` serializable con estado, duracion, restante, deadline y
  contador de reaperturas.
- Inicio automatico del circuito al entrar en `Correr`.
- Cierre temporal del perimetro cronometrado de Correr al expirar.
- Expulsion automatica a `PZ-R2` si el jugador esta dentro del circuito.
- Ruta segura `DS-C2 <-> DS-M1` mantenida abierta.
- Giratiempo en `SS13` para reabrir y reiniciar el circuito sin entrar al
  inventario.
- HUD DOM con estado del circuito, hora por `Reloj`, equipamiento y accion.
- Tests de expiracion, expulsion, reapertura, ruta segura y escaleras eliminadas.

## M3.5: exploracion top-down jugable

Estado: implementado.

Objetivo: convertir la navegacion por grafo en una experiencia top-down sala a
sala sin perder el grafo como herramienta de debug y validacion.

- Crear vista top-down por defecto con salas rectangulares, puertas, jugador,
  recompensas y NPCs placeholder.
- Mantener el modo grafo oculto con `F2` y `?view=graph`.
- Usar el grafo y `getConnectionAccess` como fuente de verdad de puertas,
  bloqueos, secretos, escaleras y cronometro.
- Guardar pose top-down compatible con partidas antiguas.
- Implementar movimiento continuo, puerta por contacto e interaccion cercana
  con `Space`.
- Completar menus DOM pausables: Items, Companeros y Diario.
- Modelar companeros placeholder: Choco, Trufa, TostaRica1 y TostaRica2.

Criterios de aceptacion:

- El juego carga en top-down por defecto.
- Cruzar `PZ-E1 -> PZ-E2` funciona desde una puerta top-down.
- El modo grafo sigue disponible para debug y tests.
- Los menus pausan movimiento y se pueden abrir con `I`, `C`, `J`.
- Tests y build pasan.

## M4: bosses funcionales

Objetivo: representar jefes como encuentros jugables aunque usen assets
placeholder.

- Implementar encuentros para Tuto, Pintor, Guille, Carlos Caudet, Antonio,
  Mascle, Xavi y Enric.
- Respetar requisitos de acceso y victoria de cada boss.
- Registrar victoria, desbloqueos y recompensas persistentes.
- Mantener la logica de boss fuera de escenas Phaser.

Criterios de aceptacion:

- Cada boss bloquea o concede progreso segun sus requisitos.
- Antonio exige Fragmentos 1, 2 y 3, Varita y Varita de Sauco.
- Tuto exige los cinco ingredientes legendarios.
- Mascle exige codigo y pistas de Loteria.

## M5: assets, UI final, audio, QA y pulido

Objetivo: llevar el MVP funcional a experiencia presentable.

- Sustituir placeholders por sprites, tiles, FX, audio y UI final.
- Consolidar manifiesto de assets con claves estables.
- Pulir camara, transiciones de sala, feedback de puertas/bloqueos y secretos.
- Completar menus DOM de pausa, guardado, opciones y debug.
- Ejecutar playtest visual en desktop y movil.
- Revisar performance, legibilidad y accesibilidad basica.

Criterios de aceptacion:

- El juego es legible y navegable en navegador.
- HUD y menus no ocultan el playfield de forma critica.
- Build y tests pasan.
- El guardado mantiene compatibilidad con `el-pillador.save.v1`.

## Revision de documentacion local

Resultado de la revision de `H:/Codex/Game/Doc`:

- Correcto: el brief confirma Phaser 3, TypeScript, Vite, HTML/CSS y
  `localStorage`.
- Correcto: los Markdown simples declaran 14 escaleras activas y 4 eliminadas.
- Correcto: las escaleras eliminadas son `PZ-C4`, `DS-K1`, `PZ-L1` y `PZ-P2`;
  no aparecen como activas en los Markdown ni como etiquetas de escalera en los
  `.drawio` locales.
- Correcto: hay 114 filas de conexion para Piso 1 y Piso 2, y ninguna sala `SS`
  aparece como origen de una conexion posterior.
- Pendiente: el GDD menciona `Santuario Final`, pero no hay grafo/layout
  confirmado para esa zona.
- Pendiente: `SR3`, `SR8`, `SR10` y `SR15` aparecen como contenido de Sabios,
  pero no existe todavia un archivo de conexiones/layout del Piso Sabios.

## Validacion automatica esperada

- Grafo:
  - todas las salas referenciadas existen;
  - no hay conexiones normales despues de salas `SS`;
  - no hay escaleras activas eliminadas;
  - cada gate apunta a una conexion valida.
- Documentacion:
  - los `.drawio` locales no reintroducen etiquetas de escalera eliminadas;
  - las referencias a Sabios sin layout dedicado se tratan como pendientes, no
    como salas conectadas automaticamente.
- Progresion:
  - las rutas criticas del documento son reproducibles;
  - los requisitos de bosses se pueden obtener antes de exigirlos;
  - las reglas anti-softlock se mantienen.
- App:
  - `npm run build`;
  - smoke test en navegador;
  - guardar/cargar desde `localStorage`.

## Defaults y decisiones bloqueadas

- Fuente de verdad: Markdown.
- Fuente local: `H:/Codex/Game/Doc`.
- Layout visual: `.drawio`, solo geometria.
- Primer MVP: mazmorra navegable.
- Sabios: destinos/nodos de contenido hasta recibir mapa interno.
- Santuario Final: pendiente de especificacion.
- UI densa: DOM, no canvas.
- Estado persistente: serializable y separado de sprites/tweens/camaras.
- Escenas Phaser: delgadas, sin reglas de progresion.
- Agentes: no crear ahora; usar despues para validacion de grafo y playtest.
