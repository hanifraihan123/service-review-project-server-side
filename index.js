const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors({
  origin: ['http://localhost:5173','https://service-review-client-419db.web.app'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req,res,next) => {
  const token = req.cookies?.token;
  if(!token){
    return res.status(401).send({message: 'Unauthorized Access'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
    if(err){
      return res.status(401).send({message: 'Unauthorized Access'})
    }
    req.user = decoded;
    next();
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.neb49.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const serviceCollection = client.db("serviceReview").collection("services");
    const reviewCollection = client.db('allReviews').collection('reviews');
    const userCollection = client.db("allUsers").collection('users');

    // Perform the CRUD operations here
    app.post('/addService',verifyToken, async(req,res)=>{
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    })

    // jwt token related APIs
    app.post('/jwt', (req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '10h'});
        res
        .cookie('token',token,{
            sameSite: 'none',
            httpOnly: true,
            secure: true
            })
        .send({success: true})
    })

    app.post('/logout', (req,res)=>{
      res
      .clearCookie('token', {
            sameSite: 'none',
            httpOnly: true,
            secure: true
      })
      .send({success: true})
    })

    // Read all services
    app.get('/services', async(req,res)=>{
      const filter = req.query.filter;
      const search = req.query.search;
      let query = {title: { $regex:search, $options:'i' }};
      if(filter) query.category = filter;
      const cursor = serviceCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/allService', async(req,res)=>{
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    // Home page 6 data
    app.get('/some-services', async(req,res)=>{
      const cursor = serviceCollection.find().limit(6);
      const result = await cursor.toArray();
      res.send(result);
    })

    // Read a single service
    app.get('/service/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await serviceCollection.findOne(query);
      res.send(result);
    })

    // Update service Details APIs
    // app.patch('/services/:id', async(req,res)=>{
    //   const id = req.params.id;
    //   const filter = {_id: new ObjectId(id)}
    //   const updatedService = {
    //     $set: {

    //     }
    //   }
    //   const result = await serviceCollection.updateOne(filter,updatedService)
    //   res.send(result)
    // })

    // Get a single service by email
    app.get('/services/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const search = req.query.search;
      const query = {email,category: { $regex:search, $options:'i' }}
      if(req.user.email !== req.params.email){
        return res.status(403).send({message: 'Forbidden Access'})
      }
      const result = await serviceCollection.find(query).toArray();
      res.send(result);
    })

    // Service Delete related APIs
    app.delete('/service/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await serviceCollection.deleteOne(query)
      res.send(result)
    })

    // Review related APIs
    app.post('/allReviews', async(req,res)=>{
      const reviews = req.body;
      const result = await reviewCollection.insertOne(reviews);
      res.send(result);
    })

    // Get all reviews
    app.get('/reviews', async(req,res)=>{
      const cursor = reviewCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // Get specific Review
    app.get('/review', async(req,res)=>{
      const id = req.query.id;
      const query = {serviceId: id}
      const result = await reviewCollection.find(query).toArray();
      res.send(result)
    })

    
    // Update Review details related APIs
    app.patch('/review/:id', async(req,res)=>{
      const id = req.params.id;
      const updateReview = req.body;
      const filter = {_id: new ObjectId(id)}
      const updatedReview = {
        $set: {
          review: updateReview.review,rating: updateReview.rating
        }
      }
      const result = await reviewCollection.updateOne(filter,updatedReview)
      res.send(result)
    })

    // Get User's Review
    app.get('/review/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = {email};
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/review/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await reviewCollection.deleteOne(query);
      res.send(result)
    })

    // User Collection APIs
    app.post('/addUser', async(req,res)=>{
      const user = req.body;
      // if(user.email === "") return res.status(400).send('Empty User cant add')
      const query = {email: user.email}
      const alreadyExist = await userCollection.findOne(query);
        if (alreadyExist)
        return res
          .status(400)
          .send('You have already registered')
          const result = await userCollection.insertOne(user)
          res.send(result)
    })
   
    // Get All users
    app.get('/users', async(req,res)=>{
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Service Review Server is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});