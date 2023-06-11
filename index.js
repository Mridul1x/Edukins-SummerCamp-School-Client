const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.bi1yihr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("summercamp").collection("users");
    const classesCollection = client.db("summercamp").collection("classes");
    const instructorCollection = client
      .db("summercamp")
      .collection("instructor");
    const selectedItemsCollection = client
      .db("summercamp")
      .collection("selectedItems");
    const paymentCollection = client.db("summercamp").collection("payments");

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //user make admin api jwt

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "Admin" };
      res.send(result);
    });
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "Admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //user make instructor api jwt

    app.get("/users/instructor/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "Instructor" };
      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "Instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    app.get("/instructor", async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    });
    // TODO: veryfyjt >
    app.get("/selectedItems", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ error: true, message: 'forbidden access' })
      // }

      const query = { email: email };
      const result = await selectedItemsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/selectedItems", async (req, res) => {
      const item = req.body;
      const result = await selectedItemsCollection.insertOne(item);
      res.send(result);
    });
    app.delete("/selectedItems/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedItemsCollection.deleteOne(query);
      res.send(result);
    });
    // payment
    // TODO verifyJWT >
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // payment
    // TODO verifyJWT >
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query = {
        _id: { $in: payment.selectedItems.map((id) => new ObjectId(id)) },
      };
      const deleteResult = await selectedItemsCollection.deleteMany(query);

      res.send({ insertResult, deleteResult });
    });
    app.post("/update-available-seats", async (req, res) => {
      const { classIds } = req.body;
      const updateResult = await classesCollection.updateMany(
        { _id: { $in: classIds.map((id) => new ObjectId(id)) } },
        { $inc: { availableSeats: -1 } }
      );

      res.send(updateResult);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running Successfully");
});

app.listen(port, () => {
  console.log(`Bistro boss is sitting on port ${port}`);
});
