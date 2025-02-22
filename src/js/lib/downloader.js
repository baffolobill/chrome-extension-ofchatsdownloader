import { getCookieStore, getAuthConfig } from './utils';
import { getAllChats, getMe } from './api_requests.js';
import { getLogger } from './logs.js';
import {readCurrentUserLocalStorage, readLocalStorage, storeCurrentLocalStorage, storeLocalStorage} from './storage_utils.js';
import { flushStats } from './stats.js';
import { sendRuntimeSignal } from './signals.js';
import { handle_stopOFDownloaderBtn } from './ui_helpers.js';


function downloadFileFromText(filename, content) {
    let anchorElement = document.createElement('a');
    let blob = new Blob([ content ], {type : "application/json;charset=UTF-8"});

    anchorElement.href = window.URL.createObjectURL(blob);
    anchorElement.download = filename;
    anchorElement.style.display = 'none';
    document.body.appendChild(anchorElement);
    anchorElement.click();  //this is probably the key - simulating a click on a download link
    anchorElement.remove();  // we don't need this anymore
}

export async function performChatsDownload(){
    var logger = getLogger();

    await flushStats();
    
    const cookieStoreId = await getCookieStore();
    logger.log("Getting auth config ...");
    const authConfig = await getAuthConfig(cookieStoreId);
    
    if (!authConfig) {
        logger.log("Couldn't calculate auth config. Exit. Try to refresh page.");
        return;
    }

    logger.log("Auth config has been calculated. Now we can perform requests to OnlyFans API.");

    const user = {
        id: authConfig['USER_ID'],
        userAgent: authConfig['USER_AGENT'],
        xbc: authConfig['X_BC'],
        cookie: authConfig['COOKIE'],
    };

    await storeCurrentLocalStorage(user);

    logger.log("Executing request to get profile data. Looks like without this request, other one fails.");
    // Похоже, что без этого запроса не отработают остальные запросы 
    // на получение списка чатов и самих сообщений. Почему-то выпадает ошибка 401.
    let responseMe = await getMe(user, logger);
    if (responseMe === null){
        return false;
    }
    
    logger.log("Now, we are finally executing requests to fetch all messages ...");
    let response = await getAllChats(user, logger);
    if (!response) {
        console.log('Nothing has been fetched. Exit. Response: ', response);
        logger.log('Nothing has been fetched. Exit.');
        return false;
    }
    logger.log("All messages has been fetched.");
    
    await sendRuntimeSignal('stopped');
    handle_stopOFDownloaderBtn();
    
    logger.log("Triggering download process of saved chats. Please wait ...");
    const downloadFilename = `model_${user.id}.json`;
    const cachedData = JSON.stringify(response);
    downloadFileFromText(downloadFilename, cachedData);
    logger.log(`We has been triggered download process. Check download forlder for file ${downloadFilename}`);
}

export async function downloadUILogs(){
    let messages = [];
    const logsMessages = document
        .getElementById('of-download-logs')
        .getElementsByClassName('ui-logger-message');
    
    Array.from(logsMessages).forEach(element => {
        messages.push(element.textContent);
    });
    downloadFileFromText("logs.txt", messages.join('\n'));
}


export async function downloadChatsFromStorage(){
    let user = await readCurrentUserLocalStorage();
    if (!user) {
        const cookieStoreId = await getCookieStore();
        console.log("Getting auth config ...");
        const authConfig = await getAuthConfig(cookieStoreId);

        if (!authConfig) {
          console.log("Couldn't calculate auth config. Exit. Try to refresh page.");
          return;
        }

        console.log("Auth config has been calculated. Now we can perform requests to OnlyFans API.");

        user = {
            id: authConfig['USER_ID'],
            userAgent: authConfig['USER_AGENT'],
            xbc: authConfig['X_BC'],
            cookie: authConfig['COOKIE'],
        };

        await storeCurrentLocalStorage(user);
    }

    let all_chats = {};

    const profilesCacheKey = `OFChatProfiles_${user.id}`;
    let cachedProfiles = await readLocalStorage(profilesCacheKey);
    if (Array.isArray(cachedProfiles) && cachedProfiles.length) {
      console.log(`Found ${cachedProfiles.length} chats in storage. Use them.`)
    } else {
        alert('Nothing found in local storage. Exit.');
        return;
    }

    console.log("Now let's fetch messages from all chats ...");
    for (const chatProfile of cachedProfiles) {
        const chatId = chatProfile['user_id'];
        
        console.log(`Process messages fetching for chatId:${chatId} ...`);

        console.log(`Let's first check, if messages already downloaded for chatId:${chatId} ...`);
        const chatCacheKey = `OFChatMessages_${user.id}_${chatId}`;
        let cachedMessages = await readLocalStorage(chatCacheKey);
        if (Array.isArray(cachedMessages) && cachedMessages.length){
            console.log(`Found ${cachedMessages.length} messages in storage for chatId:${chatId}.`);
            all_chats[chatId] = cachedMessages;
        }
    }

    // Uncomment for debug
    // await new Promise(r => setTimeout(r, 5000));

    const cachedData = JSON.stringify(all_chats);
    const downloadFilename = `model_${user.id}_cached.json`;
    downloadFileFromText(downloadFilename, cachedData);
}