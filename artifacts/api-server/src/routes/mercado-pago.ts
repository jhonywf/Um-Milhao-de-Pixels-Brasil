import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const supabaseUrl = process.env.SUPABASE_URL || "https://cnyjodkusuikivdwbwcg.supabase.co";
const supabasePublishableKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
const mercadoPagoWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || "";
const appPublicUrl = (process.env.APP_PUBLIC_URL || "https://um-milhao-de-pixels-brasil--jhonymec2.replit.app").replace(/\/$/, "");

type ReservationRow = {
  id: string;
  user_id: string;
  status: "active" | "converted" | "expired" | "cancelled";
  pixel_count: number;
  amount_cents: number;
  expires_at: string;
};

type MercadoPagoPreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
  error?: string;
};

type MercadoPagoPayment = {
  id: number;
  status?: string;
  currency_id?: string;
  transaction_amount?: number;
  external_reference?: string | null;
};

type WallOrderRow = {
  id: string;
  status: string;
  reservation_id: string;
  provider_reference: string | null;
};

function getBearerToken(req: Request) {
  const authorization = req.header("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

function readQueryString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

function isValidWebhookSignature(req: Request, dataId: string) {
  const xSignature = req.header("x-signature") || "";
  const xRequestId = req.header("x-request-id") || "";

  if (!mercadoPagoWebhookSecret || !xSignature || !xRequestId || !dataId) {
    return false;
  }

  const parts = Object.fromEntries(
    xSignature
      .split(",")
      .map((part) => part.trim().split("=", 2))
      .filter(([key, value]) => Boolean(key && value)),
  );

  const ts = parts.ts;
  const receivedV1 = parts.v1;

  if (!ts || !receivedV1 || !/^[a-f0-9]{64}$/i.test(receivedV1)) {
    return false;
  }

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expectedV1 = createHmac("sha256", mercadoPagoWebhookSecret)
    .update(manifest)
    .digest("hex");

  const expected = Buffer.from(expectedV1, "hex");
  const received = Buffer.from(receivedV1, "hex");

  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function loadOwnActiveReservation(reservationId: string, accessToken: string) {
  if (!supabasePublishableKey) {
    throw new Error("SUPABASE_PUBLIC_KEY_MISSING");
  }

  const query = new URLSearchParams({
    select: "id,user_id,status,pixel_count,amount_cents,expires_at",
    id: `eq.${reservationId}`,
    limit: "1",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/wall_reservations?${query.toString()}`, {
    headers: {
      Accept: "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const rows = await response.json() as ReservationRow[];
  const reservation = rows[0] ?? null;

  if (!reservation) return null;
  if (reservation.status !== "active") return null;
  if (new Date(reservation.expires_at).getTime() <= Date.now()) return null;
  if (!Number.isInteger(reservation.pixel_count) || reservation.pixel_count < 1) return null;
  if (!Number.isInteger(reservation.amount_cents) || reservation.amount_cents < 1) return null;

  return reservation;
}

async function serviceRoleGet<T>(path: string): Promise<T> {
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY_MISSING");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      Accept: "application/json",
      apikey: supabaseServiceRoleKey,
      ...(supabaseServiceRoleKey.startsWith("sb_secret_")
        ? {}
        : { Authorization: `Bearer ${supabaseServiceRoleKey}` }),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SUPABASE_SERVICE_ROLE_READ_FAILED:${response.status}`);
  }

  return await response.json() as T;
}

async function loadReservationForWebhook(reservationId: string) {
  const query = new URLSearchParams({
    select: "id,user_id,status,pixel_count,amount_cents,expires_at",
    id: `eq.${reservationId}`,
    limit: "1",
  });

  const rows = await serviceRoleGet<ReservationRow[]>(`wall_reservations?${query.toString()}`);
  return rows[0] ?? null;
}

async function findExistingPaidOrder(paymentId: string) {
  const query = new URLSearchParams({
    select: "id,status,reservation_id,provider_reference",
    provider: "eq.mercado_pago",
    provider_reference: `eq.${paymentId}`,
    limit: "1",
  });

  const rows = await serviceRoleGet<WallOrderRow[]>(`wall_orders?${query.toString()}`);
  return rows[0] ?? null;
}

async function loadMercadoPagoPayment(paymentId: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${mercadoPagoAccessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MERCADO_PAGO_PAYMENT_READ_FAILED:${response.status}`);
  }

  return await response.json() as MercadoPagoPayment;
}

async function finalizeReservation(
  reservationId: string,
  paymentId: string,
  amountCents: number,
) {
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY_MISSING");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/finalize_wall_reservation`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      apikey: supabaseServiceRoleKey,
      ...(supabaseServiceRoleKey.startsWith("sb_secret_")
        ? {}
        : { Authorization: `Bearer ${supabaseServiceRoleKey}` }),
    },
    body: JSON.stringify({
      p_reservation_id: reservationId,
      p_provider: "mercado_pago",
      p_provider_reference: paymentId,
      p_amount_cents: amountCents,
    }),
  });

  const payload = await response.text();

  if (!response.ok) {
    throw new Error(`FINALIZE_WALL_RESERVATION_FAILED:${response.status}:${payload.slice(0, 300)}`);
  }

  return payload;
}

router.post("/mercado-pago/preference", async (req: Request, res: Response) => {
  const accessToken = getBearerToken(req);
  const reservationId = typeof req.body?.reservation_id === "string" ? req.body.reservation_id.trim() : "";

  if (!accessToken) {
    res.status(401).json({ message: "Entre na sua conta para continuar com o pagamento." });
    return;
  }

  if (!reservationId) {
    res.status(400).json({ message: "Reserva inválida." });
    return;
  }

  if (!mercadoPagoAccessToken) {
    req.log?.error("MERCADO_PAGO_ACCESS_TOKEN is not configured");
    res.status(503).json({ message: "O pagamento ainda não está configurado no servidor." });
    return;
  }

  try {
    const reservation = await loadOwnActiveReservation(reservationId, accessToken);

    if (!reservation) {
      res.status(409).json({
        message: "Essa reserva não está mais disponível. Volte à parede e faça uma nova seleção.",
      });
      return;
    }

    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            id: `pixels-${reservation.id}`,
            title: `${reservation.pixel_count} pixels — Um Milhão de Pixels Brasil`,
            description: "Reserva de pixels na parede digital Um Milhão de Pixels Brasil",
            quantity: 1,
            currency_id: "BRL",
            unit_price: reservation.amount_cents / 100,
          },
        ],
        external_reference: reservation.id,
        metadata: {
          reservation_id: reservation.id,
          pixel_count: reservation.pixel_count,
        },
        back_urls: {
          success: `${appPublicUrl}/parede?payment=success`,
          pending: `${appPublicUrl}/parede?payment=pending`,
          failure: `${appPublicUrl}/parede?payment=failure`,
        },
        auto_return: "approved",
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(reservation.expires_at).toISOString(),
      }),
    });

    const payload = await preferenceResponse.json() as MercadoPagoPreferenceResponse;

    if (!preferenceResponse.ok || !payload.id) {
      req.log?.error(
        { status: preferenceResponse.status, mpError: payload.error, mpMessage: payload.message },
        "Mercado Pago preference creation failed",
      );
      res.status(502).json({ message: "Não foi possível abrir o Mercado Pago agora. Tente novamente." });
      return;
    }

    const checkoutUrl = payload.sandbox_init_point || payload.init_point;

    if (!checkoutUrl) {
      req.log?.error({ preferenceId: payload.id }, "Mercado Pago preference returned no checkout URL");
      res.status(502).json({ message: "O Mercado Pago não retornou o link de pagamento." });
      return;
    }

    res.status(201).json({
      preference_id: payload.id,
      checkout_url: checkoutUrl,
      reservation_id: reservation.id,
      pixel_count: reservation.pixel_count,
      amount_cents: reservation.amount_cents,
      expires_at: reservation.expires_at,
    });
  } catch (error) {
    req.log?.error({ err: error }, "Could not create Mercado Pago preference");
    res.status(500).json({ message: "Não foi possível iniciar o pagamento agora." });
  }
});

