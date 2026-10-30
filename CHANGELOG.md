# WorkshopPower -- historial de versiones

## 2.7.6 -- 2026-10-30

- Manifest: sbcRequired true (needs WorkshopService); side bar keeps the group names

## 2.7.5 -- 2026-10-30

- Job list: no program-name rewriting

## 2.7.4 -- 2026-10-29

- Phone layout fixes (44 px touch targets, no overflow), Workbench full-screen section picker, clamps hint, interrupted jobs off the table, Machine scale label

## 2.7.3 -- 2026-10-29

- Audit and UX fixes: Jog owns workzeroaxis.g, restart notice with time, shared pulse table with update and download, side bar tooltips, spacing, wider field

## 2.7.2 -- 2026-10-29

- State chips with an icon: the icon carries the color and there is no dot (family.css); chosen chip tinted

## 2.7.1 -- 2026-10-29

- PID chart read from the service (any screen), Activity shows its active filters, health state without the duplicate icon

## 2.7.0 -- 2026-10-29

- Side bars: no gray line, a chosen item goes to the start of its section; Printing: start-up chip without the mode rows, tests notice only when the chip is not green, no-sensor fault reading; Vision: settings cards packed in columns, laser crosses only with Laser mode; Zones: visible mode dot

## 2.6.10 -- 2026-10-28

- Design family: final shared styles

## 2.6.9 -- 2026-10-28

- Design family: page bar with lead, own design css removed, section color as --wf-sec

## 2.6.8 -- 2026-10-28

- Header badge icon always white; Lights: how-it-works note inside the Summary, save bar only with changes

## 2.6.7 -- 2026-10-28

- Minimalist design: neutral page bar with a solid badge, text side items with a section line, neutral cards with a 2 px top line, dot and word states, outline buttons, collapsible How it works

## 2.6.6 -- 2026-10-28

- Risk dialogs get their colored side bar back; one type scale (Roboto in the panels, no half sizes)

## 2.6.5 -- 2026-10-28

- Risk dialogs get their colored side bar back; one type scale (Roboto in the panels, no half sizes)

## 2.6.4 -- 2026-10-28

- Tapping the calendar again hides the history date fields

## 2.6.3 -- 2026-10-27

- Plan warnings in words, risk dialogs in DWC style, mesh point selection, link to Machine modes

## 2.6.2 -- 2026-10-27

- Consumption: long ranges (30 days) cover the whole range with averaged points; side bar no longer makes the page jump; start-up chip as in every page

## 2.6.1 -- 2026-10-26

- Run-time guard: the 3.6 build refuses to start on a host with window.DWC and the 3.7 build outside DWC 3.7.x (visible warning); shipped as a strict per-line zip (dwcVersion 3.6 / 3.7)

## 2.6.0 -- 2026-10-26

- Job view redesigned as cards (energy bar, cost, comparison with similar jobs of the same mode and material), with 7 / 30 day, mode and cancelled filters, sort order, totals, energy per process and CSV export
- Cost and energy so far of the job running now (live job or file), idle (standby) power in the history, monthly kWh limit with a warning in the page header, CSV export of the period bars
- Live panel says what to do when there is no meter or it stopped answering
- Meters: one card per meter (status, live power, ID / IP / version / key) and the new-meter form as a block of its own (divider, accent border, "New meter" title, Cancel / Test / Save and use); the guide to get the ID and key can be hidden
- Consumption.vue split into LiveSummary, PeriodSection, JobsSection (JobItem, JobSummary, RunningJob), HistorySection, BudgetCard, MeterCard and MeterHealth; the same on DWC 3.6 and 3.7

## 2.5.21 -- 2026-10-24

- Start-up assistant: active lines highlighted, single-step way back, dark select options; Lights time picker and defaults; Printing FFF switch; Mesh handles above the points

## 2.5.20 -- 2026-10-24

- Start-up card reports its pending count to the service (machine setup list)

## 2.5.19 -- 2026-10-23

- Follow a sign-in or logout made in another tab

## 2.5.18 -- 2026-10-23

- One sign-in for every tab (token in localStorage)

## 2.5.17 -- 2026-10-23

- Header: no health chip while signed out

## 2.5.16 -- 2026-10-23

- Compact live job strip in the bar; page header treats an expired session as sign in; numeric PIN field

## 2.5.15 -- 2026-10-23

- Page header asks who is signed in; PIN field is numeric

