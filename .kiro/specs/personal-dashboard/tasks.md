# Implementation Plan: Personal Dashboard

## Overview

Build a single-page personal dashboard using plain HTML, CSS, and Vanilla JavaScript. The app is structured as one HTML file, one CSS file, and one JavaScript file. All user data is persisted to `localStorage`. Implementation proceeds widget by widget, wiring everything together at the end.

## Tasks

- [x] 1. Set up HTML structure and base CSS
  - Create the full DOM skeleton in `index.html`: header with app title and settings button, `.dashboard-grid` container, and one `<section>` per widget (`#widget-clock`, `#widget-timer`, `#widget-todos`, `#widget-bookmarks`)
  - Add all required IDs and data attributes referenced by the design: `#clock-time`, `#clock-date`, `#clock-greeting`, `#timer-display`, `#timer-start-btn`, `#timer-stop-btn`, `#timer-reset-btn`, `#todo-input`, `#todo-add-btn`, `#todo-list`, `#bookmark-label-input`, `#bookmark-url-input`, `#bookmark-add-btn`, `#bookmark-list`
  - Link `css/style.css` and `js/script.js` in `index.html` (script at end of `<body>`)
  - In `css/style.css`, define CSS custom properties on `:root`: `--color-bg`, `--color-surface`, `--color-accent`, `--color-text`, `--radius`, `--shadow`
  - Implement the `.dashboard-grid` CSS Grid layout and the single `@media (max-width: 768px)` breakpoint that collapses to one column
  - Add the `.widget` base card style (background, border-radius, padding, box-shadow) and `.widget--hidden { display: none; }`
  - Apply consistent typographic contrast for headings, labels, and body text
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.3_

- [x] 2. Implement the Storage helper and app scaffold in `js/script.js`
  - [x] 2.1 Write the `Storage` helper object with `get(key, fallback)` and `set(key, value)` methods wrapping `localStorage`, including try/catch error handling
    - Implement `showStorageWarning()` as a debounced function that renders a dismissible banner once per session
    - Define the `pd_` key constants: `PD_TODOS`, `PD_BOOKMARKS`, `PD_NOTES`, `PD_WEATHER_CITY`, `PD_WEATHER_UNIT`, `PD_VISIBILITY`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 2.2 Write the `generateId()` utility using `Date.now().toString(36) + Math.random().toString(36).slice(2)`
    - _Requirements: 4.2, 5.2_
  - [x] 2.3 Write the top-level `initAll()` function and wire it to `DOMContentLoaded`; leave widget `init` call stubs in place for subsequent tasks
    - _Requirements: 8.2_

- [x] 3. Implement the Greeting / Clock widget
  - [x] 3.1 Write `initClock()` that calls `tickClock()` immediately and schedules it with `setInterval(tickClock, 1000)`
    - `tickClock()` reads `new Date()`, formats `#clock-time` as HH:MM:SS and `#clock-date` as "Weekday, Month Day"
    - Derive the greeting string from the local hour: 05–11 → "Good morning", 12–17 → "Good afternoon", 18–04 → "Good evening"; write it to `#clock-greeting`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 3.2 Register `initClock()` in `initAll()`
    - _Requirements: 2.1_

- [x] 4. Implement the Focus Timer widget
  - [x] 4.1 Write `initTimer()` with internal state variables (`remaining = 1500`, `intervalId = null`) and `renderTimer()` that formats remaining seconds as MM:SS and updates `#timer-display`
    - _Requirements: 3.1, 3.2_
  - [x] 4.2 Implement `startTimer()`: if not already running, set `setInterval` decrementing `remaining` each second, calling `renderTimer()`, and auto-stopping at 0 with a visual signal (e.g., add a `.timer--done` class or `alert`)
    - _Requirements: 3.2, 3.4, 3.6_
  - [x] 4.3 Implement `stopTimer()`: clear the interval and preserve `remaining`; implement `resetTimer()`: clear the interval and set `remaining = 1500`, then call `renderTimer()`
    - Wire click handlers on `#timer-start-btn`, `#timer-stop-btn`, `#timer-reset-btn`
    - _Requirements: 3.3, 3.5, 3.7_
  - [x] 4.4 Register `initTimer()` in `initAll()`
    - _Requirements: 3.1_

