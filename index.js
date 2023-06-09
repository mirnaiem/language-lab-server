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
  const classCollection = client.db("assignment12").collection('classes')

  const verifyAdmin=async(req,res,next)=>{
    const email=req.decoded.email;
    const query={email:email};
    const user=await usersCollection.findOne(query);
    if(user?.role !== 'Admin'){
      return res.status(403).send({error:true, message:'forbidden user'} )
    }
    next()}

  const verifyInstructor=async(req,res,next)=>{
    const email=req.decoded.email;
    const query={email:email};
    const user=await usersCollection.findOne(query);
    if(user?.role !== 'Instructor'){
      return res.status(403).send({error:true, message:'forbidden user'} )
    }
    next()
  }

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

  app.get('/users',verifyJWT,verifyAdmin, async (req, res) => {
   const query = req.body;
   const result = await usersCollection.find(query).toArray();
   res.send(result);
  })

  app.post('/users',verifyJWT,verifyAdmin, async (req, res) => {
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

  // class related api's
  app.get('/admin/classes',verifyJWT,verifyAdmin,async(req,res)=>{
    const classes=req.body;
    const result=await classCollection.find(classes).toArray();
    res.send(result)
  })

  app.get('/instructor/classes/:email',verifyJWT,verifyInstructor,async(req,res)=>{
   const email=req.params.email;
   const query={instructorEmail:email}
   const result=await classCollection.find(query).toArray();
   res.send(result)
  })

  app.get('/classes', async (req, res) => {
    const status = 'Approve'; 
    const result = await classCollection.find({ status }).toArray();
    res.send(result);
  });
  
  app.post('/classes', verifyJWT,verifyInstructor,async(req,res)=>{
    const query=req.body;
    console.log(query);
    const result= await classCollection.insertOne(query);
    res.send(result)
  })

  app.patch('/classes/approve/:id',verifyJWT,verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
     $set: {
      status: 'Approve'
     }
    }
    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result)
   })
   
  app.patch('/classes/deny/:id',verifyJWT,verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
     $set: {
      status: 'Deny'
     }
    }
    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result)
   })

  app.post('/classes/feedback/:id',verifyJWT,verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const feedbackInfo=req.body;
    console.log(feedbackInfo)
    const updateDoc = {
     $set: {
      feedback:feedbackInfo.feedback
     }
    }
    const result = await classCollection.updateOne(filter, updateDoc);
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