const express = require("express");
const config = require('../config.js');
const crypto = require('crypto');
const OAuth = require('oauth-request');
const queryString = require('query-string');
const axios = require("axios").default;
const fs = require('fs').promises;
const dataStore = require('.././services/dataStore.js');
const cloudStorage = require('.././services/cloudStorage.js');
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
    console.log('-- Media Services -- ');
    res.send('Media Services');
});

router.get("/library", function (req, res) {
    console.log('-- Media Library Services -- ', req.query.user_id);
    let mediaData = [];
    twitterAPI.get(config.adsAccount.adsAPI.mediaLibrary, function (err, results, tweets) {
        let medias = JSON.parse(results.body);
        //console.log('medias ', medias);
        dataStore.getMediaKeys(req.query.user_id).then((mediaKeys) => {
            console.log('m keys --> ', mediaKeys)
            medias.data.forEach((element) => {
                if (mediaKeys.includes(element.media_key)) {
                    mediaData.push(element);
                }
            })
            console.log('mediaData ', mediaData);
            res.send(mediaData);

        })
    });
});

router.post("/upload", function (req, res) {
    if (req.files)
        console.log('-- Media Upload Services -- ', req.files, ' Body ', req.body);
    let uploadedFile = req.files.File;
    uploadedFile.mv(config.fileStorageDir + uploadedFile.name);
    // check file extension for video/GIF
    let fileExt = uploadedFile.name.split(".");
    if (fileExt[1] === 'mp4' || fileExt[1] === 'mov' || fileExt[1] === 'gif' || fileExt[1] === 'avi') {
        console.log('Video/GIF file upload');
        // res.send({'message':'Video files are not supported', 'code':'501'});
        uploadVideo(uploadedFile, req.body.userId).then((result)   =>  {
            console.log('VIDEO UPLOADED -- SUCCESS');
            res.send(result);
        });
    } else {
        uploadMedia(uploadedFile).then((media) => {
            uploadMediaLib(media.media_key, uploadedFile.name).then((results) => {
                utils.createCard({ 'mediaKey': media.media_key, 'cardName': 'validate_card', 'websiteURL': 'https://www.twitter.com', 'websiteTitle': 'Twitter' }).then((card) => {
                    console.log('Validatin card created ', card.data)
                    updateUserMediaMap(req.body.userId, media.media_key);
                    utils.deleteCard(card.data.id);
                    res.send(results)
                }).catch(function (error) {
                    // Card validation failed
                    res.send(error);
                });
            });
        }).catch(function (error) {
            console.log('~~~~~ MEDIA upload error ~~~~~ ', error)
        });
    }
});

async function updateUserMediaMap(userId, mediaKey) {
    console.log('updateUserMediaMap ', userId, ' - ', mediaKey);
    dataStore.upsertMediaKey(userId, mediaKey);

}

async function uploadMediaLib(mediaKey, fileName) {
    console.log('uploadMediaLib ', mediaKey, fileName)
    return new Promise(function (resolve, reject) {
        let options = {
            url: config.adsAccount.adsAPI.mediaLibrary,
            json: true,
            headers: { "Content-Type": "application/json" },
            form: { 'media_key': mediaKey, 'file_name': fileName, 'name': 'Game Cards' }

        }
        twitterAPI.post(options, function (error, response, results) {
            if (error) {
                console.log('Twitter uploadMediaLib error ', error);
                reject(error);
            }
            if (response) {
                console.log('Twitter uploadMediaLib response ', response.body);
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

async function uploadVideo(uploadedFile, userId) {
    let encodedFile = await fs.readFile(config.fileStorageDir + uploadedFile.name, { encoding: 'base64' });
    return new Promise(function (resolve, reject) {
        utils.initializeMediaUpload(uploadedFile.size, uploadedFile.mimetype).then((mediaId) => {
            console.log(' INIT Media Id ', mediaId);
            utils.appendFileChunk(mediaId, encodedFile, 0).then((aMediaId) => {
                console.log(' APPEND Media Id ', aMediaId);
                utils.finalizeUpload(aMediaId).then((media) => {
                    console.log(' FINALIZE Media Id ', media);
                    utils.sleep(2000);
                    utils.uploadStatus(media.media_id_string).then((status) => {
                        console.log('UPLOAD STATUS ', status);
                        uploadMediaLib(media.media_key, uploadedFile.name).then((result) => {
                            updateUserMediaMap(userId, media.media_key);
                            console.log('Upload video to Media Lib ', result)
                            resolve(result);
                        })
                    })
                }).catch(function (error) {
                    console.log('FINALIZE ERROR ', error);
                    reject(error);
                })
            });

        })
    })

}

module.exports = router
