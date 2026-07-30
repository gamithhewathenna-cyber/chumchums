# Fork POS — PHP + MySQL edition

Same Restaurant POS, rebuilt to run on **standard Namecheap shared cPanel hosting**.
No Node.js required — just PHP 7.4+ and MySQL/MariaDB, which every cPanel plan has.

- **Backend:** PHP REST API (PDO/MySQL), JWT auth, role-based access
- **Frontend:** vanilla-JS single-page app (no build step), responsive, dark/light mode
- **Single site:** the API lives under `/api`, the app is served from the same domain

## Demo logins

| Username | Password   | Role    |
|----------|------------|---------|
| admin    | admin123   | admin   |
| manager  | manager123 | manager |
| cashier  | cashier123 | cashier |
| wendy    | waiter123  | waiter  |
| kitchen  | kitchen123 | kitchen |

**Change these before going live** (log in as admin → Staff).

---

## Install on Namecheap cPanel — step by step

### 1. Create the MySQL database
cPanel → **MySQL® Databases**:
1. Create a database, e.g. `pos` → it becomes `youruser_pos`.
2. Create a database user, e.g. `posuser` → `youruser_posuser`, with a strong password.
3. Under *Add User To Database*, add that user to the database and grant **ALL PRIVILEGES**.

Write down the final names — they include your cPanel username as a prefix.

### 2. Upload the files
cPanel → **File Manager**:
1. Go to `public_html` (or a subfolder if you want the POS at `/pos`).
2. Upload `pos-php.zip` and **Extract** it there.
3. Move the *contents* (`index.html`, `api/`, `assets/`, `.htaccess`, `sql/`) directly
   into `public_html` so that `index.html` sits at the web root.
   (In File Manager, enable "Show Hidden Files" so you can see `.htaccess`.)

### 3. Create the config file
In File Manager, go into the `api/` folder:
1. Copy `config.example.php` → rename the copy to `config.php`.
2. Edit `config.php` and fill in the values from step 1:
   ```php
   'db_host'    => 'localhost',
   'db_name'    => 'youruser_pos',
   'db_user'    => 'youruser_posuser',
   'db_pass'    => 'the_password_you_set',
   'jwt_secret' => 'paste_a_long_random_string_here',
   ```

### 4. Load the database + demo data
Two ways — pick one:

**A) Browser (easiest):** visit
`https://yourdomain.com/api/seed.php?key=YOUR_JWT_SECRET`
(use the exact `jwt_secret` from config.php). You should see
`✅ Seed complete`.

**B) phpMyAdmin:** cPanel → phpMyAdmin → select your DB → **Import** →
upload `sql/schema.sql` to create the tables. (Demo data only loads via method A.)

### 5. **Delete the seed file** (important)
After seeding, delete `api/seed.php` in File Manager so it can't be run again.

### 6. Open your site
Go to `https://yourdomain.com` → log in with **admin / admin123**.

### 7. Secure it
- admin → **Staff**: change every password / remove unused accounts.
- cPanel → **SSL/TLS Status** → run **AutoSSL** so the site is https.

---

## Troubleshooting

- **"Database connection failed"** → recheck `api/config.php` values. The DB name and
  user both start with your cPanel username (e.g. `bob123_pos`). Host is usually
  `localhost`.
- **Login says Unauthorized / 401 immediately** → your host is stripping the
  Authorization header. The included `.htaccess` already re-adds it
  (`HTTP_AUTHORIZATION` rule). Make sure the root `.htaccess` uploaded (it's a hidden
  file). On LiteSpeed/Apache this works out of the box.
- **Blank page / 500** → check cPanel → **Errors** or set your PHP version to 7.4+ in
  cPanel → *Select PHP Version*. Ensure the **pdo_mysql** extension is enabled there.
- **API 404 on every call** → the root `.htaccess` didn't upload, or `mod_rewrite`
  is off (rare on cPanel). Confirm `.htaccess` is at the web root next to `index.html`.
- **Putting the app in a subfolder** (e.g. `public_html/pos`) → it still works because
  paths are relative to the same folder; just visit `yourdomain.com/pos`.

## Backup
admin → Settings → **Download Backup** (full JSON). You can also export the database
from cPanel → phpMyAdmin → Export at any time.

## Scope
Per request this excludes multi-branch management, AI/automation, and tax/VAT config.
Hardware (printers, cash drawer, scanner, customer display) and email/SMS receipts are
modeled at the data/receipt layer; wiring real devices/gateways needs your drivers and
provider credentials.

## Security notes
- `api/config.php` holds your DB password; the included `api/.htaccess` blocks direct
  web access to all PHP files except `index.php`. Keep it in place.
- Passwords are stored hashed (PHP `password_hash`). JWTs are signed with your
  `jwt_secret` — keep it long and private.
