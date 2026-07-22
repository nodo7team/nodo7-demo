import { NextResponse } from 'next/server';
import { fetchSalesFromSheet } from '@/lib/platforms/sheets';
import { parseNotification, generateRowHash } from '@/lib/utils/sales-parser';
import { supabaseAdmin } from '@/lib/db/supabase';
import { logAction } from '@/lib/db/actions-log';

/**
 * Convierte un string de fecha en formato español "D/M/YYYY H:m:s" (ej: "15/4/2026 21:47:27")
 * a un objeto Date válido en UTC.
 */
function parseSpanishDate(dateStr: string): Date {
  try {
    const parts = dateStr.trim().split(/\s+/);
    if (!parts[0]) return new Date();

    const dateParts = parts[0].split('/');
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // Mes indexado en 0
    const year = parseInt(dateParts[2], 10);

    let hour = 0;
    let minute = 0;
    let second = 0;

    if (parts[1]) {
      const timeParts = parts[1].split(':');
      hour = parseInt(timeParts[0] || '0', 10);
      minute = parseInt(timeParts[1] || '0', 10);
      second = parseInt(timeParts[2] || '0', 10);
    }

    // Retorna la fecha local del servidor (o la zona horaria del sistema)
    return new Date(year, month, day, hour, minute, second);
  } catch {
    return new Date();
  }
}

export async function POST() {
  try {
    // 1. Obtener los renglones crudos desde el Google Sheet
    const rawRows = await fetchSalesFromSheet();
    
    if (rawRows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No se encontraron filas de datos en Google Sheets.',
        upserted: 0
      });
    }

    const recordsToInsert = [];

    // 2. Parsear y procesar cada renglón
    for (const row of rawRows) {
      // Saltar filas sin marca temporal o notificación
      if (!row.timestamp || !row.notification) continue;

      const parsed = parseNotification(row.notification);
      const rowHash = await generateRowHash(row.timestamp, row.notification, row.app);
      const saleDate = parseSpanishDate(row.timestamp);

      // Determinar plataforma sugerida por el detalle
      let platform = 'general';
      const notificationLower = row.notification.toLowerCase();
      if (notificationLower.includes('clicktv') || notificationLower.includes('click tv')) {
        platform = 'clicktv';
      } else if (notificationLower.includes('raptor')) {
        platform = 'raptor';
      }

      recordsToInsert.push({
        sale_date: saleDate.toISOString(),
        raw_notification: row.notification.trim(),
        app: row.app.trim(),
        amount: parsed.amount,
        client_name: parsed.clientName,
        transaction_type: parsed.transactionType,
        google_sheet_row_id: rowHash,
        // Guardar plataforma sugerida como metadato de utilidad
        platform
      });
    }

    if (recordsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No había filas válidas para procesar.',
        upserted: 0
      });
    }

    // 3. Deduplicar registros en memoria antes de hacer upsert en Supabase para evitar el error:
    // "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const uniqueRecordsMap = new Map<string, any>();
    for (const record of recordsToInsert) {
      uniqueRecordsMap.set(record.google_sheet_row_id, record);
    }
    const uniqueRecordsToInsert = Array.from(uniqueRecordsMap.values());

    // 4. Insertar / Actualizar en la base de datos de Supabase
    // Dado que google_sheet_row_id tiene una restricción UNIQUE,
    // el upsert ignorará o sobreescribirá registros si ya existen, previniendo duplicados
    const { error: dbError } = await supabaseAdmin
      .from('sales')
      .upsert(uniqueRecordsToInsert, { onConflict: 'google_sheet_row_id' });

    if (dbError) {
      throw new Error('Error al guardar en Supabase: ' + dbError.message);
    }

    // Registrar acción en el log
    await logAction({
      action: 'sync',
      platform: undefined,
      payload: { source: 'google_sheets', totalRows: rawRows.length, processed: recordsToInsert.length },
      success: true
    });

    return NextResponse.json({
      success: true,
      total_rows: rawRows.length,
      processed: recordsToInsert.length,
      message: `Sincronización completada. ${recordsToInsert.length} transacciones procesadas.`
    });
  } catch (e: any) {
    console.error('Error en sincronización de Sheets:', e);
    
    await logAction({
      action: 'sync',
      payload: { source: 'google_sheets' },
      success: false,
      error_message: e?.message || 'Error desconocido'
    });

    return NextResponse.json(
      { error: e?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
