# Working on this repo

- Commit and push directly to `main`. No feature branches or pull requests
  needed.
- This is an unpacked Chromium MV3 extension (Helium is the target browser).
  There is no build step; these files are loaded as-is:
  - `manifest.json`: only the `storage` permission; keep it that way (no
    `tabs` or host permissions) unless a feature really needs more
  - `background.js`: service worker that tracks unseen tabs in
    `chrome.storage.session` and tells the content script when one gets
    seen. Every new tab starts unseen (even if created active), and becomes
    seen once it has stayed active in its window for `SEEN_DELAY_MS`:
    `chrome.windows.create({ url: [...] })` creates all tabs active and
    activates each in turn before going back to the first, so plain
    `tabs.onActivated` / `tab.active` can't tell seen tabs apart
  - `content.js`: runs at `document_start` in the top frame of every page,
    asks the background whether its tab is unseen, and prefixes
    `document.title` with `● ` (a `MutationObserver` keeps the prefix when the
    page changes its title)
  - `icon.svg`: source of the extension icon; `icons/*.png` are rendered from
    it at 16/32/48/128 px (Playwright screenshot with a transparent
    background); re-render them whenever the SVG changes
- Test with the pre-installed Playwright Chromium by loading the extension with
  `--disable-extensions-except` / `--load-extension` in a persistent context
  (`headless: false` plus `--headless=new`, or the service worker never
  starts), and drive tabs through the service worker (`chrome.tabs.*`). Tab
  titles can't be read without the `tabs` permission, so test against a
  scratch copy of the extension with `tabs` added to the manifest. Serve test
  pages from a local HTTP server: content scripts don't run on `data:` URLs.
