const oauthSignature = require('oauth-signature')
const config = require('../config.js');

function getEncodedSignature(reqBody) {
    let timestamp = Math.floor(new Date().getTime() / 1000);
    let nonce = getNonce(7);
    let oauth_signature = {
        'timestamp': timestamp,
        'nonce': nonce
    }


    var httpMethod = 'POST',
        url = 'https://ads-api.twitter.com/10/accounts/18ce55g3aw0/cards',
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

module.exports = { getEncodedSignature };