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

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.active) return;
  withState((s) => (s.add(tab.id), true)).then(() => notify(tab.id, true));
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  withState((s) => s.delete(tabId)).then((changed) => {
    if (changed) notify(tabId, false);
  });
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
