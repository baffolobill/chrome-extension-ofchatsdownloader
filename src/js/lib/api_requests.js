var sha1 = require('sha1');
import { decrStatsValue, incrStatsValue, updateStatsValue } from './stats.js';
import {
  readLocalStorage
} from './storage_utils.js';
var Buffer = require('buffer/').Buffer
import {
  isReceivedStopSignal,
  sendRuntimeSignal,
} from './signals.js';
import { getConfigChatMessagesLimitValue, getConfigRequestBackoffAttemptsValue, getConfigRequestBackoffDelayValue } from './ui_helpers.js';
const fetch = require('fetch-retry')(global.fetch);

const RULES_URL = 'https://raw.githubusercontent.com/deviint/onlyfans-dynamic-rules/main/dynamicRules.json';


/**
 * @typedef {Object} Rules
 * @property {string} static_param - Static parameter for signing
 * @property {number[]} checksum_indexes - Indexes used for checksum calculation
 * @property {number} checksum_constant - Constant value added to checksum
 * @property {string} start - Start string for the signature
 * @property {string} end - End string for the signature
 * @property {*} [key: string] - Other potential keys in the rules object
 */

/**
 * @typedef {Object} Body
 * @property {string} endpoint - The API endpoint
 * @property {string} [user-id] - Optional user ID
 * @property {string} [time] - Optional timestamp
 */

/**
 * @typedef {Object} Sign
 * @property {string} sign - The generated signature
 * @property {string} time - The timestamp used for signing
 */

/**
 * Signs a request to the OnlyFans API
 * @param {Rules} rules - The rules for signing the request
 * @param {Body} body - The request body
 * @returns {Sign} The signed request
 */
function signRequest(rules, body) {
    const time = body?.time || (+new Date()).toString()
    const url = new URL(body.endpoint, "https://onlyfans.com")

    const msg = [
        rules["static_param"],
        time,
        url.pathname + url.search,
        body?.["user-id"] || 0
    ].join("\n")
    const shaHash = sha1(msg);
    const hashAscii = Buffer.from(shaHash, 'ascii');

    const checksum = rules["checksum_indexes"].reduce((result, value) => result + hashAscii[value], 0) + rules["checksum_constant"];
    const sign = [rules["start"], shaHash, Math.abs(checksum).toString(16), rules["end"]].join(":")

    return {
        sign, time
    }
}

async function getRules() {
    const res = await fetch(RULES_URL)

    if (res.status !== 200) {
        throw new Error("Failed to fetch rules")
    }else{
        const data = await res.json()
        return data
    }
}

/**
 * @typedef {Object} User
 * @property {string} id - The user's ID
 * @property {string} userAgent - The user's user agent string
 * @property {string} xbc - The user's XBC value
 * @property {string} cookie - The user's cookie
 */

/**
 * Makes a request to OnlyFans API
 * @param {string} url - The URL to make the request to
 * @param {User} user - The user object containing necessary information
 * @returns {Promise<Response>} The response from the API
 */
export async function makeOFRequest(url, user, logger) {
    const numRetries = getConfigRequestBackoffAttemptsValue();
    const backoffMode = getConfigRequestBackoffDelayValue();
    const rules = await getRules()
    const sign = await signRequest(rules, {endpoint: url, "user-id": user.id})
    const beforeFetchTime = performance.now();

    // console.error('REMOVE TEST CODE BELOW:');
    // if (url.startsWith('https://onlyfans.com/api2/v2/chats?')) {
    //     url = 'https://httpstat.us/500';
    // }
    // if (url.startsWith('https://onlyfans.com/api2/v2/chats/')) {
    //     url = 'https://httpstat.us/429';
    // }
    // if (url.startsWith('https://onlyfans.com/api2/v2/chats/')) {
    //     url = 'https://httpstat.us/404';
    // }
    
    const res = await fetch(url, {
        headers: {
            'accept': 'application/json, text/plain, */*',
            "app-token": rules.app_token,
            'Referer': 'https://onlyfans.com/',
            "user-id": user.id,
            "user-agent": user.userAgent,
            "x-bc": user.xbc,
            "cookie": user.cookie,
            ...sign
        },
        retries: numRetries,
        retryOn: async function (attempt, error, response) {
            console.log(`Request attempt: ${attempt}. Response code: ${response.status}. Error: `, error);

            if (backoffMode === 'stop') {
                console.warn(`Request failed. Retry is disabled by user.`);
                logger.log(`Request failed. Retry is disabled by user.`);
                return false;
            }

            if (attempt >= numRetries) {
                console.error(
                    `Cancel retrying request because of too many attempts (attempt: ${attempt} from: ${numRetries}).`
                );
                logger.log(
                    `Cancel retrying request because of too many attempts (attempt: ${attempt} from: ${numRetries}).`
                );
                return false;
            }

            if (response.status === 401 || response.status === 403) {
                console.error(`
                    Server responded with statusCode:${response.status}. Stop application. 
                    Try to refresh page and login again.`
                );
                logger.log(
                  `Cancel retrying request because authentication is required (status code ${response.status}).`
                );
                return false;
            } 
            if (error !== null || response.status === 429 || response.status === 503 || response.status === 504) {
                logger.log(
                    `Retrying request because of status code ${response.status}. 
                    Attempt number ${attempt + 1}`
                );
                console.log(`retrying, attempt number ${attempt + 1}`);
                return true;
            }

            return false;
        },
        retryDelay: function (attempt, error, response) {
            if (backoffMode === 'retry-2s') {
                logger.log('Next retry after 2 seconds delay ...');
                return 2000;
            } else if (backoffMode === 'retry-exp') {
                const delayTime = Math.pow(2, attempt) * 1000; // 1000, 2000, 4000
                logger.log(`Next retry attempt (${attempt}) after ${delayTime/1000} seconds delay ...`);
                return delayTime;
            } else if (backoffMode === 'stop') {
                alert(`Request failed. Retry is disabled.`);
            } else {
                alert(`Unknown retry mode: ${backoffMode}`);
            }
            return null;
        }
    })
    const afterFetchTime = performance.now();

    const requestTime = Math.ceil(afterFetchTime - beforeFetchTime);
    logger.log(`Request time:${requestTime} ms. URL: ${url}. Started At: ${beforeFetchTime}. Finished At: ${afterFetchTime}.`);
    console.log(`Request time:${requestTime} ms. URL: ${url}. Started At: ${beforeFetchTime}. Finished At: ${afterFetchTime}.`);
    await updateStatsValue('lastrequesttimems', requestTime);

    return res
}


