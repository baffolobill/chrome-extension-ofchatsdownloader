const ls = chrome.storage.local;

/**
 * Helper for storing the new bcTokens object
 */
function storeBcTokens(bcTokens)
{
    console.error('Started storeBcTokens with bcTokens:', bcTokens);
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

async function handleBcToken(data)
{
    console.error('Started handleBcToken with data:', data);
    const { bcTokenSha, id } = data;
    
    const bcTokens = await getStoredBcTokens();
    console.error('bcTokens:', bcTokens);
    bcTokens[id] = bcTokenSha;
    storeBcTokens(bcTokens);

    return true;
}

chrome.runtime.onMessage.addListener(handleBcToken);


// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
