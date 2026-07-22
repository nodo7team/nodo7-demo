-- Migración 0006: Crear tabla de ventas (sales)
-- Esta tabla almacena las transacciones financieras sincronizadas desde Google Sheets

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
  raw_notification TEXT NOT NULL,
  app VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  google_sheet_row_id VARCHAR(64) UNIQUE NOT NULL,
  platform VARCHAR(50) DEFAULT 'general' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir lectura/escritura al rol de servicio (admin)
-- Dado que el panel de control usa supabaseAdmin (service_role),
-- no es estrictamente necesario definir políticas públicas si el RLS está activado
-- pero el rol service_role siempre tiene acceso completo por defecto.
-- No obstante, si se necesita acceso directo por otros roles en el futuro, se pueden definir aquí.

-- Crear índices para optimizar las consultas y filtros del Dashboard
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_type ON public.sales(transaction_type);
CREATE INDEX IF NOT EXISTS idx_sales_app ON public.sales(app);

-- Comentario explicativo de la tabla
COMMENT ON TABLE public.sales IS 'Registro de transacciones e ingresos/gastos parseados desde las notificaciones de Google Sheets.';
