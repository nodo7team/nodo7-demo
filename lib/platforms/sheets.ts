import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

/**
 * Carga las credenciales de Google de forma flexible:
 * 1. Primero busca la variable de entorno GOOGLE_CREDENTIALS_JSON (ideal para Vercel en producción).
 * 2. Si no está, busca el archivo local especificado en GOOGLE_CREDENTIALS_FILE.
 */
function getCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (e) {
      throw new Error('Error al parsear GOOGLE_CREDENTIALS_JSON: ' + (e as Error).message);
    }
  }

  const credentialsFile = process.env.GOOGLE_CREDENTIALS_FILE || 'our-card-455617-g6-75877b4aec05.json';
  const filePath = path.isAbsolute(credentialsFile)
    ? credentialsFile
    : path.join(process.cwd(), credentialsFile);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No se encontró el archivo de credenciales de Google en: ${filePath}. ` +
      `Por favor, configúralo en .env.local o carga la variable GOOGLE_CREDENTIALS_JSON.`
    );
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (e) {
    throw new Error(`Error al leer el archivo de credenciales ${credentialsFile}: ` + (e as Error).message);
  }
}

/**
 * Inicializa el cliente de autenticación JWT de Google
 */
function getGoogleAuthClient() {
  const credentials = getCredentials();
  
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
}

export interface SheetRow {
  timestamp: string;
  notification: string;
  app: string;
  time: string;
}

/**
 * Obtiene las filas de ventas desde el Google Sheet de manera segura
 */
export async function fetchSalesFromSheet(): Promise<SheetRow[]> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('La variable GOOGLE_SPREADSHEET_ID no está configurada en las variables de entorno.');
  }

  const auth = getGoogleAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Obtener los metadatos del Spreadsheet para buscar la hoja por gid (1670424327)
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  
  // Buscar la hoja que tenga el ID 1670424327 (el gid de la URL que pasó el usuario)
  const targetGid = 1670424327;
  const targetSheet = metadata.data.sheets?.find(
    (sheet) => sheet.properties?.sheetId === targetGid
  );

  // Si no se encuentra ese gid en particular, usar la primera hoja por defecto
  const sheetName = targetSheet?.properties?.title || metadata.data.sheets?.[0]?.properties?.title || 'Sheet1';

  // 2. Obtener los valores del rango A2:D de esa pestaña (omitiendo la fila 1 de encabezado)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A2:D`,
  });

  const rows = response.data.values || [];

  // Mapear el array plano de celdas a objetos legibles
  return rows.map((row) => ({
    timestamp: row[0] || '',
    notification: row[1] || '',
    app: row[2] || '',
    time: row[3] || '',
  }));
}
