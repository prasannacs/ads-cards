const express = require("express");
const config = require('../config.js');
const crypto = require('crypto');
const OAuth = require('oauth-request');
const queryString = require('query-string');
const axios = require("axios").default;
const fs = require('fs').promises;
const dataStore = require('.././services/dataStore.js');
const cloudStorage = require('.././services/cloudStorage.js');

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
    console.log('-- Media Services -- ');
    res.send('Media Services');
});

router.get("/library", function (req, res) {
    console.log('-- Media Library Services -- ',req.query.user_id);
    let mediaData = [];
    twitterAPI.get(config.adsAccount.adsAPI.mediaLibrary, function (err, results, tweets) {
        let medias = JSON.parse(results.body);
        //console.log('medias ', medias);
        dataStore.getMediaKeys(req.query.user_id).then((mediaKeys)=> {
            console.log('m keys --> ',mediaKeys)
            medias.data.forEach((element)=>  {
                if(mediaKeys.includes(element.media_key))   {
                    mediaData.push(element);
                }
            })
            console.log('mediaData ',mediaData);
            res.send(mediaData);
    
        })    
    });
});

router.post("/upload", function (req, res) {
    if (req.files)
        console.log('-- Media Upload Services -- ', req.files, ' Body ',req.body);
    let uploadedFile = req.files.File;
    uploadedFile.mv(config.fileStorageDir + uploadedFile.name);
    // cloudStorage.uploadToGCS(uploadedFile.name, uploadedFile.data);
    uploadMedia(uploadedFile).then((media) => {
        uploadMediaLib(media.media_key, uploadedFile.name).then((results) => {
            updateUserMediaMap(req.body.userId,media.media_key);
            res.send(results)
        });
    });
});

async function updateUserMediaMap(userId, mediaKey)  {
    console.log('updateUserMediaMap ',userId,' - ',mediaKey);
    dataStore.upsertMediaKey(userId,mediaKey);

}

async function uploadMediaLib(mediaKey, fileName) {
    return new Promise( function (resolve, reject)  {
        let options = {
            url: config.adsAccount.adsAPI.mediaLibrary,
            json: true,
            headers: { "Content-Type": "application/json"},
            form: { 'media_key': mediaKey, 'file_name': fileName, 'name': 'Game Cards' }

        }
        twitterAPI.post(options, function (error, response, results) {
            if (error) {
                console.log('Twitter error ', error);
                reject(error);
            }
            if (response) {
                console.log('Twitter response ', response.body);
                resolve(response.body);
            }
        })
    })
}

async function uploadMedia(uploadedFile) {
    let encodedFile = await fs.readFile(config.fileStorageDir + uploadedFile.name, { encoding: 'base64' });
    return new Promise(function (resolve, reject) {
        let options = {
            url: config.v11API.media,
            json: true,
            headers: { "Content-Type": "application/octet-stream", "Content-Transfer-Encoding": "base64" },
            form: { 'media_category': 'tweet_image', 'media_data': encodedFile }
        }
        twitterAPI.post(options, function (error, response, results) {
            if (error) {
                console.log('Twitter error ', error);
                reject(error);
            }
            if (response) {
                console.log('Twitter response ', response.body);
                resolve(response.body);
            }
        })

    });
}

module.exports = router
