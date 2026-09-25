export async function generatePazYSalvoHash(data: {
  receiptNumber: string;
  waiterName: string;
  amountUsd: number;
  dateStr: string;
  ownerName: string;
}): Promise<string> {
  const message = `${data.receiptNumber}|${data.waiterName}|${data.amountUsd}|${data.dateStr}|${data.ownerName}|BUCHE_SECURE_SALT`;
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback pseudorandom SHA-like hex
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash << 5) - hash + message.charCodeAt(i);
    hash |= 0;
  }
  return '7f83b165' + Math.abs(hash).toString(16).padStart(8, '0') + '9d12' + Date.now().toString(16);
}
