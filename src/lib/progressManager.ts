export interface WatchProgressInfo {
  provider: string; // 'vidfast' | 'vidlink'
  season: number;
  episode: number;
  time: number;
  duration: number;
  lastUpdated: number;
}

export function saveInternalProgress(
  tmdbId: string,
  type: 'movie' | 'tv',
  provider: string,
  season: number,
  episode: number
) {
  if (typeof window === 'undefined') return;
  try {
    const historyStr = window.localStorage.getItem('cinexpHistory') || '{}';
    const history = JSON.parse(historyStr);
    const key = `${type === 'tv' ? 't' : 'm'}${tmdbId}`;
    
    history[key] = {
      provider,
      season,
      episode,
      last_updated: Date.now()
    };

    window.localStorage.setItem('cinexpHistory', JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save internal progress', e);
  }
}

export function getInitialSync(tmdbId: string, type: 'movie' | 'tv'): WatchProgressInfo | null {
  if (typeof window === 'undefined') return null;

  let bestProgress: WatchProgressInfo | null = null;

  // 0. Check Internal History (priority for provider/episode selection)
  try {
    const historyStr = window.localStorage.getItem('cinexpHistory');
    if (historyStr) {
      const history = JSON.parse(historyStr);
      const key = `${type === 'tv' ? 't' : 'm'}${tmdbId}`;
      const item = history[key];
      if (item) {
        bestProgress = {
          provider: item.provider,
          season: item.season || 1,
          episode: item.episode || 1,
          time: 0, // Time is handled by provider-specific storage below
          duration: 0,
          lastUpdated: item.last_updated || 0
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse cinexpHistory', e);
  }
  
  // 1. Check Vidlink
  try {
    const vlStr = window.localStorage.getItem('vidLinkProgress');
    if (vlStr) {
      const vlData = JSON.parse(vlStr);
      const parsedId = tmdbId.toString();
      const item = vlData[parsedId];
      if (item && item.type === type) {
        let pTime = 0, pDuration = 0, pSeason = 1, pEpisode = 1;
        
        let lastUpdated = item.last_updated || 0;

        if (type === 'tv') {
          pSeason = parseInt(item.last_season_watched || '1', 10);
          pEpisode = parseInt(item.last_episode_watched || '1', 10);
          const epKey = `s${pSeason}e${pEpisode}`;
          const epData = item.show_progress?.[epKey];
          if (epData && epData.progress) {
            pTime = epData.progress.watched || 0;
            pDuration = epData.progress.duration || 0;
            // Vidlink didn't document last_updated for TV episodes, so we take root if available
            lastUpdated = epData.last_updated || lastUpdated;
          }
        } else {
          pTime = item.progress?.watched || 0;
          pDuration = item.progress?.duration || 0;
        }

        bestProgress = {
          provider: 'vidlink',
          season: pSeason,
          episode: pEpisode,
          time: pTime,
          duration: pDuration,
          lastUpdated: lastUpdated
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse vidLinkProgress', e);
  }

  // 2. Check Vidfast
  try {
    const vfStr = window.localStorage.getItem('vidFastProgress');
    if (vfStr) {
      const vfData = JSON.parse(vfStr);
      const prefix = type === 'movie' ? 'm' : 't';
      const parsedId = `${prefix}${tmdbId}`;
      const item = vfData[parsedId];
      
      if (item && item.type === type) {
        let pTime = 0, pDuration = 0, pSeason = 1, pEpisode = 1;
        let lastUpdated = item.last_updated || 0;

        if (type === 'tv') {
          pSeason = parseInt(item.last_season_watched || '1', 10);
          pEpisode = parseInt(item.last_episode_watched || '1', 10);
          const epKey = `s${pSeason}e${pEpisode}`;
          const epData = item.show_progress?.[epKey];
          if (epData && epData.progress) {
            pTime = epData.progress.watched || 0;
            pDuration = epData.progress.duration || 0;
            lastUpdated = epData.last_updated || lastUpdated;
          }
        } else {
          pTime = item.progress?.watched || 0;
          pDuration = item.progress?.duration || 0;
        }

        // If Vidfast is newer or no previous best
        if (!bestProgress || lastUpdated > bestProgress.lastUpdated) {
          bestProgress = {
            provider: 'vidfast',
            season: pSeason,
            episode: pEpisode,
            time: pTime,
            duration: pDuration,
            lastUpdated: lastUpdated
          };
        } else if (bestProgress.provider === 'vidfast') {
          // Update time for the current best if it's vidfast
          bestProgress.time = pTime;
          bestProgress.duration = pDuration;
        }
      }
    }
  } catch (e) {
     console.error('Failed to parse vidFastProgress', e);
  }

  // Final check for time if the best provider was from internal history or Vidlink
  if (bestProgress && bestProgress.time === 0) {
    bestProgress.time = getStartTimeFor(tmdbId, type, bestProgress.provider, bestProgress.season, bestProgress.episode);
  }

  return bestProgress;
}

export function getStartTimeFor(
  tmdbId: string, 
  type: 'movie' | 'tv', 
  provider: string, 
  season: number, 
  episode: number
): number {
  if (typeof window === 'undefined') return 0;
  
  if (provider === 'vidlink') {
    try {
      const vlStr = window.localStorage.getItem('vidLinkProgress');
      if (vlStr) {
        const item = JSON.parse(vlStr)[tmdbId.toString()];
        if (item) {
          if (type === 'tv') {
             const epKey = `s${season}e${episode}`;
             if (item.show_progress?.[epKey]?.progress) {
                return item.show_progress[epKey].progress.watched || 0;
             }
          } else {
             if (item.progress) return item.progress.watched || 0;
          }
        }
      }
    } catch {}
  } else if (provider === 'vidfast') {
    try {
      const prefix = type === 'movie' ? 'm' : 't';
      const parsedId = `${prefix}${tmdbId}`;
      const vfStr = window.localStorage.getItem('vidFastProgress');
      if (vfStr) {
        const item = JSON.parse(vfStr)[parsedId];
        if (item) {
          if (type === 'tv') {
             const epKey = `s${season}e${episode}`;
             if (item.show_progress?.[epKey]?.progress) {
                return item.show_progress[epKey].progress.watched || 0;
             }
          } else {
             if (item.progress) return item.progress.watched || 0;
          }
        }
      }
    } catch {}
  }
  return 0;
}

export function cleanupProgressCache() {
  if (typeof window === 'undefined') return;

  const MAX_ITEMS = 60; // Keep local storage lightweight

  const cleanFor = (key: string) => {
    try {
      const str = window.localStorage.getItem(key);
      if (!str) return;
      const data = JSON.parse(str);
      const keys = Object.keys(data);
      if (keys.length > MAX_ITEMS) {
        // Sort by last_updated descending
        const sorted = keys.map(k => ({ key: k, last_updated: data[k].last_updated || 0 }))
                           .sort((a, b) => b.last_updated - a.last_updated);
        
        // Remove older items
        const toRemove = sorted.slice(MAX_ITEMS);
        for (const item of toRemove) {
          delete data[item.key];
        }
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      console.error(`Failed to clean ${key}`, e);
    }
  };

  cleanFor('vidLinkProgress');
  cleanFor('vidFastProgress');
  cleanFor('cinexpHistory');
}
