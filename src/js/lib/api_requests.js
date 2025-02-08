var sha1 = require('sha1');
import {
  readLocalStorage
} from './storage_utils.js';
var Buffer = require('buffer/').Buffer


const RULES_URL = 'https://raw.githubusercontent.com/deviint/onlyfans-dynamic-rules/main/dynamicRules.json';

// function create_sign(link, headers) {
//     const _time = String(Math.round(Date.now()));

//     const url = new URL(link);
//     const path = url.pathname;

//     const dynamic_r = {};
//     const static_param = dynamic_r["static_param"];
//     const user_id = headers['user-id'];
//     const msg = `${static_param}\n${_time}\n${path}\n${user_id}`;
//     const message = Buffer.from(msg, 'utf-8');
//     const _hash = crypto.createHash('sha1').update(message);
//     const sha_1_sign = _hash.digest('hex');
//     const sha_1_b = Buffer.from(sha_1_sign, 'ascii');

//     const checksum_indexes = dynamic_r['checksum_indexes'];
//     const checksum_constant = dynamic_r['checksum_constant'];
//     const checksum = checksum_indexes.reduce((acc, i) => acc + sha_1_b[i], 0) + checksum_constant;


//     headers["sign"] = dynamic_r["sign_format"].format(sha_1_sign, format(abs(checksum), 'x'))
//     headers["time"] = _time
// }



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
export async function makeOFRequest(url, user) {
    const rules = await getRules()
    const sign = await signRequest(rules, {endpoint: url, "user-id": user.id})
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
        }
    })

    return res
}


export async function getAllProfileChatMessages(chatId, user, logger) {
    const limit = 50;
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
        );
        logger.log(`Response status code: ${chatsResponse.status}`);
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

    logger.log(`Going to fetch ${limit} chats per request ...`);

    while (true) {
        let params = { offset: offset, limit: limit, order: "old", skip_users: "all" };
        let queryParams = new URLSearchParams(params).toString();

        logger.log(`Fetching limit:${limit} offset:${offset} chats from OnlyFans ...`);
        let chatsResponse = await makeOFRequest(
            `https://onlyfans.com/api2/v2/chats?${queryParams}`,
            user,
        );
        logger.log(`Response status code: ${chatsResponse.status}`);

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

export async function getMe(user) {
    let chatsResponse = await makeOFRequest(
        `https://onlyfans.com/api2/v2/users/me`,
        user,
    );
    let response = await chatsResponse.json();
    return response;
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
        chrome.storage.local.set({[profilesCacheKey]: cachedProfiles});
        logger.log(`Fetched ${cachedProfiles.length} chats.`);
    }

    console.info('profiles: ', cachedProfiles);

    logger.log("Now let's fetch messages from all chats ...");
    for (const chatProfile of cachedProfiles) {
        const chatId = chatProfile['user_id'];
        
        logger.log(`Process messages fetching for chatId:${chatId} ...`);

        logger.log(`Let's first check, if messages already downloaded for chatId:${chatId} ...`);
        const chatCacheKey = `OFChatMessages_${user.id}_${chatId}`;
        let cachedMessages = await readLocalStorage(chatCacheKey);
        if (Array.isArray(cachedMessages) && cachedMessages.length){
            logger.log(`Found ${cachedMessages.length} messages in storage for chatId:${chatId}.`);
        } else {
            logger.log(`Nothing in cache, so fetching chatId:${chatId} messages from OnlyFans ...`);
            cachedMessages = await getAllProfileChatMessages(chatId, user, logger);
            logger.log(`Fetched ${cachedMessages.length} messages for chatId:${chatId}.`);

            logger.log(`Saving chatId:${chatId} messages in local storage ...`);
            chrome.storage.local.set({[chatCacheKey]: cachedMessages});
            logger.log(`ChatId:${chatId} messages has been saved in browser storage.`);
        }
        all_chats[chatId] = cachedMessages;
    }

    return all_chats;
}

export async function fetchHash(user) {
  const res = await fetch('https://cdn2.onlyfans.com/hash/', {
    headers: {
      'accept': '*/*',
      'Referer': 'https://onlyfans.com/',
      "user-agent": user.userAgent,
    }
  })

  return await res.text()
}