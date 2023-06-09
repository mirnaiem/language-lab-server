const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors())
app.use(express.json())

const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error:true,message:'unauthorized access'})
  }
  const token=authorization.split(' ')[1];
  jwt.verify(token,process.env.ACCESS_TOKEN,(err,decoded)=>{
    if(err){
    return res.status(401).send({error:true,message:'unauthorized access'})

    }
    req.decoded=decoded;
    next()
  })
}
 

const uri = `mongodb+srv://${process.env.VITE_UserName}:${process.env.VITE_Password}@cluster0.tefm3zp.mongodb.net/?retryWrites=true&w=majority`;

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
  await client.connect();

  const usersCollection = client.db("assignment12").collection('users')

  // Jwt
app.post('/jwt',(req,res)=>{
 const user=req.body;
 const token=jwt.sign(user,process.env.Access_Token,{expiresIn: '1h'});
 res.send({token})
})

  // users related api's

  // admin
  app.get('/users/admin/:email',verifyJWT,async(req,res)=>{
    const email=req.params?.email;
    const decodedEmail=req.decoded?.email;
    if(decodedEmail !== email){
     return res.send({admin:false})
    }
    const query={email:email}
    const user=await usersCollection.findOne(query);
    const result={admin:user?.role === 'Admin'};
    res.send(result)
  })
// instructor
  app.get('/users/instructor/:email',verifyJWT,async(req,res)=>{
    const email=req.params?.email;
    const decodedEmail=req.decoded?.email;
    if(decodedEmail !== email){
     return res.send({admin:false})
    }
    const query={email:email}
    const user=await usersCollection.findOne(query);
    const result={admin:user?.role === 'Instructor'};
    res.send(result)
  })

  app.get('/users', async (req, res) => {
   const query = req.body;
   const result = await usersCollection.find(query).toArray();
   res.send(result);
  })
  app.post('/users', async (req, res) => {
   const user = req.body;
   const email = { email: user.email }
   const existingUser = await usersCollection.findOne(email)
   if (existingUser) {
    return res.send({ message: 'user already exist' })
   }
   const result = await usersCollection.insertOne(user);
   res.send(result)
  })

  app.patch('/users/admin/:id', async (req, res) => {
   const id = req.params.id;
   const filter = { _id: new ObjectId(id) };
   const updateDoc = {
    $set: {
     role: 'Admin'
    }
   }
   const result = await usersCollection.updateOne(filter, updateDoc);
   res.send(result)
  })
  app.patch('/users/instructor/:id', async (req, res) => {
   const id = req.params.id;
   const filter = { _id: new ObjectId(id) };
   const updateDoc = {
    $set: {
     role: 'Instructor'
    }
   }
   const result = await usersCollection.updateOne(filter, updateDoc);
   res.send(result)
  })

  // Send a ping to confirm a successful connection
  await client.db("admin").command({ ping: 1 });
  console.log("Pinged your deployment. You successfully connected to MongoDB!");
 } finally {
  // Ensures that the client will close when you finish/error
  // await client.close();
 }
}
run().catch(console.dir);

app.get('/', (req, res) => {
 res.send('assignment 12 on the way')
})
app.listen(port)