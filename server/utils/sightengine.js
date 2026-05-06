import axios from 'axios';
import { track, trackError } from './apiTracker.js';

export async function checkText(text) {
  const USER = process.env.SIGHTENGINE_USER;
  const KEY  = process.env.SIGHTENGINE_SECRET;
  if (!text || !USER || !KEY) return { clean: true, matches: [] };

  try {
    track('sightengine');
    const { data } = await axios.get('https://api.sightengine.com/1.0/text/check.json', {
      params: { text, lang: 'en', mode: 'standard', api_user: USER, api_secret: KEY },
      timeout: 5000,
    });
    const matches = data?.profanity?.matches ?? [];
    return { clean: matches.length === 0, matches };
  } catch {
    trackError('sightengine');
    return { clean: true, matches: [] };
  }
}
