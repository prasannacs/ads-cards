const express = require("express");
const config = require('../config.js');
const crypto = require('crypto');
const OAuth = require('oauth-request');
const queryString = require('query-string');
const axios = require("axios").default;
const dataStore = require('.././services/dataStore.js');

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
    console.log('-- Get Cards Services -- ');
    twitterAPI.setToken({
        key: config.adsAccount.tokenKey,
        secret: config.adsAccount.tokenSecret
    });
    let cardsData = [];
    twitterAPI.get(config.adsAccount.adsAPI.websiteCards, function (err, results, tweets) {

        let cards = JSON.parse(results.body);
        //console.log('medias ', medias);
        dataStore.getMediaKeys(req.query.user_id).then((mediaKeys)=> {
            console.log('m keys --> ',mediaKeys)
            cards.data.forEach((element)=>  {
                if(mediaKeys.includes(element.media_key))   {
                    cardsData.push(element);
                }
            })
            console.log('cardsData ',cardsData);
            res.send(cardsData);
    
        })    
    });
});

router.delete("/", function (req, res) {
    console.log('-- DELETE Cards Services -- ', req.body.cardId);
    let url = config.adsAccount.adsAPI.websiteCards + req.body.cardId
    twitterAPI.delete(url, function (err, results, tweets) {
        res.send(results.body);
    });
});

router.post("/tweet", function (req, res) {
    console.log('Tweet Post ',req.body)
    var tweetOptions = {
        url: config.v11API.tweet,
        json: true,
        form: { 'status': req.body.tweet, 'card_uri': req.body.cardURI },
    }
    twitterAPI.setToken({
        key: req.body.oauthToken,
        secret: req.body.oauthTokenSecret
    });
    twitterAPI.post(tweetOptions, function (error, response, results) {
        if (error)
            console.log('Twitter error ', error);
        if (response)   {
            console.log('Twitter response ', response.body);
            res.send(response.body);
        }
    })
})

router.post("/create-card", function (req, res) {
    console.log('-- Create Ads Cards Services -- ', req.body);
    createCard(req.body).then((card) => {
        console.log('card URI ', card.card_uri)
        res.send({ 'card_uri': card.card_uri });
    }).catch(function (error) {
        res.send({ 'error': error })
    })

});

async function createCard(cardForm) {
    console.log('CardForm ', cardForm)
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

module.exports = router
