# Registro de Ventas — Grupo Progreso

Web para escanear el código QR de cada producto, registrar la venta (contado o crédito) y llevar el control de la cartera por cobrar. Se instala en el celular como aplicación y sigue funcionando sin señal.

---

## Cómo probarla ahora mismo

Abre `public/index.html` en el navegador. Arranca en **modo prueba**: los datos se guardan en el mismo dispositivo y trae 9 productos de ejemplo. Todo funciona menos la cámara, que exige HTTPS.

Para probar el escáner desde el celular necesitas subirla primero (paso 2).

---

## Paso 1 — Crear el proyecto en Firebase

1. Entra a `console.firebase.google.com` y crea un proyecto (por ejemplo `gp-ventas`).
2. En **Compilación → Firestore Database**, crea la base de datos. Elige la región `us-central1` o `southamerica-east1`.
3. En **Compilación → Authentication**, activa el método **Correo electrónico / contraseña** y crea un usuario por vendedor.
4. En **Configuración del proyecto → Tus apps**, agrega una app **Web** (icono `</>`). Copia el objeto `firebaseConfig` que te muestra.
5. Abre `public/index.html`, busca la sección `CONFIGURACIÓN` (cerca de la línea 470) y pega ahí tu configuración:

```js
const CFG = {
  firebase: {
    apiKey: "AIza...",
    authDomain: "gp-ventas.firebaseapp.com",
    projectId: "gp-ventas",
    storageBucket: "gp-ventas.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:0000:web:abcdef"
  },
  ...
```

En esa misma sección ajusta tus vendedores y los recargos por plazo.

`CFG.sucursales` viene vacío a propósito. Si lo dejas así, la app nunca pregunta por sucursal. Si escribes las tuyas, aparece un campo para elegirla al registrar la venta y queda guardada en cada registro.

---

## Paso 2 — Publicar

Con Node.js instalado:

```bash
npm install -g firebase-tools
firebase login
cd registro-ventas
firebase use --add          # elige el proyecto que creaste
firebase deploy
```

Te devuelve una dirección tipo `https://gp-ventas.web.app`. Ábrela en el celular y usa **Agregar a pantalla de inicio**: queda con su icono, sin barra del navegador.

El comando `firebase deploy` sube también las reglas de seguridad de `firestore.rules`.

---

## Paso 3 — Dar de alta a los vendedores

Las reglas de seguridad esperan un documento por empleado. En Firestore crea la colección `usuarios` y, por cada persona, un documento cuyo ID sea el **UID** que aparece en Authentication:

```
usuarios/{uid}  →  { nombre: "Katherine", rol: "vendedor" }
usuarios/{uid}  →  { nombre: "Abrahan",   rol: "admin" }
```

Con `rol: "vendedor"` la persona puede registrar ventas y cobros, pero no puede editar precios ni borrar registros. Con `rol: "admin"` puede todo.

---

## Qué hace cada pantalla

**Escanear** — Antes de encender la cámara puedes elegir *Código QR* o *Código de barras* y luego indicar si la venta será *al contado* o *a crédito*. Al reconocer un código la cámara se apaga sola y abre el registro de venta. Si el código no existe, se abre el formulario para poner nombre, marca, categoría, precios y existencia. También acepta el código escrito a mano, útil si la etiqueta está rayada.

**Productos** — Catálogo con buscador, existencias y alta de productos nuevos. Cada producto puede tener un SKU interno y el código de barras que ya trae de fábrica; ambos sirven para buscarlo y registrarlo.

**Ventas** — Filtra el resumen e historial por mes, día o año, consulta el ranking por vendedor, descarga el CSV con cantidad, precio unitario, prima y saldo, y limpia todos los registros de ventas con confirmación.

**Cartera** — Créditos activos ordenados por fecha de vencimiento, total por cobrar, monto vencido y clientes en mora. Desde aquí se registran los abonos: el monto se aplica solo a la cuota más antigua pendiente.

**Entregas y devoluciones** — Permite filtrar los registros por mes, día o año, limpiarlos con confirmación y tocar cualquier registro para editar vendedor, zona, productos entregados y devoluciones. Dentro del formulario, escanear el mismo producto suma su cantidad; también puedes ajustarla con menos y más, o deslizar el producto para borrarlo. **Cartera** también permite filtrar por período, limpiar todos los créditos y, deslizando un crédito, eliminarlo o marcarlo como pagado completamente.

**Etiquetas** — Genera el código QR de cada producto y lo entrega listo para pegar.

