/**
 * Bir UTC zaman dizesini (örn: "14:30" veya tam bir ISO dizesi) alıp
 * Türkiye saat dilimine (UTC+3) göre formatlar.
 *
 * @param timeString - UTC formatında zamanı temsil eden dize.
 * @param showSeconds - Saniyelerin gösterilip gösterilmeyeceği.
 * @returns 'HH:MM' veya 'HH:MM:SS' formatında UTC+3 zaman dizesi. Geçersiz giriş için '-' döner.
 */
export const formatTimeToUTC3 = (
  timeString: string | null | undefined,
  showSeconds: boolean = false
): string => {
  if (!timeString) {
    return '-';
  }

  // Tarih ve saat bilgisini birleştirmek için geçici bir tarih nesnesi oluşturuyoruz.
  // Bu, Date nesnesinin saat dilimi dönüşümlerini doğru yapmasını sağlar.
  const today = new Date().toISOString().split('T')[0];
  
  // Gelen string'in tam bir ISO tarihi mi yoksa sadece saat mi olduğunu kontrol edelim.
  let dateObj: Date;
  if (timeString.includes('T')) {
    // Tam bir ISO dizesi (örn: "2023-10-27T14:30:00Z")
    dateObj = new Date(timeString);
  } else {
    // Sadece saat dizesi (örn: "14:30" veya "14:30:15").
    // 'Z' ekleyerek bunun bir UTC saati olduğunu belirtiyoruz.
    dateObj = new Date(`${today}T${timeString}Z`);
  }

  // Eğer tarih nesnesi geçersizse, orijinal dizeyi geri döndür.
  if (isNaN(dateObj.getTime())) {
    return timeString;
  }
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Istanbul', // Türkiye'nin saat dilimi, UTC+3'ü doğru şekilde yönetir.
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  if (showSeconds) {
    options.second = '2-digit';
  }

  return dateObj.toLocaleTimeString('tr-TR', options);
};