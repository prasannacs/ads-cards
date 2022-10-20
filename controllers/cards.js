const express = require("express");
const config = require('../config.js');
const crypto = require('crypto');
const OAuth = require('oauth-request');
const queryString = require('query-string');
const axios = require("axios").default;
const dataStore = require('.././services/dataStore.js');
const utils = require('.././services/utils.js');

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
    let adsURL = config.adsAccount.adsAPI.carouselCards;
    // if( req.query.discriminator)    {
    //     adsURL = config.adsAccount.adsAPI.websiteCards;
    // }
    twitterAPI.get(adsURL, function (err, results, tweets) {
        let cards = JSON.parse(results.body);
        // console.log('-----------');
        // console.log('cards ', cards.data);
        // console.log('-----------');
        dataStore.getMediaKeys(req.query.user_id).then((mediaKeys) => {
            // if( req.query.discriminator)    {
            console.log('m keys --> ', mediaKeys)
            cards.data.forEach((element) => {
                if (element.components[0].media_key != undefined) {
                    if (mediaKeys.includes(element.components[0].media_key)) {
                        cardsData.push(element);
                    }
                } 
            })
            cards.data.forEach((element)    =>  {
                if (element.components[0].media_keys != undefined ) {
                    for(let i=0; i< element.components[0].media_keys.length; i++ ) {
                        if( mediaKeys.includes(element.components[0].media_keys[i] )  )  {
                            cardsData.push(element);
                            break;
                        }
                    }
                }
            })
            console.log('cardsData ', cardsData);
            res.send(cardsData);
        })
    });
});

router.delete("/", function (req, res) {
    console.log('-- DELETE Cards Services -- ', req.body.cardId);
    utils.deleteCard(req.body.cardId).then(() => {
        res.send('Card deleted');
    }).catch(function (error) {
        res.send('Delete error ');
        console.log('validation card not deleted')
    });
});

router.post("/tweet", function (req, res) {
    console.log('Tweet Post ', req.body)
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
        if (response) {
            console.log('Twitter response ', response.body);
            res.send(response.body);
        }
    })
})

router.post("/create-card", function (req, res) {
    req.body.mediaKey = req.body.mediaKey[0];
    console.log('-- Create Ads Cards Services -- ', req.body);
    utils.createCard(req.body).then((card) => {
        console.log('card URI ', card.data.card_uri)
        res.send({ 'card_uri': card.data.card_uri });
    }).catch(function (error) {
        res.send({ 'error': error })
    })

});

router.post("/create-carousel", function (req, res) {
    console.log('-- Create Carousel Cards Services -- ', req.body);
    createCarouselAxios(req.body).then((result) => {
        res.send({ 'card_uri': result.data.card_uri });
    }).catch(function (error) {
        res.send({ 'error': error })
    })
});

async function createCarouselAxios(media) {
    var data = JSON.stringify({
        "name": media.name,
        "components": [
            {
                "type": "SWIPEABLE_MEDIA",
                "media_keys": media.media_keys,
            },
            {
                "type": "DETAILS",
                "title": media.title,
                "destination": {
                    "type": "WEBSITE",
                    "url": media.url
                }
            }
        ]
    });
    let encodedSignature = utils.getEncodedSignature(config.adsAccount.adsAPI.carouselCards, 'POST', data);
    let auth_header = 'OAuth oauth_consumer_key="' + config.adsAccount.consumerKey + '",oauth_token="' + config.adsAccount.tokenKey + '",oauth_signature_method="HMAC-SHA1",oauth_timestamp="' + encodedSignature.timestamp + '",oauth_nonce="' + encodedSignature.nonce + '",oauth_version="1.0",';
    auth_header = auth_header + 'oauth_signature="' + encodedSignature.encodedSignature + '"';

    console.log('auth_header ', auth_header)
    // "Ku1UEZuMZKAz4Rh4edwSxOSJzD0%3D"';

    var axiosConfig = {
        method: 'post',
        url: config.adsAccount.adsAPI.carouselCards,
        headers: {
            'Authorization': auth_header,
            'Content-Type': 'application/json'
        },
        data: data
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

module.exports = router
