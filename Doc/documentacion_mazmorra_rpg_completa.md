# Documentación de la mazmorra RPG

Paquete de documentación para pasar a otro chat o a un programador.

Incluye:

1. `00_resumen_general.md`
2. `01_salas_y_conexiones.md`
3. `02_items_npcs_rumores.md`
4. `03_bloqueos_dependencias_rutas.md`
5. `04_datos_tecnicos_programacion.json`

Estado actual:

- Piso 1 confirmado.
- Piso 2 confirmado.
- Escaleras eliminadas:
  - `PZ-C4 → Lotería`
  - `DS-K1 → Panadería`
  - `PZ-L1 → Cocina`
  - `PZ-P2 → Catacumbas`
- Escaleras activas:
  - Piso 1 ↔ Piso 2:
    - `DS-C2 ↔ Magia Oscura`
    - `SR4 ↔ Lotería`
    - `DS-G1 ↔ Panadería`
    - `DS-R1 ↔ Magia Oscura`
    - `PZ-R4 ↔ Gym`
  - Piso 2 ↔ Sabios:
    - `SR6 → Sabios 1`
    - `SR16 → Sabios 2`
    - `SR13 → Sabios 3`
    - `SR19 → Sabios 4`

Leyenda de conexiones:

- `normal`: conexión normal.
- `bloqueo`: conexión cerrada por bloqueo o puerta.
- `secreto`: conexión a sala secreta.
- `escalera`: cambio de piso.
- Las salas `SS` son terminales: no debe haber salas normales después de una sala secreta.


---

# 00 — Resumen general

## Concepto

Mazmorra principal de un RPG top-down estilo Zelda. La estructura está diseñada como una mazmorra con backtracking fuerte, bloqueos por ítems, salas secretas desbloqueadas mediante rumores, y varias zonas conectadas por escaleras.

## Pisos

| Piso | Zonas |
|---|---|
| Piso 1 | Entrada, Cocina, Grecia, Correr, Catacumbas |
| Piso 2 | Magia Oscura, Lotería, Panadería, Gym |
| Piso Sabios | Sabios 1, Sabios 2, Sabios 3, Sabios 4 |

## Zonas del Piso 1

| Zona | Color | Función |
|---|---|---|
| Entrada | Amarillo | Hub central e inicio |
| Cocina | Rojo | Zona de Tuto, SR1, SR20, SS2, SS9 |
| Grecia | Azul | Zona de Lupa, Pintor, SS7, SS12, CP-G1 |
| Correr | Verde | Zona de velocidad, B7, SR17, SR21, circuito cronometrado |
| Catacumbas | Morado | Zona de B4, Objeto Xavi, Zapatillas, Caudet |

## Zonas del Piso 2

| Zona | Posición | Color | Función |
|---|---|---|---|
| Magia Oscura | Norte | Morado | Válvula, Sabios 1, B8, Antonio, SS3, SS14 |
| Lotería | Oeste | Naranja | B6, Mascle, Trufa, Sabios 2, SS4, SS15 |
| Panadería | Sur | Azul/cian | B9, Xavi, Dedos Mágicos, Sabios 3, SS5 |
| Gym | Este | Verde | B3, Enric, Sabios 4, SS6, pista de lotería 2 |

## Reglas críticas

Actualizacion: `B4` requiere cualquier companero. `Trufa` cuenta como companero,
pero no es el unico requisito valido.

1. Las salas secretas `SS` y `CP-G1` son terminales.
2. Una zona bloqueada solo debe tener una entrada válida por su bloqueo.
3. `B4` es la Criatura mitológica. Requiere cualquier companero; `Trufa` es una opcion valida y se obtiene en `SR5`.
4. `SR1` da Varita de Sauco, necesaria para Antonio.
5. `SR21` da Fragmento Trifuerza 3, necesario para Antonio.
6. La escalera Correr → Magia Oscura puede cerrarse temporalmente por el cronómetro; por eso se mantiene Cocina → Magia Oscura como acceso seguro.
7. El circuito cronometrado de Correr nunca debe cerrarse de forma permanente.
8. `SS13` contiene Giratiempo y permite reiniciar/reabrir el circuito cronometrado. El acceso se abre en dos pasos: Lupa sobre el Reloj para obtener Rumor 13, luego Lupa en `SR18`.
9. `CP-G1` es una sala secreta de combate Pokemon situada a la izquierda de `PZ-G1`. En diseno final solo se abrira durante 5 minutos a cierta hora del dia; en la version actual se abre con Rumor 16 y el flag concedido en `SS14`.
9. `PZ-R2 ↔ PZ-K1` es conexión normal entre Correr y Catacumbas.
10. `B7` bloquea la conexión `MG-R1 ↔ SR17`.


