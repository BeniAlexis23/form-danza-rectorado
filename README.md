# Registro de danzas · Rectorado UNDC

Aplicación cliente-servidor con React, Express, Node.js, TypeScript y **MySQL**. Se utiliza MySQL como persistencia; no requiere MongoDB.

Para desplegar desde GitHub en Dokploy, seguir [docs/DOKPLOY.md](docs/DOKPLOY.md). Se incluyen Dockerfile, variables de producción, healthcheck e integración continua. La imagen inicia en el puerto 3001 y prepara las tablas en una base MySQL existente sin eliminar registros.

## Ejecutar

Requisitos: Node.js 22.12 o superior, pnpm 11.25.0 y MySQL 8.0 o superior.

El código está organizado en `frontend/` (React y recursos públicos), `backend/` (API Express, MySQL y generación de PDF) y `shared/` (tipos y validaciones compartidos). Las dependencias se gestionan con pnpm desde la raíz, usando `package.json` y `pnpm-lock.yaml`.

1. `pnpm install`
2. Copiar `.env.example` a `.env`, configurar la conexión MySQL y definir `ADMIN_EMAIL` (correo autorizado) y `ADMIN_KEY` (exactamente 10 caracteres). No publicar estas credenciales ni incorporarlas al código del cliente. Reiniciar los servicios después de modificar `.env`.
3. `pnpm db:init` crea la base y las tablas sin eliminar datos existentes.
4. `pnpm dev`
5. Abrir http://127.0.0.1:5173. El botón **Coordinación** permite acceder al consolidado con el correo y la clave configurados. El correo se compara sin distinguir mayúsculas; la clave sí distingue mayúsculas y minúsculas. El acceso se limita a 10 solicitudes fallidas por IP cada 15 minutos.

Para producción: `pnpm build` y `pnpm start` sirven interfaz y API desde http://127.0.0.1:3001. Configurar HTTPS y un proxy inverso para acceso remoto. Si el proxy usa limitación por IP, configurar `trust proxy` según la infraestructura y sin confiar indiscriminadamente en cabeceras externas.

`pnpm test` verifica las reglas de inscripción, parejas y duración.

Para pruebas, establecer `TEST_MODE=true` en `.env` y reiniciar `pnpm dev`: permite consolidar desde una pareja completa. El panel muestra el modo activo y el PDF se identifica como ficha de prueba sin validez oficial, incluso si posteriormente se desactiva el modo. Se mantienen las validaciones de integrantes registrados, sin duplicados y duración de la danza. Para exigir las 10 parejas reglamentarias, usar `TEST_MODE=false`. La consolidación conserva el mismo cierre de nómina, también en pruebas.

`pnpm test:integration` verifica el flujo real con MySQL. Usar exclusivamente una base desechable cuyo nombre termine en `_test`: la prueba limpia sus participantes y su delegación. Configurar `MYSQL_DATABASE`, `ADMIN_EMAIL`, `ADMIN_KEY` de 10 caracteres y una fecha de cierre futura en `REGISTRATION_CLOSES_AT` en ese entorno de pruebas. Las capturas de `docs/` muestran la revisión visual con datos ficticios; no son registros reales.

## Flujo

- Cada integrante de una dependencia del Rectorado registra nombres, apellidos, DNI, celular y dependencia. Se valida el DNI único en MySQL. La dependencia es de texto libre: no se ha supuesto una lista oficial de oficinas.
- El registro individual no es una ficha oficial presentada ante la comisión.
- Coordinación consulta y busca participantes, descarga el consolidado CSV y selecciona las parejas que integrarán la nómina oficial. Personas no seleccionadas permanecen en el consolidado interno y no aparecen en la ficha final.
- Coordinación completa modalidad, danza, duración, reseña y datos del representante. Se exige un mínimo de 10 parejas completas y sin participantes repetidos. No se impone un límite reglamentario al total de parejas; el máximo técnico del esquema es de 10 000 parejas por solicitud.
- Al confirmar la consolidación se fija una única delegación del Rectorado y se bloquean nuevos registros. Esta operación tiene confirmación explícita. No se implementan ediciones posteriores al cierre.
- Tras consolidar, **Vista previa de ficha** abre el documento completo dentro del panel, con opción de cerrar, abrir en otra pestaña o descargar el mismo PDF mostrado. El visor funciona en escritorio y móvil, carga sus recursos desde el proyecto y ajusta la hoja completa sin volver a renderizar al cambiar el ancho.
- La ficha se genera en una sola hoja A4, reutilizando la cabecera y marca de agua de `backend/assets/ficha-base.pdf`, derivada del anexo original. Incluye datos de la delegación y representante, tabla de participantes, reseña y firma. El contenido se ajusta de forma proporcional para conservar todos los datos en la misma página; las nóminas o reseñas extensas se muestran con letra menor. La ficha se presenta ante la comisión; el sistema no realiza ese envío.
- Para regenerar la plantilla después de cambiar las bases, revisar primero las páginas y coordenadas y ejecutar `tools/prepare-sheet-template.py` con Python y pypdf. La aplicación utiliza la plantilla ya incluida y no requiere Python para funcionar.

## Bases incorporadas

La copia está en `frontend/public/bases.pdf`. Inscripción: 28 de octubre al 13 de noviembre de 2026, inclusive (America/Lima). El cierre predeterminado es el inicio del 14 de noviembre, hora de Lima, exclusivo. `REGISTRATION_CLOSES_AT` puede modificarse únicamente cuando exista la autorización de la comisión que contemplan las bases. La consolidación administrativa se permite después del cierre para preparar el expediente recibido en plazo.

Evento: lunes 23 de noviembre de 2026. Concentración 15:30–16:00 en Casa de la Cultura; pasacalle 16:00–17:00; concurso 17:30–19:00 en Parque O’Higgins. Participación obligatoria en el pasacalle. Duraciones: afroperuana 7–10 minutos, folclórica 8–12 minutos.

La identidad visual (azul institucional, tipografía de interfaz y escudo) se tomó de `sistema-inscripcion-undc`; no se copiaron sus datos ni credenciales. Los datos personales se conservan en MySQL y el acceso administrativo utiliza una clave de coordinación en memoria del navegador, sin guardarla en localStorage. Realizar respaldos y establecer el plazo institucional de conservación antes de uso público.