export async function getAllProfileChatMessages(chatId, user, logger) {
    let limit = 50;
    try {
        limit = getConfigChatMessagesLimitValue();
    } catch(err) {
        logger.log(`Couldn't get messages limit from config. Use default value "50".`);
        limit = 50;
    }

    let lastId = null;
    let messages = [];

    logger.log(`Going to fetch ${limit} messages for chatId:${chatId} per request ...`);

    while (true) {
        let params = { limit: limit, order: "desc", skip_users: "all" };
        if (lastId) {
            params.id = lastId;
        }

        let queryParams = new URLSearchParams(params).toString();
        logger.log(`Fetching limit:${limit} lastMessageId:${lastId} messages for chatId:${chatId} from OnlyFans ...`);
        let chatsResponse = await makeOFRequest(
            `https://onlyfans.com/api2/v2/chats/${chatId}/messages?${queryParams}`,
            user,
            logger,
        );
        logger.log(`Response status code: ${chatsResponse.status}`);
        console.log(`Response status code: ${chatsResponse.status}`);
        if (chatsResponse.status === 404) {
            console.log(`Got status 404 for chatId:${chatId}. Maybe it was deleted. Return emtpy array.`);
            logger.log(`Got status 404 for chatId:${chatId}. Maybe it was deleted. Return emtpy array.`);
            return [];
        } else if (!chatsResponse?.ok) {
            console.error(`Request "getAllProfileChatMessages" responded with code: ${chatsResponse?.status}.`);
            logger.log(`Request "getAllProfileChatMessages" responded with code: ${chatsResponse?.status}.`);
            alert(`Couldn't fetch messages. Contact with support and send logs.`);
            return null;
        }

        let response = await chatsResponse.json();
        console.info(`messages for chatId:${chatId} request: `, response);
        const responseMessages = response.list || [];

        if (!Array.isArray(responseMessages) || responseMessages.length === 0) {
            logger.log(`No more messages for chatId:${chatId}, we has been fetch all of them.`);
            break;
        }

        logger.log(`Fetched ${responseMessages.length} messages for chatId:${chatId} from OnlyFans.`);

        responseMessages.forEach(function(value){
            console.info('Chat Message: ', value);
            let whoWrote = 'other';
            let fromUserId = value['fromUser']['id'].toString()

            if (fromUserId == chatId.toString()) {
                whoWrote = 'client';
            } else if (fromUserId == user['id'].toString()) {
                whoWrote = 'model';
            }

            let msg = {
                text: value['text'],
                createdAt: value['createdAt'],
                id: value['id'],
                whoWrote: whoWrote,
                // Is message has photo, audio, video?
                hasMedia: (value['mediaCount'] > 0 ? true : false),
            };
            messages.push(msg);
        });

        lastId = responseMessages[responseMessages.length - 1].id;

        // Sleep 0.5 seconds before next try
        logger.log("Let's wait 0.5 second before next request ...")
        await new Promise(r => setTimeout(r, 500));
    }
    
    logger.log(`Total ${messages.length} messages for chatId:${chatId} has been fetched from OnlyFans.`);
    return messages;
}

