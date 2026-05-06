import https from 'https';

const DEADLOCK_APP_ID = 1422450;

export const patchState = {
  version: '1.5',
  source: 'default',   // 'default' | 'steam' | 'manual'
  updatedAt: null,
  lastChecked: null,
};

function fetchSteamPatch() {
  return new Promise(resolve => {
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${DEADLOCK_APP_ID}&count=20&maxlength=400`;
    https.get(url, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const items = JSON.parse(data)?.appnews?.newsitems ?? [];
          for (const item of items) {
            const m = item.title.match(/(?:update|patch|hotfix)\s+([\d]+\.[\d]+(?:\.[\d]+)?)/i);
            if (m) return resolve(m[1]);
          }
        } catch {}
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });
}

export async function refreshPatch() {
  patchState.lastChecked = new Date().toISOString();
  const v = await fetchSteamPatch();
  if (v && patchState.source !== 'manual') {
    if (v !== patchState.version) {
      console.log(`✓ Patch auto-updated to ${v} (Steam)`);
    }
    patchState.version = v;
    patchState.source = 'steam';
    patchState.updatedAt = new Date().toISOString();
  }
}

// Initial check + hourly refresh
refreshPatch();
setInterval(refreshPatch, 60 * 60 * 1000);
