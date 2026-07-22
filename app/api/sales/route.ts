import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET() {
  try {
    // 1. Obtener todas las transacciones ordenadas por fecha de venta descendente
    const { data: sales, error } = await supabaseAdmin
      .from('sales')
      .select('*')
      .order('sale_date', { ascending: false });

    if (error) {
      throw new Error('Error al obtener ventas de Supabase: ' + error.message);
    }

    let totalIncome = 0;
    let totalExpense = 0;
    
    // Contenedores para métricas agrupadas (solo para ingresos/ventas)
    const appStats: Record<string, number> = {};
    const dailyIncome: Record<string, number> = {};
    const monthlyIncome: Record<string, number> = {};

    // 2. Iterar y procesar las métricas financieras
    sales?.forEach((s) => {
      const amount = parseFloat(s.amount) || 0;
      const isIncome = s.transaction_type === 'income';

      if (isIncome) {
        totalIncome += amount;
        
        // Agrupar por App receptora (ej: Mercado Pago, Naranja X)
        const appName = s.app || 'Desconocido';
        appStats[appName] = (appStats[appName] || 0) + amount;

        // Agrupar por fecha diaria (formato YYYY-MM-DD)
        const dateStr = s.sale_date.split('T')[0];
        dailyIncome[dateStr] = (dailyIncome[dateStr] || 0) + amount;

        // Agrupar por mes (formato YYYY-MM)
        const monthStr = s.sale_date.substring(0, 7);
        monthlyIncome[monthStr] = (monthlyIncome[monthStr] || 0) + amount;
      } else {
        totalExpense += amount;
      }
    });

    const netBalance = totalIncome - totalExpense;

    // 3. Formatear datos de series temporales para Recharts
    // Gráfico diario: los últimos 15 días con ingresos registrados
    const chartDataByDay = Object.entries(dailyIncome)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-15); 

    // Gráfico mensual histórico
    const chartDataByMonth = Object.entries(monthlyIncome)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Distribución por App de cobro (Formato Donut Chart)
    const appDistribution = Object.entries(appStats).map(([name, value]) => ({
      name,
      value,
    }));

    return NextResponse.json({
      success: true,
      kpis: {
        totalIncome,
        totalExpense,
        netBalance,
        transactionCount: sales?.length || 0,
      },
      chartDataByDay,
      chartDataByMonth,
      appDistribution,
      transactions: sales || [],
    });
  } catch (e: any) {
    console.error('Error en API de estadísticas de ventas:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
