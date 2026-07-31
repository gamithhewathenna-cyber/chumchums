<?php
// Minimal SMTP client (no external dependencies — supports AUTH LOGIN, implicit SSL, STARTTLS)
function smtp_send($cfg, $to, $subject, $body) {
  $host = trim($cfg['smtp_host'] ?? '');
  $port = (int)($cfg['smtp_port'] ?? 587);
  $user = trim($cfg['smtp_user'] ?? '');
  $pass = $cfg['smtp_pass'] ?? '';
  $secure = $cfg['smtp_secure'] ?? 'tls'; // none|ssl|tls
  $fromEmail = trim($cfg['smtp_from_email'] ?? $user);
  $fromName = trim($cfg['smtp_from_name'] ?? 'Fork POS');

  if (!$host) return [false, 'SMTP host is not configured'];
  if (!$fromEmail) return [false, 'From email is not configured'];

  $target = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
  $errno = 0; $errstr = '';
  $sock = @stream_socket_client($target, $errno, $errstr, 12);
  if (!$sock) return [false, "Connection failed: $errstr ($errno)"];
  stream_set_timeout($sock, 12);

  $read = function () use ($sock) {
    $data = '';
    while (($line = fgets($sock, 515)) !== false) {
      $data .= $line;
      if (isset($line[3]) && $line[3] === ' ') break;
    }
    return $data;
  };
  $write = function ($cmd) use ($sock) { fwrite($sock, $cmd . "\r\n"); };
  $expect = function ($resp, $codes) { return in_array((int)substr($resp, 0, 3), $codes, true); };
  $fail = function ($msg) use ($sock) { fclose($sock); return [false, $msg]; };

  $banner = $read();
  if (!$expect($banner, [220])) return $fail("Unexpected greeting: $banner");

  $write('EHLO forkpos.local');
  $resp = $read();
  if (!$expect($resp, [250])) return $fail("EHLO failed: $resp");

  if ($secure === 'tls') {
    $write('STARTTLS');
    $resp = $read();
    if (!$expect($resp, [220])) return $fail("STARTTLS rejected: $resp");
    if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) return $fail('TLS handshake failed');
    $write('EHLO forkpos.local');
    $resp = $read();
    if (!$expect($resp, [250])) return $fail("EHLO after STARTTLS failed: $resp");
  }

  if ($user !== '') {
    $write('AUTH LOGIN');
    $resp = $read();
    if (!$expect($resp, [334])) return $fail("AUTH LOGIN not supported: $resp");
    $write(base64_encode($user));
    $resp = $read();
    if (!$expect($resp, [334])) return $fail("Username rejected: $resp");
    $write(base64_encode($pass));
    $resp = $read();
    if (!$expect($resp, [235])) return $fail("Authentication failed: $resp");
  }

  $write("MAIL FROM:<$fromEmail>");
  $resp = $read();
  if (!$expect($resp, [250])) return $fail("MAIL FROM rejected: $resp");

  $write("RCPT TO:<$to>");
  $resp = $read();
  if (!$expect($resp, [250, 251])) return $fail("RCPT TO rejected: $resp");

  $write('DATA');
  $resp = $read();
  if (!$expect($resp, [354])) return $fail("DATA rejected: $resp");

  $headers = "From: {$fromName} <{$fromEmail}>\r\n";
  $headers .= "To: <{$to}>\r\n";
  $headers .= "Subject: {$subject}\r\n";
  $headers .= "MIME-Version: 1.0\r\n";
  $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
  $headers .= 'Date: ' . date('r') . "\r\n";

  $norm = str_replace("\r\n", "\n", $body);
  $escaped = str_replace("\n", "\r\n", str_replace("\n.", "\n..", $norm));

  fwrite($sock, $headers . "\r\n" . $escaped . "\r\n.\r\n");
  $resp = $read();
  if (!$expect($resp, [250])) return $fail("Message rejected: $resp");

  $write('QUIT');
  fclose($sock);
  return [true, 'Sent'];
}
