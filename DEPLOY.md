# Deploy MealRoulette as a PWA

Deploy the backend to Render and the frontend to Vercel. This gives you a URL you can open on iPhone and "Add to Home Screen" as a PWA.

## 1) Deploy backend (`api-gateway`) to Render

1. Push your repo to GitHub.
2. In Render, create a **Web Service** from your repo.
3. Use these settings:
   - Runtime: **Docker**
   - Dockerfile path: `Dockerfile`
   - Docker build context: `.`
   - Health check path: `/health`
4. Deploy and copy the public URL, e.g. `https://mealroulette-api.onrender.com`.
5. Verify:
   - `https://mealroulette-api.onrender.com/health` returns `{ "ok": true }`.
   - `https://mealroulette-api.onrender.com/graphql` responds (Apollo endpoint).

## 2) Deploy frontend (`apps/frontend`) to Vercel

1. In Vercel, import the same repo.
2. Set **Root Directory** to `apps/frontend`.
3. Build settings:
   - Framework Preset: **Vite**
   - Build Command: `pnpm --filter frontend run build`
   - Output Directory: `dist`
4. Add Environment Variables in Vercel:
   - `VITE_GRAPHQL_URL=https://YOUR_RENDER_URL/graphql`
   - `VITE_ANALYTICS_URL=https://YOUR_RENDER_URL/api/analytics/swipes`
5. Deploy.

## 3) Verify PWA behavior

1. Open your Vercel URL on iPhone Safari.
2. Tap **Share** -> **Add to Home Screen**.
3. Launch from the icon and verify:
   - Recipes load (GraphQL to Render)
   - Swipes/analytics post to Render
   - App works with service worker caching on repeat visits

## 4) Important notes

- `VITE_*` values are bundled into frontend JS at build time.
- When backend URL changes, update Vercel env vars and redeploy.
- Render free plans may cold-start after idle.

## 5) Monorepo files used for deployment

- Backend container: `Dockerfile`
- Backend health/CORS: `apps/api-gateway/src/index.ts`
- Frontend PWA shell: `apps/frontend/index.html`, `apps/frontend/public/manifest.webmanifest`, `apps/frontend/public/sw.js`
- Vercel SPA routing: `apps/frontend/vercel.json`
