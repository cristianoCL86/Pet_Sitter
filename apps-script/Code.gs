/**
 * Pet_Sitter - inicialización del backend
 * Esta primera versión solo valida las conexiones y prepara las hojas.
 * No despliega una API ni crea usuarios todavía.
 *
 * Propiedades requeridas:
 *   SPREADSHEET_ID
 *   DRIVE_FOLDER_ID
 */

function getPetSitterConfig_() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const driveFolderId = props.getProperty('DRIVE_FOLDER_ID');

  if (!spreadsheetId || !driveFolderId) {
    throw new Error('Faltan SPREADSHEET_ID o DRIVE_FOLDER_ID en las Propiedades del script.');
  }

  return { spreadsheetId, driveFolderId };
}

/**
 * Comprueba que Apps Script puede abrir la hoja y la carpeta.
 * Ejecutar primero desde el editor de Apps Script.
 */
function testPetSitterConnections() {
  const config = getPetSitterConfig_();
  const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  const folder = DriveApp.getFolderById(config.driveFolderId);

  const result = {
    spreadsheetName: spreadsheet.getName(),
    spreadsheetAccessible: true,
    driveFolderName: folder.getName(),
    driveFolderAccessible: true
  };

  Logger.log('Conexión correcta con Google Sheets: ' + result.spreadsheetName);
  Logger.log('Conexión correcta con Google Drive: ' + result.driveFolderName);
  return result;
}

/**
 * Crea las pestañas necesarias sin borrar información existente.
 * Si una pestaña ya existe, conserva su contenido.
 */
function setupPetSitterSheets() {
  const config = getPetSitterConfig_();
  const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);

  const schemas = {
    Families: [
      'family_id', 'family_name', 'owner_name', 'owner_email',
      'read_token_hash', 'active', 'created_at'
    ],
    Pets: [
      'pet_id', 'family_id', 'pet_name', 'species', 'active', 'created_at'
    ],
    PetSitters: [
      'sitter_id', 'family_id', 'username', 'display_name',
      'password_salt', 'password_hash', 'active', 'created_at'
    ],
    Sessions: [
      'session_id', 'sitter_id', 'family_id', 'token_hash',
      'created_at', 'expires_at', 'revoked'
    ],
    Entries: [
      'entry_id', 'family_id', 'entry_date', 'description',
      'pets_json', 'created_by_sitter_id', 'created_at'
    ],
    EntryPhotos: [
      'photo_id', 'entry_id', 'family_id', 'drive_file_id',
      'mime_type', 'created_at'
    ]
  };

  const created = [];
  const preserved = [];

  Object.keys(schemas).forEach(function(sheetName) {
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, schemas[sheetName].length)
        .setValues([schemas[sheetName]]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, schemas[sheetName].length)
        .setFontWeight('bold');
      created.push(sheetName);
    } else {
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, schemas[sheetName].length)
          .setValues([schemas[sheetName]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, schemas[sheetName].length)
          .setFontWeight('bold');
        created.push(sheetName + ' (encabezados agregados)');
      } else {
        preserved.push(sheetName);
      }
    }
  });

  Logger.log('Pestañas creadas: ' + (created.join(', ') || 'ninguna'));
  Logger.log('Pestañas existentes conservadas: ' + (preserved.join(', ') || 'ninguna'));
  Logger.log('Inicialización terminada. No se eliminó información existente.');

  return { created: created, preserved: preserved };
}
