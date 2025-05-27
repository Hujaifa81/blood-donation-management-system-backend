require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { parse } = require('dotenv');
const app = express();
const port = process.env.PORT || 5000;
const secretKey = process.env.JWT_SECRET;
app.use(cors({
  origin: ['http://localhost:5173', 'https://blood-donation-managemen-7ebd3.web.app'],
  credentials: true,
  optionSuccessStatus: 200,
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
    const blogsCollection = client.db('blood_donation').collection('blogs')

    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      // console.log('data from verifyToken middleware--->', req.user?.email)
      const email = req.user?.email
      const query = { email }
      const result = await usersCollection.findOne(query)
      if (!result || result?.role !== 'admin')
        return res
          .status(403)
          .send({ message: 'Forbidden Access! Admin Only Actions!' })

      next()
    }
    // verify volunteer middleware
    const verifyVolunteer = async (req, res, next) => {
      // console.log('data from verifyToken middleware--->', req.user?.email)
      const email = req.user?.email
      const query = { email }
      const result = await usersCollection.findOne(query)
      if (!result || result?.role !== 'volunteer')
        return res
          .status(403)
          .send({ message: 'Forbidden Access! Volunteer Only Actions!' })

      next()
    }
    // verify admin or volunteer middleware
    const verifyAdminOrVolunteer = async (req, res, next) => {
      // console.log('data from verifyToken middleware--->', req.user?.email)
      const email = req.user?.email
      const query = { email }
      const result = await usersCollection.findOne(query)
      if (!result || (result?.role !== 'admin' && result?.role !== 'volunteer'))
        return res
          .status(403)
          .send({ message: 'Forbidden Access! Admin or Volunteer Only Actions!' })

      next()
    }
    // verify admin  or donor middleware
    const verifyDonorOrAdmin = async (req, res, next) => {
      // console.log('data from verifyToken middleware--->', req.user?.email)
      const email = req.user?.email
      const query = { email }
      const result = await usersCollection.findOne(query)
      if (!result || (result?.role !== 'donor' && result?.role !== 'admin'))
        return res
          .status(403)
          .send({ message: 'Forbidden Access! Donor or Admin Only Actions!' })

      next()
    }

    // Generate jwt token
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, secretKey, {
        expiresIn: '1d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    //users count
    app.get('/users/count', verifyToken, verifyAdmin, async (req, res) => {
      const status = req.query.status
      const role = req.query.role
      let query = {}
      if (role) {
        query.role = role;
      }
      if (status) {
        query = { status }
      }
      const result = await usersCollection.countDocuments(query);

      res.send(result)
    })
    //get all users
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

      const status = req.query.status;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 0; // 0 means no pagination
      const skip = (page - 1) * limit;

      let query = {};

      if (status) {
        query.status = status;
      }

      try {
        const cursor = usersCollection.find(query).sort({ _id: -1 });
        const result = limit
          ? await cursor.skip(skip).limit(limit).toArray()
          : await cursor.toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Internal server error' });
      }
    });
    //search users by blood group, district, upazila 
    app.get('/donors/search', async (req, res) => {

      const bloodGroup = req.query.bloodGroup;
      const district = req.query.district;
      const upazila = req.query.upazila;
      const search = req.query.search;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 0; // 0 means no pagination
      const skip = (page - 1) * limit;
      if (!search || !bloodGroup || !district || !upazila) {
        return res.status(400).send({ message: 'At least one search parameter is required' });
      }
      let query = {};

      if (search) {
        if (bloodGroup) {
          query.bloodGroup = bloodGroup;
        }
        if (district) {
          query.district = district;
        }
        if (upazila) {
          query.upazila = upazila;
        }
        query.role = 'donor';
      }

      try {
        const cursor = usersCollection.find(query).sort({ _id: -1 });
        const result = limit
          ? await cursor.skip(skip).limit(limit).toArray()
          : await cursor.toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Internal server error' });
      }
    });

    //get single user by email
    app.get('/user/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (req.user?.email !== email) {
        return res.status(403).send({ message: 'Forbidden Access! You can only access your own data.' });
      }
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
    app.put('/user/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.user?.email !== email) {
        return res.status(403).send({ message: 'Forbidden Access! You can only access your own data.' });
      }
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
    app.patch('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
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
    app.get('/donationRequests/count/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (req.user?.email !== email) {
        return res.status(403).send({ message: 'Forbidden Access! You can only access your own data.' });
      }
      const status = req.query.status
      let query = { email: email }
      if (status) {
        query = { status, email }
      }
      const result = await donationRequestsCollection.countDocuments(query);
      res.send(result)
    })
    //get single donation request by id
    app.get('/donationRequest/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await donationRequestsCollection.findOne(query);
      res.send(result);
    });
    //donation requests count
    app.get('/donationRequests/count', verifyToken, verifyAdminOrVolunteer, async (req, res) => {
      const status = req.query.status
      let query = {}
      if (status) {
        query = { status }
      }
      const result = await donationRequestsCollection.countDocuments(query);
      res.send(result)
    })
    //get all donation requests
    app.get('/donationRequests', verifyToken, verifyAdminOrVolunteer, async (req, res) => {
      const pageLimit = parseInt(req.query.limit)
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const skip = (page - 1) * limit;
      const status = req.query.status
      let query = {};
      if (status) {
        query.status = status
      }


      const cursor = await donationRequestsCollection.find(query).sort({ _id: -1 })
      const result = pageLimit ? await cursor.limit(pageLimit).toArray() : await cursor.skip(skip).limit(limit).toArray();

      res.send(result);
    });
    //get donation request by email
    app.get('/donationRequests/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.user?.email !== email) {
        return res.status(403).send({ message: 'Forbidden Access! You can only access your own data.' });
      }
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
    app.post('/donationRequests/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (req.user?.email !== email) {
        return res.status(403).send({ message: 'Forbidden Access! You can only access your own data.' });
      }
      const data = req.body
      const user = await usersCollection.findOne({ email });
      if (user.status === 'active') {
        const result = await donationRequestsCollection.insertOne({
          ...data,
          status: 'pending'
        })
        res.status(201).send({
          message: 'Donation Request created successfully',
          result
        });
      }
      else {
        return res.status(200).send({ message: 'User is blocked', result });
      }
    })
    //update donation request
    app.put('/donationRequests/:id', verifyToken, verifyDonorOrAdmin, async (req, res) => {
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
    app.patch('/donationRequests/:id', verifyToken, async (req, res) => {
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
    app.delete('/donationRequests/:id', verifyToken, verifyDonorOrAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await donationRequestsCollection.deleteOne(query)
      res.send({ success: true })
    })
    //logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
      } catch (err) {
        res.status(500).send(err)
      }
    })
    //create a blog
    app.post('/blogs', verifyToken, verifyAdminOrVolunteer, async (req, res) => {
      const data = req.body
      const result = await blogsCollection.insertOne({
        ...data,
        status: 'drafted'
      })
      res.status(201).send({
        message: 'blogs created successfully',
        result
      });
    })
    //get blogs count
    app.get('/blogs/count', async (req, res) => {
      const status = req.query.status

      let query = {}
      if (status) {
        query = { status }
      }
      const result = await blogsCollection.countDocuments(query);
      res.send(result)
    })
    //get all blogs
    app.get('/blogs', async (req, res) => {
      const status = req.query.status;
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const skip = (page - 1) * limit;
      try {

        let query = {};

        if (status) {
          query.status = status;
        }

        const result = await blogsCollection.find(query).skip(skip).limit(limit).toArray();
        res.status(200).send(
          result
        );
      } catch (error) {
        console.error('Failed to fetch blogs:', error);
        res.status(500).send({
          message: 'Internal server error',
          error: error.message
        });
      }
    });
    //get  blog with id
    app.get('/blogs/:id', async (req, res) => {

      const id = req.params.id;
      try {
        let query = { _id: new ObjectId(id) };

        const result = await blogsCollection.findOne(query);
        res.status(200).send(
          result
        );
      } catch (error) {
        console.error('Failed to fetch blogs:', error);
        res.status(500).send({
          message: 'Internal server error',
          error: error.message
        });
      }
    });
    //update a blog
    app.put('/blog/:id', verifyToken, verifyAdminOrVolunteer, async (req, res) => {
      const id = req.params.id
      const { title, content, thumbnail } = req.body
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          title: title,
          content: content,
          thumbnail: thumbnail
        }
      }
      const result = await blogsCollection.updateOne(query, updateDoc)
      return res.status(200).send({ message: 'successful', result });
    })
    //update blog status
    app.patch('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body
      const query = { _id: new ObjectId(id) }
      let updateDoc = {}
      if (status === 'drafted') {
        updateDoc = {
          $set: {
            status: 'published',
          }
        }
      }
      else {
        updateDoc = {
          $set: {
            status: 'drafted',
          }
        }
      }

      const result = await blogsCollection.updateOne(query, updateDoc)
      return res.status(200).send({ message: 'successful', result });
    })
    //delete a blog
    app.delete('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await blogsCollection.deleteOne(query)
      res.send({ success: true })
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
