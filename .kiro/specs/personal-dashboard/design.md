# Design Document

## Overview

The personal dashboard is a single-page web application built with plain HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser with no build step, no framework, and no backend. All state is persisted to `localStorage`. The app is structured as one HTML file, one CSS file, and one JavaScript file, keeping the codebase minimal and easy to follow.

---

## Architecture

### High-Level Structure

```
index.html          ← Shell: DOM structure, widget containers, settings panel
css/style.css       ← All visual styling, layout, themes, responsive rules
js/script.js        ← All logic: widget modules, storage helpers, event wiring
```

The JavaScript file is organized into clearly separated sections:

1. **Config** — key names, defaults, API endpoint template
2. **Storage helpers** — thin wrappers around `localStorage` (get/set/remove)
3. **Widget modules** — one self-contained section per widget (init, render, event handlers)
4. **Settings module** — visibility toggles, persistence
5. **App init** — calls each widget's `init()` on `DOMContentLoaded`

No module bundler is used. All code lives in a single IIFE or top-level scope with clear section comments.

---

## Data Models

All data is stored in `localStorage` as JSON strings. Keys use the `pd_` prefix.

### Key Registry

| Key | Type | Description |
|---|---|---|
| `pd_todos` | `Task[]` | Array of task objects |
| `pd_bookmarks` | `Bookmark[]` | Array of bookmark objects |
| `pd_notes` | `string` | Raw note text |
| `pd_weather_city` | `string` | Last searched city name |
| `pd_weather_unit` | `"C" \| "F"` | Temperature unit preference |
| `pd_visibility` | `VisibilityMap` | Widget show/hide state |

### Type Definitions

```js
// Task
{ id: string, title: string, done: boolean }

// Bookmark
{ id: string, label: string, url: string }

// VisibilityMap
{ clock: boolean, todos: boolean, bookmarks: boolean, notes: boolean, weather: boolean }
```

IDs are generated with `Date.now().toString(36) + Math.random().toString(36).slice(2)` — no external library needed.

---

## Component Design

### Clock Widget

**DOM:** `#widget-clock` containing `#clock-time` (HH:MM:SS) and `#clock-date` (e.g., "Monday, January 1").

**Logic:**
- `initClock()` calls `tickClock()` immediately, then schedules it with `setInterval(tickClock, 1000)`.
- `tickClock()` reads `new Date()`, formats time and date strings, and sets `textContent` on both elements.
- No storage interaction — clock is always live.

---

### To-Do List Widget

**DOM:** `#widget-todos` containing:
- `#todo-input` (text input) + `#todo-add-btn` (button)
- `#todo-list` (unordered list) — each `<li>` has a checkbox, label, and delete button

**Logic:**
- `initTodos()` loads from storage, calls `renderTodos()`.
- `renderTodos(tasks)` clears `#todo-list` and rebuilds it from the tasks array.
- `addTodo(title)` creates a new Task object, pushes to array, saves, re-renders.
- `toggleTodo(id)` flips `done` on the matching task, saves, re-renders.
- `deleteTodo(id)` filters out the task, saves, re-renders.
- Event delegation on `#todo-list` handles toggle and delete clicks by reading `data-id` attributes.
- Input validation: `title.trim()` must be non-empty before `addTodo` is called.

---

### Bookmarks Widget

**DOM:** `#widget-bookmarks` containing:
- `#bookmark-label-input` + `#bookmark-url-input` + `#bookmark-add-btn`
- `#bookmark-list` (unordered list) — each `<li>` has an `<a>` link and a delete button

**Logic:**
- `initBookmarks()` loads from storage, calls `renderBookmarks()`.
- `renderBookmarks(bookmarks)` rebuilds the list. Each `<a>` has `target="_blank" rel="noopener noreferrer"`.
- `addBookmark(label, url)` validates both fields are non-empty, creates a Bookmark object, saves, re-renders.
- `deleteBookmark(id)` filters out the bookmark, saves, re-renders.
- Event delegation on `#bookmark-list` handles delete clicks.

---

### Notes Widget

**DOM:** `#widget-notes` containing `#notes-textarea` (a `<textarea>`).

**Logic:**
- `initNotes()` loads saved text from storage, sets `textarea.value`.
- An `input` event listener on `#notes-textarea` calls `saveNotes()` debounced at 800ms.
- `saveNotes()` writes `textarea.value` to `pd_notes` in storage.
- If no saved value exists, `textarea` shows a `placeholder` attribute set in HTML.

---

### Weather Widget

**DOM:** `#widget-weather` containing:
- `#weather-city-input` + `#weather-search-btn`
- `#weather-unit-toggle` (button cycling C/F)
- `#weather-display` (div showing city, temperature, condition, or error message)

