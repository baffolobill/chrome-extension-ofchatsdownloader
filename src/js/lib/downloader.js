import { getCookieStore, getAuthConfig } from './utils';
import { getAllChats, getMe } from './api_requests.js';
import { getLogger } from './logs.js';
import {readLocalStorage} from './storage_utils.js';


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


export function showLoading(){
    const btn = document.getElementById('startOFDownloaderBtn');
    btn.disabled = true;
    btn.innerHTML = `
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <span class="ps-1" role="status">Выполняется ...</span>
    `;
}


export function hideLoading(){
    const btn = document.getElementById('startOFDownloaderBtn');
    btn.disabled = false;
    btn.innerHTML = "Начать скачивание чатов";
}

export async function performChatsDownload(){
    var logger = getLogger();
    
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

    logger.log("Let's check if all necessary data exists in local storage ...")

    // const cacheKey = `OFChats_${user.id}`;
    let cachedData = null; //await readLocalStorage(cacheKey);
    // console.info("Cached data: ", cachedData);
    // if (cachedData !== null) {
    //     logger.log("Yep, found saved data in storage. Use that data.")
    // } else {
    //     logger.log("No saved data found. Getting to execute some requests to OnlyFans to fetch messages ...");

        logger.log("Executing request to get profile data. Looks like without this request, other one fails.");
        // Похоже, что без этого запроса не отработают остальные запросы 
        // на получение списка чатов и самих сообщений. Почему-то выпадает ошибка 401.
        let responseMe = await getMe(user);
    
        logger.log("Now, we are finally executing requests to fetch all messages ...");
        let response = await getAllChats(user, logger);
        logger.log("All messages has been fetched.");

        cachedData = JSON.stringify(response);

        // logger.log("Let's save in the browser cache retrieved just now messages.");
        // chrome.storage.local.set({[cacheKey]: cachedData});
        // logger.log("Messages has been saved in browser storage.");
    // }

    logger.log("Triggering download process of saved chats. Please wait ...");
    const downloadFilename = `model_${user.id}.json`;
    downloadFileFromText(downloadFilename, cachedData);
    logger.log(`We has been triggered download process. Check download forlder for file ${downloadFilename}`);
}

export async function downloadUILogs(){
    const downloadFilename = "logs.txt";
    let messages = [];
    const logsMessages = document
        .getElementById('of-download-logs')
        .getElementsByClassName('ui-logger-message');
    
    Array.from(logsMessages).forEach(element => {
        messages.push(element.textContent);
    });
    downloadFileFromText(downloadFilename, messages.join('\n'));
}

export async function clearUILogs() {
    document.getElementById('of-download-logs').innerHTML = "";
}