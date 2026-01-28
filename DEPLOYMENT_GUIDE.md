# 🚀 Deployment & Custom Domain Guide for Seaflow Logistics

Since you are using **Railway** for hosting, here is the step-by-step guide to getting your application live with a custom link (e.g., `www.seaflow-logistics.com`).

## Phase 1: Deploying the App 

Before you can have a link, the code must be running on a server.

1.  **Push to GitHub**: Ensure your latest code (including the deployment updates I just made) is pushed to your GitHub repository.
2.  **Create Project on Railway**:
    *   Go to [Railway.app](https://railway.app/).
    *   Click **"New Project"** -> **"Deploy from GitHub repo"**.
    *   Select your `logistics-app` repository.
3.  **Configure Environment Variables**:
    *   In the Railway project dashboard, go to the **"Variables"** tab.
    *   Add the following secrets:
        *   `DATABASE_URL`: Connection string for your Supabase PostgreSQL database.
        *   `JWT_SECRET`: A long random string (e.g., generate one [here](https://generate-secret.vercel.app/32)).
        *   `NODE_ENV`: Set this to `production`.
        *   `PORT`: Set this to `5001`.
4.  **Wait for Build**: Railway will automatically install dependencies, build your React frontend, and start the node server. Once it says "Active", your app is live!
    *   Railway will generate a default link like: `logistics-app-production.up.railway.app`.

---

## Phase 2: Setting up a Custom Link (Custom Domain)

To change the default Railway link to something professional like `app.seaflow.com`:

### 1. Purchase a Domain
If you haven't already, buy a domain name from a registrar like:
*   [Namecheap](https://www.namecheap.com/)
*   [GoDaddy](https://www.godaddy.com/)
*   [Cloudflare](https://www.cloudflare.com/)

### 2. Connect in Railway
1.  Open your project in **Railway**.
2.  Click on your service settings (the box representing your app).
3.  Go to the **"Settings"** tab.
4.  Scroll down to **"Domains"**.
5.  Click **"Custom Domain"**.
6.  Enter your domain (e.g., `app.seaflow.com` or `seaflow-logistics.com`).

### 3. Configure DNS Records
Railway will give you a **DNS Record** to add to your domain registrar.

*   **If using a subdomain** (e.g., `app.seaflow.com`):
    *   **Type**: `CNAME`
    *   **Name**: `app`
    *   **Value/Target**: `logistics-app-production.up.railway.app` (the value Railway provides).

*   **If using the root domain** (e.g., `seaflow.com`):
    *   **Type**: `A` (or `ALIAS`/`ANAME` depending on provider)
    *   **Name**: `@`
    *   **Value**: (The IP address Railway provides).

### 4. Verification
*   Go back to your domain registrar's website and save the DNS records.
*   Wait a few minutes (DNS propagation can take up to 24h, but is usually fast).
*   Railway will automatically issue a **secure SSL certificate (HTTPS)** for your custom link.

## Troubleshooting
*   **White Screen?** Check the "Deploy Logs" in Railway. If the build failed, ensure `npm run build` works locally.
*   **API Errors?** Ensure your `DATABASE_URL` is correct and allows connections from the public internet (or whitelisted Railway IPs).
