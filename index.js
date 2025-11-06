const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;

const serviceAccount = require("./smart-deals-shop-firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});



// Middleware
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
  console.log("login info");
  next();
};

const verifyFirebaseToken = async (req, res, next) => {
  console.log("in the verify middleware", req.headers.authorization);

  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  try {
    const userInfoToken = await admin.auth().verifyIdToken(token);
    console.log("after valid token", userInfoToken);
    req.token_email = userInfoToken.email;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).send({ message: "unauthorized access" });
  }
};

const uri =
  "mongodb+srv://smartdbUser:NAmEHQhJ6rpXIPqB@cluster0.cewig2g.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("smartDealsDB");
    const productsCollection = db.collection("products");
    const bidsCollection = db.collection("bids");
    const usersCollections = db.collection("users");
    // Users API
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollections.findOne(query);
      if (existingUser) {
        res.send({
          message: "user already exits. do not need to insert again",
        });
      } else {
        const result = await usersCollections.insertOne(newUser);
        res.send(result);
      }
    });
    // Products API
    app.get("/products", async (req, res) => {
      // const projectField = {title: 1, price_min: 1, price_max: 1, image: 1}
      // const cursor = productsCollection.find().sort({price_min: 1}).skip(2).limit(5).project(projectField);

      console.log(req.query);
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const cursor = productsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/latest-product", async (req, res) => {
      const cursor = productsCollection
        .find()
        .sort({
          created_at: -1,
        })
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await productsCollection.findOne(query);
      res.send(cursor);
    });

    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updateProduct = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updateProduct.name,
          price: updateProduct.price,
        },
      };
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // Bids realted APIs
    app.get("/bids", logger, verifyFirebaseToken, async (req, res) => {
      // console.log('headers', req.headers);

      const email = req.query.email;
      const query = {};
      if (email) {
        query.buyer_email = email;
        if (email !== req.token_email) {
          return res.status(403).send({ message: "forbiden access" });
        }
      }
      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get(
      "/products/bids/:productId",
      verifyFirebaseToken,
      async (req, res) => {
        const productId = req.params.productId;
        const query = { product_id: productId };
        console.log(productId);

        const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
        const result = await cursor.toArray();
        res.send(result);
      }
    );

    // app.get('/bids', async (req, res) => {
    //   const query = {};
    //   if (email) {
    //     query.buyer_email = email;
    //   }
    //   const cursor = bidsCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // })

    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });

    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Smart Deals Server is running");
});

app.listen(port, () => {
  console.log(`Smart server is running on port: ${port}`);
});
