# Unseen Tabs

A tiny Chromium (Manifest V3) extension: tabs opened in the background (e.g.
middle-click / Ctrl+click on a link) get a `● ` in front of their title. The
first time you switch to the tab, the bullet goes away for good.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.

## How it works

- `background.js` records the id of every tab created without being active,
  and forgets it when the tab is activated, closed or replaced.
- `content.js` runs at the start of every page load, asks the background
  whether its tab is still unseen, and if so prefixes `document.title`. A
  `MutationObserver` keeps the bullet when the page changes its own title.

## Limitations

- It edits the page title, so it can't work where extensions can't inject
  scripts: `chrome://` pages, the Chrome Web Store, and some built-in viewers.
- The list of unseen tabs is kept for the browser session only; tabs restored
  after a restart start without a bullet.
