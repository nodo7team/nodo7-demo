function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Abre WhatsApp: en móvil usa wa.me (app nativa), en PC usa web.whatsapp.com (misma pestaña).
 * waUrl debe estar en formato wa.me generado por whatsappUrl().
 */
export function openWhatsApp(waUrl: string): void {
  if (isMobile()) {
    window.open(waUrl, '_blank');
    return;
  }
  // Convierte wa.me/{phone}?text=... → web.whatsapp.com/send?phone=...&text=...
  const url = new URL(waUrl);
  const phone = url.pathname.replace('/', '');
  const text = url.searchParams.get('text') || '';
  const params = new URLSearchParams();
  if (phone) params.set('phone', phone);
  if (text) params.set('text', text);
  window.open(`https://web.whatsapp.com/send?${params}`, 'whatsapp_web');
}

/** URL de chat directo (sin mensaje) según dispositivo */
export function whatsAppChatUrl(phone: string): string {
  const clean = phone.replace(/[^\d]/g, '');
  if (isMobile()) return `https://wa.me/${clean}`;
  return `https://web.whatsapp.com/send?phone=${clean}`;
}
