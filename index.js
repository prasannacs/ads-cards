const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors')
const fileUpload = require('express-fileupload');
const login = require('./controllers/login')
const media = require('./controllers/media')
const cards = require('./controllers/cards')

const app = express();
const PORT = process.env.PORT || 4080;

app.use(cors());
app.options('*', cors()) 
app.post('*', cors()) 
app.get('*', cors()) 

app.use(bodyParser.json({strict:false}));
app.use(bodyParser.urlencoded({ extended: true }));

// enable files upload
app.use(fileUpload({
    createParentPath: true
}));

app.use('/login', login)
app.use('/media', media)
app.use('/cards', cards)

app.listen(PORT, ()=>   {
    console.log("App listening on port",PORT);
    //stream.streamTweetsHttp();
});

module.exports = app;
