import {readCurrentUserLocalStorage, readLocalStorage} from './storage_utils.js';

const STATS_KEYS = ['total', 'cached', 'fetched', 'remains', 'lastrequesttimems'];

export async function updateStatsValue(key, value) {
    const user = await readCurrentUserLocalStorage();
    if (!user) {
        return null;
    }
    const statsCacheKey = `OFStats_${user.id}_${key}`;
    await chrome.storage.local.set({
      [statsCacheKey]: value
    });

    await renderStats();
}

export async function incrStatsValue(key) {
    let currentValue = await getStatsValue(key) || 0;

    await updateStatsValue(key, (currentValue + 1));
}

export async function decrStatsValue(key) {
    let currentValue = await getStatsValue(key) || 0;

    await updateStatsValue(key, (currentValue - 1));
}

export async function getStatsValue(key) {
    const user = await readCurrentUserLocalStorage();
    if (!user) {
        return null;
    }
    const statsCacheKey = `OFStats_${user.id}_${key}`;
    return await readLocalStorage(statsCacheKey);
}

export async function flushStats() {
    STATS_KEYS.forEach(async function (statsKey) {
        await updateStatsValue(statsKey, null);
    });
}

export async function renderStats(){
    const keyToElementId = {
        'total': 'statsTotalChatsCount',
        'cached': 'statsCachedChatsCount',
        'fetched': 'statsFetchedChatsCount',
        'remains': 'statsRemainChatsCount',
        'lastrequesttimems': 'statsLastRequestTimeMs',
    };
    STATS_KEYS.forEach(async function(statsKey){
        const statsValue = await getStatsValue(statsKey);
        const elementId = keyToElementId[statsKey];
        let displayValue = '---';
        if (statsValue !== null) {
            displayValue = statsValue;
        }
        document.getElementById(elementId).innerHTML = displayValue;
    });
}