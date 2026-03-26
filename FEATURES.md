# Meal Roulette — What It Does & Features

Meal Roulette is a **nutrition-focused meal discovery app** that suggests recipes based on your macro targets and preferences, then lets you log what you make and track daily progress. Think “spin the wheel, get a recipe, hit your macros.”

---

## What the App Does

1. **You set your nutrition goals** — protein, carbs, fat, calorie cap, max cook time, and preferred ingredients (proteins, vegetables, carbs, fats).
2. **You spin the roulette** — the app uses an AI/LLM (Groq or Hugging Face) to generate a single recipe that fits those preferences.
3. **You see one recipe at a time** — full details (ingredients, steps, macros, optional video), with options to re-spin, substitute ingredients, and mark steps/ingredients done.
4. **When you make it, you log it** — “Made It ✓” saves the meal to today’s log and updates your macro progress.
5. **You can review history** — past logged meals and a daily streak are available in a side panel.

Everything runs in the browser; preferences and logs are stored locally (localStorage / IndexedDB). No account required.

---

## Features (Overview)

| Feature | Description |
|--------|--------------|
| **Hero & onboarding** | Full-screen landing with “Start Cooking”; first visit shows hero, then main app. |
| **Preferences (macro & diet)** | Set protein, carbs, fat (g), calorie cap, max cook time (15–60+ min), and preferred ingredients by category. Persisted to IndexedDB. |
| **Pull cord / Edit Preferences** | Decorative pull cord (or header button) opens/closes the preferences panel with a roll-down animation. |
| **Roulette spin** | One “Spin it” (or similar) CTA; slot-machine animation runs while the app fetches one AI-generated recipe. |
| **Recipe reveal** | After spin, a single recipe card appears with name, cuisine, cook time, macros (animated counters), description, ingredients, and steps. |
| **Ingredient substitution** | “?” next to each ingredient opens a popover; Groq suggests a substitute and reason; “Use this” replaces the ingredient in the card. |
| **Checkboxes** | Ingredients and steps can be checked off as you cook (local state only). |
| **YouTube thumbnail** | When a recipe has a video ID, a thumbnail and link are shown. |
| **Made It ✓** | Logs the recipe to today’s macro log, updates the macro bar, and can show a short success animation. |
| **Re-spin** | “Not feeling it?” lets you spin again for a new recipe (avoiding the last few made recipes when possible). |
| **Macro tracker bar** | Sticky bottom bar: collapsed view shows today’s macro totals vs targets; expand to see progress bars and list of logged meals. |
| **Meal history panel** | Slide-in panel (e.g. from header) lists all logged meals from localStorage, grouped by date, with optional streak. |
| **Daily streak** | Consecutive calendar days with at least one logged meal; shown in header (e.g. when ≥ 3) and in history/tracker. |
| **Design system** | Graph-paper background, Kalam/Caveat fonts, food-named palette (Chili, Herb, Ink, Paper, etc.), offset shadows, notebook lines on preference/history views, annotation-style callouts. |

---

## Feature Details

### Preferences

- **Macro targets:** Protein, carbs, fat in grams; calorie cap. Sliders + quantity-style inputs.
- **Cook time:** Pills (e.g. 15 min, 30 min, 45 min, 1 hr+). “1 hr+” means no max.
- **Preferred ingredients:** Multi-select by category — Proteins, Vegetables, Carbs, Fats. Used to bias AI-generated recipes.
- **Persistence:** Stored in Zustand and synced to IndexedDB; loaded on app init.
- **UI:** Form lives in a roll-down panel; no separate “Update” button — opening/closing (and optional save on close) applies.

### Roulette & recipe generation

- **Flow:** User clicks spin → slot machine animates → app calls recommendation service to get one recipe from the LLM (Groq or Hugging Face) using current preferences and “avoid recent” names.
- **Fallback:** If no API key, the app can show mock recipes so the UI still works offline.
- **Single recipe:** One recipe per spin; no deck or swipe in this flow (other code may support decks elsewhere).

