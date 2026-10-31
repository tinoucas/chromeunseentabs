// Tracks tabs that were opened in the background and not activated yet.
// The set lives in chrome.storage.session so it survives the service worker
// being suspended (tab ids don't outlive the browser session anyway).

const KEY = 'unseen';

let unseen = null;              // Set<number>, loaded lazily
let queue = Promise.resolve();  // serializes read-modify-write

function withState(fn) {
  const run = queue.then(async () => {
    if (!unseen) {
      const data = await chrome.storage.session.get(KEY);
      unseen = new Set(data[KEY] || []);
    }
    const changed = fn(unseen);
    if (changed) await chrome.storage.session.set({ [KEY]: [...unseen] });
    return changed;
  });
  queue = run.catch(() => {});
  return run;
}

function notify(tabId, isUnseen) {
  chrome.tabs.sendMessage(tabId, { unseen: isUnseen }).catch(() => {
    // No content script there (yet, or ever: chrome:// pages, web store...).
  });
}

// A tab only counts as seen once it has stayed the active tab of its window
// for a moment. When a window is opened with several URLs at once
// (chrome.windows.create({ url: [...] })), Chrome creates every tab as active
// and activates each in turn before settling on the first one: those
// passing activations must not count.
const SEEN_DELAY_MS = 300;
const settling = new Map(); // windowId -> timer of the tab about to be seen

function activated(tabId, windowId) {
  clearTimeout(settling.get(windowId));
  settling.set(windowId, setTimeout(async () => {
    settling.delete(windowId);
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !tab.active) return;
    const changed = await withState((s) => s.delete(tabId));
    if (changed) notify(tabId, false);
  }, SEEN_DELAY_MS));
}

chrome.tabs.onCreated.addListener((tab) => {
  // Track every new tab, active or not: see above.
  withState((s) => (s.add(tab.id), true)).then(() => {
    if (!tab.active) notify(tab.id, true);
  });
  if (tab.active) activated(tab.id, tab.windowId);
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  activated(tabId, windowId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  withState((s) => s.delete(tabId));
});

// Prerendered / instant pages swap the tab for a new one with another id.
chrome.tabs.onReplaced.addListener((addedId, removedId) => {
  withState((s) => {
    if (!s.delete(removedId)) return false;
    s.add(addedId);
    return true;
  }).then((changed) => {
    if (changed) notify(addedId, true);
  });
});

// The content script asks on every page load whether its tab is unseen.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg !== 'isUnseen' || !sender.tab) return;
  const tabId = sender.tab.id;
  withState(() => false).then(() => {
    // A tab that is already active has been seen, whatever the set says.
    sendResponse(unseen.has(tabId) && !sender.tab.active);
  });
  return true; // async response
});
