export interface HistoryItem {
  id: string | number;
  type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  timestamp: number;
}

const HISTORY_KEY = "cinexp_watch_history";

export function addWatchHistory(item: Omit<HistoryItem, "timestamp">) {
  if (typeof window === "undefined") return;

  try {
    const historyStr = localStorage.getItem(HISTORY_KEY);
    let history: HistoryItem[] = historyStr ? JSON.parse(historyStr) : [];

    // Remove if already exists to push to front
    history = history.filter((h) => h.id !== item.id);

    // Add to front
    history.unshift({ ...item, timestamp: Date.now() });

    // Keep only last 20
    if (history.length > 20) {
      history = history.slice(0, 20);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error("Failed to save history:", err);
  }
}

export function getWatchHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const historyStr = localStorage.getItem(HISTORY_KEY);
    return historyStr ? JSON.parse(historyStr) : [];
  } catch (err) {
    console.error("Failed to parse history:", err);
    return [];
  }
}

export function removeFromWatchHistory(id: string | number) {
  if (typeof window === "undefined") return;

  try {
    const historyStr = localStorage.getItem(HISTORY_KEY);
    let history: HistoryItem[] = historyStr ? JSON.parse(historyStr) : [];
    history = history.filter((h) => String(h.id) !== String(id));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    
    // Dispatch custom event for real-time UI updates
    window.dispatchEvent(new Event("historyUpdated"));
  } catch (err) {
    console.error("Failed to remove from history:", err);
  }
}
