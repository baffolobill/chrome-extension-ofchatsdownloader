export async function wipeStorage() {
  chrome.storage.local.clear(function () {
    var error = chrome.runtime.lastError;
    if (error) {
      console.error(error);
    }
  });
  chrome.storage.sync.clear(); // callback is optional
}

export async function readLocalStorage(key) {
  console.info(`Read from local storage for key:${key}`);
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      console.info(`Storage value for key:${key} is: `, result);
      if (result[key] === undefined) {
        // reject();
        resolve(null);
      } else {
        resolve(result[key]);
      }
    });
  });
}

export async function storeLocalStorage(key, value) {
    console.info(`Store to local storage for key:${key} value:`, value);
  
    await chrome.storage.local.set({
      [key]: value
    });
}

export async function readCurrentUserLocalStorage() {
    return await readLocalStorage('OF_current_user');
}

export async function storeCurrentLocalStorage(user) {
    await storeLocalStorage('OF_current_user', user);
}

export async function storeSignalLocalStorage(signal) {
  await storeLocalStorage('OF_execution_signal', signal);
}

export async function readSignalLocalStorage() {
  return await readLocalStorage('OF_execution_signal');
}