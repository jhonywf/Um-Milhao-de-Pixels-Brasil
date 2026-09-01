export type MercadoPagoCheckout = {
  preference_id: string;
  checkout_url: string;
  reservation_id: string;
  pixel_count: number;
  amount_cents: number;
  expires_at: string;
};

function readablePaymentError(payload: unknown) {
  if (typeof payload === 'object' && payload && 'message' in payload) {
    return String(payload.message);
  }
  return 'Não foi possível iniciar o pagamento agora.';
}

export async function createMercadoPagoCheckout(
  reservationId: string,
  accessToken: string,
): Promise<MercadoPagoCheckout> {
  const response = await fetch('/api/payments/mercado-pago/preference', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ reservation_id: reservationId }),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(readablePaymentError(payload));
  }

  return payload as MercadoPagoCheckout;
}
