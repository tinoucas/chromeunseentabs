# Unseen Tabs

A tiny Chromium (Manifest V3) extension: tabs opened in the background (e.g.
middle-click / Ctrl+click on a link, or all but the first tab of a window
opened with several pages at once) get a `● ` in front of their title. The
first time you switch to the tab, the bullet goes away for good.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.
3. For incognito windows too: click **Details** on the extension and turn on
   **Allow in Incognito**.

## How it works

- `background.js` records the id of every new tab, and forgets it once the
  tab has stayed the active tab of its window for 300 ms, or is closed. The
  delay is there because Chrome briefly activates every tab of a window opened
  with several URLs before settling on the first one.
- `content.js` runs at the start of every page load, asks the background
  whether its tab is still unseen, and if so prefixes `document.title`. A
  `MutationObserver` keeps the bullet when the page changes its own title.

## Limitations

- It edits the page title, so it can't work where extensions can't inject
  scripts: `chrome://` pages, the Chrome Web Store, and some built-in viewers.
- The list of unseen tabs is kept for the browser session only; tabs restored
  after a restart start without a bullet.
