# Desplegar aplicación y MySQL juntos en Dokploy

Esta opción utiliza `docker-compose.yml` de la raíz. Incluye `app` (frontend compilado y backend) y `mysql` (MySQL 8.4), con volumen persistente `mysql-data`. No requiere crear otro servicio MySQL en Dokploy.

## Pasos

1. Subir el proyecto actualizado a GitHub, incluyendo `Dockerfile`, `docker-compose.yml`, `.env.compose.example` y los archivos de código y pnpm. No subir credenciales reales.
2. En un proyecto de Dokploy, crear un servicio **Docker Compose**. Elegir el modo **Docker Compose**, no **Stack**, porque este archivo construye la imagen desde el código.
3. Conectar GitHub, seleccionar repositorio y rama `main`, y configurar el archivo **`docker-compose.yml`** en la raíz. El contexto de construcción debe incluir el proyecto completo.
4. En **Environment**, pegar `.env.compose.example` y completar `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `ADMIN_EMAIL` y `ADMIN_KEY`. La clave de coordinación debe tener exactamente **10 caracteres**. Usar un usuario MySQL distinto de `root`, por ejemplo `undc_danzas`.
5. Este Compose usa explícitamente la red externa `dokploy-network`, creada por Dokploy, para el servicio `app`. Desactivar **Isolated Deployments** para esta configuración. En **Preview Compose**, verificar que `app` conserva las redes `database` y `dokploy-network`, y que `mysql` permanece en `database`.
6. En **Domains**, agregar el dominio o subdominio y elegir **Service: `app`**, puerto **3001**, ruta `/` y HTTPS. Configurar el DNS hacia el servidor. Dokploy agregará las etiquetas Traefik del dominio; no es necesario escribirlas manualmente.
7. Pulsar **Deploy**. Primero arranca MySQL; una vez que acepta conexiones con el usuario de aplicación, arranca `app`, crea las tablas y sirve el sistema.

Ejemplo de variables que se deben completar en el panel (los valores vacíos son obligatorios):

```dotenv
MYSQL_DATABASE=undc_danzas
MYSQL_USER=undc_danzas
MYSQL_PASSWORD=
MYSQL_ROOT_PASSWORD=
ADMIN_EMAIL=
ADMIN_KEY=
TRUST_PROXY=1
TEST_MODE=false
REGISTRATION_CLOSES_AT=2026-11-14T00:00:00-05:00
```

No configurar `MYSQL_HOST`: el Compose fija `mysql`, que es el nombre del servicio. No se publican puertos de MySQL ni de la aplicación en el host; el acceso web pasa por Traefik. `MYSQL_ROOT_PASSWORD` se entrega únicamente al contenedor MySQL; el backend utiliza el usuario de aplicación.

El cierre predeterminado incluye el 13 de noviembre de 2026 completo, hora de Lima. Revisar la fecha antes de ponerlo en servicio y modificarla únicamente con autorización de la comisión.

## Datos y actualizaciones

Los datos persisten en `mysql-data` entre reinicios y despliegues del mismo servicio/proyecto Compose. Configurar respaldos de ese volumen desde Dokploy. No eliminar el volumen ni ejecutar `docker compose down -v` si se quieren conservar los registros.

Las variables iniciales de MySQL crean la base y el usuario solamente cuando el volumen está vacío. Cambiar las contraseñas en Environment después del primer despliegue no modifica los usuarios existentes: primero actualizar la contraseña en MySQL y luego sincronizarla en las variables. Mantener el nombre del proyecto Compose para reutilizar el mismo volumen.

Si ya hay datos en el servicio MySQL anterior, este Compose no los migra automáticamente. Exportar la base anterior e importarla en el nuevo MySQL antes de aceptar registros; comprobar los datos antes de cambiar el dominio. No borrar el servicio anterior hasta verificar la migración.

## Comprobar

- En logs de `mysql`: servidor listo para conexiones.
- En logs de `app`: `Tablas MySQL listas.` y `API UNDC: http://0.0.0.0:3001`.
- En `https://TU-DOMINIO/api/health`: `{"ok":true}`.
- Abrir el formulario, ingresar a Coordinación y revisar la vista previa PDF.

El archivo requiere la red de Dokploy. Para una prueba local con Docker, crear primero esa red con `docker network create dokploy-network`, guardar las variables en un archivo privado y ejecutar `docker compose --env-file .env.compose up -d --build`. Para acceso web local se necesitará un proxy en esa red o un override de puertos exclusivo de desarrollo; el archivo principal está destinado a Dokploy.

GitHub Actions valida la configuración Compose además de probar y construir la imagen. No habilita por sí mismo el despliegue automático: **Auto Deploy** se configura en Dokploy.

Referencias: [Docker Compose en Dokploy](https://docs.dokploy.com/docs/core/docker-compose) y [dominios y redes](https://docs.dokploy.com/docs/core/docker-compose/domains).
