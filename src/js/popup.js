import { fetchHash, getAllChats, getMe } from './lib/api_requests.js';

const containerNames = {};
const containersEnabled = false;  //browser.contextualIdentities !== undefined;
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

async function getContainers()
{
    /**
     * Containers are enabled, but none found.
     */
    let containers = await chrome.contextualIdentities.query({});
    if (containers.length < 1) {
        return;
    }

    // Sort container list by name.
    containers.sort(function(a, b) {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (nameA < nameB) {
            return -1;
        }

        if (nameA > nameB) {
            return 1;
        }

        return 0;
    });

    document.getElementById('container-list').classList.remove('hidden');

    const optionList = document.getElementById('container-select');

    for (const container of containers)
    {
        const storeId = container.cookieStoreId;
        const { name } = container;

        containerNames[storeId] = name;

        const option = document.createElement('option');
        option.setAttribute('value', storeId);
        option.textContent = name;

        optionList.insertAdjacentElement('beforeend', option);
    }

    optionList.addEventListener('change', function(event) {
        const storeId = event.target.value;

        if (!storeId || storeId.length < 1) {
            displayAuthConfig(null);
            return;
        }

        displayAuthConfig(storeId);
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
    console.error('All Cookies: ', cookies);

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

function showControls() {
    document.getElementById('copy-to-clipboard').classList.remove('hidden');
    document.getElementById('download-file').classList.remove('hidden');
    document.getElementById('json').classList.remove('hidden');
}

function hideControls() {
    document.getElementById('copy-to-clipboard').classList.add('hidden');
    document.getElementById('download-file').classList.add('hidden');
    document.getElementById('json').classList.add('hidden');
}

function hideErrorMessages() {
    const errorMessageIds = [
        'auth-error-message',
        'auth-container-error-message',
        'bc-error-message',
        'bc-container-error-message',
    ];

    for (const id of errorMessageIds) {
        document.getElementById(id).classList.add('hidden');
    }
}

function showErrorMessage(cookieStoreId, isAuthError) {
    hideErrorMessages();
    hideControls();

    const errorMessageId = isAuthError
        ? containersEnabled
            ? 'auth-container-error-message'
            : 'auth-error-message'
        : containersEnabled
            ? 'bc-container-error-message'
            : 'bc-error-message';

    if (containersEnabled) {
        [...document.querySelectorAll('.container-name-template')].forEach((el) => {
            el.textContent = containerNames[cookieStoreId] || 'Default (no container)';
        });
    }

    document.getElementById(errorMessageId).classList.remove('hidden');
}

async function getAuthConfig(cookieStoreId) {
    const mappedCookies = await getMappedCookies(cookieStoreId);
    console.error('mappedCookies:', mappedCookies);
    /**
     * If authId isn't specified, user is not logged into OnlyFans... or at least we assume so.
     */
    if (!mappedCookies['auth_id'] || !mappedCookies['sess']) {
        showErrorMessage(cookieStoreId, true);
        return null;
    }

    // See `background/background.js` as to why we use `st` here
    const st = mappedCookies['st'];
    const bcToken = await getBcTokenSha(st);
    console.error(`bcToken: ${bcToken} for st: ${st}`);

    if (!bcToken) {
        showErrorMessage(cookieStoreId, false);
        return null;
    }

    return {
        USER_ID: mappedCookies['auth_id'],
        USER_AGENT: navigator.userAgent,
        X_BC: bcToken,
        // X_HASH: await fetchHash({userAgent: navigator.userAgent}),
        COOKIE: Object.keys(mappedCookies)
            .filter((key) => desiredCookies.includes(key))
            .map((key) => `${key}=${mappedCookies[key]};`)
            .join(' '),
    };
}

async function displayAuthConfig(cookieStoreId) {
    const authConfig = await getAuthConfig(cookieStoreId);
    console.error('AuthConfig:', authConfig);

    if (!authConfig) {
        return;
    }

    hideErrorMessages();
    showControls();

    const user = {
        id: authConfig['USER_ID'],
        userAgent: authConfig['USER_AGENT'],
        xbc: authConfig['X_BC'],
        // xhash: authConfig['X_HASH'],
        cookie: authConfig['COOKIE'],
    };
    const jsonElement = document.getElementById('json');
    // const authJson = JSON.stringify(authConfig, null, 2);
    // jsonElement.textContent = authJson;
    // let response = await getAllChats(
    let responseMe = await getMe(user);
    let response = await getAllChats(user);
    const responseText = JSON.stringify(response);
    console.error(responseText);
    jsonElement.textContent = responseText;

    const copyBtn = document.getElementById('copy-to-clipboard');
    const oldBtnText = copyBtn.innerHTML;
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(authJson);

            copyBtn.textContent = 'Copied to clipboard!';
            copyBtn.setAttribute('disabled', '1');
        }
        catch (err) {
            console.error(err);
        }

        setTimeout(() => {
            copyBtn.textContent = oldBtnText;
            copyBtn.removeAttribute('disabled');
        }, 2500);
    });

    const file = new Blob([responseText], {type: 'text/plain'});
    const downloadBtn = document.getElementById('download-file');
    downloadBtn.href = URL.createObjectURL(file);
    downloadBtn.download = 'auth.json';
}

async function getCookieStore(){
    return chrome.cookies.getAllCookieStores()
        .then( async cookieStores => {
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            const storeId = cookieStores?.find( cookieStore => cookieStore?.tabIds?.indexOf(tab?.id) !== -1)?.id;
            return storeId;
        });
}

// document.addEventListener('DOMContentLoaded', async () => {
//     console.error('Extenstion inited.');
//     console.error('Calling displayAuthConfig()...');

//     console.error(`cookies:id=`, await getCookieStore());

//     await displayAuthConfig(await getCookieStore());

//     if (containersEnabled) {
//         await getContainers();
//     }
// });