## 2.5.14 -- 2026-10-23

- Common page header: health chip, session chip, quiet start-up icon when ready

## 2.5.13 -- 2026-10-23

- Side bar sections no longer overflow the page on narrow screens (under 900 px)

## 2.5.12 -- 2026-10-22

- Side-bar pin only while the bar is open; Lights panel counts only the faults the service marks

## 2.5.11 -- 2026-10-22

- Pin on every side bar, thin scrollbars, one sign-in dialog

## 2.5.10 -- 2026-10-22

- Sign-in never opens by itself; keyboard only on touch

## 2.5.9 -- 2026-10-22

- Fix names, values and catalog markers the English rename left behind

## 2.5.8 -- 2026-10-22

- Sessions made clear: not-signed-in chip, sign-in on visitor 403, refusal toast

## 2.5.7 -- 2026-10-22

- Sign-in dialog focus and kiosk keyboard helper; Jog blocked touches explained

## 2.5.6 -- 2026-10-22

- Kiosk keyboard helper call, sign-in dialog font

## 2.5.5 -- 2026-10-22

- Jog and bars tell why an action is blocked and ask for the session; Jog loses the Machine pointer sections

## 2.5.4 -- 2026-10-22

- Sign-in dialog redesign and on-screen keyboard; single floating panel for power actions; risk bar on one line; Jog gear and scrollbar; side tabs transition

## 2.5.3 -- 2026-10-21

- PIN sign enters by itself when the PIN has the length that worked last time

## 2.5.2 -- 2026-10-21

- Side bar: pin next to the fold arrow keeps the bar open

## 2.5.1 -- 2026-10-21

- Page routes in English with redirects from the old ones, localStorage keys migrated to English

## 2.5.0 -- 2026-10-21

- No fixed currency or meter assumption, no-meter message, tariff and meter settings for technicians

## 2.4.5 -- 2026-10-21

- Add meter opens in its own card with a title and a Close button

## 2.4.4 -- 2026-10-21

- Consumption bars and meter editor receive their props again (renamed bindings repaired)

## 2.4.3 -- 2026-10-21

- Page reloads when the DWC language changes; Vision pins dsf-python below 3.7; meter wizard copy over http

## 2.4.2 -- 2026-10-21

- English migration: texts through the catalog, no in-browser translator, interfaces per part

## 2.4.1 -- 2026-10-20

- English names: remaining values, ids, theme panels and the Vision backend keys (fixes a mismatch with the page)

## 2.4.0 -- 2026-10-20

- All the code, data keys and enum values are in English; stored data is converted by the one-off migration script

## 2.3.2 -- 2026-10-18

- Start-up entry is a chip in the page header

## 2.3.1 -- 2026-10-17

- Start-up strip under the page header, same place as the other plugins

## 2.3.0 -- 2026-10-16

- Start-up card is now a dialog opened from a strip on the page (one card per function, progress, step-by-step assistant), with a plain explanation for every row

## 2.2.8 -- 2026-10-16

- Start-up assistant (shared piece), Lights: the strip pin is chosen in Advanced (plain LED removed)

## 2.2.7 -- 2026-10-15

- Start-up card (shared piece): Printing assistant renamed so it no longer collides with the card

## 2.2.6 -- 2026-10-15

- Rebuilt with the shared start-up card piece

## 2.2.5 -- 2026-10-15

- Spanish texts with accents and enie

## 2.2.4 -- 2026-10-14

- Hide every mention of another plugin when it is absent

## 2.2.3 -- 2026-10-14

- Cleanup: no more lookups of the old service Id (PiCustomCodes) or mentions of the removed custom G-codes

## 2.2.2 -- 2026-10-14

- One header only: the live reading moved to a Summary section

## 2.2.1 -- 2026-10-14

- Header is its own card above the live card, like the other pages

## 2.2.0 -- 2026-10-14

- The page has the side bar (By period, Jobs, History, Meter); the live card on top is the header and always shows

## 2.1.0 -- 2026-10-13

- Recent jobs: file and live job merged into one row, more detail per job (expandable, real power from the meter), the live job name without the third-party program

## 2.0.2 -- 2026-10-13

- Files and macros written by the plugin are in English; bilingual risk texts

## 2.0.1 -- 2026-10-13

- Official localization completed: no Spanish text left in the sources, texts with parameters are single keys

## 2.0.0 -- 2026-10-13

