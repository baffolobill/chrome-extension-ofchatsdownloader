const desiredCookies = ['auth_id', 'sess'];

/**
 * Get the correct bcToken from storage
 */
async function getBcTokenSha(id)
{
    return new Promise((resolve) => {
        chrome.storage.local.get(['bcTokens'], function(data) {
            const bcTokens = data.bcTokens || {};

            if (bcTokens[id]) {
                resolve(bcTokens[id]);
                return;
            }

            resolve(null);
        });
    });
}

async function getMappedCookies(cookieStoreId) {
    /**
     * Grab the cookies from the browser...
     */
    const cookieOpts = {
        domain: '.onlyfans.com',
    };

    /**
     * Container tabs
     */
    if (cookieStoreId) {
        cookieOpts.storeId = cookieStoreId;
    }

    const cookies = await chrome.cookies.getAll(cookieOpts);
    console.info('All Cookies: ', cookies);

    /**
     * We only care about `name` and `value` in each cookie entry.
     */
    const mappedCookies = {};
    for (const cookie of cookies)
    {
        mappedCookies[cookie.name] = cookie.value;
    }

    return mappedCookies;
}


export async function getAuthConfig(cookieStoreId) {
    const mappedCookies = await getMappedCookies(cookieStoreId);
    console.info('mappedCookies:', mappedCookies);
    /**
     * If authId isn't specified, user is not logged into OnlyFans... or at least we assume so.
     */
    if (!mappedCookies['auth_id'] || !mappedCookies['sess']) {
        // showErrorMessage(cookieStoreId, true);
        alert('Could not find valid cookie values, make sure you are logged into OnlyFans.');
        return null;
    }

    // See `background/background.js` as to why we use `st` here
    const st = mappedCookies['st'];
    const bcToken = await getBcTokenSha(st);
    console.info(`bcToken: ${bcToken} for st: ${st}`);

    if (!bcToken) {
        alert('Could not find valid x_bc value. Please open OnlyFans.com once and make sure it fully loads. If you are not logged in, please log in and refresh the page.');
        return null;
    }

    return {
        USER_ID: mappedCookies['auth_id'],
        USER_AGENT: navigator.userAgent,
        X_BC: bcToken,
        COOKIE: Object.keys(mappedCookies)
            .filter((key) => desiredCookies.includes(key))
            .map((key) => `${key}=${mappedCookies[key]};`)
            .join(' '),
    };
}


export async function getCookieStore(){
    return chrome.cookies.getAllCookieStores()
        .then( async cookieStores => {
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            const storeId = cookieStores?.find( cookieStore => cookieStore?.tabIds?.indexOf(tab?.id) !== -1)?.id;
            return storeId;
        });
}