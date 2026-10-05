const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export interface OcrValidationResult {
  isValid: boolean;
  extractedReference?: string;
  extractedAmountBs?: number;
  extractedBank?: string;
  extractedPhone?: string;
  confidenceScore: number;
  notes: string;
  requiresManualReview: boolean;
}

const MANUAL_REVIEW: OcrValidationResult = {
  isValid: false,
  confidenceScore: 0,
  requiresManualReview: true,
  notes: 'Verificación automática no disponible. Confirma el comprobante contra el banco antes de marcarlo como pagado.',
};

/**
 * La comprobante nunca se valida en el dispositivo: la clave de Gemini vive en el
 * servidor. Si el servicio no responde, la orden NO se marca como pagada.
 */
export async function validatePagoMovilScreenshot(
  imageBase64: string,
  expectedRef: string,
  expectedAmountBs: number
): Promise<OcrValidationResult> {
  if (!API) return MANUAL_REVIEW;
  try {
    const response = await fetch(API + '/api/ai/validate-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionStorage.getItem('virgen_del_valle_session')
          ? { Authorization: `Bearer ${sessionStorage.getItem('virgen_del_valle_session')}` }
          : {}),
      },
      body: JSON.stringify({ imageBase64, expectedRef, expectedAmountBs }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.result) {
      return { ...MANUAL_REVIEW, notes: data.message || MANUAL_REVIEW.notes };
    }
    return { ...MANUAL_REVIEW, ...data.result, requiresManualReview: Boolean(data.result.requiresManualReview) };
  } catch {
    return { ...MANUAL_REVIEW, notes: 'No se pudo contactar al servidor de verificación. Revisa el comprobante manualmente.' };
  }
}