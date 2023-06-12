const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.Secret_Key)
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
    console.log(err);
    if(err){
    return res.status(401).send({error:true,message:'unauthorized access to'})

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
  

  const usersCollection = client.db("assignment12").collection('users')
  const classCollection = client.db("assignment12").collection('classes')
  const selectCollection = client.db("assignment12").collection('select')
  const paymentCollection = client.db("assignment12").collection('payment')

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
 const token=jwt.sign(user,process.env.ACCESS_TOKEN,{expiresIn: '6d'});
 res.send({token})
})

  // users related api's

  // admin
  app.get('/users/admin/:email',async(req,res)=>{
    const email=req.params?.email;
    const decodedEmail=req.decoded?.email;
    // if(decodedEmail !== email){
    //  return res.send({admin:false})
    // }
    const query={email:email}
    const user=await usersCollection.findOne(query);
    const result={admin:user?.role === 'Admin'};
    res.send(result)
  })
// instructor
  app.get('/users/instructor/:email',async(req,res)=>{
    const email=req.params?.email;
    const decodedEmail=req.decoded?.email;
    // if(decodedEmail !== email){
    //  return res.send({instructor:false})
    // }
    const query={email:email}
    const user=await usersCollection.findOne(query);
    const result={instructor:user?.role === 'Instructor'};
    res.send(result)
  })

  app.get('/users',verifyJWT,verifyAdmin, async (req, res) => {
   const query = req.body;
   const result = await usersCollection.find(query).toArray();
   res.send(result);
  })
  app.get('/user/:email',verifyJWT, async (req, res) => {
   const email = req.params.email;
   const filter={email: email}
   const result = await usersCollection.findOne(filter);
   res.send(result);
  })

  app.get('/users/instructor', async (req, res) => {
    const filter = { role: 'Instructor' };
    const result = await usersCollection.find(filter).toArray();
    res.send(result);
  });

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

  app.patch('/users/admin/:id',verifyJWT,verifyAdmin, async (req, res) => {
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
  app.patch('/users/instructor/:id',verifyJWT,verifyAdmin, async (req, res) => {
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
   
  app.get('/classes/enroll', async (req, res) => {
    const filter = { enroll: { $exists: true } };
    const sort = { enroll: -1 };
    const limit = 6;
  
    const result = await classCollection.find(filter).sort(sort).limit(limit).toArray();
    res.send(result);
  });
 
  app.get('/classes/p-instructor', async (req, res) => {
    const instructorEnrollments = await classCollection.aggregate([
      { $match: { enroll: { $exists: true } } }, 
      { $group: { _id: '$instructorEmail', totalEnrollment: { $sum: '$enroll' }, instructorImage: { $first: '$instructorImage' }, instructorName:{$first: '$instructorName'} } }, 
      { $sort: { totalEnrollment: -1 } }, 
      { $limit: 6 }, 
      { $project: { email: '$_id', totalEnrollment: 1,instructorName:1, instructorImage: 1, _id: 0 } }
    ]).toArray();
  
    res.send(instructorEnrollments);
  });
  
  
  

  app.post('/classes', verifyJWT,verifyInstructor,async(req,res)=>{
    const query=req.body;
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
      status: 'Deny',
     }
    }
    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result)
   })
  
  app.patch('/classes/:id', verifyJWT, async (req, res) => {
    const id = req.params.id;
  
    const filter = { _id: new ObjectId(id) };
    const classDoc = await classCollection.findOne(filter);

    const updatedSeat = parseInt(classDoc.seat) - 1;
    const updatedEnroll = (classDoc.enroll || 0) + 1;
    
    const updateDoc = {
      $set: {
        seat: updatedSeat,
        enroll: updatedEnroll
      }
    };
    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result);
  });
  
  

  app.post('/classes/feedback/:id',verifyJWT,verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const feedbackInfo=req.body;
    const updateDoc = {
     $set: {
      feedback:feedbackInfo.feedback
     }
    }
    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result)
   })

   //selected class api's
  app.get('/selectclass/:email',verifyJWT,async(req,res)=>{
    const email=req.params?.email;
    const query={email:email};
    const result=await selectCollection.find(query).toArray();
    res.send(result)
  })
  app.get('/selectedclass/:id',verifyJWT,async(req,res)=>{
    const id=req.params.id;
    const query={_id:new ObjectId(id)}
    const result=await selectCollection.findOne(query);
    res.send(result);
  })
   app.post('/selectclass',async(req,res)=>{
    const selectedClass=req.body;
    const result=await selectCollection.insertOne(selectedClass);
    res.send(result) 
   })
 app.delete('/selectclass/:id',verifyJWT,async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await selectCollection.deleteOne(query)
  res.send(result)
 })

//  payment api
app.get('/payment/:email',verifyJWT,async(req,res)=>{
  const email=req.params.email;
  const query={email:email};
  const result=await paymentCollection.find(query).sort({ date: -1 }).toArray();
  res.send(result);
})
app.post('/payment',verifyJWT,async(req,res)=>{
  const query=req.body;
  const result=await paymentCollection.insertOne(query);
  res.send(result);
})

// payment-Intent
app.post('/payment-intent',async(req,res)=>{
  const {price}=req.body;
  const amount=parseInt(price*100);
  const paymentIntent =await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types:['card']
  })
  res.send({
    clientSecret:paymentIntent.client_secret
  })
})

  // Send a ping to confirm a successful connection
  // await client.db("admin").command({ ping: 1 });
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