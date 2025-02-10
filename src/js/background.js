const ls = chrome.storage.local;

/**
 * Helper for storing the new bcTokens object
 */
function storeBcTokens(bcTokens)
{
    console.log('Started storeBcTokens with bcTokens:', bcTokens);
    ls.set({'bcTokens': bcTokens});
}

/**
 * Retrieve the stored bcTokens object
 * If none, return a fresh object
 */
async function getStoredBcTokens()
{
    return new Promise((resolve, reject) => {
        ls.get(['bcTokens'], function(data) {
            if (!data.bcTokens) {
                storeBcTokens({});
                resolve({});
                return;
            }

            resolve(data.bcTokens);
        });
    });
}

async function handleBcToken(data) {
    console.log('Started handleBcToken with data:', data);
    const { bcTokenSha, id } = data;
    
    const bcTokens = await getStoredBcTokens();
    console.log('bcTokens:', bcTokens);
    bcTokens[id] = bcTokenSha;
    storeBcTokens(bcTokens);
}

async function handleOFEvent(data) {
    console.log('Started handleOFEvent with data:', data);
    const event = data.event;

    if (event === 'updateBcToken') {
        await handleBcToken(data.data);
    }
    
    return true;
}

chrome.runtime.onMessage.addListener(handleOFEvent);


// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
