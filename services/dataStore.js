const { Datastore } = require('@google-cloud/datastore');

// Instantiate a datastore client
const datastore = new Datastore({
  projectId: 'twttr-des-sa-demo-dev',
});

async function upsertMediaKey(userId, mediaKey) {
  const query = datastore
    .createQuery('userMediaMap')
    .filter('userId', '=', userId);

  const [tasks] = await datastore.runQuery(query);
  console.log('Tasks:');
  if (tasks.length > 0) {
    tasks.forEach(task => {
      console.log(task);
      let temp_media_key = task.media_keys
      temp_media_key.push(mediaKey)
      task.media_keys = temp_media_key;
      datastore.update(task);
    });
  } else {
    const userIdKey = datastore.key('userMediaMap');
    const data = {
      userId: userId,
      media_keys: [mediaKey]
    };

    const entity = {
      key: userIdKey,
      data: data,
    };
    await datastore.insert(entity);
  }
}

async function getMediaKeys(userId) {
  const query = datastore
    .createQuery('userMediaMap')
    .filter('userId', '=', userId);

  return new Promise(function (resolve, reject) {
    datastore.runQuery(query).then((tasks) => {
      let task = tasks[0];
      resolve(task[0].media_keys);
    }).catch(function(error)  {
      reject('Error in fetching media keys')
    })
  })

}

module.exports = { upsertMediaKey, getMediaKeys };