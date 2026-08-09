# Ulam Diary

A simple, mobile-friendly web app that helps you randomly choose a Filipino dish (*ulam*) for the day. Once you accept a dish, it becomes today’s saved ulam and won’t appear in future suggestions.

**Live site:** [https://hollyBelly2021.github.io/ulam-diary/](https://hollyBelly2021.github.io/ulam-diary/)

## Features

- Random ulam generator with reject / accept actions
- Multiple ulam selections for the same day
- Daily selections persisted with `localStorage`
- Accepted dishes are excluded from future suggestions
- Compact previous-ulam diary history (all dishes per date)
- Reset available dish list (with confirmation; history is kept)

## Tech stack

- React
- TypeScript
- Vite
- CSS Modules

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal (usually `http://localhost:5173`).

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start the development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |

## How it works

1. Tap the plate icon, then **Cook at Home** for a random dish (or **Dine Out** for a restaurant).
2. Tap **X** to reject and get another suggestion (same dish won’t repeat in a row when others are available).
3. Tap the **checkmark** to save to **Today’s Table** (or **Restaurant Pick**).
4. Returning on the same day shows your saved choices; a new day lets you choose again.
5. Use **Reset Dish List** to restore all dishes to the random pool without clearing history.

Data is stored only in your browser via `localStorage`.