---

# 01 — Salas y conexiones

Leyenda: `normal`, `bloqueo`, `secreto`, `escalera`.

---

# Piso 1

## Escaleras activas del Piso 1

| Sala | Destino |
|---|---|
| `DS-C2` | Piso 2 / Magia Oscura |
| `SR4` | Piso 2 / Lotería |
| `DS-G1` | Piso 2 / Panadería |
| `DS-R1` | Piso 2 / Magia Oscura |
| `PZ-R4` | Piso 2 / Gym |

## Escaleras eliminadas del Piso 1

| Sala | Destino eliminado |
|---|---|
| `PZ-C4` | Piso 2 / Lotería |
| `DS-K1` | Piso 2 / Panadería |

## Piso 1 — Entrada

| Sala | Conecta con | Tipo |
|---|---|---|
| `PZ-E1` | `PZ-E2` | normal |
| `PZ-E1` | `PZ-E3` | normal |
| `PZ-E1` | `PZ-E4` | normal |
| `PZ-E1` | `DS-E1` | normal |
| `PZ-E2` | `SR18` | normal |
| `PZ-E2` | `PZ-R1` | normal |
| `SR18` | `SS13` | bloqueo |
| `PZ-E3` | `SR2` | normal |
| `SR2` | `SS1` | bloqueo |
| `PZ-E4` | `DS-E2` | normal |
| `DS-E2` | `PZ-C1` | normal |
| `DS-E2` | `PZ-G1` | normal |

## Piso 1 — Cocina

| Sala | Conecta con | Tipo |
|---|---|---|
| `PZ-C1` | `SR1` | normal |
| `PZ-C1` | `DS-C1` | normal |
| `DS-C1` | `MG-C1` | normal |
| `DS-C1` | `SR20` | bloqueo |
| `SR20` | `SS2` | secreto |
| `MG-C1` | `BOSS-Tuto` | normal |
| `MG-C1` | `PZ-C2` | normal |
| `PZ-C2` | `PZ-C3` | normal |
| `PZ-C3` | `DS-C2` | normal |
| `PZ-C3` | `SS9` | secreto |
| `DS-C2` | Piso 2 / Magia Oscura | escalera |

## Piso 1 — Grecia

| Sala | Conecta con | Tipo |
|---|---|---|
| `PZ-G1` | `PZ-G2` | normal |
| `PZ-G1` | `CP-G1` | secreto |
| `PZ-G2` | `SS12` | secreto |
| `PZ-G2` | `DS-G1` | normal |
| `PZ-G2` | `SR9` | normal |
| `DS-G1` | `MG-G1` | normal |
| `DS-G1` | `PZ-G3` | bloqueo |
| `DS-G1` | Piso 2 / Panadería | escalera |
| `PZ-G3` | `PZ-G4` | normal |
| `PZ-G4` | `DS-G2` | normal |
| `DS-G2` | `BOSS-Pintor` | normal |
| `MG-G1` | `SR9` | normal |
| `MG-G1` | `SR4` | normal |
| `SR4` | `SS7` | secreto |
| `SR4` | Piso 2 / Lotería | escalera |

## Piso 1 — Correr

| Sala | Conecta con | Tipo |
|---|---|---|
| `PZ-R1` | `PZ-R2` | normal |
| `PZ-R2` | `PZ-K1` | normal |
| `PZ-R2` | `PZ-R3` | normal |
| `PZ-R2` | `MG-R1` | normal |
| `MG-R1` | `DS-R1` | normal |
| `DS-R1` | Piso 2 / Magia Oscura | escalera |
| `MG-R1` | `SR17` | bloqueo |
| `SR17` | `SR21` | normal |
| `PZ-R3` | `PZ-R4` | normal |
| `PZ-R4` | Piso 2 / Gym | escalera |
| `PZ-R4` | `MG-R2` | normal |
| `MG-R2` | `DS-R3` | normal |
| `DS-R3` | `DS-R2` | normal |
| `DS-R2` | `BOSS-Guille` | normal |
| `DS-R3` | `SS8` | secreto |
| `DS-R2` | `SS10` | secreto |

