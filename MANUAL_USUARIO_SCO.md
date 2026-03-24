# MANUAL COMPLETO DE USUARIO — SCO (Sistema de Costeos OLO)

Este documento es la guía oficial del sistema SCO. Contiene instrucciones detalladas para todos los módulos de valor agregado. Fue creado para que el asistente de inteligencia artificial pueda responder cualquier pregunta de los usuarios sobre cómo usar la aplicación.

---

## ÍNDICE DE MÓDULOS

1. [CLIENTES](#módulo-clientes)
2. [INVENTARIO](#módulo-inventario)
3. [MANTENIMIENTO DE INVENTARIO](#módulo-mantenimiento)
4. [TAREAS (Solicitudes de Producción)](#módulo-tareas)
5. [ANÁLISIS DE TAREAS (Tabla de Datos)](#módulo-análisis-de-tareas)
6. [CORRESPONDENCIA (Correos Automáticos)](#módulo-correspondencia)

---

---

# MÓDULO: CLIENTES

## ¿Qué es el módulo de Clientes?

El módulo de Clientes permite gestionar la base de datos completa de clientes de la empresa. Incluye creación, edición, eliminación, búsqueda avanzada e importación masiva desde Excel. Está integrado con el sistema de validación de Hacienda de Costa Rica para verificar la identidad fiscal de los clientes.

---

## ¿Cómo crear un cliente nuevo?

### Paso 1: Acceder al módulo
- En el menú lateral, hacer clic en **"Clientes"**.
- Se carga la pantalla principal con la lista de todos los clientes existentes.

### Paso 2: Abrir el formulario de creación
- Hacer clic en el botón verde **"Nuevo Cliente"** en la esquina superior derecha.
- Se abre un formulario modal.

### Paso 3: Completar los datos del cliente
Los campos del formulario son:

| Campo | Descripción | Obligatorio |
|---|---|---|
| **Tipo de persona** | Física (persona natural) o Jurídica (empresa) | Sí |
| **Tipo de identificación** | Cédula, DIMEX, NITE, Pasaporte, etc. | Sí |
| **Número de identificación** | Número exacto según tipo | Sí |
| **Nombre completo / Razón social** | Nombre de la persona o empresa | Sí |
| **Nombre comercial** | Nombre con el que opera (puede ser diferente) | No |
| **Correo electrónico** | Email principal de contacto | No |
| **Teléfono** | Número de contacto | No |
| **Dirección** | Dirección física | No |
| **Provincia / Cantón / Distrito** | Ubicación geográfica de Costa Rica | No |

### Paso 4: Validar en Hacienda (opcional pero recomendado)
- Al ingresar la cédula o identificación, el sistema puede consultar automáticamente el Registro Nacional / Hacienda para validar si el contribuyente existe y está activo.
- Los estados de validación son:
  - **Válido**: El contribuyente existe y está activo en Hacienda.
  - **Pendiente**: Aún no se ha validado.
  - **Inválido**: No encontrado o con problemas en Hacienda.

### Paso 5: Guardar
- Hacer clic en **"Guardar"** o **"Crear Cliente"**.
- El sistema confirma con un mensaje verde de éxito.
- El cliente aparece inmediatamente en la lista.

---

## ¿Cómo editar un cliente existente?

1. En la tabla de clientes, localizar el cliente a modificar.
2. Hacer clic en el ícono de **editar (lápiz)** en la columna de acciones.
3. Se abre el mismo formulario con los datos actuales precargados.
4. Modificar los campos necesarios.
5. Hacer clic en **"Guardar"**.

---

## ¿Cómo eliminar un cliente?

1. En la tabla, hacer clic en el ícono de **eliminar (basurero)** del cliente.
2. Aparece un diálogo de confirmación: *"¿Está seguro de que desea eliminar este cliente?"*
3. Confirmar con **"Sí, eliminar"**.
4. El cliente se elimina permanentemente.

> **Advertencia:** Si el cliente tiene cotizaciones, pedidos o tareas asociadas, es posible que no se pueda eliminar directamente.

---

## ¿Cómo buscar un cliente?

### Búsqueda rápida (barra de filtros):
- En la sección de filtros, escribir en el campo de búsqueda el nombre, cédula o cualquier dato del cliente.
- La tabla se filtra en tiempo real.

### Búsqueda avanzada (modal de búsqueda):
- Hacer clic en el botón **"Buscar Cliente"** (lupa).
- Se abre un modal con búsqueda especializada que permite localizar un cliente para asignarlo a otro proceso (cotización, tarea, etc.).

---

## ¿Cómo importar clientes desde Excel?

1. Preparar un archivo Excel (.xlsx o .csv) con las columnas correctas.
2. Hacer clic en el botón **"Importar"** (ícono de Excel).
3. Se abre el modal de importación.
4. Subir el archivo.
5. El sistema procesa los datos y crea los clientes automáticamente.
6. Se muestra un resumen de cuántos clientes se importaron correctamente y cuáles tuvieron errores.

---

## ¿Qué significan los indicadores de la pantalla principal?

| Indicador | Descripción |
|---|---|
| **Total Clientes** | Número total de clientes registrados en el sistema |
| **Validados** | Clientes cuya identidad fiscal fue verificada exitosamente con Hacienda |
| **Pendientes** | Clientes que aún no han sido validados con Hacienda |
| **Jurídicos** | Clientes clasificados como personas jurídicas (empresas) |

---

## Preguntas frecuentes sobre Clientes

**P: ¿Puedo tener el mismo cliente en varias tiendas?**
R: Los clientes son compartidos dentro del sistema, pero las cotizaciones y tareas sí son por tienda.

**P: ¿Es obligatorio validar con Hacienda?**
R: No es obligatorio, pero sí recomendado si se va a emitir factura electrónica a ese cliente.

**P: ¿Qué pasa si ingreso un número de cédula incorrecto?**
R: El sistema lo acepta, pero el estado de validación quedará como "Inválido" o "Pendiente" al consultar Hacienda.

---

---

# MÓDULO: INVENTARIO

## ¿Qué es el módulo de Inventario?

El módulo de Inventario gestiona el catálogo de artículos o materias primas de la empresa. Permite registrar artículos con su código, descripción, cantidad en stock, costo, porcentaje de ganancia y precio de venta. Incluye categorías, unidades de medida e importación masiva.

---

## Vistas del módulo de Inventario

El módulo tiene 4 vistas accesibles desde el menú lateral del módulo:

| Vista | Descripción |
|---|---|
| **Inventario** | Lista principal de artículos con filtros y tabla |
| **Categorías** | Gestión de categorías para clasificar artículos |
| **Importar** | Carga masiva de artículos desde Excel |
| **Unidades de Medida** | Gestión de unidades (unidades, kilogramos, metros, etc.) |

---

## ¿Cómo crear un artículo nuevo?

### Paso 1: Acceder al módulo
- En el menú lateral, hacer clic en **"Inventario"**.

### Paso 2: Crear nuevo artículo
- Hacer clic en el botón azul **"Nuevo Artículo"**.
- Se abre un formulario modal.

### Paso 3: Completar los datos
| Campo | Descripción | Obligatorio |
|---|---|---|
| **Código del artículo** | Código único de identificación interna (ej: ART-001) | Sí |
| **Descripción** | Nombre descriptivo del artículo | Sí |
| **Categoría** | Clasificación del artículo (debe existir en el catálogo) | No |
| **Unidad de medida** | Cómo se mide (unidades, kg, metros, etc.) | No |
| **Cantidad en stock** | Cantidad actual disponible | Sí |
| **Costo** | Costo de adquisición o producción del artículo | Sí |
| **% Ganancia** | Porcentaje de ganancia a aplicar sobre el costo | No |
| **Precio de venta** | Se calcula automáticamente: Costo × (1 + % Ganancia) | Automático |
| **Activo** | Si el artículo está disponible para usar en el sistema | Sí |

### Paso 4: Guardar
- Hacer clic en **"Guardar"**.
- El artículo aparece en la tabla.

---

## ¿Cómo editar un artículo?

1. En la tabla de inventario, hacer clic en el ícono de **editar (lápiz)** del artículo.
2. Modificar los campos necesarios.
3. Guardar.

---

## ¿Cómo filtrar artículos?

En la barra de filtros se puede:
- **Buscar por texto**: Nombre o código del artículo.
- **Filtrar por categoría**: Solo ver artículos de una categoría específica.
- **Ordenar**: Por código, descripción, cantidad, costo o precio.
- **Dirección de orden**: Ascendente o descendente.

---

## ¿Cómo gestionar Categorías?

1. En el módulo de Inventario, cambiar a la vista **"Categorías"**.
2. Se muestra la lista de categorías existentes.
3. Se pueden crear categorías nuevas, editarlas o desactivarlas.
4. Las categorías son usadas para clasificar artículos y para filtrar.

---

## ¿Cómo gestionar Unidades de Medida?

1. Cambiar a la vista **"Unidades de Medida"**.
2. Crear, editar o desactivar unidades (ej: "unidades", "kilogramos", "metros", "litros").
3. Las unidades se asignan a cada artículo.

---

## ¿Cómo importar inventario desde Excel?

1. Cambiar a la vista **"Importar"**.
2. Descargar la plantilla de ejemplo si está disponible.
3. Llenar el Excel con los artículos.
4. Subir el archivo.
5. El sistema procesa e importa los artículos automáticamente.

---

## ¿Cómo funciona el cálculo de precio?

El precio de venta se calcula automáticamente:

```
Precio de venta = Costo × (1 + % Ganancia / 100)
```

**Ejemplo:**
- Costo: ₡1,000
- % Ganancia: 30%
- Precio = ₡1,000 × 1.30 = **₡1,300**

---

## Preguntas frecuentes sobre Inventario

**P: ¿Se descuenta el inventario automáticamente cuando se usa en una tarea?**
R: Sí, cuando se procesan tareas con ítems del inventario y se activa el consumo, el sistema puede descontar el stock. Esto depende de la configuración.

**P: ¿Qué pasa si la cantidad llega a cero?**
R: El módulo de Mantenimiento detecta esto automáticamente y genera una alerta.

**P: ¿Se pueden tener artículos inactivos?**
R: Sí. Un artículo inactivo no aparece en búsquedas normales pero conserva su historial.

---

---

# MÓDULO: MANTENIMIENTO

## ¿Qué es el módulo de Mantenimiento?

El módulo de Mantenimiento (también llamado "Control Avanzado de Inventario") es un sistema de monitoreo inteligente que vigila los niveles de stock, genera alertas automáticas cuando el inventario está bajo, predice la demanda futura y propone órdenes de reabastecimiento. También registra todos los movimientos de inventario.

---

## Vistas del módulo de Mantenimiento

| Vista | Descripción |
|---|---|
| **Umbrales** | Configurar niveles mínimos y máximos de stock por artículo |
| **Alertas** | Ver todas las alertas activas de stock bajo |
| **Reabastecimiento** | Órdenes de compra/reposición generadas automáticamente |
| **KPIs** | Indicadores clave de rendimiento del inventario |
| **Predicción** | Proyección de demanda futura por artículo |
| **Movimientos** | Historial completo de entradas y salidas de inventario |
| **Configuración** | Ajustes generales del módulo |

---

## ¿Qué son los Umbrales y cómo se configuran?

Un **umbral** es un nivel mínimo o máximo de stock que defines para un artículo. Cuando el stock cae por debajo del mínimo, el sistema genera una alerta automática.

### ¿Cómo crear un umbral?

1. Ir a la vista **"Umbrales"**.
2. Hacer clic en **"Nuevo Umbral"** o similar.
3. Seleccionar el artículo del inventario.
4. Definir:
   - **Stock mínimo**: Cantidad mínima aceptable.
   - **Stock máximo**: Cantidad ideal máxima.
   - **Punto de reorden**: Cantidad a la que se dispara la orden de reabastecimiento.
5. Guardar.

### ¿Qué pasa cuando el stock cae por debajo del mínimo?
- El sistema detecta la situación automáticamente.
- Se genera una **alerta activa** visible en la vista de Alertas.
- Se puede generar una orden de reabastecimiento desde esa misma alerta.
- Si el sistema de notificaciones está activo, puede enviar una notificación en tiempo real.

---

## ¿Qué son las Alertas?

Las alertas son notificaciones automáticas generadas cuando:
- El stock de un artículo cae por debajo del umbral mínimo configurado.
- Se detecta un artículo con stock en cero.

### Vista de Alertas
- Muestra todas las alertas activas ordenadas por fecha.
- Por cada alerta se ve: artículo, código, stock actual, umbral mínimo, y el déficit.
- Desde aquí se puede generar una orden de reabastecimiento directamente.

---

## ¿Qué son las Órdenes de Reabastecimiento?

Son propuestas automáticas de compra generadas cuando el sistema detecta que un artículo necesita reponerse.

### Flujo típico:
1. El stock baja del umbral mínimo → Se genera una alerta.
2. Desde la alerta o desde la vista de umbrales, se genera una **Orden de Reabastecimiento**.
3. La orden queda registrada con estado "Pendiente".
4. Un responsable puede aprobarla, procesarla o cancelarla.

### Estados de una orden:
- **Pendiente**: Generada pero no procesada.
- **En proceso**: Se está gestionando la compra.
- **Completada**: El inventario fue repuesto.
- **Cancelada**: No se va a procesar.

---

## ¿Qué son los KPIs del inventario?

Los KPIs (Key Performance Indicators) son métricas de rendimiento del inventario:

| KPI | Descripción |
|---|---|
| **Valor total del inventario** | Suma del costo × cantidad de todos los artículos |
| **Artículos bajo stock** | Cantidad de artículos por debajo de su umbral mínimo |
| **Tasa de rotación** | Con qué frecuencia se repone el inventario |
| **Artículos sin movimiento** | Artículos que no han tenido movimiento en X días |
| **Exactitud del inventario** | Comparación entre stock teórico y físico |

---

## ¿Cómo funciona la Predicción de Demanda?

El módulo analiza el historial de consumo de cada artículo y proyecta cuántas unidades se van a necesitar en el futuro.

- Basada en el historial de movimientos de inventario.
- Muestra proyecciones por artículo.
- Ayuda a decidir cuándo y cuánto pedir.

---

## ¿Qué son los Movimientos de Inventario?

Los movimientos son el registro histórico de todas las entradas y salidas de stock.

### Tipos de movimiento:
- **Entrada**: Stock que ingresa (compra, producción, ajuste positivo).
- **Salida**: Stock que sale (uso en tareas/producción, venta, ajuste negativo).
- **Ajuste**: Corrección manual de inventario.

### Vista de Movimientos:
- Muestra todos los movimientos ordenados por fecha.
- Por cada movimiento: artículo, tipo, cantidad, fecha, usuario responsable.

---

## Notificaciones en Tiempo Real

El módulo tiene un sistema de notificaciones en tiempo real que aparece en la esquina superior derecha de la pantalla. Avisa inmediatamente cuando:
- Se genera una nueva alerta de stock bajo.
- Una orden de reabastecimiento cambia de estado.

---

## Preguntas frecuentes sobre Mantenimiento

**P: ¿Las alertas se generan automáticamente o manualmente?**
R: Automáticamente. El sistema revisa constantemente los niveles de stock contra los umbrales configurados.

**P: ¿Puedo configurar umbrales diferentes para cada artículo?**
R: Sí. Cada artículo tiene su propio umbral independiente.

**P: ¿Se puede importar la configuración de umbrales?**
R: Sí, existe la opción de importar umbrales desde Excel.

**P: ¿Qué pasa si no tengo configurados umbrales?**
R: No se generarán alertas automáticas. Los umbrales son el prerequisito para el sistema de alertas.

---

---

# MÓDULO: TAREAS

## ¿Qué es el módulo de Tareas?

El módulo de Tareas es el corazón operativo del sistema. Gestiona las **solicitudes de producción o trabajo** que pasan por diferentes estados desde que se crean hasta que se finalizan. Cada tarea tiene un número de consecutivo único, un solicitante, ítems de materiales, personal asignado y un registro de costos.

---

## Estados de una Tarea

Las tareas tienen un ciclo de vida definido con los siguientes estados en orden:

| Estado | Significado |
|---|---|
| **En Cola** | La tarea fue creada y está esperando ser asignada o iniciada |
| **En Proceso** | La tarea está siendo trabajada activamente |
| **Produciendo** | Se está produciendo el material o producto |
| **Esperando suministros** | La tarea está pausada por falta de materiales |
| **Terminado** | El trabajo físico está completo, pendiente de cierre |
| **Finalizado** | La tarea está completamente cerrada |

> **Importante:** La vista principal de Tareas por defecto **oculta las tareas Finalizadas** para mantener la lista limpia. Para ver tareas finalizadas, debes usar el filtro de estado.

---

## ¿Cómo crear una Tarea nueva?

### Paso 1: Acceder al módulo
- En el menú lateral, hacer clic en **"Tareas"**.

### Paso 2: Abrir el formulario de creación
- Hacer clic en el botón **"Nueva Tarea"** en la parte superior.
- Se abre un modal de creación.

### Paso 3: Completar el formulario

El formulario de creación de tareas incluye campos estándar y campos dinámicos configurados por el administrador:

**Campos estándar:**
| Campo | Descripción |
|---|---|
| **Descripción breve** | Resumen corto de qué se necesita hacer |
| **Fecha estimada de entrega** | Cuándo debe estar lista la tarea |
| **Cantidad de unidades** | Cuántas unidades se deben producir o entregar |

**Campos dinámicos del formulario** (configurados por el administrador de la tienda, pueden incluir):
- Departamento solicitante
- Cliente o proyecto
- Tipo de trabajo
- Solicitud EPA
- Solicitud COFERSA
- Tablas de ítems simples o completas
- Cualquier otro campo personalizado

### Paso 4: Guardar
- Hacer clic en **"Guardar"** o **"Crear Tarea"**.
- El sistema asigna automáticamente un **número de consecutivo único** (ej: TAREA-001, TAREA-002).
- La tarea queda en estado **"En Cola"**.
- Se envía automáticamente un correo al solicitante notificando la creación.

---

## ¿Cómo procesar (actualizar) una Tarea?

### Paso 1: Localizar la tarea
- En la lista de tareas, buscar la tarea por número de consecutivo, estado u otros filtros.

### Paso 2: Abrir el modal de procesamiento
- Hacer clic en el botón **"Procesar"** o en el nombre de la tarea.
- Se abre el modal de procesamiento.

### Paso 3: Actualizar los datos

En el modal de procesamiento se puede:

| Acción | Descripción |
|---|---|
| **Cambiar estado** | Mover la tarea al siguiente estado del ciclo |
| **Agregar ítems** | Agregar materiales o artículos del inventario con cantidad y costo |
| **Asignar personal** | Seleccionar colaboradores asignados a esta tarea |
| **Registrar fecha de inicio** | Cuándo se inició el trabajo efectivamente |
| **Registrar fecha de cierre** | Cuándo se terminó el trabajo |
| **Registrar "Entregado a"** | A quién se entregó el resultado |
| **Cantidad de personas** | Cuántas personas trabajaron en la tarea |
| **Total de costos** | Se calcula automáticamente sumando los ítems |

### Paso 4: Guardar
- Al guardar, el sistema actualiza la tarea.
- Si el estado cambió, **se envía automáticamente un correo al solicitante** informando el nuevo estado.

---

## ¿Qué son los Ítems de una Tarea?

Los ítems son los materiales, artículos o servicios involucrados en la tarea. Cada ítem tiene:
- **Descripción**: Qué es el material.
- **Cantidad**: Cuánto se va a usar.
- **Costo unitario**: Precio por unidad.
- **Costo total**: Cantidad × Costo unitario (calculado automáticamente).

El sistema suma todos los ítems para calcular el **Total de Costo** de la tarea.

---

## ¿Qué son los Encargados y Colaboradores?

### Encargados (Líderes)
- Son los usuarios del sistema que pueden gestionar y procesar tareas.
- Se configuran desde el botón **"Configurar Encargados"** en el módulo de Tareas.
- Un encargado es quien recibe las tareas y las mueve entre estados.

### Colaboradores
- Son personas que trabajan físicamente en las tareas pero que no necesariamente tienen acceso al sistema.
- Se registran con nombre, email y teléfono.
- Se gestionan desde el botón **"Gestionar Colaboradores"**.
- Se pueden asignar a tareas específicas.

---

## ¿Cómo filtrar Tareas?

La barra de filtros permite:
- **Buscar por texto**: Número de consecutivo o descripción.
- **Filtrar por estado**: Solo ver tareas en un estado específico.
- **Rango de fechas**: Filtrar por fecha de creación (desde / hasta).

---

## ¿Cómo exportar Tareas a CSV?

1. Hacer clic en el botón **"Exportar"** (si está disponible en el módulo).
2. El sistema descarga un archivo CSV con todas las tareas (incluyendo finalizadas).
3. El archivo incluye: consecutivo, estado, fecha, solicitante, descripción, costos, etc.

---

## ¿Cómo funciona el sistema de notificaciones de Tareas?

El sistema envía correos automáticos al solicitante de la tarea en dos momentos:

| Evento | Correo enviado |
|---|---|
| **Tarea creada** | "Tu solicitud ha sido recibida. Número: TAREA-XXX" |
| **Cambio de estado** | "Tu solicitud fue actualizada: Estado anterior → Estado nuevo" |
| **Tarea finalizada** | Correo especial de cierre |

Los correos incluyen:
- Número de la tarea
- Estado anterior y nuevo
- Fecha del cambio
- Descripción de la solicitud
- Información del cliente/proyecto si aplica

---

## Vista TareasDeadline (Vista Principal)

La vista principal del módulo muestra las tareas organizadas visualmente con información de:
- Número de consecutivo.
- Estado actual con color diferenciador.
- Fecha estimada de entrega.
- Solicitante.
- Botón de acción para procesar.

---

## Preguntas frecuentes sobre Tareas

**P: ¿Puedo crear una tarea desde una cotización?**
R: Sí. El sistema permite importar los ítems de una cotización existente directamente a la tarea.

**P: ¿Cuántas tareas puedo tener activas?**
R: No hay límite. El sistema está diseñado para manejar grandes volúmenes.

**P: ¿El solicitante necesita tener acceso al sistema para recibir notificaciones?**
R: No. Los correos se envían al email del solicitante sin importar si tiene cuenta en el sistema.

**P: ¿Puedo volver un estado atrás? Por ejemplo, de "En Proceso" a "En Cola"?**
R: Sí, técnicamente el sistema permite cambiar a cualquier estado, pero se recomienda seguir el flujo normal para mantener la trazabilidad.

**P: ¿Qué pasa si cierro la tarea sin registrar ítems de costo?**
R: La tarea se puede cerrar, pero el total de costo quedará en ₡0.

**P: ¿Cómo veo las tareas finalizadas?**
R: En la barra de filtros, selecciona el estado "Finalizado". Por defecto las tareas finalizadas están ocultas de la vista principal.

---

---

# MÓDULO: ANÁLISIS DE TAREAS

## ¿Qué es el módulo de Análisis de Tareas?

El módulo de Análisis de Tareas (también llamado "Tabla de Datos") es una herramienta de reportería y análisis que muestra todas las tareas finalizadas con sus costos detallados, agrupados por cliente. Permite filtrar, analizar totales y exportar a Excel para análisis externos.

---

## ¿Cómo acceder al módulo?

- En el menú lateral, buscar **"Análisis de Tareas"** o **"Tabla de Datos"**.

---

## ¿Qué información muestra el módulo?

### Tabla principal de tareas
Por cada tarea se muestra:
- Número de consecutivo.
- Estado de la tarea.
- Fecha de inicio de producción.
- Fecha de cierre.
- Cliente o proyecto asociado.
- Descripción breve.
- Cantidad de unidades.
- Total de costo registrado.

### Totales por Cliente
Una sección separada muestra el resumen financiero por cliente:
- Nombre del cliente.
- Número de tareas completadas.
- Total acumulado de costos.

### Total General
El sistema muestra el total global sumando todos los clientes del período filtrado.

---

## ¿Cómo filtrar el análisis?

Los filtros disponibles son:

| Filtro | Descripción |
|---|---|
| **Búsqueda por texto** | Buscar por número de tarea, descripción o cliente |
| **Fecha inicio desde** | Filtrar tareas que iniciaron desde una fecha específica |
| **Fecha cierre hasta** | Filtrar tareas cerradas hasta una fecha específica |
| **Estado** | Ver solo tareas en un estado específico |
| **Cliente** | Ver solo las tareas de un cliente específico |

### ¿Cómo usar los filtros de fecha?
- **Fecha inicio desde**: Solo muestra tareas cuya fecha de inicio de producción es igual o posterior a la fecha indicada.
- **Fecha cierre hasta**: Solo muestra tareas cuya fecha de cierre es igual o anterior a la fecha indicada.

Esto es útil para generar reportes de un período específico, por ejemplo: "todas las tareas del mes de marzo".

---

## ¿Cómo exportar el análisis a Excel?

1. Aplicar los filtros deseados para el reporte.
2. Hacer clic en el botón **"Exportar Excel"**.
3. El sistema genera y descarga automáticamente un archivo Excel (.xlsx).
4. El archivo contiene todas las tareas filtradas con sus datos completos y los totales por cliente.

---

## ¿Cuál es la diferencia entre Análisis de Tareas y el módulo de Tareas normal?

| Aspecto | Módulo Tareas | Análisis de Tareas |
|---|---|---|
| **Enfoque** | Gestión operativa (crear, procesar, cambiar estados) | Análisis y reportería (ver, filtrar, exportar) |
| **Qué muestra** | Tareas activas (oculta finalizadas por defecto) | Todas las tareas incluyendo finalizadas |
| **Agrupación** | Cronológica | Por cliente con subtotales |
| **Exportación** | CSV básico | Excel completo con totales |
| **Para quién** | Personal operativo | Gerencia o análisis financiero |

---

## Preguntas frecuentes sobre Análisis de Tareas

**P: ¿Puedo ver el costo total de todas las tareas de un cliente específico?**
R: Sí. La sección "Totales por Cliente" muestra exactamente eso.

**P: ¿El análisis incluye tareas en todos los estados?**
R: Sí, puedes filtrar por cualquier estado o ver todos.

**P: ¿Los datos del análisis se actualizan en tiempo real?**
R: Sí, siempre muestran la información más reciente de la base de datos.

**P: ¿Puedo hacer el reporte de un mes específico?**
R: Sí. Usa el filtro "Fecha inicio desde" y "Fecha cierre hasta" para definir el rango del mes.

---

---

# MÓDULO: CORRESPONDENCIA

## ¿Qué es el módulo de Correspondencia?

El módulo de Correspondencia es el motor de comunicación automática del sistema. Permite configurar plantillas de correo electrónico y reglas automáticas para que el sistema envíe correos en momentos clave (como cuando se crea una tarea o cambia de estado). También permite enviar correos manuales y ver el historial de todos los correos enviados.

---

## Las 3 secciones del módulo de Correspondencia

| Sección | Descripción |
|---|---|
| **Plantillas** | Diseña los correos HTML que se van a enviar |
| **Reglas** | Define cuándo y a quién se envía cada plantilla |
| **Historial** | Registro de todos los correos enviados, con estado |

---

## SECCIÓN: Plantillas

### ¿Qué es una plantilla?

Una plantilla es el diseño HTML del correo electrónico. Define el asunto y el cuerpo del correo con variables dinámicas que el sistema reemplaza con datos reales.

### ¿Cómo crear una plantilla?

1. En el módulo de Correspondencia, ir a la pestaña **"Plantillas"**.
2. Hacer clic en **"Nueva Plantilla"**.
3. Completar:
   - **Nombre de la plantilla**: Nombre interno para identificarla (ej: "Tarea Creada", "Cambio de Estado").
   - **Asunto del correo**: El asunto que ve el destinatario. Puede incluir variables (ej: `Tarea {{numero_tarea}} - Estado: {{estado_nuevo}}`).
   - **Cuerpo HTML**: El contenido del correo en formato HTML con variables dinámicas.
4. Guardar.

### Variables dinámicas disponibles en plantillas

Las variables se escriben entre dobles llaves: `{{nombre_variable}}`

#### Variables para el evento "Tarea Creada":

| Variable | Descripción |
|---|---|
| `{{numero_tarea}}` | Número de consecutivo de la tarea (ej: TAREA-001) |
| `{{estado}}` | Estado actual de la tarea |
| `{{email_solicitante}}` | Correo electrónico del solicitante |
| `{{descripcion_breve}}` | Descripción breve de la solicitud |
| `{{fecha_estimada_entrega}}` | Fecha límite estimada |
| `{{cantidad_unidades}}` | Número de unidades solicitadas |
| `{{departamento_solicitante}}` | Departamento del formulario dinámico |
| `{{cliente}}` | Cliente o proyecto del formulario |
| `{{solicitud_epa}}` | Solicitud EPA si aplica |
| `{{solicitud_cofersa}}` | Solicitud COFERSA si aplica |
| `{{tipo_trabajo}}` | Tipo de trabajo del formulario |

#### Variables adicionales para el evento "Cambio de Estado":

| Variable | Descripción |
|---|---|
| `{{estado_anterior}}` | Estado previo antes del cambio |
| `{{estado_nuevo}}` | Nuevo estado después del cambio |
| `{{badge_estado_anterior}}` | Badge HTML coloreado del estado anterior |
| `{{badge_estado_nuevo}}` | Badge HTML coloreado del estado nuevo |
| `{{bloque_cambio_estado}}` | Bloque completo con flecha de transición y fecha |
| `{{bloque_resumen_solicitud}}` | Badges de EPA/COFERSA/Zona Franca |
| `{{bloque_detalle_solicitud}}` | Tabla con detalles de la solicitud |
| `{{fecha_cambio}}` | Fecha y hora exacta del cambio de estado |

### ¿Cómo activar o desactivar una plantilla?

- En la lista de plantillas, hay un toggle (interruptor) para activar/desactivar cada plantilla.
- Una plantilla desactivada no puede ser usada por ninguna regla activa.

### ¿Cómo editar una plantilla existente?

- Hacer clic en el ícono de editar de la plantilla.
- Modificar el asunto, el HTML o el nombre.
- Guardar.

---

## SECCIÓN: Reglas

### ¿Qué es una regla de correspondencia?

Una regla define **cuándo** se envía un correo (qué evento lo dispara), **cuál plantilla** usar y **a quién** se envía.

### ¿Cómo crear una regla?

1. Ir a la pestaña **"Reglas"**.
2. Hacer clic en **"Nueva Regla"**.
3. Completar:
   - **Nombre**: Nombre descriptivo (ej: "Notificación Cambio de Estado").
   - **Evento que dispara la regla**: El evento del sistema que activa el envío.
   - **Plantilla**: Qué plantilla de correo usar.
   - **Tipo de destinatario**: Fijo (email manual) o Dinámico (toma el email de los datos del evento).
   - **Email del destinatario**: Si es fijo, escribir el email.
   - **Campo del email**: Si es dinámico, indicar qué campo contiene el email (ej: `email_solicitante`).
   - **Prioridad**: Número de prioridad (mayor número = mayor prioridad).
   - **Reintentos**: Cuántas veces reintentar si falla el envío.
   - **Activa**: Si la regla está activada o no.

### Eventos disponibles del sistema

| Evento | Cuándo se dispara |
|---|---|
| `tarea.creada` | Cuando se crea una tarea nueva |
| `tarea.estado_cambiado` | Cuando cualquier tarea cambia de estado |
| `tarea.finalizada` | Específicamente cuando una tarea pasa a estado "Finalizado" |

### ¿Cómo activar o desactivar una regla?

- En la lista de reglas hay un toggle para activar/desactivar.
- Una regla desactivada no procesa ningún evento aunque ocurra.

### Reglas ya configuradas en el sistema

El sistema viene con estas reglas precargadas:

| Regla | Evento | Destinatario |
|---|---|---|
| Tarea Creada | `tarea.creada` | Solicitante de la tarea (campo `email_solicitante`) |
| Cambio de Estado de Tarea | `tarea.estado_cambiado` | Solicitante de la tarea (campo `email_solicitante`) |
| Tarea Finalizada | `tarea.finalizada` | Solicitante de la tarea (campo `email_solicitante`) |

---

## SECCIÓN: Historial

### ¿Qué muestra el historial?

El historial es el registro completo de todos los correos que el sistema ha intentado o enviado.

Por cada registro se muestra:

| Campo | Descripción |
|---|---|
| **Evento** | Qué evento disparó el envío |
| **Regla aplicada** | Cuál regla generó el envío |
| **Destinatario (Para)** | A quién se envió el correo |
| **Asunto** | El asunto del correo enviado |
| **Estado** | enviado / error / pendiente / enviando |
| **Fecha** | Cuándo se procesó |
| **message_id** | ID único del mensaje en el servidor SMTP |
| **smtp_accepted** | Emails que el servidor aceptó |
| **smtp_rejected** | Emails que el servidor rechazó |

### Estados de envío en el historial

| Estado | Significado |
|---|---|
| **enviado** | El correo fue aceptado exitosamente por el servidor SMTP |
| **error** | Hubo un error y el correo no se pudo enviar |
| **pendiente** | El sistema aún está procesando el envío |
| **enviando** | Actualmente en proceso de envío |

### ¿Cómo filtrar el historial?

Se puede filtrar por:
- **Estado**: Solo ver enviados, solo ver errores, etc.
- **Rango de fechas**: Desde / hasta.
- **Búsqueda por asunto**: Buscar correos que contengan cierta palabra en el asunto.

### ¿Cómo reintentar un envío fallido?

1. En el historial, localizar el registro con estado "error".
2. Hacer clic en el botón **"Reintentar"** del registro.
3. El sistema reintenta el envío inmediatamente.
4. El resultado se actualiza en el historial.

---

## Envío Manual de Correos

Además de los correos automáticos, puedes enviar correos manuales desde el módulo de Correspondencia.

### ¿Cómo enviar un correo manual?

1. Hacer clic en el botón **"Nuevo Envío"** o **"Enviar Correo"** en la parte superior del módulo.
2. Se abre el modal de envío manual.
3. Completar:
   - **Para**: Email(s) del destinatario principal (separados por coma si son varios).
   - **CC**: Email(s) en copia (opcional).
   - **CCO**: Email(s) en copia oculta (opcional).
   - **Plantilla**: Seleccionar una plantilla existente o escribir el HTML directamente.
   - **Asunto**: Si no viene de la plantilla.
4. Hacer clic en **"Enviar"**.
5. El sistema envía el correo y queda registrado en el historial.

---

## ¿Cómo sé si los correos se están enviando correctamente?

1. Ir al módulo de Correspondencia → pestaña **"Historial"**.
2. Ver los registros más recientes.
3. Si el estado es **"enviado"** y `smtp_accepted` tiene el email del destinatario → el correo llegó.
4. Si el estado es **"error"** → revisar `smtp_rejected` y el campo `smtp_response` para entender el motivo.

---

## Estadísticas del módulo de Correspondencia

En la parte superior del módulo hay un panel de estadísticas que muestra:
- **Total de correos**: Total histórico de correos procesados.
- **Enviados**: Correos que llegaron exitosamente.
- **Errores**: Correos que fallaron.
- **Pendientes**: Correos en espera de procesamiento.
- **Tasa de éxito**: Porcentaje de correos enviados exitosamente.

---

## Preguntas frecuentes sobre Correspondencia

**P: ¿Por qué no llegó el correo de una tarea?**
R: Revisar en el Historial si el evento aparece. Si aparece con estado "error", leer el smtp_response para ver el motivo. Si no aparece ningún registro, puede ser que la regla esté desactivada o el evento no se disparó.

**P: ¿Puedo enviar el correo a más de una persona?**
R: Sí. Las reglas permiten múltiples destinatarios. También se puede usar CC en el envío manual.

**P: ¿Puedo personalizar completamente el diseño del correo?**
R: Sí. Las plantillas aceptan HTML completo. Puedes diseñar el correo como desees.

**P: ¿Los correos automáticos funcionan aunque no esté logueado en el sistema?**
R: Sí. Los correos automáticos son disparados en el momento en que ocurre el evento (ej: cuando alguien guarda una tarea), independientemente de si el administrador está viendo el sistema.

**P: ¿Cuántas reglas puedo tener para el mismo evento?**
R: Puedes tener múltiples reglas para el mismo evento. El sistema las procesa todas. La prioridad determina el orden de procesamiento.

**P: ¿Cómo agrego un destinatario fijo que siempre reciba copia de cualquier tarea?**
R: Crear una regla con el mismo evento (`tarea.estado_cambiado`) pero con tipo de destinatario "fijo" y el email que siempre debe recibir.

---

---

# INFORMACIÓN GENERAL DEL SISTEMA

## ¿Cómo funciona el sistema de tiendas (multi-tienda)?

El sistema SCO soporta múltiples tiendas o unidades de negocio. Cada usuario tiene acceso a una o más tiendas.

- Al iniciar sesión, si el usuario tiene acceso a más de una tienda, debe seleccionar cuál usar.
- Si solo tiene una tienda asignada, se selecciona automáticamente.
- La tienda actual se muestra en la barra superior.
- Todos los datos (inventario, clientes, tareas, etc.) están separados por tienda.

## ¿Cómo sé en qué tienda estoy trabajando?

- En la barra superior de navegación (TopBar) se muestra el nombre de la tienda activa con un ícono de tienda.

## ¿Cómo cambiar de tienda?

- Si tienes acceso a múltiples tiendas, cerrar sesión y al volver a iniciar sesión seleccionar otra tienda.

## ¿Qué son los permisos y roles?

- Cada usuario tiene un rol (ej: Administrador, Usuario, etc.).
- Los roles definen a qué módulos puede acceder el usuario.
- Un usuario sin permiso de "Configuración" no verá ese botón en el menú de usuario.
- Un administrador tiene acceso a todos los módulos incluyendo Seguridad, donde se gestionan usuarios, roles y permisos.

## ¿Dónde ver mi perfil?

- Hacer clic en el avatar/nombre en la esquina superior derecha.
- Seleccionar **"Mi Perfil"**.

## ¿Cómo contactar soporte?

- Hacer clic en el avatar/nombre en la esquina superior derecha.
- Seleccionar **"Contáctenos"**.
- Completar el formulario de contacto con el asunto, prioridad y descripción del problema.

---

*Documento generado para el sistema SCO — Sistema de Costeos OLO.*
*Versión: 1.0 | Módulos cubiertos: Clientes, Inventario, Mantenimiento, Tareas, Análisis de Tareas, Correspondencia.*