- Needs WorkshopService 2.0: calls its central API (POST /machine/WorkshopService/api) instead of the custom codes M9003 / M9010, which are gone
- The local key of the energy meter goes as plain text (no hex)

## 1.6.0 -- 2026-10-13

- Official DWC localization: es.json / en.json via registerPluginLocalization

## 1.5.2 -- 2026-10-12

- Heartbeat; system wording; origin tags

## 1.5.1 -- 2026-10-12

- Consumo: estado desde DWC y solo con la pagina a la vista; dwcVersion 3.6

## 1.5.0 -- 2026-10-11

- Carpetas en ingles bajo 0:/sys/workshop (datos, disenos, malla, cortar por partes); arreglos de la Mesa de trabajo

## 1.4.1 -- 2026-10-11

- Las paginas vuelven a cargar (punto y coma en safe-saving.js)

## 1.4.0 -- 2026-10-11

- Id nuevo en ingles (Workshop...) y guardado seguro ante cortes de luz

# TallerConsumo -- historial de versiones

## 1.3.1 -- 2026-10-10

- Compatibilidad con los Id nuevos en ingles (busca el servicio por el Id nuevo o el viejo); sin cambiar ningun Id todavia

## 1.3.0 -- 2026-10-10

- Varios medidores (por ejemplo la cama aparte): cada uno con su lectura y el total; consultas e historial por medidor

## 1.2.12 -- 2026-10-10

- Estilo comun segun DESIGN.md (alto de botones, colores de la paleta, encabezados)

## 1.2.11 -- 2026-10-10

- Los comandos de la pagina van por HTTP desde el primero (antes salian por G-code mientras cargaban los plugins) y reintentan ~15 s si el servicio se esta reiniciando

## 1.2.10 -- 2026-10-10

- Estandar de advertencias y nombre visible del servicio (Servicio de la Pi)

## 1.2.9 -- 2026-10-10

- Comandos M9003 en ingles; los nombres en español siguen como alias; traducciones al ingles completas

## 1.2.8 -- 2026-10-10

- Comunicacion: el aviso de falta el servicio de la Pi explica en el lugar como se comunica la Pi con la Duet (antes enlazaba a GitHub)

## 1.2.7 -- 2026-10-10

- Aviso con enlace a la explicacion cuando falta el servicio de la Pi (sin modo SBC, sin PiCustomCodes o detenido)

## 1.2.6 -- 2026-10-10

- Los trabajos en vivo (por red o USB) se nombran 'trabajo en vivo' en vez de un nombre de programa

## 1.2.5 -- 2026-10-10

- Linea de diseno comun: colores por significado, encabezado con el icono del menu, textos legibles con el tema claro de DWC

## 1.2.4 -- 2026-10-10

- Textos legibles con el tema claro de DWC

## 1.2.3 -- 2026-10-09

- Ctrl+rueda / Ctrl+tecla pasan al zoom de Chrome

## 1.2.2 -- 2026-10-09

- Salud del medidor: ultima lectura, lecturas buenas y fallas (% de exito), tiempo entre lecturas, duracion y reintentos, ultima falla

## 1.2.1 -- 2026-10-09

- Medidor: sin respaldo al original; estado 'configura un medidor' y boton Olvidar medidor (doble toque)

## 1.2.0 -- 2026-10-09

- Pagina redisenada: en vivo + hoy/mes/proyeccion, comparacion con el periodo anterior, trabajos con costo, historial 24h/7d/30d sin rampas falsas en huecos, y configuracion del medidor (buscar/probar/guardar)

## 1.1.3 -- 2026-10-09

- Graficos: el tooltip se ve tambien en escala 'sin picos' (antes quedaba fuera del grafico)

## 1.1.2 -- 2026-10-09

- Graficos: en escala logaritmica el eje Y muestra numeros (1, 2, 5 de cada decada)

## 1.1.1 -- 2026-10-08

- Escala de graficos: cambiar uno cambia todos

## 1.1.0 -- 2026-10-08

- Graficos: escala lineal / logaritmica / sin picos (boton abajo a la izquierda)

## 1.0.3 -- 2026-10-08

- Icono del menu: medidor (antes un rayo parecido al de Servicios)

## 1.0.2 -- 2026-10-08

- Nombre visible en ingles

## 1.0.1 -- 2026-10-08

- Graficos: los ejes mantienen el formato (3k, sin diagonal) despues de zoom/pan

