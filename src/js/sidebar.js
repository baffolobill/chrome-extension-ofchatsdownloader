import '../img/icon-128.png';
import '../css/sidebar.scss'

// Import all of Bootstrap's JS
import * as bootstrap from 'bootstrap'

import {showDebugInfo} from './lib/debug_info';
import {
  performChatsDownload,
  downloadUILogs,
  clearUILogs, showLoading,
  hideLoading
} from './lib/downloader';
import {wipeStorage} from './lib/storage_utils';


async function initDownloader(){
    const startOFDownloaderBtn = document.getElementById('startOFDownloaderBtn');
    startOFDownloaderBtn.addEventListener('click', async () => {
        showLoading();
        await performChatsDownload();
        // try {
        //     await performChatsDownload();
        // } finally {
        //     // await new Promise(r => setTimeout(r, 15000));
            // hideLoading();
            // }
            hideLoading();

        
    });
    
    const ofDownnloadLogsSaveBtn = document.getElementById('ofDownnloadLogsSaveBtn');
    ofDownnloadLogsSaveBtn.addEventListener('click', async () => {
        await downloadUILogs();
    });
    
    const ofDownnloadLogsClearBtn = document.getElementById('ofDownnloadLogsClearBtn');
    ofDownnloadLogsClearBtn.addEventListener('click', async () => {
        await clearUILogs();
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