## Piso 1 — Catacumbas

| Sala | Conecta con | Tipo |
|---|---|---|
| `PZ-K1` | `PZ-K2` | normal |
| `PZ-K2` | `SR14` | normal |
| `SR14` | `MG-K1` | normal |
| `MG-K1` | `DS-K1` | normal |
| `DS-K1` | `PZ-K3` | bloqueo |
| `PZ-K3` | `PZ-K4` | normal |
| `PZ-K4` | `DS-K2` | normal |
| `DS-K2` | `BOSS-Carlos` | normal |
| `DS-K2` | `SS11` | secreto |

---

# Piso 2

## Escaleras activas del Piso 2

| Sala | Destino |
|---|---|
| `DS-M1` | Piso 1 / Cocina |
| `MG-M1` | Piso 1 / Correr tras resolver puzzle MG-M1 |
| `SR6` | Sabios 1 |
| `MG-L1` | Piso 1 / Grecia |
| `SR16` | Sabios 2 |
| `PZ-P1` | Piso 1 / Grecia |
| `SR13` | Sabios 3 |
| `PZ-Y1` | Piso 1 / Correr |
| `SR19` | Sabios 4 |

Nota de layout y topologia: `SR16` y `PZ-L1` tienen sus posiciones visuales
intercambiadas en el layout confirmado. `SR16` conserva NPC4 y la escalera a
Sabios 2; `PZ-L1` conserva su estado de escalera eliminada y ahora aloja el
acceso secreto a `SS15`.

## Escaleras eliminadas del Piso 2

| Sala | Destino eliminado |
|---|---|
| `PZ-L1` | Piso 1 / Cocina |
| `PZ-P2` | Piso 1 / Catacumbas |

## Piso 2 — Magia Oscura

| Sala | Conecta con | Tipo |
|---|---|---|
| `SR6` | `PZ-M2` | normal |
| `SR6` | `PZ-M1` | normal |
| `SR6` | `PZ-M4` | bloqueo |
| `SR6` | Sabios 1 | escalera |
| `PZ-M1` | `DS-M1` | normal |
| `DS-M1` | Piso 1 / Cocina | escalera |
| `PZ-M2` | `MG-M1` | normal |
| `MG-M1` | Piso 1 / Correr tras resolver puzzle MG-M1 | escalera |
| `PZ-M4` | `DS-M2` | normal |
| `DS-M2` | `SS3` | secreto |
| `PZ-M4` | `SR11` | normal |
| `PZ-M4` | `PZ-M3` | normal |
| `PZ-M3` | `BOSS-Antonio` | normal |
| `BOSS-Antonio` | `SS14` | secreto |

## Piso 2 — Lotería

| Sala | Conecta con | Tipo |
|---|---|---|
| `MG-L1` | `DS-L1` | normal |
| `MG-L1` | Piso 1 / Grecia | escalera |
| `DS-L1` | `PZ-L2` | normal |
| `PZ-L2` | `PZ-L3` | normal |
| `PZ-L3` | `SR16` | normal |
| `PZ-L2` | `BOSS-Mascle` | bloqueo |
| `BOSS-Mascle` | `PZ-L4` | normal |
| `PZ-L1` | `PZ-L4` | normal |
| `SR16` | Sabios 2 | escalera |
| `PZ-L1` | `SS15` | secreto |
| `PZ-L4` | `DS-L2` | normal |
| `DS-L2` | `SS4` | secreto |
| `DS-L2` | `SR5` | normal |

## Piso 2 — Panadería

| Sala | Conecta con | Tipo |
|---|---|---|
| `DS-P1` | `PZ-P1` | normal |
| `PZ-P1` | Piso 1 / Grecia | escalera |
| `PZ-P1` | `PZ-P2` | normal |
| `PZ-P2` | `MG-P1` | normal |
| `MG-P1` | `SR7` | bloqueo |
| `SR7` | `PZ-P3` | normal |
| `PZ-P3` | `PZ-P4` | normal |
| `PZ-P4` | `DS-P2` | normal |
| `DS-P2` | `BOSS-Xavi` | normal |
| `DS-P2` | `SS5` | secreto |
| `DS-P2` | `SR13` | normal |
| `SR13` | Sabios 3 | escalera |

