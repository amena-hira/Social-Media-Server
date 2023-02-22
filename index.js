const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const fs = require('fs');// create directory package
require('dotenv').config();
const port = process.env.PORT || 5000;
const path = require('path');
const fileUpload = require('express-fileupload')


// extra Multiple Images ----------
const bodyParser = require('body-parser')
// const upload = multer({ dest: 'uploads/' })
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.mkdir('./uploads/', (err) => {
            cb(null, './uploads/');
        });
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }

})

var upload = multer({ storage: storage });

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload())

// extra Multiple Images ----------
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use('/uploads', express.static('uploads'))




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwbwt8c.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const postsCollection = client.db('SocialMedia').collection('posts');
        const usersCollection = client.db('SocialMedia').collection('users');

        // Users
        app.post('/users', async (req, res) => {
            const users = req.body;
            const result = await usersCollection.insertOne(users);
            res.send(result);
        })
        app.get('/users/:email', async (req, res) => {
            const query = { email: req.params.email }
            const user = await usersCollection.findOne(query);
            res.send(user);
        })
        app.patch('/users', async (req, res) => {
            const query = { email: req.body.email };
            const updateDoc = {
                $set: {
                    name: req.body.name,
                    university: req.body.university,
                    address: req.body.address
                }
            }
            // console.log(updateDoc);
            const result = await usersCollection.updateOne(query, updateDoc);
            res.send(result);
        })


        // POSTS Multiple Images
        app.post('/posts', async (req, res) => {
            console.log("body: ",req.body,"files: ", req.files)
            const postMessage = req.body.postMessage;
            let imageUrl = [];
            for (const image of req.files.image) {
                const singleImage = image;
                const picData = singleImage.data;
                const picBufferData = picData.toString('base64');
                const imageBuffer = Buffer.from(picBufferData, 'base64')
                console.log("imagebuffer: ", imageBuffer)
                imageUrl.push(imageBuffer)
            }
            console.log(imageUrl)
            const posts = {
                postMessage,
                imageUrl,
                like: 0,
                comment: []
            }
            console.log(posts)
            const result = await postsCollection.insertOne(posts);
            res.send(result);
            // res.send({ result: 'ok' });
        })

        app.get('/posts', async (req, res) => {
            const query = {};
            const posts = await postsCollection.find(query).toArray();
            res.send(posts);
        })
        // limit and sort
        app.get('/popular/posts', async (req, res) => {
            const query = {};
            const posts = await postsCollection.find().sort({ like: -1 }).limit(3).toArray();
            res.send(posts);
        })

        app.get('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            console.log(query)
            const post = await postsCollection.findOne(query);
            res.send(post);
        })

        app.patch('/posts/:id', async (req, res) => {
            const id = req.params.id;
            console.log(req.body)
            const query = { _id: new ObjectId(id) }
            const post = await postsCollection.findOne(query);
            let result = '';
            if (JSON.stringify(req.body) === '{}') {
                const likeInt = parseInt(post.like);
                const likeNum = likeInt + 1;
                console.log('like number: ', likeNum);
                const updateDoc = {
                    $set: {
                        like: likeNum
                    }
                }
                result = await postsCollection.updateOne(query, updateDoc);
            }
            else {
                result = await postsCollection.updateOne(query, { $push: { comment: req.body.comment } });
            }
            res.send(result)

        })
    }
    finally {

    }
}
run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('SocialCon server is running');
})

app.listen(port, () => console.log(`SocialCon server is running on ${port}`))