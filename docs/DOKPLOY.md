# Despliegue desde GitHub a Dokploy

Para desplegar la aplicación y MySQL juntos en un solo servicio Docker Compose, seguir [DOKPLOY-COMPOSE.md](DOKPLOY-COMPOSE.md). Los pasos de este documento corresponden a la alternativa con Application y MySQL separados.

La aplicación se construye desde el `Dockerfile` de la raíz con Node.js 24 y pnpm 11.25.0. Express sirve la interfaz compilada, la API, las bases y el visor PDF en el mismo puerto interno **3001**. No se usa el servidor de desarrollo Vite en producción.

## 1. Subir el proyecto a GitHub

Crear un repositorio, preferiblemente privado por ser un sistema interno, y subir el proyecto completo desde la raíz. No subir `.env`, `node_modules`, `dist` ni `tmp`; están excluidos en `.gitignore`. Los ejemplos `.env.example` y `.env.production.example` se pueden publicar porque no contienen credenciales reales.

Si aún no hay repositorio local, ejecutar desde la raíz (reemplazar la URL):

```bash
git init -b main
git add .
git commit -m "Preparar registro de danzas UNDC para Dokploy"
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

GitHub Actions ejecutará las pruebas con una base MySQL desechable, la compilación, la construcción Docker y una comprobación del contenedor, su conexión y la ficha PDF. Las credenciales definidas en ese workflow corresponden exclusivamente a su servicio temporal de CI.

## 2. Crear MySQL en Dokploy

Crear un servicio **MySQL 8.4** en el mismo proyecto y entorno que la aplicación. Configurar:

- Base de datos: `undc_danzas`.
- Usuario de aplicación: `undc_danzas` y su contraseña propia.
- Almacenamiento persistente del servicio MySQL y respaldos periódicos.

Desplegar primero MySQL y copiar su **host de conexión interna**, usuario, contraseña y nombre de base. No usar `localhost` ni `127.0.0.1`: dentro del contenedor apuntan a la propia aplicación. MySQL no necesita un puerto público.

Dokploy crea la base de datos. El usuario de la aplicación necesita permisos sobre esa base para crear las tablas y operar sus registros. No es necesario otorgar permisos globales ni usar root. En cada arranque se ejecutan `CREATE TABLE IF NOT EXISTS` e `INSERT IGNORE`; los registros existentes se conservan. Esto inicializa el esquema actual, no sustituye las migraciones que requieran cambios de columnas en futuras versiones.

## 3. Crear la aplicación

En Dokploy, crear una **Application** y conectar el proveedor GitHub con acceso al repositorio. Seleccionar:

| Campo | Valor |
| --- | --- |
| Repositorio | El creado en el paso 1 |
| Rama | `main` |
| Build Type | `Dockerfile` |
| Build Path / Context | Raíz del repositorio (`/` o `.` según el campo) |
| Dockerfile | `Dockerfile` |
| Puerto del contenedor | `3001` |

No seleccionar `frontend/` o `backend/` como contexto: Docker necesita ambos y `shared/`. No sobrescribir el comando de inicio; la imagen ya contiene el correcto. No configurar `pnpm dev` como comando de producción.

## 4. Configurar variables

Copiar `.env.production.example` en la pestaña **Environment** de la aplicación y reemplazar todos los valores indicados. Configurar como mínimo:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3001
TRUST_PROXY=1
MYSQL_HOST=HOST_INTERNO_QUE_MUESTRA_DOKPLOY
MYSQL_PORT=3306
MYSQL_USER=undc_danzas
MYSQL_PASSWORD=CONTRASENA_REAL_DEL_SERVICIO_MYSQL
MYSQL_DATABASE=undc_danzas
ADMIN_EMAIL=CORREO_REAL_DE_COORDINACION
ADMIN_KEY=CLAVE_REAL_DE_10_CARACTERES
RUN_DB_INIT=true
DB_CREATE_DATABASE=false
TEST_MODE=false
REGISTRATION_CLOSES_AT=2026-11-14T00:00:00-05:00
```

Los valores escritos como indicaciones son marcadores: reemplazarlos. `ADMIN_KEY` debe contener exactamente **10 caracteres** y distingue mayúsculas. `ADMIN_EMAIL` es el correo de acceso; no envía mensajes ni requiere configurar SMTP. No configurar estas credenciales como variables `VITE_*`: deben permanecer en el backend.

`TRUST_PROXY=1` corresponde a un solo proxy Traefik delante del contenedor. Si hay más proxies, configurar el valor según la ruta real de red. Mantener el contenedor accesible por Traefik sin publicar directamente su puerto en Internet.

El cierre configurado es el inicio del 14 de noviembre de 2026 en Lima, por lo que el día 13 se incluye completo. Después de esa fecha, el registro aparecerá cerrado. Modificarlo solamente si existe autorización de la comisión. Para un entorno de pruebas separado se puede usar `TEST_MODE=true`; no conectarlo a la base de producción.

Los cambios de variables requieren un nuevo despliegue o reinicio del contenedor. El archivo `.env` local no se copia en la imagen.

## 5. Dominio, HTTPS y despliegue

En **Domains**, asignar el dominio o subdominio, ruta `/` y puerto **3001**. Configurar DNS hacia el servidor y activar HTTPS con el certificado correspondiente. La aplicación y la API usan el mismo dominio, por lo que no hay que configurar una URL distinta para el frontend ni CORS.

Pulsar **Deploy** y comprobar en los logs:

```text
Tablas MySQL listas.
API UNDC: http://0.0.0.0:3001
```

La imagen incluye un healthcheck a `/api/health` que verifica la conexión MySQL, con 90 segundos iniciales de tolerancia. Si se configura también el healthcheck de Swarm en Dokploy, usar ese endpoint y el mismo puerto. El proceso espera brevemente ante errores temporales de conexión; una contraseña incorrecta o una base inexistente detiene el inicio con error para que se corrija la configuración.

Comprobar el formulario, el acceso a Coordinación y la vista previa. No consolidar una nómina ficticia en producción: la consolidación fija la delegación y cierra el registro.

## Actualizaciones y persistencia

Después de cada cambio, subir un commit y volver a desplegar. Se puede habilitar **Auto Deploy** en Dokploy para la rama elegida. El workflow de CI comprueba el código, pero no activa ni bloquea por sí mismo los despliegues de Dokploy; configurar esa política en el repositorio o plataforma si se desea esperar al resultado de CI.

Los registros se guardan en el servicio MySQL, no en el contenedor de la aplicación. Los PDF se generan al solicitarlos y las plantillas viajan dentro de la imagen. La aplicación no requiere volumen persistente propio. Hacer y verificar respaldos del servicio MySQL antes de cambios de esquema o intervenciones sobre los datos.

## Referencias oficiales

- [Aplicaciones y variables de entorno](https://docs.dokploy.com/docs/core/applications).
- [Build Type y Dockerfile](https://docs.dokploy.com/docs/core/applications/build-type).
- [Dominios](https://docs.dokploy.com/docs/core/domains).
- [Healthchecks y producción](https://docs.dokploy.com/docs/core/applications/going-production).
