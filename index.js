require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;
const secretKey = process.env.JWT_SECRET;
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized' });
  }
  try {
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'Unauthorized' });
      }
      req.user = decoded;

      next();
    })
  }
  catch (err) {
    return res.status(403).send({ message: 'Forbidden' });
  }

}

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.8oqwp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();
    const usersCollection=client.db('blood_donation').collection('users');

    // Verify JWT token
    app.post('/jwt', async (req, res) => {
      const user=req.body;
      const token=jwt.sign(user, secretKey, { expiresIn: '1h' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
      .send({success:true});

    })
    // Create a new user
    app.post('/users/:email',async(req,res)=>{
      const email=req.params.email;
      const user=req.body;
      const query={email};
      const isExist=await usersCollection.findOne(query);
      if(isExist){
       const updateDoc = {
        $set: {
        signedIn: new Date(),
      },
      };
      const result = await usersCollection.updateOne(query, updateDoc)
        return res.status(200).send({ message:'User already exists', result });
      }
      const result=await usersCollection.insertOne({
        ...user,
        role:'donor',
        status:'active',
        createdAt:new Date(),
        signedIn:new Date()
      });
      res.status(201).send({
        message:'User created successfully',
        result
      });
    })
    app.post('/logout', async (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',// Set to true if using HTTPS
        sameSite:process.env.NODE_ENV === 'production'?'none':'strict',
      })
      res.send({ success: true });
    })
    

    // // Connect the client to the server	(optional starting in v4.7)
    
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Blood Donation Management System Backend is running...');
});

app.listen(port, () => {
  // console.log(`Server running on port ${port}`);
});