## Piso 2 — Gym

| Sala | Conecta con | Tipo |
|---|---|---|
| `MG-Y1` | `DS-Y1` | normal |
| `DS-Y1` | `PZ-Y2` | normal |
| `PZ-Y2` | `PZ-Y1` | normal |
| `PZ-Y1` | Piso 1 / Correr | escalera |
| `PZ-Y1` | `SR12` | bloqueo |
| `SR12` | `PZ-Y3` | normal |
| `PZ-Y3` | `SS6` | secreto |
| `PZ-Y3` | `DS-Y2` | normal |
| `DS-Y2` | `BOSS-Enric` | normal |
| `DS-Y2` | `PZ-Y4` | normal |
| `PZ-Y4` | `SR19` | normal |
| `SR19` | Sabios 4 | escalera |


---

# 02 — Items, NPCs y rumores

## Items y recompensas

Actualizacion: `Trufa` cuenta como companero para `B4`, pero `B4` acepta
cualquier companero desbloqueado.

| Item / recompensa | Sala | Zona / piso | Uso |
|---|---|---|---|
| Espada | `SR2` | Entrada / Piso 1 | Item base |
| Varita de Sauco | `SR1` | Cocina / Piso 1 | Requisito de Antonio |
| Lupa | `SR4` / NPC1 | Grecia / Piso 1 | Abre B3 / Gym |
| Interruptor Azul | `SS1` | Entrada / Piso 1 | Abre B7 |
| Ítem Hermano | `SS8` | Correr / Piso 1 | Requisito de NPC2 |
| Código numérico | `SS10` | Correr / Piso 1 | Abre B6 |
| Objeto Xavi | `SR14` | Catacumbas / Piso 1 | Requisito Boss Xavi |
| Zapatillas Guillem | `SS11` | Catacumbas / Piso 1 | Requisito Boss Guille |
| Ítem NPC7 | `SR9` | Grecia / Piso 1 | Requisito de NPC7 |
| Válvula remota | `SR6` | Magia Oscura / Piso 2 | Abre B5 |
| Interruptor sala control | `SR11` | Magia Oscura bloqueada / Piso 2 | Abre B9 |
| Trufa | `SR5` | Lotería bloqueada / Piso 2 | Cuenta como companero para B4 |
| Dedos Mágicos | `SR13` | Panadería bloqueada / Piso 2 | Requisito Boss Enric |
| Ítem NPC6 | `SR7` | Panadería bloqueada / Piso 2 | Requisito de NPC6 |
| Item Resurrección | `SS15` | Lotería bloqueada / Piso 2 | Requisito NPC5 / Choco |
| Poción | `SR18` / NPC3 | Entrada / Piso 1 | Requisito NPC4 |
| TostaRica2 | `SR17` / NPC2 | Correr bloqueado / Piso 1 | Recompensa NPC2 |
| TostaRica1 | `SR16` / NPC4 | Lotería bloqueada / Piso 2 | Recompensa NPC4 |
| Choco | `SR15` / NPC5 | Sabios 3 | Recompensa tras Item Resurrección |

## Fragmentos de Trifuerza

| Fragmento | Sala | Uso |
|---|---|---|
| Fragmento Trifuerza 1 | `SS3` | Requisito Antonio |
| Fragmento Trifuerza 2 | `SR8` / Sabios 4 | Requisito Antonio |
| Fragmento Trifuerza 3 | `SR21` | Requisito Antonio |

## Ingredientes legendarios

| Ingrediente | Sala | Zona |
|---|---|---|
| Ingrediente 1 | `SS5` | Panadería |
| Ingrediente 2 | `SS6` | Gym |
| Ingrediente 3 | `SR20` / NPC7 | Cocina |
| Cebo especial | `SS14` | Magia Oscura |
| Ingrediente 4 | `CP-G1` | Grecia / bestia legendaria |
| Ingrediente 5 | `SR18` / Tienda | Compra de 1M monedas tras ganar la Lotería |

## Interruptores sellados

| Interruptor | Sala | Uso |
|---|---|---|
| Interruptor sellado 1 | `SS2` | Abre B8 |
| Interruptor sellado 2 | `SS7` | Abre B8 |
| Interruptor sellado 3 | `SS12` | Abre B8 |

