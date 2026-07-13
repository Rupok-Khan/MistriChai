# Deploy MistriChai with Vercel and Render

Production layout:

- Vercel: React/Vite frontend from `client/`
- Render Web Service: Express API from `server/`
- Render Private Service: MySQL 8
- Render Persistent Disk: uploaded images and documents

## Cost requirement

The API needs a paid Render web-service instance because Render does not allow persistent disks on free web services. Without a disk, uploaded partner photos, NID files, chat attachments, service images, and site-content images disappear after a restart or deployment. MySQL also requires a private service with persistent storage.

## 1. Create MySQL on Render

1. Follow Render's official MySQL guide: <https://render.com/docs/deploy-mysql>.
2. Use its **Deploy to Render** MySQL 8 template.
3. Select the **Singapore** region, matching `render.yaml`.
4. Configure strong values:

```env
MYSQL_DATABASE=mistrichai
MYSQL_USER=mistrichai
MYSQL_PASSWORD=GENERATE_A_STRONG_PASSWORD
MYSQL_ROOT_PASSWORD=GENERATE_ANOTHER_STRONG_PASSWORD
```

5. Confirm its disk is mounted at `/var/lib/mysql`.
6. Wait for MySQL and copy its private hostname, usually similar to `mysql-xxxx`.

Keep MySQL private. Use `mysqldump` backups; Render advises against using disk-snapshot restoration for live database recovery.

## 2. Deploy the API from the Blueprint

1. Push the latest repository changes to GitHub.
2. In Render, choose **New > Blueprint**.
3. Connect `Rupok-Khan/OnDemand`.
4. Render detects [render.yaml](render.yaml) and creates `mistrichai-api` with the Node runtime, health check, database initialization, and 1 GB upload disk.
5. Enter the required secret variables when prompted:

```env
DB_HOST=YOUR_MYSQL_PRIVATE_HOSTNAME
DB_USER=mistrichai
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=mistrichai
ADMIN_EMAIL=YOUR_PRIVATE_ADMIN_EMAIL
ADMIN_PASSWORD=YOUR_STRONG_PRIVATE_ADMIN_PASSWORD
CORS_ORIGIN=https://YOUR-VERCEL-PROJECT.vercel.app
```

The Blueprint generates `JWT_SECRET` automatically. Do not change it during normal redeployments because changing it signs out every user.

6. Apply the Blueprint and wait for deployment.
7. Verify `https://mistrichai-api.onrender.com/api/health` (replace the hostname with yours). It should return `{"ok":true}`.

Render supplies `PORT` automatically. Do not set it manually.

## 3. Deploy the frontend on Vercel

1. In Vercel, choose **Add New > Project** and import the same repository.
2. Set **Root Directory** to `client`.
3. Confirm Framework **Vite**, build command `npm run build`, output `dist`, and install command `npm install`.
4. Add this variable to Production and any Preview environments you use:

```env
VITE_API_URL=https://mistrichai-api.onrender.com
```

Use your actual Render URL and do not add a trailing slash.

5. Deploy. `client/vercel.json` handles direct visits and refreshes on dashboard routes.
6. Copy the final Vercel production URL.
7. In Render, update the API's `CORS_ORIGIN` to that exact URL and redeploy:

```env
CORS_ORIGIN=https://mistrichai.vercel.app
```

Multiple exact origins can be comma-separated. Keep `CROSS_SITE_COOKIES=true` while using separate `vercel.app` and `onrender.com` domains.

## 4. Custom domains

Recommended:

```text
https://mistrichai.com       -> Vercel
https://api.mistrichai.com   -> Render API
```

After DNS is active:

- Change Vercel `VITE_API_URL` to `https://api.mistrichai.com`, then redeploy.
- Change Render `CORS_ORIGIN` to `https://mistrichai.com,https://www.mistrichai.com`, then redeploy.
- With these same-site custom subdomains, `CROSS_SITE_COOKIES=false` can be used.

## 5. Production checks

Test login persistence beyond 15 minutes, dashboard refreshes, file uploads after an API redeploy, booking and partner-change workflows, both payment workflows, withdrawals, admin uploads, languages, and themes.

Never commit `.env` files, database passwords, admin credentials, payment credentials, or JWT secrets.

## Deployment files

- `render.yaml`: Render API Blueprint and upload disk
- `client/vercel.json`: Vercel SPA routing
- `server/scripts/initDb.js`: idempotent schema initialization
- `server/.env.example` and `client/.env.example`: variable templates
