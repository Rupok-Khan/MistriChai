# Free deployment: Vercel + Render + Aiven + Cloudinary

Architecture:

- Frontend: Vercel Free
- Backend: Render Free Web Service
- Database: Aiven for MySQL Free
- Uploads: Cloudinary Free

The Render free service sleeps after 15 minutes without traffic and can take about a minute to wake. Its filesystem is temporary, so all new uploads are stored in Cloudinary.

## 1. Create Aiven MySQL

1. Sign in at <https://console.aiven.io> and create a project.
2. Create an **Aiven for MySQL** service using the **Free** plan.
3. Wait until it is running.
4. On **Overview > Connection information**, copy the Host, Port, User, Password, and Database name (normally `defaultdb`).
5. Download the CA certificate (`ca.pem`).
6. Convert it to one-line Base64 in PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\ca.pem"))
```

Save the output for `DB_SSL_CA_BASE64`. Do not commit it.

## 2. Create Cloudinary storage

1. Create a free account at <https://cloudinary.com>.
2. Open the Cloudinary Console and copy **Cloud name**, **API key**, and **API secret**.
3. Never put the API secret in Vercel or frontend code. It belongs only in Render.
4. If chat users need to open PDF attachments, open the product environment's **Security** settings and enable **Allow delivery of PDF and ZIP files**. Cloudinary Free blocks PDF delivery by default.

## 3. Deploy the backend on Render

1. Push this repository to GitHub.
2. In Render select **New > Blueprint** and connect `Rupok-Khan/MistriChai`.
3. Render reads `render.yaml` and creates the `mistrichai-api` free web service.
4. Enter every variable marked `sync: false`:

```env
DB_HOST=your-aiven-host.aivencloud.com
DB_PORT=your-aiven-port
DB_USER=avnadmin
DB_PASSWORD=your-aiven-password
DB_NAME=defaultdb
DB_SSL_CA_BASE64=the-single-line-base64-ca
ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=your-strong-admin-password
CORS_ORIGIN=https://your-vercel-project.vercel.app
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

5. Apply the Blueprint. The free-compatible start command initializes missing database tables and starts Express.
6. Verify `https://YOUR-RENDER-DOMAIN/api/health` returns `{"ok":true}`.

Do not add a Render disk, `UPLOAD_DIR`, or `PORT` variable. Render provides the port, and uploads go to Cloudinary.

## 4. Deploy the frontend on Vercel

1. Import the same GitHub repository in Vercel.
2. Set **Root Directory** to `client`.
3. Confirm framework **Vite**, build command `npm run build`, and output directory `dist`.
4. Add:

```env
VITE_API_URL=https://YOUR-RENDER-DOMAIN
```

Do not add a trailing slash. Deploy the frontend.

## 5. Correct CORS after Vercel deployment

Copy the final Vercel production URL. In Render update:

```env
CORS_ORIGIN=https://YOUR-EXACT-VERCEL-DOMAIN
```

Keep `CROSS_SITE_COOKIES=true`, save, and redeploy Render. Multiple exact origins can be comma-separated.

## 6. Verify

- Test customer, partner, and admin login.
- Stay logged in for more than 15 minutes and refresh each dashboard.
- Upload a partner photo, admin site image, cancellation proof, and chat attachment.
- Confirm new URLs use `https://res.cloudinary.com/...`.
- Redeploy Render and confirm uploads still work.
- Test booking, partner change, final payment, wallet, and withdrawal workflows.

## Free-tier limitations

- Render sleeps after 15 idle minutes; the first request after sleep can take about one minute.
- Render provides 750 free instance hours per workspace per month and applies bandwidth/build limits.
- Aiven Free MySQL currently provides 1 GB RAM and 1 GB disk, can be powered off after continued inactivity, and has no SLA.
- Cloudinary usage must stay within the current free account allowance.
- Free tiers are suitable for learning, demos, and light use—not guaranteed production availability.