## Pistas de Lotería

| Pista | Sala | Uso |
|---|---|---|
| Pista Lotería 1 | `SS9` | Resolver Mascle / Lotería |
| Pista Lotería 2 | `SR19` / NPC6 | Resolver Mascle / Lotería |

---

# NPCs

| NPC | Sala | Requisito | Da |
|---|---|---|---|
| NPC1 | `SR4` | Ninguno | Lupa |
| NPC2 | `SR17` | Ítem Hermano | TostaRica2 + Rumor 2 |
| NPC3 / Mireia | `SR18` | Ninguno | Poción + Rumor 3 |
| NPC4 | `SR16` | Poción | TostaRica1 + Rumor 4 |
| NPC5 | `SR15` / Sabios 3 | Item Resurrección | Choco |
| NPC6 | `SR19` | Ítem NPC6 | Pista Lotería 2 |
| NPC7 | `SR20` | Ítem NPC7 | Ingrediente 3 + Rumor 5 |
| NPC8 | `SR12` | Ninguno | Rumor 10 |

---

# Relación rumores → salas secretas

Regla general:

```text
Rumor 1 → SS1
Rumor 2 → SS2
...
Rumor 15 → SS15
Rumor 16 → CP-G1
```

## Ubicación recomendada de cada rumor

| Rumor | Desbloquea | Ubicación del rumor | Motivo |
|---|---|---|---|
| Rumor 1 | `SS1` | `SABIOS-2` / Bombas | Revela el muro B1 hacia Interruptor Azul |
| Rumor 2 | `SS2` | `SR17` / NPC2 | Obliga a volver a Cocina bloqueada |
| Rumor 3 | `SS3` | `SR18` / NPC3 Mireia | Obliga a volver a Magia bloqueada |
| Rumor 4 | `SS4` | `SR16` / NPC4 | Obliga a volver a Lotería |
| Rumor 5 | `SS5` | `SR20` / NPC7 | Obliga a volver a Panadería |
| Rumor 6 | `SS6` | `SR13` | Obliga a volver a Gym |
| Rumor 7 | `SS7` | `PZ-C3` / Lupa | Hace volver a Grecia |
| Rumor 8 | `SS8` | `SR5` | Hace volver a Correr |
| Rumor 9 | `SS9` | `SR2` | Hace volver a Cocina |
| Rumor 10 | `SS10` | `SR12` / NPC8 | Mantiene la regla de NPC8 dando Rumor 10 |
| Rumor 11 | `SS11` | `SR14` | Pista interna de Catacumbas |
| Rumor 12 | `SS12` | `MG-G1` | Pista interna de Grecia |
| Rumor 13 | `SS13` | Reloj / Lupa | Pista del Giratiempo; luego Lupa en `SR18` abre el acceso |
| Rumor 14 | `SS14` | `SR11` | Pista interna de Magia bloqueada |
| Rumor 15 | `SS15` | `BOSS-Mascle` | Pista final de Lotería bloqueada |
| Rumor 16 | `CP-G1` | `SS14` | Pista de la sala de combate Pokemon en Grecia |

## Salas secretas y contenido

| Sala secreta | Zona | Contenido |
|---|---|---|
| `SS1` | Entrada | Interruptor Azul |
| `SS2` | Cocina | Interruptor sellado 1 |
| `SS3` | Magia Oscura | Fragmento Trifuerza 1 |
| `SS4` | Lotería | Palabra secreta |
| `SS5` | Panadería | Ingrediente legendario 1 |
| `SS6` | Gym | Ingrediente legendario 2 |
| `SS7` | Grecia | Interruptor sellado 2 |
| `SS8` | Correr | Ítem Hermano |
| `SS9` | Cocina | Pista Lotería 1 |
| `SS10` | Correr | Código numérico |
| `SS11` | Catacumbas | Zapatillas Guillem |
| `SS12` | Grecia | Interruptor sellado 3 |
| `SS13` | Entrada | Giratiempo |
| `SS14` | Magia Oscura | Cebo especial + Rumor 16 |
| `SS15` | Lotería | Item Resurrección |
| `CP-G1` | Grecia | Bestia legendaria; requiere Cebo especial y entrega Ingrediente legendario 4 |


---

