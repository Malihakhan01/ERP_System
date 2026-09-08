# FactoryOS Garment ERP — Hostinger Business Shared Hosting Deployment Guide

This guide details step-by-step how to deploy the **FactoryOS Garment ERP** backend (Laravel 13 + MySQL 8) and frontend (Next.js 16) on **Hostinger Business Shared Hosting** with zero external SaaS dependencies.

---

## 1. MySQL Database Creation on Hostinger

1. Log into your **Hostinger hPanel**.
2. Navigate to **Databases** → **Management**.
3. Create a new MySQL database:
   * **Database Name**: `u123456789_factoryos`
   * **Username**: `u123456789_erpuser`
   * **Password**: *Generate a secure 16+ character password*.
4. Open **phpMyAdmin** for the new database.
5. Click the **Import** tab and upload [`backend/database/schema_mysql.sql`](./database/schema_mysql.sql).
6. Click **Go** to generate all 22 tables and foreign key constraints.

---

## 2. Laravel Backend Setup

1. In hPanel, navigate to **Files** → **File Manager**.
2. Upload the `backend/` folder to your domain directory (e.g. `/home/u123456789/domains/yourdomain.com/laravel`).
3. Set up the `.env` file from [`.env.example`](./.env.example):
   ```env
   APP_NAME=FactoryOS
   APP_ENV=production
   APP_KEY=base64:...
   APP_DEBUG=false
   APP_URL=https://api.yourdomain.com

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=u123456789_factoryos
   DB_USERNAME=u123456789_erpuser
   DB_PASSWORD=YourDatabasePassword

   QUEUE_CONNECTION=database
   CACHE_STORE=file
   FILESYSTEM_DISK=local
   ```
4. Set storage permissions in File Manager:
   * `storage/` → `775` permissions.
   * `bootstrap/cache/` → `775` permissions.

---

## 3. Hostinger cPanel Cron Jobs Configuration

In hPanel, go to **Advanced** → **Cron Jobs** and configure the following 2 tasks:

### Task A: Laravel Scheduler (Runs Every Minute)
* **Frequency**: `* * * * *` (Every minute)
* **Command**:
  ```bash
  /usr/bin/php /home/u123456789/domains/yourdomain.com/laravel/artisan schedule:run >> /dev/null 2>&1
  ```

### Task B: Database Queue Worker (Runs Every 5 Minutes)
* **Frequency**: `*/5 * * * *` (Every 5 minutes)
* **Command**:
  ```bash
  /usr/bin/php /home/u123456789/domains/yourdomain.com/laravel/artisan queue:work --stop-when-empty --tries=3 --timeout=120 >> /dev/null 2>&1
  ```

---

## 4. Next.js Frontend Configuration

1. Set the production API URL in `.env.production`:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
   ```
2. Build and deploy the Next.js bundle via Hostinger Node.js Application manager or standard deployment.

---

## 5. Security & Private Storage
All uploaded files (tech packs, employee CNICs, export documents) are stored in `storage/app/private/` outside the public web root. Access is strictly authorized and streamed through the `/api/v1/files/{id}/download` endpoint with Sanctum Bearer token verification.
