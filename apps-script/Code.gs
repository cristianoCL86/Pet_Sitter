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


/**
 * Registra la familia inicial y sus mascotas.
 * Ejecutar manualmente desde el editor, una sola vez.
 * La función es idempotente: reutiliza los registros si ya existen.
 */
function registerInitialFamilyLuluMaya() {
  const config = getPetSitterConfig_();
  const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  const familySheet = spreadsheet.getSheetByName('Families');
  const petsSheet = spreadsheet.getSheetByName('Pets');

  if (!familySheet || !petsSheet) {
    throw new Error('Primero ejecuta setupPetSitterSheets().');
  }

  const familyName = 'Familia Lulu y Maya';
  const now = new Date();
  const familyValues = familySheet.getDataRange().getValues();
  const familyHeaders = familyValues[0];
  const familyNameCol = familyHeaders.indexOf('family_name');
  const familyIdCol = familyHeaders.indexOf('family_id');

  if (familyNameCol < 0 || familyIdCol < 0) {
    throw new Error('La pestaña Families no tiene los encabezados esperados.');
  }

  let familyId = null;
  for (let i = 1; i < familyValues.length; i++) {
    if (String(familyValues[i][familyNameCol]).trim() === familyName) {
      familyId = String(familyValues[i][familyIdCol]);
      break;
    }
  }

  if (!familyId) {
    familyId = Utilities.getUuid();
    const familyRow = {
      family_id: familyId,
      family_name: familyName,
      owner_name: '',
      owner_email: '',
      read_token_hash: '',
      active: true,
      created_at: now
    };
    familySheet.appendRow(familyHeaders.map(function(header) {
      return Object.prototype.hasOwnProperty.call(familyRow, header)
        ? familyRow[header] : '';
    }));
  }

  const petValues = petsSheet.getDataRange().getValues();
  const petHeaders = petValues[0];
  const petFamilyCol = petHeaders.indexOf('family_id');
  const petNameCol = petHeaders.indexOf('pet_name');

  if (petFamilyCol < 0 || petNameCol < 0) {
    throw new Error('La pestaña Pets no tiene los encabezados esperados.');
  }

  const existingPets = {};
  for (let i = 1; i < petValues.length; i++) {
    if (String(petValues[i][petFamilyCol]) === familyId) {
      existingPets[String(petValues[i][petNameCol]).trim().toLowerCase()] = true;
    }
  }

  const petsToRegister = ['Lulu', 'Maya'];
  const addedPets = [];

  petsToRegister.forEach(function(petName) {
    if (existingPets[petName.toLowerCase()]) return;

    const petRow = {
      pet_id: Utilities.getUuid(),
      family_id: familyId,
      pet_name: petName,
      species: 'Perro',
      active: true,
      created_at: now
    };
    petsSheet.appendRow(petHeaders.map(function(header) {
      return Object.prototype.hasOwnProperty.call(petRow, header)
        ? petRow[header] : '';
    }));
    addedPets.push(petName);
  });

  const result = {
    familyName: familyName,
    familyId: familyId,
    petsAdded: addedPets,
    message: 'Registro de familia completado. No se generó un enlace de acceso.'
  };

  Logger.log(JSON.stringify(result));
  return result;
}


/**
 * Alta administrativa de un Pet Sitter.
 *
 * Antes de ejecutar, configurar temporalmente estas Script Properties:
 * PROVISION_FAMILY_NAME, PROVISION_SITTER_USERNAME,
 * PROVISION_SITTER_DISPLAY_NAME y PROVISION_SITTER_PASSWORD.
 *
 * La contraseña temporal se elimina de Script Properties al comenzar.
 * Esta función NO debe exponerse mediante doGet/doPost.
 */