# 03 — Bloqueos, dependencias y rutas

## Bloqueos principales

| Bloqueo | Zona | Conexión | Requisito | Bloquea |
|---|---|---|---|---|
| `B2` | Grecia | `DS-G1 ↔ PZ-G3` | Varita | Grecia bloqueada: `PZ-G3`, `PZ-G4`, `DS-G2`, `BOSS-Pintor` |
| `B3` | Gym | `PZ-Y1 ↔ SR12` | Lupa | Gym bloqueado |
| `B4` | Catacumbas | `DS-K1 ↔ PZ-K3` | Cualquier companero | Catacumbas bloqueada: `PZ-K3`, `PZ-K4`, `DS-K2`, `SS11`, `BOSS-Carlos` |
| `B5` | Cocina | `DS-C1 ↔ SR20` | Válvula remota | Cocina bloqueada: `SR20`, `SS2` |
| `B6` | Lotería | `PZ-L2 ↔ BOSS-Mascle` | Código numérico | Lotería bloqueada |
| `B7` | Correr | `MG-R1 ↔ SR17` | Interruptor Azul | `SR17`, `SR21` |
| `B8` | Magia Oscura | `SR6 ↔ PZ-M4` | Interruptores sellados 1 + 2 + 3 | Magia bloqueada |
| `B9` | Panadería | `MG-P1 ↔ SR7` | Interruptor sala control | Panadería bloqueada |
| `B10` | Entrada | Pendiente en `PZ-E3` | Palabra secreta | Sala opcional pendiente de definir |
| `B11` | Tienda | Compra de ingrediente | 1M monedas de la Lotería | Ingrediente legendario 5 |

## Bloqueos locales o especiales

| Bloqueo | Uso |
|---|---|
| `SR18 ↔ SS13` | Acceso bloqueado al Giratiempo |
| `SR2 <-> SS1` | B1: muro agrietado de Entrada hacia Interruptor Azul |
| `B1` | Se abre colocando Bombas junto al muro |
| `B10` | Pendiente en `PZ-E3`; no crear sala ni recompensa hasta definirlo |

---

# Dependencias de bosses

Actualizacion: el acceso por `B4` requiere cualquier companero, no
exclusivamente `Trufa`.

| Boss | Sala | Requisitos |
|---|---|---|
| Tuto | `BOSS-Tuto` | Ingredientes legendarios 1 + 2 + 3 + 4 + 5 |
| Pintor | `BOSS-Pintor` | Acceso por B2 / Varita; sin item especial de combate |
| Guille | `BOSS-Guille` | Zapatillas Guillem + completar circuito cronometrado |
| Carlos Caudet | `BOSS-Carlos` | Acceso por B4 / cualquier companero; sin item especial de combate |
| Antonio | `BOSS-Antonio` | Fragmentos 1 + 2 + 3, Varita y Varita de Sauco |
| Mascle | `BOSS-Mascle` | Código para B6 + pistas de Lotería 1 y 2 para resolver/vencer |
| Xavi | `BOSS-Xavi` | Objeto Xavi |
| Enric | `BOSS-Enric` | Dedos Mágicos |

---

# Dependencias importantes

## Antonio

| Requisito | Ubicación |
|---|---|
| Fragmento Trifuerza 1 | `SS3` / Magia Oscura |
| Fragmento Trifuerza 2 | `SR8` / Sabios 4 |
| Fragmento Trifuerza 3 | `SR21` / Correr |
| Varita | `SR3` / Sabios 1 |
| Varita de Sauco | `SR1` / Cocina |

## Tuto

| Requisito | Ubicación |
|---|---|
| Ingrediente 1 | `SS5` / Panadería |
| Ingrediente 2 | `SS6` / Gym |
| Ingrediente 3 | `SR20` / Cocina |
| Ingrediente 4 | `CP-G1` / bestia legendaria |
| Ingrediente 5 | `SR18` / Tienda tras ganar Lotería |

## Mascle

| Requisito | Ubicación |
|---|---|
| Código numérico | `SS10` |
| Pista Lotería 1 | `SS9` |
| Pista Lotería 2 | `SR19` / NPC6 |

---

# Ruta de progresión recomendada

## Inicio y apertura de B7

