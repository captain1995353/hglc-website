import "server-only";

/**
 * Minimal SSLCommerz v4 client — session init + transaction validation.
 * Docs: https://developer.sslcommerz.com/doc/v4/
 */

const SANDBOX = process.env.SSLCZ_SANDBOX !== "false";

const HOST = SANDBOX
  ? "https://sandbox.sslcommerz.com"
  : "https://securepay.sslcommerz.com";

const INIT_URL = `${HOST}/gwprocess/v4/api.php`;
const VALIDATE_URL = `${HOST}/validator/api/validationserverAPI.php`;

function credentials() {
  const store_id = process.env.SSLCZ_STORE_ID;
  const store_passwd = process.env.SSLCZ_STORE_PASSWORD;
  if (!store_id || !store_passwd) {
    throw new Error("SSLCZ_STORE_ID / SSLCZ_STORE_PASSWORD are not set");
  }
  return { store_id, store_passwd };
}

export type SslInitParams = {
  tranId: string;
  amount: number;
  productName: string;
  customer: { name: string; email: string; phone: string };
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
};

export type SslInitResult =
  | { ok: true; gatewayUrl: string; sessionKey: string }
  | { ok: false; reason: string };

export async function initSslSession(params: SslInitParams): Promise<SslInitResult> {
  const { store_id, store_passwd } = credentials();

  const body = new URLSearchParams({
    store_id,
    store_passwd,
    total_amount: params.amount.toFixed(2),
    currency: "BDT",
    tran_id: params.tranId,
    success_url: params.successUrl,
    fail_url: params.failUrl,
    cancel_url: params.cancelUrl,
    ipn_url: params.ipnUrl,
    // Course enrolment is a non-physical product, so no shipping.
    shipping_method: "NO",
    product_name: params.productName,
    product_category: "Education",
    product_profile: "non-physical-goods",
    cus_name: params.customer.name || "Student",
    cus_email: params.customer.email,
    cus_phone: params.customer.phone || "N/A",
    cus_add1: "Dhaka",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
  });

  const response = await fetch(INIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    return { ok: false, reason: `Gateway returned HTTP ${response.status}` };
  }

  const data = (await response.json()) as {
    status?: string;
    GatewayPageURL?: string;
    sessionkey?: string;
    failedreason?: string;
  };

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    return { ok: false, reason: data.failedreason || "Gateway rejected the session" };
  }

  return {
    ok: true,
    gatewayUrl: data.GatewayPageURL,
    sessionKey: data.sessionkey || "",
  };
}

export type SslValidation = {
  status: string; // VALID | VALIDATED | INVALID_TRANSACTION | FAILED
  tran_id?: string;
  amount?: string;
  currency?: string;
  val_id?: string;
  bank_tran_id?: string;
  card_type?: string;
  risk_level?: string;
  [key: string]: unknown;
};

/**
 * Server-to-server confirmation. Never trust the browser POST alone —
 * this call is what decides whether money actually arrived.
 */
export async function validateSslTransaction(
  valId: string,
): Promise<SslValidation | null> {
  const { store_id, store_passwd } = credentials();

  const url = `${VALIDATE_URL}?${new URLSearchParams({
    val_id: valId,
    store_id,
    store_passwd,
    format: "json",
  })}`;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  return (await response.json()) as SslValidation;
}

export function isSslPaid(validation: SslValidation | null) {
  return validation?.status === "VALID" || validation?.status === "VALIDATED";
}
