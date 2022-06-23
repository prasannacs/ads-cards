const { Storage } = require('@google-cloud/storage');
const FileReader = require('filereader')

const storage = new Storage();

async function uploadToGCS(destFileName, contents) {
    await storage.bucket('ads-cards').file(destFileName).save();
    // console.log(
    //     `${destFileName} with contents ${contents} uploaded to ads-cards.`
    // );
}

async function streamFileDownload(fileName) {
    return new Promise(function(resolve,reject) {
        storage.bucket('ads-cards').file(fileName).download().then((contents)=> {
            resolve(contents.toString('base64'));
        }).catch(function (error)   {
            reject(error);
        })
    })
    // let contents = await storage.bucket('ads-cards').file(fileName).download();
    // return contents.toString();
  }

async function getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

module.exports = { uploadToGCS, streamFileDownload, getBase64 };