function adminCreateSitterFromProperties() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  const props = PropertiesService.getScriptProperties();
  const familyName = props.getProperty('PROVISION_FAMILY_NAME');
  const username = props.getProperty('PROVISION_SITTER_USERNAME');
  const displayName = props.getProperty('PROVISION_SITTER_DISPLAY_NAME');
  const password = props.getProperty('PROVISION_SITTER_PASSWORD');

  // Elimina de inmediato los datos de aprovisionamiento, especialmente la contraseña.
  props.deleteProperty('PROVISION_FAMILY_NAME');
  props.deleteProperty('PROVISION_SITTER_USERNAME');
  props.deleteProperty('PROVISION_SITTER_DISPLAY_NAME');
  props.deleteProperty('PROVISION_SITTER_PASSWORD');

  try {
    if (!familyName || !username || !displayName || !password) {
      throw new Error('Faltan propiedades temporales de aprovisionamiento. Configúralas nuevamente.');
    }
    if (!/^[A-Za-z0-9._-]{4,40}$/.test(username)) {
      throw new Error('El usuario debe tener entre 4 y 40 caracteres: letras, números, punto, guion o guion bajo.');
    }
    if (password.length < 12) {
      throw new Error('La contraseña debe tener al menos 12 caracteres. Configura una nueva contraseña temporal y vuelve a ejecutar.');
    }

    const config = getPetSitterConfig_();
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    const familySheet = spreadsheet.getSheetByName('Families');
    const sitterSheet = spreadsheet.getSheetByName('PetSitters');
    if (!familySheet || !sitterSheet) {
      throw new Error('No existen las pestañas requeridas. Ejecuta setupPetSitterSheets().');
    }

    const familyValues = familySheet.getDataRange().getValues();
    const familyHeaders = familyValues[0];
    const familyNameCol = familyHeaders.indexOf('family_name');
    const familyIdCol = familyHeaders.indexOf('family_id');
    const activeCol = familyHeaders.indexOf('active');
    if (familyNameCol < 0 || familyIdCol < 0 || activeCol < 0) {
      throw new Error('La pestaña Families no tiene los encabezados esperados.');
    }

    let familyId = '';
    for (let i = 1; i < familyValues.length; i++) {
      if (String(familyValues[i][familyNameCol]).trim() === familyName &&
          String(familyValues[i][activeCol]).toLowerCase() !== 'false') {
        familyId = String(familyValues[i][familyIdCol]);
        break;
      }
    }
    if (!familyId) throw new Error('No se encontró una familia activa con ese nombre.');

    const sitterValues = sitterSheet.getDataRange().getValues();
    const sitterHeaders = sitterValues[0];
    const usernameCol = sitterHeaders.indexOf('username');
    const familyCol = sitterHeaders.indexOf('family_id');
    if (usernameCol < 0 || familyCol < 0) {
      throw new Error('La pestaña PetSitters no tiene los encabezados esperados.');
    }

    for (let i = 1; i < sitterValues.length; i++) {
      if (String(sitterValues[i][usernameCol]).trim().toLowerCase() === username.toLowerCase()) {
        throw new Error('Ese nombre de usuario ya existe. Los nombres de usuario deben ser únicos en toda la plataforma.');
      }
    }

    const salt = Utilities.getUuid() + Utilities.getUuid();
    const iterations = 120000;
    const passwordHash = pbkdf2Sha256Base64_(password, salt, iterations);
    const sitter = {
      sitter_id: Utilities.getUuid(),
      family_id: familyId,
      username: username,
      display_name: displayName,
      password_salt: salt,
      password_hash: 'pbkdf2_sha256$' + iterations + '$' + passwordHash,
      active: true,
      created_at: new Date()
    };

    sitterSheet.appendRow(sitterHeaders.map(function(header) {
      return Object.prototype.hasOwnProperty.call(sitter, header) ? sitter[header] : '';
    }));

    Logger.log('Cuenta Pet Sitter creada correctamente. Usuario: ' + username +
      '. Familia: ' + familyName + '. No se registra ni se muestra la contraseña.');
    return { created: true, username: username, familyName: familyName };
  } finally {
    lock.releaseLock();
  }
}


