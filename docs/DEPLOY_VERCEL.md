# Deployment Guide: Vercel

This guide provides step-by-step instructions for hosting **VeloAnalytics** on your own private web domain using Vercel. This ensures your app is always accessible, continuously updated, and completely private.

---

## 1. Connect GitHub Repository

Before Vercel can host your app, the code needs to live in a GitHub repository:
1. Go to [GitHub.com](https://github.com) and create a free account if you do not have one.
2. In Google AI Studio, choose **Export to GitHub**. This creates a private or public repository in your account.

---

## 2. Create a Vercel Account

1. Go to [Vercel.com](https://vercel.com).
2. Click **Sign Up** and select **Continue with GitHub**. This links your GitHub account so Vercel can deploy your code automatically.

---

## 3. Import Project

1. Once logged into Vercel, click **Add New...** and select **Project**.
2. Select your `VeloAnalytics` repository from the list and click **Import**.
3. Vercel automatically detects that this is a **Vite** application. The build command (`npm run build`) and output directory (`dist`) are pre-configured.

---

## 4. Configure Environment Variables & Proxy

VeloAnalytics is a local-first application. You can enter all your API keys directly inside the in-app **Settings** panel (stored privately in browser `localStorage`). However, if you want build-time default fallbacks for your deployment:

1. Expand the **Environment Variables** section in the Vercel project configuration.
2. Refer to `.env.example` in the repository for supported keys:
  - **AI Providers:** `VITE_GEMINI_API_KEY`, `VITE_OPENAI_API_KEY`, `VITE_ANTHROPIC_API_KEY`, `VITE_GROQ_API_KEY`
  - **Mapping & Weather:** `VITE_GOOGLE_MAPS_API_KEY`, `VITE_OPENWEATHERMAP_API_KEY`
  - **Basic Authentication (Optional):** `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`
3. Enter the variable **Name** and **Value**, then click **Add**.

> **Note on Garmin Connect Sync:**  
> Your Garmin Personal API Key is entered privately into the app via **Settings > Garmin Connect** on your device. The included `vercel.json` in your repository automatically proxies requests from `/api/garmin/:path*` to `https://personal.connectapi.garmin.com/:path*`, bypassing browser CORS without exposing or storing personal tokens on the server.

---

## 5. Deploy & Verify

1. Click **Deploy**. Vercel will install dependencies and compile the production bundle (typically 1–2 minutes).
2. Once complete, Vercel provides your production URL (e.g., `velo-analytics-yourname.vercel.app`).
3. Open your production URL in your browser and upload a sample `.FIT` file to verify operation.

---

## Continuous Updates

Whenever you push or merge a commit to your `main` branch in GitHub, Vercel automatically detects the change, triggers a clean build, and updates your live production site with zero downtime.