- [x] 5. Checkpoint — verify clock and timer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the To-Do List widget
  - [x] 6.1 Write `initTodos()`: load `pd_todos` from storage (fallback `[]`), call `renderTodos()`
    - `renderTodos(tasks)` clears `#todo-list` and rebuilds it; each `<li>` contains a checkbox (`data-id`, `data-action="toggle"`), a `<label>` or `<span>` for the title (strikethrough when `done`), an edit button (`data-action="edit"`), and a delete button (`data-action="delete"`)
    - _Requirements: 4.1, 4.10_
  - [x] 6.2 Implement `addTodo(title)`: validate `title.trim()` is non-empty, create `{ id, title, done: false }`, push to array, call `Storage.set`, call `renderTodos()`
    - Wire click on `#todo-add-btn` and `keydown` Enter on `#todo-input`; clear the input after adding; do nothing (and clear input) if title is empty
    - _Requirements: 4.2, 4.3_
  - [x] 6.3 Implement `toggleTodo(id)`: flip `done` on the matching task, call `Storage.set`, call `renderTodos()`
    - _Requirements: 4.4, 4.9_
  - [x] 6.4 Implement inline editing: when `data-action="edit"` is clicked, replace the title `<span>` with an `<input>` pre-filled with the current title; on `blur` or Enter, validate the new value — if non-empty save it via `Storage.set` and re-render, otherwise restore the original title
    - _Requirements: 4.5, 4.6, 4.7_
  - [x] 6.5 Implement `deleteTodo(id)`: filter out the task, call `Storage.set`, call `renderTodos()`
    - Wire event delegation on `#todo-list` for toggle, edit, and delete actions using `data-action` and `data-id`
    - _Requirements: 4.8, 4.9_
  - [x] 6.6 Register `initTodos()` in `initAll()`
    - _Requirements: 4.10_

- [x] 7. Implement the Quick Links (Bookmarks) widget
  - [x] 7.1 Write `initBookmarks()`: load `pd_bookmarks` from storage (fallback `[]`), call `renderBookmarks()`
    - `renderBookmarks(bookmarks)` clears `#bookmark-list` and rebuilds it; each `<li>` contains an `<a>` with `target="_blank" rel="noopener noreferrer"` styled as a button/card, and a delete button (`data-id`, `data-action="delete"`)
    - _Requirements: 5.1, 5.4, 5.7_
  - [x] 7.2 Implement `addBookmark(label, url)`: validate both fields are non-empty, create `{ id, label, url }`, push to array, call `Storage.set`, call `renderBookmarks()`
    - Wire click on `#bookmark-add-btn`; do nothing if either field is empty
    - _Requirements: 5.2, 5.3, 5.6_
  - [x] 7.3 Implement `deleteBookmark(id)`: filter out the bookmark, call `Storage.set`, call `renderBookmarks()`
    - Wire event delegation on `#bookmark-list` for delete actions
    - _Requirements: 5.5, 5.6_
  - [x] 7.4 Register `initBookmarks()` in `initAll()`
    - _Requirements: 5.7_

- [x] 8. Checkpoint — verify to-do list and quick links
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Wire everything together and validate full integration
  - [x] 9.1 Confirm `initAll()` calls `initClock()`, `initTimer()`, `initTodos()`, and `initBookmarks()` in order on `DOMContentLoaded`
    - Verify the complete event wiring table from the design: all button clicks, keyboard shortcuts (Enter on inputs), and delegated list events are registered exactly once
    - _Requirements: 1.2, 8.2_
  - [x] 9.2 Validate `localStorage` round-trips for todos and bookmarks: add items, reload the page (or re-call `init`), and confirm items are restored with correct state
    - _Requirements: 4.9, 4.10, 5.6, 5.7, 6.1, 6.4_
  - [x] 9.3 Verify the dashboard opens correctly via `file://` protocol in Chrome, Firefox, Edge, and Safari with no console errors
    - _Requirements: 7.3, 7.4_
  - [x] 9.4 Verify responsive layout: confirm the grid collapses to a single column at ≤ 768px viewport width and no horizontal scrolling occurs
    - _Requirements: 1.3, 1.4_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP (none in this plan, as NFR-1 specifies no test setup required)
- Each task references specific requirements for traceability
- The design document's Correctness Properties are informational; no automated property-based test framework is set up per NFR-1
- All persistence uses the `pd_` key prefix to avoid collisions
- No inline styles in HTML; no `!important` in CSS

## Feature Enhancements

### 1. Light/Dark Mode
- Add toggle button
- Implement theme switching with Tailwind
- Save preference to localStorage

### 2. Custom Name Greeting
- Add input for user name
- Store name in localStorage
- Display dynamic greeting

### 3. Pomodoro Custom Time
- Add input or modal for time setting
- Update timer dynamically
- Save to localStorage