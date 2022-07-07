const oauthSignature = require('oauth-signature')
const config = require('../config.js');
const OAuth = require('oauth-request');
const crypto = require('crypto');
const axios = require("axios").default;
const Twitter = require("twitter")

const twitterClient = new Twitter({
    consumer_key: config.adsAccount.consumerKey,
    consumer_secret: config.adsAccount.consumerSecret,
    access_token_key: config.adsAccount.tokenKey,
    access_token_secret: config.adsAccount.tokenSecret
})

var twitterAPI = OAuth({
    consumer: {
        key: config.adsAccount.consumerKey,
        secret: config.adsAccount.consumerSecret
    },
    signature_method: 'HMAC-SHA1',
    hash_function: function (base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    }
});

function getEncodedSignature(adUrl, method, reqBody) {
    let timestamp = Math.floor(new Date().getTime() / 1000);
    let nonce = getNonce(7);
    let oauth_signature = {
        'timestamp': timestamp,
        'nonce': nonce
    }

    var httpMethod = method,
        url = adUrl,
        parameters = {
            oauth_consumer_key: config.adsAccount.consumerKey,
            oauth_token: config.adsAccount.tokenKey,
            oauth_nonce: nonce,
            oauth_timestamp: timestamp,
            oauth_signature_method: 'HMAC-SHA1',
            oauth_version: '1.0',
        },
        consumerSecret = config.adsAccount.consumerSecret,
        tokenSecret = config.adsAccount.tokenSecret,
        encodedSignature = oauthSignature.generate(httpMethod, url, parameters, consumerSecret, tokenSecret, reqBody);
    oauth_signature.encodedSignature = encodedSignature;
    console.log('---------- encodedSignature --------- ', oauth_signature.encodedSignature)

    return oauth_signature;
}

function getNonce(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    console.log('------- NONCE ------- ', result)
    return result;
}

async function createCard(cardForm) {
    console.log('CardForm / Validation ', cardForm.mediaKey, cardForm.cardName)
    let cardOptions = {
        url: config.adsAccount.adsAPI.websiteCards,
        json: true,
        form: { 'name': cardForm.cardName, 'website_title': cardForm.websiteTitle, 'website_url': cardForm.websiteURL, 'media_key': cardForm.mediaKey }
    }

    twitterAPI.setToken({
        key: config.adsAccount.tokenKey,
        secret: config.adsAccount.tokenSecret
    });

    return new Promise(function (resolve, reject) {
        twitterAPI.post(cardOptions, function (error, response, results) {
            if (response.body.errors) {
                console.log('Twitter error ', response.body.errors);
                reject(response.body.errors[0]);
            }
            if (response.body.data) {
                console.log('Twitter response ', response.body);
                resolve(response.body.data);
            }
        })
    });
}

async function initializeMediaUpload(mediaSize, mediaType) {
    return new Promise(function (resolve, reject) {
        twitterClient.post("media/upload", {
            command: "INIT",
            total_bytes: mediaSize,
            media_type: mediaType,
            media_category: 'tweet_gif'
        }, function (error, data, response) {
            if (error) {
                console.log(error)
                reject(error)
            } else {
                resolve(data.media_id_string)
            }
        })
    })
}

async function appendFileChunk(mediaId, mediaData, segmentId) {
    return new Promise(function (resolve, reject) {
        twitterClient.post("media/upload", {
            command: "APPEND",
            media_id: mediaId,
            media_data: mediaData,
            segment_index: segmentId
        }, function (error, data, response) {
            if (error) {
                console.log(error)
                reject(error)
            } else {
                resolve(mediaId)
            }
        })
    })
}

async function finalizeUpload(mediaId) {
    return new Promise(function (resolve, reject) {
        twitterClient.post("media/upload", {
            command: "FINALIZE",
            media_id: mediaId
        }, function (error, data, response) {
            if (error) {
                console.log(error)
                reject(error)
            } else {
                resolve(data)
            }
        })
    })
}


async function deleteCard(cardId) {
    let url = config.adsAccount.adsAPI.websiteCards + '/' + cardId;
    let encodedSignature = getEncodedSignature(url, 'DELETE', null);
    let auth_header = 'OAuth oauth_consumer_key="' + config.adsAccount.consumerKey + '",oauth_token="' + config.adsAccount.tokenKey + '",oauth_signature_method="HMAC-SHA1",oauth_timestamp="' + encodedSignature.timestamp + '",oauth_nonce="' + encodedSignature.nonce + '",oauth_version="1.0",';
    auth_header = auth_header + 'oauth_signature="' + encodedSignature.encodedSignature + '"';

    console.log('auth_header ', auth_header)

    var axiosConfig = {
        method: 'delete',
        url: url,
        headers: {
            'Authorization': auth_header,
            'Content-Type': 'application/json'
        },
        // data: data
    };

    return new Promise(function (resolve, reject) {
        axios(axiosConfig)
            .then(function (response) {
                resolve(response.data);
            })
            .catch(function (error) {
                console.log(error);
                reject(error);
            });
    });

}

module.exports = { getEncodedSignature, createCard, deleteCard, initializeMediaUpload, appendFileChunk, finalizeUpload };