export async function getAllProfileChats(user, logger) {
    const limit = 50;
    let offset = 0;
    let profiles = [];

    // FIXME
    // return [];

    logger.log(`Going to fetch ${limit} chats per request ...`);

    while (true) {
        let params = { offset: offset, limit: limit, order: "old", skip_users: "all" };
        let queryParams = new URLSearchParams(params).toString();

        logger.log(`Fetching limit:${limit} offset:${offset} chats from OnlyFans ...`);
        let chatsResponse = await makeOFRequest(
            `https://onlyfans.com/api2/v2/chats?${queryParams}`,
            user,
            logger,
        );
        logger.log(`Response status code: ${chatsResponse.status}`);
        console.log(`Response status code: ${chatsResponse.status}`);
        if (!chatsResponse?.ok) {
            console.error(`Request "getAllProfileChats" responded with code: ${chatsResponse?.status}.`);
            logger.log(`Request "getAllProfileChats" responded with code: ${chatsResponse?.status}.`);
            alert(`Couldn't fetch chats. Contact with support and send logs.`);
            return null;
        }

        let response = await chatsResponse.json();
        console.info('chats request: ', response);
        const chats = response.list || [];

        if (!Array.isArray(chats) || chats.length === 0) {
            logger.log(`No more chats, we has been fetch all of them.`);
            break;
        }

        logger.log(`Fetched ${chats.length} chats from OnlyFans.`);

        chats.forEach(function(value){
            profiles.push({'user_id': value['withUser']['id']});
        });

        if (response['nextOffset'] == 0) {
            logger.log(`No need in new request, because "nextOffset" in response is 0. That means we already got all chats.`);
            break;
        }
        offset += limit;
        
        // Sleep 0.5 seconds before next try
        logger.log("Let's wait 0.5 second before next request ...")
        await new Promise(r => setTimeout(r, 500));
    }

    logger.log(`Total ${profiles.length} chats has been fetched from OnlyFans.`);

    return profiles;
}

export async function getMe(user, logger) {
    let response = await makeOFRequest(
        `https://onlyfans.com/api2/v2/users/me`,
        user,
        logger,
    );
    if (!response?.ok) {
        console.error(`Request "getMe" responded with code: ${response?.status}.`);
        logger.log(`Request "getMe" responded with code: ${response?.status}.`);
        alert(`Couldn't perform test request. Contact with support and send logs.`);
        return null;
    }
    let responseData = await response.json();
    return responseData;
}


export async function getAllChats(user, logger){
    let all_chats = {};

    logger.log("Check if chats already fetched ...");
    const profilesCacheKey = `OFChatProfiles_${user.id}`;
    let cachedProfiles = await readLocalStorage(profilesCacheKey);
    if (Array.isArray(cachedProfiles) && cachedProfiles.length) {
        logger.log(`Found ${cachedProfiles.length} chats in storage. Use them.`)
    } else {
        logger.log("Nothing in cache, so fetching chats from OnlyFans ...");
        cachedProfiles = await getAllProfileChats(user, logger);
        if (cachedProfiles === null) {
            return false;
        }
        chrome.storage.local.set({[profilesCacheKey]: cachedProfiles});
        logger.log(`Fetched ${cachedProfiles.length} chats.`);
    }

    await updateStatsValue('total', cachedProfiles.length);
    await updateStatsValue('remains', cachedProfiles.length);

    console.info('profiles: ', cachedProfiles);

    logger.log("Now let's fetch messages from all chats ...");
    for (const chatProfile of cachedProfiles) {
        if (await isReceivedStopSignal()) {
            logger.log('Exit loop, because user has pressed STOP button.');
            await sendRuntimeSignal('stop');
            break;
        }

        const chatId = chatProfile['user_id'];
        
        logger.log(`Process messages fetching for chatId:${chatId} ...`);

        logger.log(`Let's first check, if messages already downloaded for chatId:${chatId} ...`);
        const chatCacheKey = `OFChatMessages_${user.id}_${chatId}`;
        let cachedMessages = await readLocalStorage(chatCacheKey);
        if (Array.isArray(cachedMessages) && cachedMessages.length){
            logger.log(`Found ${cachedMessages.length} messages in storage for chatId:${chatId}.`);
            await incrStatsValue('cached');
        } else {
            logger.log(`Nothing in cache, so fetching chatId:${chatId} messages from OnlyFans ...`);
            cachedMessages = await getAllProfileChatMessages(chatId, user, logger);
            if (cachedMessages === null){
                return false;
            }
            logger.log(`Fetched ${cachedMessages.length} messages for chatId:${chatId}.`);

            logger.log(`Saving chatId:${chatId} messages in local storage ...`);
            chrome.storage.local.set({[chatCacheKey]: cachedMessages});
            logger.log(`ChatId:${chatId} messages has been saved in browser storage.`);
            await incrStatsValue('fetched');
        }
        await decrStatsValue('remains');
        all_chats[chatId] = cachedMessages;

        // FIXME:
        // await new Promise(r => setTimeout(r, 5000));
    }

    return all_chats;
}
