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
