<div align="center">

# ⚡ NEXUS — Discipline OS

**A personal productivity and discipline web app built for focused, intentional living.**

![Version](https://img.shields.io/badge/version-2.0-F59E0B?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-60A5FA?style=flat-square)
![Firebase](https://img.shields.io/badge/Firebase-10.9.0-orange?style=flat-square&logo=firebase)
![Status](https://img.shields.io/badge/status-active-34D399?style=flat-square)

<br/>

> *"We are what we repeatedly do. Excellence, then, is not an act but a habit."*
> — Aristotle

<br/>

[🚀 Live Demo](#) &nbsp;·&nbsp; [📸 Screenshots](#screenshots) &nbsp;·&nbsp; [⚙️ Setup](#setup) &nbsp;·&nbsp; [📁 Structure](#file-structure)

</div>

---

## 📌 What is NEXUS?

NEXUS is a **single-file, Firebase-backed discipline operating system** designed around one idea:
**small daily systems compound into extraordinary results.**

It combines task management, habit tracking, focus timing, goal setting, and Islamic daily practices into one clean, dark-first interface — built for mobile and desktop.

---

## ✨ Features

### ⚡ Dashboard
- **Today's Focus** — top 7 urgent tasks sorted by overdue → past-time → upcoming → daily
- **MIT Card** — Most Important Task with one-click focus launch
- **Mini Stats** — Done Today, Focus Time, Streak
- **Monthly Planner** — full calendar grid with drag-and-drop task scheduling
- **Daily Habits Widget** — prayers, water tracker, dhikr counter

### ✦ Tasks
- Full task tree with subtasks (unlimited nesting)
- Levels: Daily · Weekly · Bi-Weekly · Monthly
- Priorities: High · Medium · Low
- Recurrence: Daily · Weekly · Bi-Weekly · Monthly (auto-resets at midnight)
- Due date + due time with 30-min push notifications
- Keyboard shortcuts for everything
- Filters: All, Daily, Weekly, Bi-Weekly, Monthly, High Priority, Pending, Completed, Overdue, Recurring

### 🔄 Habits Page
- Create **Good Habits** (build) or **Bad Habits** (break)
- Daily 7-dot streak tracker per habit
- Progress bar toward your streak goal (default 21 days)
- Best streak counter
- 8 science-backed tips for **building** good habits
- 8 science-backed tips for **breaking** bad habits
- Daily motivational quote (rotates every day, 30+ quotes)

### 🕌 Prayer Tracker (Dashboard widget)
- 5 daily prayers: Fajr · Dhuhr · Asr · Maghrib · Isha
- 4 columns per prayer: في المسجد · جماعة · على وقتها · قضاء
- Qadaa is mutually exclusive with the other three
- 30-day statistics: completion rate, Masjid count, Jamaa count
- Progress bar + completion indicator

### ◎ SMART Goals
- Full SMART framework: Specific, Measurable, Achievable, Relevant, Time-bound
- Measurable progress tracking (current vs target)
- SMART score (0–5 dots)
- Linked tasks count toward goal progress
- Color themes: Amber · Blue · Green · Purple · Red

### ▦ Analytics
- Total focus time, all-time completions, streak, 30-day average
- Bar charts: Task completions (last 7 days), Focus minutes (last 7 days)
- Completion rate by level (Daily · Weekly · Bi-Weekly · Monthly)

### 👤 Profile
- Custom avatar (upload from device, auto-resized to 200×200)
- Editable display name
- XP system: 10 XP per task, 1 XP per focus minute
- Level progression: Novice → Apprentice → Practitioner → Ace → Master → Grandmaster → Legend
- Milestone badges
- Cumulative stats

### 📆 Monthly Planner
- Full month grid (Mon–Sun rows, all weeks)
- Navigate months with ‹ › buttons
- Today's cell highlighted with amber outline + glowing dot
- **Drag & Drop** tasks between days (double-click or long-press to activate)
- **Touch drag** support on mobile
- Task picker modal with subtask tree and search
- Task chips show priority color, parent name for subtasks

### ⏱ Focus Mode
- Full-screen overlay with large timer
- **Background-safe** — uses wall-clock timestamps, timer keeps running even in hidden tabs
- **Wake Lock** — screen stays on while timer is active
- Page title shows live timer: `⏱ 12:34 — Task Name | NEXUS`
- Progress bar (vs estimated time)
- Topbar mini-timer when overlay is minimized
- Sessions logged to analytics

---

## 🔐 Auth & Security

- **Firebase Email/Password** + **Google Sign-In**
- `auth.setPersistence(LOCAL)` — stay logged in across browser restarts
- **Token revalidation every 3 hours** in the background — auto-logout on revoked sessions
- All data stored per-user in Firestore + localStorage cache
- No ads. No tracking. Your data stays yours.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | Tasks |
| `Ctrl+3` | Habits |
| `Ctrl+4` | Goals |
| `Ctrl+5` | Analytics |
| `Ctrl+6` | Profile |
| `Ctrl+N` | New Task |
| `Ctrl+G` | New Goal |
| `Ctrl+F` | Open Focus |
| `Ctrl+H` | Habits page |
| `Ctrl+/` | Toggle shortcuts panel |
| `ESC` | Close / Minimize |

---

## 📁 File Structure

```
nexus/
│
├── index.html           ← All-in-one deploy file (self-contained)
│
├── css/
│   └── nexus.css        ← All styles (dark/light themes, components, responsive)
│
└── js/
    ├── theme.js         ← Dark/Light theme toggle + persistence
    ├── utils.js         ← Shared helpers: uuid, todayStr, toast, formatters
    ├── db.js            ← Firebase Firestore sync + localStorage cache layer
    ├── auth.js          ← Firebase auth, 3-hour revalidation, friendly errors
    ├── managers.js      ← LM (Log), SM (Streak), NM (Notifications), TM (Tasks), GM (Goals)
    ├── focus.js         ← Focus timer — background-safe, Wake Lock, tab title
    ├── goals_ui.js      ← SMART goal modal + render
    ├── habits.js        ← Daily habits engine (prayers, water, dhikr)
    ├── planner.js       ← Monthly planner grid + drag-and-drop + task picker
    ├── render.js        ← All view renderers: Dashboard, Tasks, Profile, Analytics
    ├── habits_page.js   ← Habits page: HM engine, quotes, tips, stats
    └── app.js           ← Navigation, keyboard shortcuts, midnight tick, boot
```

---

## 🚀 Setup

### Option A — GitHub Pages (Recommended)

1. Fork or clone this repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, root `/`
4. Your site will be live at `https://username.github.io/nexus`

### Option B — Local

Just open `index.html` in any modern browser. No build step required.

### Firebase Configuration

The app uses Firebase for auth and real-time sync. To use your own Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project → Add a Web App
3. Enable **Authentication** → Sign-in methods: **Email/Password** + **Google**
4. Enable **Firestore Database** (production mode)
5. Replace the `firebaseConfig` object in `index.html`:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

6. Add your domain to Firebase → Authentication → Authorized domains

---

## 📸 Screenshots

> *(Add screenshots here)*

| Dashboard | Tasks | Habits |
|-----------|-------|--------|
| ![Dashboard]() | ![Tasks]() | ![Habits]() |

| Monthly Planner | Focus Mode | Goals |
|-----------------|------------|-------|
| ![Planner]() | ![Focus]() | ![Goals]() |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML + CSS + JavaScript (no framework) |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Fonts | Space Mono · Syne (Google Fonts) |
| Persistence | localStorage (offline cache) + Firestore (cloud sync) |
| PWA | Wake Lock API · Notification API · Visibility API |

---

## 🗺️ Roadmap

- [ ] PWA support (installable, offline-first)
- [ ] Pomodoro mode (25/5 intervals)
- [ ] Weekly review report (PDF export)
- [ ] Qibla direction widget
- [ ] Prayer time API integration
- [ ] Multi-language support (Arabic UI)
- [ ] Shared goals / accountability partner

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">

Built with 🔥 discipline and ☕ coffee by **Ahmed Elsayed**

*NEXUS — because systems beat motivation, every time.*

</div>
