# Pet Sitter

Bitácora digital de cuidado de mascotas, organizada por Familia.

## Perfiles
- **Dueños:** lectura mediante enlace único de Familia.
- **Pet Sitters:** escritura mediante token individual de cuidador.

El repositorio público contiene únicamente el frontend y el código fuente. Los registros y fotografías se guardan en Google Sheets y Google Drive mediante Google Apps Script.

## Estructura
- `index.html`: aplicación web.
- `css/styles.css`: estilos adaptables.
- `js/app.js`: interfaz y flujo de publicaciones.
- `js/api.js`: comunicación con Apps Script.
- `apps-script/Code.gs`: API y persistencia en Sheets/Drive.
- `apps-script/appsscript.json`: configuración del proyecto Apps Script.

## Configuración inicial
1. Crea una hoja de cálculo de Google para almacenar las familias, mascotas y publicaciones.
2. Crea una carpeta de Google Drive para las fotografías.
3. En Apps Script, pega `apps-script/Code.gs` y configura las propiedades del script indicadas en los comentarios del archivo.
4. Despliega Apps Script como aplicación web ejecutada por tu cuenta. Restringe el acceso de escritura mediante tokens de Pet Sitter; no publiques esos tokens en este repositorio.
5. Copia la URL del despliegue en `js/api.js` (constante `API_URL`).
6. Publica el repositorio con GitHub Pages desde Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## Seguridad
- Nunca guardes claves, tokens de familias, tokens de Pet Sitters ni credenciales de Google en GitHub.
- El enlace de lectura de cada Familia es un secreto tipo bearer: cualquiera que lo reciba podrá consultar esa Familia. Si se comparte o filtra, debe rotarse.
- El token de escritura se valida en Apps Script y no debe incluirse en enlaces compartidos con dueños.
- El frontend público no debe contener información privada ni registros reales.

## Prototipo
La interfaz puede abrirse sin backend para revisar el diseño con datos de demostración de Lulu y Maya. Los cambios de demostración se mantienen solo en el navegador y no se guardan en la nube.
