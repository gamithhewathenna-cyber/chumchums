<?php
// Minimal Stripe REST client (no SDK/Composer) — Checkout Sessions + webhook signature verification

// $lineItems: [['name'=>..., 'amount'=>cents, 'qty'=>...], ...]
// Returns [ok, sessionId, checkoutUrl, errorMessage]
function stripe_create_checkout_session($cfg, $lineItems, $successUrl, $cancelUrl, $metadata = []) {
  $secret = trim($cfg['stripe_secret_key'] ?? '');
  $currency = strtolower(trim($cfg['stripe_currency'] ?? 'usd'));
  if (!$secret) return [false, null, null, 'Stripe is not configured'];
  if (!$lineItems) return [false, null, null, 'No items to charge'];

  $body = [
    'mode' => 'payment',
    'success_url' => $successUrl,
    'cancel_url' => $cancelUrl,
  ];
  if (!empty($metadata['customer_email'])) $body['customer_email'] = $metadata['customer_email'];
  foreach ($metadata as $k => $v) $body['metadata'][$k] = (string)$v;
  foreach (array_values($lineItems) as $i => $li) {
    $body['line_items'][$i]['quantity'] = max(1, (int)$li['qty']);
    $body['line_items'][$i]['price_data']['currency'] = $currency;
    $body['line_items'][$i]['price_data']['unit_amount'] = (int)round($li['amount']);
    $body['line_items'][$i]['price_data']['product_data']['name'] = substr((string)$li['name'], 0, 250);
  }

  $ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($body),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_USERPWD => $secret . ':',
    CURLOPT_TIMEOUT => 15,
  ]);
  $resp = curl_exec($ch);
  $err = curl_error($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($resp === false) return [false, null, null, "Stripe connection failed: $err"];
  $data = json_decode($resp, true);
  if ($httpCode >= 400) return [false, null, null, $data['error']['message'] ?? "Stripe error (HTTP $httpCode)"];
  return [true, $data['id'] ?? null, $data['url'] ?? null, null];
}

// Verifies Stripe's "Stripe-Signature: t=...,v1=..." webhook header (HMAC-SHA256 over "t.payload")
function stripe_verify_webhook_sig($payload, $sigHeader, $secret, $toleranceSeconds = 300) {
  if (!$sigHeader || !$secret) return false;
  $parts = [];
  foreach (explode(',', $sigHeader) as $kv) {
    $pair = explode('=', $kv, 2);
    if (count($pair) !== 2) continue;
    $parts[$pair[0]][] = $pair[1];
  }
  $t = $parts['t'][0] ?? null;
  $v1s = $parts['v1'] ?? [];
  if (!$t || !$v1s) return false;
  if (abs(time() - (int)$t) > $toleranceSeconds) return false;
  $expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
  foreach ($v1s as $v1) if (hash_equals($expected, $v1)) return true;
  return false;
}
