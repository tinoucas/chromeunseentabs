# Unseen Tabs

A tiny Chromium (Manifest V3) extension: tabs opened in the background (e.g.
middle-click / Ctrl+click on a link, or all but the first tab of a window
opened with several pages at once) get a `● ` (`⏺︎ ` on macOS) in front of
their title. The first time you switch to the tab, the bullet goes away for
good.

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
- Tab titles are drawn in the OS's UI font, which lacks these characters, so
  their size comes from whichever font the OS falls back to. That's why macOS
  uses `⏺︎` (U+23FA + U+FE0E for text presentation): its `●` is much bigger
  than Linux's. Even between Linux machines it varies with the installed
  fonts: see below.
- The list of unseen tabs is kept for the browser session only; tabs restored
  after a restart start without a bullet.

## Tip: bullet too big on Linux

On Linux, `●` comes from the first fallback font that has it. Verdana's `●`
matches the text size, but DejaVu Sans's is much bigger, and Arch's default
fallback order (`/etc/fonts/conf.d/60-latin.conf`) tries DejaVu Sans before
Verdana. Check which one you get:

```bash
fc-match 'sans-serif:charset=25cf'
```

If it says DejaVu Sans:

1. Install Verdana (on Arch: `ttf-ms-fonts`, or one of the `ttf-ms-win*`
   packages, from the AUR).
2. Have Verdana tried right before DejaVu Sans. This has to be a system rule
   numbered after `60-latin.conf` (the user config is read before it):

   ```bash
   sudo tee /etc/fonts/conf.d/61-verdana-before-dejavu.conf >/dev/null <<'EOF'
   <?xml version="1.0"?>
   <!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
   <fontconfig>
     <!-- Try Verdana right before DejaVu Sans when falling back (e.g. for ●),
          keeping the main UI font first. Runs after 60-latin.conf. -->
     <match target="pattern">
       <test name="family"><string>DejaVu Sans</string></test>
       <edit name="family" mode="prepend"><string>Verdana</string></edit>
     </match>
   </fontconfig>
   EOF
   ```

3. Run `fc-match 'sans-serif:charset=25cf'` again (it should say Verdana),
   then quit and restart the browser.

The main UI font is unchanged; Verdana is only tried before DejaVu Sans for
characters the main font lacks. To undo, delete
`/etc/fonts/conf.d/61-verdana-before-dejavu.conf`.
