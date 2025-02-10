import { readSignalLocalStorage } from "./storage_utils";

export async function sendRuntimeSignal(event, data){
    try {
        await chrome.runtime.sendMessage({
            event: event,
            data: data,
        });
    } catch (err) {
        console.error(`Error occurred when trying to send sendRuntimeSignal:${event} data:`, data);
    }
}

export async function isReceivedStopSignal() {
    const signal = await readSignalLocalStorage();
    if (signal === 'stop' || signal === 'stopped') {
        return true;
    }
    return false;
}

export async function isSignalStarted() {
    const signal = await readSignalLocalStorage();
    if (signal === 'started' || signal === 'starting') {
        return true;
    }
    return false;
}