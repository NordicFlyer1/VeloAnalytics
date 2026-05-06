# Deployment Guide: Vercel

This guide will help you take **VeloAnalytics** from this preview and host it on your own private web address using Vercel. This is the best way to ensure your app is always available and private.

## Step 1: The "Home" for your code (GitHub)
Before Vercel can host your app, the code needs to live in a GitHub account.
1. Go to [GitHub.com](https://github.com) and create a free account if you don't have one.
2. If you are using the AI Studio "Export" feature, choose **Export to GitHub**. This will create a new "Repository" (a project folder) in your account.

## Step 2: Create a Vercel Account
1. Go to [Vercel.com](https://vercel.com).
2. Click **Sign Up** and choose **Continue with GitHub**. This links your accounts so Vercel can see your code.

## Step 3: Importing the Project
1. Once logged into Vercel, click the **"Add New..."** button and select **Project**.
2. You should see your GitHub repository listed. Click **Import**.
3. Vercel will automatically detect that this is a **Vite** project. You don't need to change the "Build Settings."

## Step 4: Adding Your API Keys (Critical)
VeloAnalytics needs your specific keys to fetch data. Before clicking "Deploy":
1. Look for the **Environment Variables** section.
2. Open the `.env.example` file in your project code to see what you need.
3. For every key (e.g., `VITE_GARMIN_API_KEY` or `VITE_STRAVA_CLIENT_ID`), type the **Name** into the Vercel box and paste your **Value** next to it.
4. Click **Add** for each one.

## Step 5: Deploy!
1. Click **Deploy**. Vercel will spend about 1-2 minutes "building" your app.
2. Once finished, you will get a private URL (e.g., `velo-analytics-yourname.vercel.app`).

---

### Pro Tip: Updates
Whenever you save a change to your code in GitHub, Vercel will automatically detect it and "re-deploy" your site. You never have to manually upload files again!