/**
 * Autentica un Pet Sitter y crea una sesión de 12 horas.
 * No exponer directamente: será invocada por el controlador API en una etapa posterior.
 */
function authenticateSitter_(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string' ||
      !username.trim() || !password || username.length > 40 || password.length > 256) {
    throw new Error('Credenciales inválidas.');
  }

  const config = getPetSitterConfig_();
  const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  const sitterSheet = spreadsheet.getSheetByName('PetSitters');
  const familySheet = spreadsheet.getSheetByName('Families');
  const sessionsSheet = spreadsheet.getSheetByName('Sessions');
  if (!sitterSheet || !familySheet || !sessionsSheet) {
    throw new Error('Faltan pestañas requeridas para autenticar.');
  }

  const values = sitterSheet.getDataRange().getValues();
  const headers = values[0];
  const col = {
    id: headers.indexOf('sitter_id'),
    family: headers.indexOf('family_id'),
    username: headers.indexOf('username'),
    display: headers.indexOf('display_name'),
    salt: headers.indexOf('password_salt'),
    hash: headers.indexOf('password_hash'),
    active: headers.indexOf('active')
  };
  if (Object.keys(col).some(function(k) { return col[k] < 0; })) {
    throw new Error('La estructura de PetSitters no es válida.');
  }

  let account = null;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][col.username]).trim().toLowerCase() === username.trim().toLowerCase()) {
      account = {
        id: String(values[i][col.id]),
        familyId: String(values[i][col.family]),
        displayName: String(values[i][col.display]),
        salt: String(values[i][col.salt]),
        storedHash: String(values[i][col.hash]),
        active: String(values[i][col.active]).toLowerCase() !== 'false'
      };
      break;
    }
  }

  // Mensaje idéntico para usuario inexistente, inactivo o contraseña incorrecta.
  if (!account || !account.active) throw new Error('Usuario o contraseña incorrectos.');

  const parts = account.storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2_sha256') {
    throw new Error('La credencial almacenada requiere revisión administrativa.');
  }
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 500000) {
    throw new Error('La configuración de la credencial no es válida.');
  }

  const calculated = pbkdf2Sha256Base64_(password, account.salt, iterations);
  if (!constantTimeStringEquals_(calculated, parts[2])) {
    throw new Error('Usuario o contraseña incorrectos.');
  }

  const familyValues = familySheet.getDataRange().getValues();
  const familyHeaders = familyValues[0];
  const familyIdCol = familyHeaders.indexOf('family_id');
  const familyActiveCol = familyHeaders.indexOf('active');
  const familyNameCol = familyHeaders.indexOf('family_name');
  if (familyIdCol < 0 || familyActiveCol < 0 || familyNameCol < 0) {
    throw new Error('La estructura de Families no es válida.');
  }

  let familyName = '';
  let familyIsActive = false;
  for (let i = 1; i < familyValues.length; i++) {
    if (String(familyValues[i][familyIdCol]) === account.familyId) {
      familyName = String(familyValues[i][familyNameCol]);
      familyIsActive = String(familyValues[i][familyActiveCol]).toLowerCase() !== 'false';
      break;
    }
  }
  if (!familyIsActive) throw new Error('Usuario o contraseña incorrectos.');

  const token = createSessionToken_();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const sessionHeaders = sessionsSheet.getDataRange().getValues()[0];
  const session = {
    session_id: Utilities.getUuid(),
    sitter_id: account.id,
    family_id: account.familyId,
    token_hash: sha256Base64_(token),
    created_at: now,
    expires_at: expiresAt,
    revoked: false
  };
  sessionsSheet.appendRow(sessionHeaders.map(function(header) {
    return Object.prototype.hasOwnProperty.call(session, header) ? session[header] : '';
  }));

  return {
    sessionToken: token,
    displayName: account.displayName,
    familyName: familyName,
    expiresAt: expiresAt.toISOString()
  };
}