router.post("/mercado-pago/webhook", async (req: Request, res: Response) => {
  const dataId = readQueryString(req.query["data.id"]);
  const type = readQueryString(req.query.type) || (typeof req.body?.type === "string" ? req.body.type : "");

  if (!mercadoPagoWebhookSecret || !supabaseServiceRoleKey || !mercadoPagoAccessToken) {
    req.log?.error("Mercado Pago webhook server credentials are incomplete");
    res.status(503).json({ message: "Webhook não configurado." });
    return;
  }

  if (!isValidWebhookSignature(req, dataId)) {
    req.log?.warn({ dataId, type }, "Rejected Mercado Pago webhook with invalid signature");
    res.sendStatus(401);
    return;
  }

  if (type && type !== "payment") {
    res.sendStatus(200);
    return;
  }

  if (!/^\d+$/.test(dataId)) {
    res.sendStatus(400);
    return;
  }

  try {
    const existingOrder = await findExistingPaidOrder(dataId);

    if (existingOrder?.status === "paid") {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }

    const payment = await loadMercadoPagoPayment(dataId);

    if (String(payment.id) !== dataId) {
      req.log?.warn({ dataId, paymentId: payment.id }, "Mercado Pago payment ID mismatch");
      res.sendStatus(409);
      return;
    }

    if (payment.status !== "approved") {
      res.status(200).json({ ok: true, ignored: `payment_${payment.status || "unknown"}` });
      return;
    }

    const reservationId = typeof payment.external_reference === "string"
      ? payment.external_reference.trim()
      : "";

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reservationId)) {
      req.log?.warn({ dataId }, "Approved Mercado Pago payment has invalid external reference");
      res.sendStatus(409);
      return;
    }

    const reservation = await loadReservationForWebhook(reservationId);

    if (!reservation) {
      req.log?.error({ dataId, reservationId }, "Reservation for approved Mercado Pago payment was not found");
      res.sendStatus(409);
      return;
    }

    const paidAmountCents = Number.isFinite(payment.transaction_amount)
      ? Math.round(Number(payment.transaction_amount) * 100)
      : -1;

    if (payment.currency_id !== "BRL" || paidAmountCents !== reservation.amount_cents) {
      req.log?.error(
        {
          dataId,
          reservationId,
          currency: payment.currency_id,
          paidAmountCents,
          expectedAmountCents: reservation.amount_cents,
        },
        "Approved Mercado Pago payment does not match reservation amount",
      );
      res.sendStatus(409);
      return;
    }

    if (reservation.status === "converted") {
      const order = await findExistingPaidOrder(dataId);
      if (order?.status === "paid" && order.reservation_id === reservation.id) {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }

      req.log?.error({ dataId, reservationId }, "Converted reservation has no matching paid order");
      res.sendStatus(409);
      return;
    }

    if (reservation.status !== "active") {
      req.log?.error(
        { dataId, reservationId, reservationStatus: reservation.status },
        "Approved Mercado Pago payment references a non-active reservation",
      );
      res.sendStatus(409);
      return;
    }

    await finalizeReservation(reservation.id, dataId, reservation.amount_cents);

    req.log?.info(
      { dataId, reservationId, pixelCount: reservation.pixel_count, amountCents: reservation.amount_cents },
      "Mercado Pago payment finalized wall reservation",
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    req.log?.error({ err: error, dataId }, "Could not process Mercado Pago webhook");
    res.sendStatus(500);
  }
});

export default router;
