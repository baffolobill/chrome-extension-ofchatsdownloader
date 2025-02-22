export function handle_stopOFDownloaderBtn() {
    const stopOFDownloaderBtn = document.getElementById('stopOFDownloaderBtn');

    stopOFDownloaderBtn.disabled = false;
    stopOFDownloaderBtn.innerHTML = `
        <i class="fa fa-circle-stop"></i> Остановить
    `;
}

export function showStopDownloadBtn(){
    const btn = document.getElementById('stopOFDownloaderBtn');
    btn.style.display = 'block';
}

export function hideStopDownloadBtn(){
    const btn = document.getElementById('stopOFDownloaderBtn');
    btn.style.display = 'none';
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
    btn.innerHTML = "Запустить";
}

export async function clearUILogs() {
    document.getElementById('id_ui-logger').innerHTML = "";
}

/**
 * Config
 */
export function getConfigChatMessagesLimitValue(){
    return parseInt(document.getElementById('configChatMessagesLimit').value);
}
export function getConfigRequestBackoffDelayValue(){
    return document.getElementById('configRequestBackoffDelay').value;
}
export function getConfigRequestBackoffAttemptsValue(){
    return parseInt(document.getElementById('configRequestBackoffAttempts').value);
}

export function lockConfigUI() {
    document.getElementById('configChatMessagesLimit').disabled = true;
    document.getElementById('configRequestBackoffDelay').disabled = true;
    document.getElementById('configRequestBackoffAttempts').disabled = true;
}

export function unlockConfigUI() {
    document.getElementById('configChatMessagesLimit').disabled = false;
    document.getElementById('configRequestBackoffDelay').disabled = false;
    document.getElementById('configRequestBackoffAttempts').disabled = false;
}