/** Valida token, expiración, revocación y estado actual de cuenta/familia. */
function validateSitterSession_(token) {
  if (typeof token !== 'string' || token.length < 30 || token.length > 256) return null;

  const config = getPetSitterConfig_();
  const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  const sessionsSheet = spreadsheet.getSheetByName('Sessions');
  const sittersSheet = spreadsheet.getSheetByName('PetSitters');
  const familiesSheet = spreadsheet.getSheetByName('Families');
  if (!sessionsSheet || !sittersSheet || !familiesSheet) return null;

  const sessionValues = sessionsSheet.getDataRange().getValues();
  const sh = sessionValues[0];
  const sc = {
    sitter: sh.indexOf('sitter_id'), family: sh.indexOf('family_id'),
    hash: sh.indexOf('token_hash'), expires: sh.indexOf('expires_at'),
    revoked: sh.indexOf('revoked')
  };
  if (Object.keys(sc).some(function(k) { return sc[k] < 0; })) return null;

  const tokenHash = sha256Base64_(token);
  let session = null;
  for (let i = 1; i < sessionValues.length; i++) {
    if (constantTimeStringEquals_(String(sessionValues[i][sc.hash]), tokenHash)) {
      session = {
        sitterId: String(sessionValues[i][sc.sitter]),
        familyId: String(sessionValues[i][sc.family]),
        expiresAt: new Date(sessionValues[i][sc.expires]),
        revoked: String(sessionValues[i][sc.revoked]).toLowerCase() === 'true'
      };
      break;
    }
  }
  if (!session || session.revoked || isNaN(session.expiresAt.getTime()) ||
      session.expiresAt.getTime() <= Date.now()) return null;

  if (!isActiveRecord_(sittersSheet, 'sitter_id', session.sitterId) ||
      !isActiveRecord_(familiesSheet, 'family_id', session.familyId)) return null;

  return { sitterId: session.sitterId, familyId: session.familyId };
}

/** Revoca la sesión correspondiente al token presentado. */
function revokeSitterSession_(token) {
  if (typeof token !== 'string' || token.length < 30 || token.length > 256) return false;
  const config = getPetSitterConfig_();
  const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName('Sessions');
  if (!sheet) return false;

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const hashCol = headers.indexOf('token_hash');
  const revokedCol = headers.indexOf('revoked');
  if (hashCol < 0 || revokedCol < 0) return false;

  const targetHash = sha256Base64_(token);
  for (let i = 1; i < values.length; i++) {
    if (constantTimeStringEquals_(String(values[i][hashCol]), targetHash)) {
      sheet.getRange(i + 1, revokedCol + 1).setValue(true);
      return true;
    }
  }
  return false;
}

function createSessionToken_() {
  // Combina cuatro UUID independientes para un token opaco de alta entropía.
  return Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '');
}

function sha256Base64_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64Encode(digest);
}

function constantTimeStringEquals_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isActiveRecord_(sheet, idHeader, idValue) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf(idHeader);
  const activeCol = headers.indexOf('active');
  if (idCol < 0 || activeCol < 0) return false;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === idValue) {
      return String(values[i][activeCol]).toLowerCase() !== 'false';
    }
  }
  return false;
}

/**
 * PBKDF2-HMAC-SHA256. Devuelve 256 bits codificados en Base64.
 * Iteraciones guardadas junto al hash para permitir futuras migraciones.
 */
function pbkdf2Sha256Base64_(password, salt, iterations) {
  const passwordBytes = Utilities.newBlob(password).getBytes();
  const saltBytes = Utilities.newBlob(salt).getBytes();
  const blockInput = saltBytes.concat([0, 0, 0, 1]);
  let u = Utilities.computeHmacSha256Signature(blockInput, passwordBytes);
  let derived = u.slice();

  for (let i = 1; i < iterations; i++) {
    u = Utilities.computeHmacSha256Signature(u, passwordBytes);
    for (let j = 0; j < derived.length; j++) {
      derived[j] = (derived[j] ^ u[j]);
    }
  }
  return Utilities.base64Encode(derived);
}