```text
Inicio
→ Entrada
→ Grecia
→ SR4 / NPC1
-> Lupa
-> SABIOS-2 / Bombas + Rumor 1
-> romper B1 con Bombas
-> SS1
→ Interruptor Azul
→ B7 en Correr
→ SR17 + SR21
```

## Apertura de Lotería bloqueada

```text
Correr / circuito
→ Gym
→ B3 con Lupa
→ SR12 / NPC8
→ Rumor 10
→ volver a Correr
→ SS10
→ Código numérico
→ Lotería
→ B6
```

## Bombas y Trufa

Actualizacion: `B4` requiere cualquier companero. La ruta de Loteria tras el
intercambio local pasa por `PZ-L1` para acceder a `SS15`; `SR16` queda conectado
con `PZ-L3` y conserva la escalera a Sabios 2.

```text
B6 Lotería
→ BOSS-Mascle
→ PZ-L4
→ SR16 / Sabios 2
→ SR10 / Bombas
→ DS-L2
→ SR5 / Trufa
```

Ruta actualizada:

```text
B6 Loteria
-> BOSS-Mascle
-> PZ-L4
-> PZ-L1 / SS15
-> PZ-L3
-> SR16 / Sabios 2
-> SR10 / Bombas
-> DS-L2
-> SR5 / Trufa u otro companero
```

## Magia, Varita y Válvula

```text
Cocina
→ DS-C2
→ Magia Oscura
→ SR6
→ Válvula remota
→ Sabios 1
→ SR3 / Varita
```

## Cocina bloqueada y B8

```text
SR6 / Válvula
→ B5 Cocina
→ SR20
→ Rumor 5 + Ingrediente 3
→ SS2 con Rumor 2 + Bombas
→ Interruptor sellado 1

Grecia
→ SS7
→ Interruptor sellado 2

Grecia
→ SS12
→ Interruptor sellado 3

Interruptores 1 + 2 + 3
→ B8 Magia Oscura
```

## Magia bloqueada

```text
B8
→ PZ-M4
→ DS-M2
→ SS3 / Fragmento 1
→ SR11 / Interruptor sala control
→ PZ-M3
→ BOSS-Antonio
→ SS14 / Cebo especial + Rumor 16
→ CP-G1 / usar Cebo especial / bestia legendaria / Ingrediente 4
```

## Panadería bloqueada

```text
SR11 / Interruptor sala control
→ B9 Panadería
→ SR7 / Ítem NPC6
→ DS-P2
→ SS5 / Ingrediente 1
→ SR13 / Dedos Mágicos + Sabios 3
→ BOSS-Xavi con Objeto Xavi
```

## Gym bloqueado

```text
Lupa
→ B3 Gym
→ SR12 / Rumor 10
→ PZ-Y3
→ SS6 / Ingrediente 2
→ SR19 / Pista Lotería 2 + Sabios 4
→ BOSS-Enric con Dedos Mágicos
```

## Catacumbas bloqueada y Guille

```text
SR5 / Trufa
→ B4 Catacumbas
→ PZ-K3
→ PZ-K4
→ DS-K2
→ SS11 / Zapatillas Guillem
→ volver a Correr
→ circuito cronometrado
→ BOSS-Guille
```

## Finales

```text
Mascle:
SS9 + SR19 + Código → BOSS-Mascle

Tuto:
Ingredientes 1 + 2 + 3 + 4 + 5 → BOSS-Tuto

Antonio:
Fragmento 1 + Fragmento 2 + Fragmento 3 + Varita + Varita de Sauco → BOSS-Antonio
```

---

# Reglas anti-softlock

1. Magia Oscura debe tener acceso seguro desde Cocina porque el acceso desde Correr puede cerrarse temporalmente.
2. El circuito cronometrado de Correr nunca puede cerrarse permanentemente.
3. `SS13` debe permitir reiniciar/reabrir el circuito cronometrado.
4. `SR6` debe estar antes de B8, porque contiene Válvula y acceso a Sabios 1.
5. `SR16` / Sabios 2 debe estar detrás de B6 pero no detrás de B8.
6. `SS2` puede requerir Válvula + Bombas + Rumor 2, pero no puede estar detrás de B8.
7. `B4` requiere cualquier companero; Trufa está en `SR5`, detrás de B6, pero no es el unico companero valido.
8. `ESC`/escaleras eliminadas no deben añadirse de nuevo si se busca mantener el backtracking actual.
