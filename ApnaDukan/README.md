# 🏪 ApnaDukan

> **Apni Dukaan, Online Karo — Sirf Bol Do!**
> A voice-to-website tool for small shop owners in Indian Tier-2/3 cities.

---

## What Is This?

ApnaDukan lets a shop owner speak for 3 minutes and automatically generates a live, professional website. No coding. No typing. No design skills needed.

**How it works:**
1. Owner clicks the mic → speaks about their shop
2. AI extracts: name, products, timings, location, contact
3. A beautiful mobile-first website is generated
4. One click → website is live on the internet

---

## Quick Start (fastest way)

Needs **Python 3.11+** and **Node.js 18+**.

- **Windows:** double-click `START.bat`
- **Mac / Linux:** `./start.sh`

First run creates `backend/.env` (add your `GEMINI_API_KEY`, Supabase and Vercel keys), installs everything, builds the Next.js frontend and starts the server at **http://localhost:5000**. Use Chrome (voice input).

**Developing the UI with hot reload:** run the Flask backend (`cd backend && python app.py`), then in another terminal `cd frontend && npm install && npm run dev` and open **http://localhost:3000** (it proxies `/api`, `/preview`, `/uploads` to Flask). After UI changes, `npm run build` refreshes what Flask serves.

---

## Setup Instructions (Step by Step)

### Step 1: Install Python

1. Go to **https://www.python.org/downloads/**
2. Download Python 3.11 or newer
3. Run the installer — ✅ **Check "Add Python to PATH"** before clicking Install
4. Verify: open Command Prompt (Windows) or Terminal (Mac) and type:
   ```
   python --version
   ```
   You should see something like `Python 3.11.9`

---

### Step 2: Download the Project

If you have Git installed:
```bash
git clone https://github.com/your-username/apnadukan.git
cd apnadukan
```

Or download the ZIP from GitHub and extract it.

---

### Step 3: Install Python Packages

Open Terminal/Command Prompt inside the `apnadukan/backend/` folder:

```bash
cd backend
pip install -r requirements.txt
```

This installs Flask, Supabase client, and all other libraries. Takes 1-2 minutes.

---

### Step 4: Get a Gemini API Key (Free)

This is the **only key you need**. Without Supabase/Vercel keys, generated sites are saved locally (`backend/local_shops.db`) and you get a `localhost` preview link.

1. Go to **https://aistudio.google.com/apikey**
2. Click **"Create API key"** and copy it
3. Open `backend/.env` and paste it:
   ```
   GEMINI_API_KEY=your-key-here
   ```

The model is `gemini-flash-latest` (Google's newest Flash model, set automatically — no need to change it).

---

### Step 5: Set Up Supabase (only needed to save & publish sites)

1. Go to **https://supabase.com/** → Sign up free
2. Click **"New Project"** → give it a name like "apnadukan"
3. Wait ~2 minutes for the project to be created
4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdef.supabase.co`)
   - **Service Role Key** (under "Project API Keys")
5. Paste them in `backend/.env`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```
6. Now create the database tables:
   - Go to **SQL Editor** in Supabase dashboard
   - Click **"New Query"**
   - Open `database/schema.sql`, copy ALL the contents
   - Paste into the SQL Editor → click **"Run"**
   - You should see "Success. No rows returned."

---

### Step 6: Get a Vercel Token (only needed to publish live)

1. Go to **https://vercel.com/** → Sign up free (use GitHub login)
2. Go to **https://vercel.com/account/tokens**
3. Click **"Create"** → name it "ApnaDukan" → click Create Token
4. Copy the token and paste in `backend/.env`:
   ```
   VERCEL_TOKEN=your-vercel-token-here
   ```

---

### Step 7: Run the App Locally

Make sure you are in the `backend/` folder, then:

```bash
python app.py
```

You should see:
```
╔══════════════════════════════════════╗
║       🏪 ApnaDukan Server            ║
║  Running at http://localhost:5000    ║
╚══════════════════════════════════════╝
```

Open your browser and go to: **http://localhost:5000**

🎉 The app is running! Try clicking the mic button and speaking.

---

### Step 8: Deploy to Vercel (Make It Live Online)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
   (You need Node.js from https://nodejs.org/)

2. From the project root folder:
   ```bash
   vercel login
   vercel --prod
   ```

3. Follow the prompts. Your frontend will be live at something like:
   `https://apnadukan.vercel.app`

> **Note:** The Flask backend needs to be hosted separately (e.g., on Railway.app or Render.com — both have free tiers). For local testing, `python app.py` is enough.

---

## Project Structure (Quick Reference)

```
apnadukan/
├── backend/
│   ├── app.py              ← Start the server with: python app.py
│   ├── .env                ← Your secret keys (never share this!)
│   ├── requirements.txt    ← Python packages
│   ├── ai/                 ← Gemini AI logic
│   ├── generator/          ← Website builder
│   └── routes/             ← API endpoints
├── frontend/               ← Next.js 15 + Tailwind v4 + GSAP (static export → frontend/out)
│   ├── app/                ← / (landing), /onboard (voice interview), /success
│   ├── components.tsx      ← landing sections + animation primitives
│   ├── screens.tsx         ← onboard + success screens (talk to the Flask API)
│   ├── lib.ts              ← GSAP helpers, voice hook, content data
│   └── public/css, js      ← main.css + products.js used by the GENERATED shop sites
├── templates/              ← 4 website themes (food/clothing/services/general)
├── database/
│   ├── schema.sql          ← Run this in Supabase SQL Editor
│   └── db.py               ← Database helper functions
└── start.sh / START.bat    ← one-command launchers
```

---

## API Endpoints (For Developers)

| Method | Endpoint | What It Does |
|--------|----------|--------------|
| POST | `/api/interview/start` | Submit initial voice transcript |
| POST | `/api/interview/answer` | Submit follow-up answer |
| GET | `/api/interview/status` | Get current interview state |
| POST | `/api/interview/reset` | Start over |
| POST | `/api/generate` | Build the website HTML |
| GET | `/api/generate/preview` | Get live preview HTML |
| GET | `/preview/<shop_id>` | View generated site |
| POST | `/api/publish` | Deploy to Vercel |
| GET | `/api/health` | Health check |

---

## Common Issues & Fixes

**"Microphone not working"**
→ Use Google Chrome. Safari has limited Web Speech API support.
→ Make sure you allowed microphone permission in the browser.

**"Gemini API error 400/403"**
→ Check GEMINI_API_KEY in backend/.env (create one at aistudio.google.com/apikey).

**"Supabase connection failed"**
→ Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are correct.
→ Check you ran the schema.sql in Supabase SQL Editor.

**"Vercel publishing failed"**
→ Make sure VERCEL_TOKEN is set correctly.
→ Try logging into vercel.com and checking your account status.

**"Module not found" error when running app.py**
→ Make sure you ran `pip install -r requirements.txt` first.
→ Make sure you're running `python app.py` from inside the `backend/` folder.

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Backend | Python + Flask | Free |
| AI Brain | Gemini (gemini-flash-latest) | Free tier |
| Speech | Web Speech API (browser) | Free |
| Frontend | Next.js 15, Tailwind v4, GSAP, Lenis | Free |
| Database | Supabase | Free (up to 500MB) |
| Hosting | Vercel | Free (up to 100GB/month) |

---

## Made With ❤️ for India 🇮🇳

Built for small shop owners in Jodhpur, Jaipur, Indore, Nagpur, and every other Tier-2/3 city where millions of businesses have no online presence yet.

*"Bol do, website tayar."*