---

## Cómo generar e imprimir los códigos QR

Entra a la pestaña **Etiquetas**:

1. **Marca los productos.** Uno por uno, o con el botón *Marcar todos*. El buscador filtra por nombre, marca o código.
2. **Elige el tamaño.** Chica (35 × 45 mm), mediana (45 × 58 mm) o grande (60 × 76 mm). Las medidas son reales: lo que imprimas sale exactamente de ese tamaño.
3. **Decide qué se ve.** Nombre del producto, marca y precio se activan o desactivan por separado. El código siempre aparece.
4. **Pon las copias.** Si tienes 12 lavadoras en piso, escribe 12 y salen doce etiquetas de ese producto.

Después elige cómo sacarlas:

| Botón | Qué hace |
|---|---|
| **Imprimir hoja** | Manda todas a la impresora acomodadas en la hoja. En el diálogo de impresión también puedes elegir *Guardar como PDF*. |
| **Descargar PNG** | Un archivo PNG por producto a 300 ppp, calidad de imprenta. Si marcaste varios, llegan juntos en un ZIP. |
| **Descargar SVG** | Versión vectorial, para mandar a una imprenta o abrir en Illustrator o Canva sin que pierda nitidez. |
| **↓** sobre una etiqueta | Descarga solo esa. |

El QR contiene el código del producto (por ejemplo `GP-1001`). Cualquier lector lo interpreta, así que las etiquetas sirven también para inventario, no solo para esta app.

**Importante al imprimir:** en el diálogo de tu impresora pon la escala en **100 %** y desactiva *Ajustar a la página*. Si la dejas en automático, las etiquetas salen más chicas y el QR pierde precisión.

---

## Cómo se calcula el crédito

```
total            = cantidad × precio unitario
prima            = total × 10 %
total a cancelar = total − prima
cuota mensual    = total a cancelar ÷ meses
```

No se cobra recargo ni interés: el saldo se reparte en partes iguales entre los meses del plazo.

El 10 % está en `CFG.primaPct` y los plazos disponibles en `CFG.plazos` (vienen 3, 6, 12, 18 y 24 meses; `CFG.plazoPorDefecto` marca cuál viene seleccionado). Cámbialos por los tuyos.

**Ejemplo.** Dos refrigeradoras de $829.00 a 12 meses:

| | |
|---|---|
| Total | $1,658.00 |
| Prima (10 %) | $165.80 |
| Total a cancelar | $1,492.20 |
| Cuota mensual | $124.35 × 12 |

Los centavos del redondeo se acumulan en la última cuota, para que la suma del plan cuadre exactamente con el total a cancelar.

**Validaciones.** Antes de calcular, la app revisa que la cantidad sea 1 o más, que el precio sea mayor a 0 y que haya un plazo elegido. Si algo falta, muestra el aviso en rojo y no deja registrar. También impide vender más unidades de las que hay en existencia.

---

## Detalles técnicos que conviene saber

**Sin conexión.** Firestore guarda los cambios en el teléfono y los sube solo cuando vuelve la señal. Si dos vendedores tocan el mismo registro estando desconectados, gana el último en sincronizar.

**Ubicación GPS.** Se captura con permiso del vendedor al momento de registrar la venta. Queda guardada como latitud y longitud, y sale en el CSV.

**Costo.** El plan gratuito de Firebase da 50.000 lecturas de documento al día. Una operación normal de tienda queda muy por debajo. Si más adelante el resumen del mes se vuelve lento porque hay miles de ventas, conviene guardar los totales ya calculados en un documento aparte en vez de leer todas las ventas cada vez.

**Librerías.** En `public/lib` van el generador de QR, el lector de QR y el compresor ZIP. Están dentro del proyecto a propósito: así la app genera etiquetas y escanea aunque el celular esté sin internet. No los borres.

**Iconos.** Falta agregar `icono-192.png` e `icono-512.png` en la carpeta `public` para que la app instalada muestre el logo de Grupo Progreso. Mientras no estén, el sistema usa un icono genérico.

**Actualizaciones.** Cada vez que cambies `index.html`, sube el número de `VERSION` en `sw.js`. Si no, los celulares siguen mostrando la versión vieja guardada.

---

## Lo que falta para producción

- Pantalla de inicio de sesión con Firebase Auth (hoy la app entra directo).
- Fotos de producto con Firebase Storage.
- Comprobante de venta en PDF o por WhatsApp.
- Recordatorio automático de cuota por vencer.
