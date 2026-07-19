# ⚽ Goals Arena

Goals Arena is a premium, high-performance social portal and match scoring logger for eFootball enthusiasts. Share match results, banter in the feed, react with standard expressions, comment in real-time, and climb the Leaderboards (Hall of Fame or Wall of Shame).

---

## 📸 Scoring Demonstration

Below is a demonstration of an eFootball match stats screen which users upload as evidence when submitting scores:

![eFootball Match Scoring Demo](docs/scoring_demo.png)

---

## 🚀 Key Features

- **🔥 Goals Feed**: A Facebook-like public social feed for announcements, questions, achievements, and general discussions.
- **💬 Real-time Comments & Reactions**: Quick emoji reactions (👍 ❤️ 😂 😮 😢) and immediate threaded commenting on posts.
- **🏆 Live Leaderboards**: 
  - **Hall of Fame**: Rankings sorted by victory count and win rate.
  - **Wall of Shame**: Wall highlighting the biggest chopos (losers).
- **📊 User Profile & Trophy Room**: Personal analytics (wins, losses, win rate, goal difference) and recent match history.
- **⚡ Performance Optimized**:
  - **Image Compression**: Screenshots are compressed to JPEG ≤900px at 72% quality on the client side before upload (5x to 10x faster uploads).
  - **Optimistic UI**: Posting content clears the form immediately and pushes to Firestore in the background.
  - **Offline Caching**: Enabled Firestore IndexedDB persistence for instantaneous repeat page loads.
  - **Hybrid Backend**: Powered by Firebase (Auth + Firestore Database) and Supabase Storage (completely free, no billing setup required for match uploads).

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS / Vanilla CSS, Lucide React (icons)
- **Database & Auth**: Firebase Authentication & Cloud Firestore
- **File Storage**: Supabase Storage (`matches` bucket)

---

## ⚙️ Setup & Installation

### 1. Prerequisites
Ensure you have Node.js installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following keys:
```env
# Firebase Credentials
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Supabase Credentials
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Running Locally
Start the local development server:
```bash
npm run dev
```

### 5. Production Build
Build the optimized application bundle:
```bash
npm run build
```

---

## 🌐 Deployment

To deploy the app to Firebase Hosting:
```bash
# Build & deploy
npm run build
firebase deploy --only hosting --project e-football-a3575
```
