const express = require("express");
const config = require('../config.js');
const crypto = require('crypto');
const OAuth = require('oauth-request');
const queryString = require('query-string');
const axios = require("axios").default;

const router = express.Router();

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

twitterAPI.setToken({
    key: config.adsAccount.tokenKey,
    secret: config.adsAccount.tokenSecret
});


router.get("/", function (req, res) {
    console.log('-- Login Services -- ',req);
    res.send('Login Services');
});

router.get("/request-token", function (req, res) {
    console.log('-- request-token -- ',req.query.path);
    let oauth_callback_url = config.oauth_callback_url;
    if(req.query.path != undefined)
        oauth_callback_url = oauth_callback_url + '/' + req.query.path;
    twitterAPI.post({
        url: 'https://api.twitter.com/oauth/request_token',
        form: {
            'oauth_callback': oauth_callback_url
        },
        json: true
    }, function (err, results, tweets) {
        console.log(results.body);
        qs = queryString.parse(results.body);
        res.send({ 'oauth_token': qs.oauth_token });
    });
});

router.get("/access-tokens", function (req, res) {
    console.log('-- Access Token Services -- ',req.query.oauth_verifier,' oauth_token ',req.query.oauth_token);
    let oauth_url = 'https://api.twitter.com/oauth/access_token?oauth_verifier='+req.query.oauth_verifier+'&oauth_token='+req.query.oauth_token;
    axios
        .post(oauth_url, null, null)
        .then((results) => {
            console.log('access-token ',results.data);
            qs = queryString.parse(results.data);
            res.send({'oauthToken': qs.oauth_token, 'oauthTokenSecret': qs.oauth_token_secret, 'userId':qs.user_id, 'screenName':qs.screen_name});
        })
        .catch(function (error) {
            //console.log(error);
        });
    
});

module.exports = router