**Logic:**
- `initWeather()` loads saved city and unit from storage. If a city exists, calls `fetchWeather(city)`.
- `fetchWeather(city)` calls the Open-Meteo geocoding API to resolve city → coordinates, then calls the Open-Meteo forecast API for current weather. Both APIs are free and require no API key.
- On success: stores the raw temperature (Celsius) and condition code internally, calls `renderWeather()`.
- `renderWeather()` converts temperature to the selected unit and maps the WMO condition code to a human-readable string, then updates `#weather-display`.
- On failure: displays a descriptive error message in `#weather-display` without clearing previously rendered data.
- `toggleUnit()` flips the unit between `"C"` and `"F"`, saves to storage, calls `renderWeather()`.

**API Endpoints (no key required):**
```
Geocoding: https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1
Forecast:  https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true
```

---

### Settings Panel

**DOM:** `#settings-btn` (gear icon button in header) toggles `#settings-panel` (a side drawer or modal).

Inside `#settings-panel`:
- One `<label>` + `<input type="checkbox">` per widget, each with a `data-widget` attribute.

**Logic:**
- `initSettings()` loads `pd_visibility` from storage (defaults all to `true`).
- Applies visibility by toggling a `.widget--hidden` CSS class on each `#widget-*` element.
- Each checkbox `change` event calls `setWidgetVisibility(widgetKey, checked)`, which updates the map, saves to storage, and toggles the CSS class.

---

## UI Layout

### Page Structure

```
┌─────────────────────────────────────────────┐
│  Header: App title            [⚙ Settings]  │
├──────────────┬──────────────┬────────────────┤
│   Clock      │   Weather    │   Bookmarks    │
├──────────────┴──────────────┤                │
│         To-Do List          │                │
├─────────────────────────────┤                │
│           Notes             │                │
└─────────────────────────────┴────────────────┘
```

Layout is implemented with CSS Grid on a `.dashboard-grid` container. On narrow viewports (< 768px) the grid collapses to a single column.

### CSS Architecture

- **Variables** (`--color-bg`, `--color-surface`, `--color-accent`, `--color-text`, `--radius`, `--shadow`) defined on `:root` for easy theming.
- **Widget card** base style: `.widget` class with background, border-radius, padding, and box-shadow.
- **Hidden state**: `.widget--hidden { display: none; }` — toggled by JS.
- **Responsive**: single `@media (max-width: 768px)` breakpoint switches grid to 1 column.
- No inline styles in HTML. No `!important` declarations.

---

## Storage Helper Design

```js
const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      showStorageWarning();
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      showStorageWarning();
    }
  }
};
```

`showStorageWarning()` renders a dismissible banner at the top of the page. It is debounced so it only appears once per session.

---

## Event Wiring Summary

| Event | Target | Handler |
|---|---|---|
| `DOMContentLoaded` | `document` | `initAll()` — calls each widget's `init` |
| `click` | `#todo-add-btn` | `addTodo` |
| `keydown` (Enter) | `#todo-input` | `addTodo` |
| `click` (delegated) | `#todo-list` | `toggleTodo` / `deleteTodo` |
| `click` | `#bookmark-add-btn` | `addBookmark` |
| `click` (delegated) | `#bookmark-list` | `deleteBookmark` |
| `input` (debounced) | `#notes-textarea` | `saveNotes` |
| `click` | `#weather-search-btn` | `fetchWeather` |
| `keydown` (Enter) | `#weather-city-input` | `fetchWeather` |
| `click` | `#weather-unit-toggle` | `toggleUnit` |
| `click` | `#settings-btn` | toggle `#settings-panel` |
| `change` (delegated) | `#settings-panel` | `setWidgetVisibility` |

---

## Correctness Properties

### Clock
- **Invariant**: The displayed time always equals `new Date()` formatted to HH:MM:SS, sampled within the current 1-second tick interval.

### To-Do List
- **Round-trip**: `JSON.parse(JSON.stringify(tasks))` produces an array structurally equal to the original (all fields preserved).
- **Invariant**: After any add/toggle/delete operation, `localStorage.getItem('pd_todos')` reflects the current in-memory task array.
- **Metamorphic**: Deleting a Task reduces the task array length by exactly 1.
- **Idempotence**: Calling `renderTodos(tasks)` twice with the same array produces identical DOM output.

### Bookmarks
- **Round-trip**: Serializing and deserializing the bookmarks array preserves all `id`, `label`, and `url` fields.
- **Invariant**: Every rendered `<a>` element has `target="_blank"` and `rel="noopener noreferrer"`.

### Notes
- **Round-trip**: Text entered in the textarea, saved to storage, and restored on reload equals the original input string.
- **Idempotence**: Saving the same note content twice results in the same stored value.

### Weather
- **Invariant**: When unit is `"F"`, displayed temperature equals `Math.round(storedCelsius * 9/5 + 32)`.
- **Error condition**: When the geocoding API returns zero results, the widget displays an error message and does not attempt a forecast fetch.

### Settings
- **Round-trip**: Saving visibility state to storage and reloading the page produces the same widget visibility configuration.
- **Invariant**: A widget with visibility `false` in storage always has the `.widget--hidden` class applied on load.

### Storage Helper
- **Error condition**: When `localStorage.setItem` throws (e.g., quota exceeded), `showStorageWarning()` is called and the in-memory state is not corrupted.