### Recipe result card

- **Content:** Title, cuisine badge, cook time, description, macro pills (with animated count-up), ingredients list, numbered steps, optional YouTube block, Re-spin and Made It actions.
- **Interactions:**  
  - Ingredient “?” → SubstitutionPopover (Groq suggestion, “Use this” to replace).  
  - Checkboxes on ingredients and steps (visual only, not persisted).  
  - “Made It ✓” → append meal to today’s macro log, notify macro bar, optional confetti/success animation.  
  - “Re-spin” → trigger new spin.

### Macro tracker bar

- **Collapsed:** One row with today’s totals (e.g. P / C / F / Cal) vs targets and a chevron to expand.
- **Expanded:** Progress bars per macro, streak line, and a list of “Meals today” from the macro log.
- **Data:** Reads/writes `macro-log-YYYY-MM-DD` in localStorage; bar gets updated via ref (e.g. `addMeal(meal)` when user hits Made It).

### History panel

- **Trigger:** Header button (e.g. “History” or icon) opens a slide-in panel from the right.
- **Content:** All `macro-log-*` entries grouped by date (newest first); each day shows logged meal names, time, and macro pills; optional streak display; empty state when no logs.
- **Data:** Same localStorage keys as macro tracker; read-only in this panel.

### Streak

- **Rule:** Consecutive calendar days with at least one logged meal (today or backward from yesterday).
- **Display:** In header when streak ≥ 3 (e.g. “🔥 5”); also in expanded macro bar and history panel.
- **Implementation:** `calculateStreak()` in `streakUtils`; uses `macro-log-*` keys.

### Ingredient substitution (Groq)

- **Trigger:** “?” button next to an ingredient in the recipe card.
- **Behavior:** Popover calls a substitution API (Groq-backed) with recipe name and ingredient; shows suggested substitute and short reason; “Use this” replaces the ingredient in the card and closes the popover.
- **Optional:** Sound or subtle animation on open/close.

### Pull cord

- **Role:** Alternate way to open/close the preferences panel (in addition to “Edit Preferences” in the header).
- **Behavior:** SVG cord with drag/tug or click; when “pulled” past a threshold (or clicked), toggles the panel; optional click sound and MorphSVG-style or path-swap animation.
- **State:** Cord or bead can reflect open/closed (e.g. brighter when preferences are open).

### Design & UX

- **Visual identity:** Graph paper background (#f7f2e8 / #c9dce8 grid), Kalam (headings) and Caveat (body), food-named colors (Chili, Herb, Saffron, Turmeric, Miso, Ink, Paper, etc.).
- **No box-shadow:** Offset “shadow” via `::before` pseudo-elements.
- **No border-radius** on cards, buttons, tags, inputs (squared, sketchbook look).
- **Slight rotation** on cards and buttons (e.g. 0.9° or -1.2°).
- **Notebook lines + red margin** on preference form and history content.
- **Annotation style:** Caveat italic callouts with “←” (e.g. “← tap ? for substitutes”) on recipe details.

---

## Data & Tech (Brief)

- **Preferences:** Zustand store + IndexedDB (e.g. `preferencesCache`).
- **Macro log:** localStorage keys `macro-log-YYYY-MM-DD`; each value is `{ date, meals: LoggedMeal[] }`.
- **Recipe generation:** LLM via Groq or Hugging Face using prompts that include macro targets, cook time, and preferred ingredients.
- **Substitution:** Groq (or similar) API returning substitute + reason.
- **Animations:** GSAP (entrance, panel open/close, slot machine, recipe reveal, macro bar expand, pull cord).
- **Tests:** Vitest + React Testing Library on the frontend; Jest on services; no behavior changed by the design-only pass.

---

## Summary

Meal Roulette helps you **choose what to cook** by spinning for one AI-generated recipe that fits your macros and preferences, **substitute ingredients** with AI suggestions, **log what you made** to see daily macro progress, and **review history and streaks** — all with a hand-drawn, notebook-style UI and no backend account.
