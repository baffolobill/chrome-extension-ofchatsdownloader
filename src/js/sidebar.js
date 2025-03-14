import '../img/icon-128.png';
import '../css/sidebar.scss'

// Import all of Bootstrap's JS
import * as bootstrap from 'bootstrap'

import {showDebugInfo} from './lib/debug_info.js';
import {
  performChatsDownload,
  downloadUILogs,
  downloadChatsFromStorage,
} from './lib/downloader.js';
import {
  showLoading,
  hideLoading,
  clearUILogs,
  showStopDownloadBtn,
  hideStopDownloadBtn,
  lockConfigUI,
  unlockConfigUI,
} from './lib/ui_helpers.js';
import {storeSignalLocalStorage, wipeStorage} from './lib/storage_utils.js';
import { isSignalStarted } from './lib/signals.js';
import { sendUILog } from './lib/logs.js';


async function initDownloader(){
    const startOFDownloaderBtn = document.getElementById('startOFDownloaderBtn');
    startOFDownloaderBtn.addEventListener('click', async () => {
        // Prevent system from go in sleep mode
        try {
            chrome.power.requestKeepAwake('system');
        } catch(err) {
            console.error("Couldn't enable system power mode to prevent sleep mode.")
        }
        lockConfigUI();
        showLoading();
        showStopDownloadBtn();
        await storeSignalLocalStorage('started');
        await performChatsDownload();
        // try {
        //     await performChatsDownload();
        // } finally {
        //     // await new Promise(r => setTimeout(r, 15000));
        // hideLoading();
        // }
        hideLoading();
        hideStopDownloadBtn();
        unlockConfigUI();
        await storeSignalLocalStorage('stopped');

        // Allow system to keep in sleep mode
        chrome.power.releaseKeepAwake();
    });
    
    const ofDownnloadLogsSaveBtn = document.getElementById('ofDownnloadLogsSaveBtn');
    ofDownnloadLogsSaveBtn.addEventListener('click', async () => {
        await downloadUILogs();
    });
    
    const ofDownnloadLogsClearBtn = document.getElementById('ofDownnloadLogsClearBtn');
    ofDownnloadLogsClearBtn.addEventListener('click', async () => {
        await clearUILogs();
    });
    
    const downloadChatsFromStorageBtn = document.getElementById('downloadChatsFromStorageBtn');
    downloadChatsFromStorageBtn.addEventListener('click', async () => {
        downloadChatsFromStorageBtn.disabled = true;
        downloadChatsFromStorageBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <span class="ps-1" role="status">Выполняется ...</span>
        `;
        await downloadChatsFromStorage();
        downloadChatsFromStorageBtn.disabled = false;
        downloadChatsFromStorageBtn.innerHTML = `
            <i class="fa fa-database"></i> Скачать сохраненные в кэше чаты
        `;
    });

    const resetStartStopBtn = document.getElementById('resetStartStopBtn');
    resetStartStopBtn.addEventListener('click', async () => {
        resetStartStopBtn.disabled = true;
        resetStartStopBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <span class="ps-1" role="status">Выполняется ...</span>
        `;
        hideLoading();
        hideStopDownloadBtn();
        unlockConfigUI();
        await storeSignalLocalStorage('stop');
        chrome.power.releaseKeepAwake();
        resetStartStopBtn.disabled = false;
        resetStartStopBtn.innerHTML = `
            <i class="fa fa-stop"></i> Reset Start/Stop Buttons
        `;
    });
    
    const stopOFDownloaderBtn = document.getElementById('stopOFDownloaderBtn');
    stopOFDownloaderBtn.addEventListener('click', async () => {
        if (await isSignalStarted()){
            stopOFDownloaderBtn.disabled = true;
            stopOFDownloaderBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            `;
            await storeSignalLocalStorage('stop');
            sendUILog('Received STOP signal from user. Stopping ...');
        }
        sendUILog('Disabling power system mode ...');
        chrome.power.releaseKeepAwake();
        sendUILog('Power mode has been disabled.');
    });
}

async function initWiper(){
    const clearStorageBtn = document.getElementById('clearStorageBtn');
    clearStorageBtn.addEventListener('click', async () => {
        await wipeStorage();
    });
}

async function initDebugInfo(){
    const showAuthConfigBtn = document.getElementById('showAuthConfigBtn');
    showAuthConfigBtn.addEventListener('click', async () => {
        await showDebugInfo();
    });
}

async function initSidebar(){
    await initDownloader();
    await initWiper();
    await initDebugInfo();
}

await initSidebar();
