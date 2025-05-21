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
  origin: ['http://localhost:5173', 'https://blood-donation-managemen-7ebd3.web.app'],
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
    const usersCollection = client.db('blood_donation').collection('users');
    const donationRequestsCollection = client.db('blood_donation').collection('donationRequests')

    // Verify JWT token
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, secretKey, { expiresIn: '1h' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
        .send({ success: true });

    })
    //users count
    app.get('/users/count', async (req, res) => {
      const status = req.query.status
      let query = {}
      if (status) {
        query = { status }
      }
      const result = await usersCollection.countDocuments(query);

      res.send(result)
    })
    //get all users
    app.get('/users', async (req, res) => {
      const status = req.query.status
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const skip = (page - 1) * limit;
      let query = {}
      if (status) {
        query.status = status
      }
      const result = await usersCollection.find(query).skip(skip).limit(limit).toArray()
      res.send(result)
    })
    //get single user by email
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const query = { email }
      const result = await usersCollection.findOne(query)
      res.send(result)
    })
    // Create a new user
    app.post('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email };
      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        const updateDoc = {
          $set: {
            signedIn: new Date(),
          },
        };
        const result = await usersCollection.updateOne(query, updateDoc)
        return res.status(200).send({ message: 'User already exists', result });
      }
      const result = await usersCollection.insertOne({
        ...user,
        role: 'donor',
        status: 'active',
        createdAt: new Date(),
        signedIn: new Date()
      });
      res.status(201).send({
        message: 'User created successfully',
        result
      });
    })
    //update user details
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const { name, bloodGroup, district, upazila, image } = req.body
      const query = { email }
      const updateDoc = {
        $set: {
          name: name,
          bloodGroup: bloodGroup,
          district: district,
          upazila: upazila,
          image: image
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      return res.status(200).send({ message: 'successful', result });

    })
    //update user status or role
    app.patch('/user/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body
      const query = { _id: new ObjectId(id) }
      let updateDoc = {}
      if (data.userStatus) {
        updateDoc = {
          $set: {
            status: data.userStatus,
          }
        }
      }
      else {
        updateDoc = {
          $set: {
            role: data.role,
          }
        }
      }

      const result = await usersCollection.updateOne(query, updateDoc)
      return res.status(200).send({ message: 'successful', result });
    })
    //donation requests count by email
    app.get('/donationRequests/count/:email', async (req, res) => {
    const email=req.params.email
      const status = req.query.status
      let query = {email:email}
      if (status) {
        query = { status,email }
      }
      const result = await donationRequestsCollection.countDocuments(query);
      res.send(result)
    })
    //get single donation request by id
    app.get('/donationRequest/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }; // Ensure this matches your DB field

      const result = await donationRequestsCollection.findOne(query);
      res.send(result);
    });
    //donation requests count
    app.get('/donationRequests/count', async (req, res) => {
      const status = req.query.status
      let query = {}
      if (status) {
        query = { status }
      }
      const result = await donationRequestsCollection.countDocuments(query);
      res.send(result)
    })
    //get all donation requests
    app.get('/donationRequests', async (req, res) => {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const skip = (page - 1) * limit;
      const status = req.query.status
      let query = {};
      if (status) {
        query = {
          status: status
        }
      }

      const cursor = await donationRequestsCollection.find(query).sort({ _id: -1 })
      const result = await cursor.skip(skip).limit(limit).toArray();

      res.send(result);
    });
    //get donation request by email
    app.get('/donationRequests/:email', async (req, res) => {
      const email = req.params.email;
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const skip = (page - 1) * limit;
      const limitPerPage = parseInt(req.query.limit)
      const status = req.query.status
      let query = { email: email };
      if (status && email) {
        query = {
          email: email,
          status: status
        }
      }

      const cursor = await donationRequestsCollection.find(query).sort({ _id: -1 })
      const result = limitPerPage ? await cursor.limit(3).toArray() : await cursor.skip(skip).limit(limit).toArray();

      res.send(result);
    });

    //create donation request
    app.post('/donationRequests/:email', async (req, res) => {
      const email = req.params.email
      const data = req.body
      const user = await usersCollection.findOne({ email });
      if (user.status === 'blocked') {
        return res.status(200).send({ message: 'User is blocked', result });
      }
      const result = await donationRequestsCollection.insertOne({
        ...data,
        status: 'pending'
      })
      res.status(201).send({
        message: 'Donation Request created successfully',
        result
      });
    })
    //update donation request
    app.put('/donationRequests/:id', async (req, res) => {
      const id = req.params.id
      const { recipientName, recipientDistrict, donationTime, recipientUpazila, hospitalName, fullAddress, bloodGroup, donationDate } = req.body
      const query = { _id: new ObjectId(id) }
      let updateDoc = {
        $set: {
          recipientName: recipientName,
          recipientDistrict: recipientDistrict,
          recipientUpazila: recipientUpazila,
          hospitalName: hospitalName,
          fullAddress: fullAddress,
          bloodGroup: bloodGroup,
          donationDate: donationDate,
          donationTime: donationTime,

        },
      };


      const result = await donationRequestsCollection.updateOne(query, updateDoc)
      return res.status(200).send({ message: 'successful', result });
    })
    //update request status
    app.patch('/donationRequests/:id', async (req, res) => {
      const id = req.params.id
      const { status } = req.body
      const query = { _id: new ObjectId(id) }
      let updateDoc = {
        $set: {
          status: status,
        },
      };
      if (status === 'inprogress') {
        updateDoc = {
          $set: {
            status: status,
            donorInfo: req.body.donorInfo
          },
        };
      }

      const result = await donationRequestsCollection.updateOne(query, updateDoc)
      return res.status(200).send({ message: 'successful', result });
    })
    //delete a request
    app.delete('/donationRequests/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await donationRequestsCollection.deleteOne(query)
      res.send({ success: true })
    })
    //logout
    app.post('/logout', async (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',// Set to true if using HTTPS
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
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
