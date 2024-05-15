const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const port = process.env.PORT || 1000;
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
//Middleware
const corsOptions = {
  origin: [
    'https://library-management-1d9c1.web.app',
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ],
  credentials: true,
  // optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
  
// verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      console.log(decoded);
      req.user = decoded;
      next();
    });
  }
  console.log(token);
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tostkkh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();
    const bookCollection = client.db("booksDB").collection("books");
    const borrowBookCollection = client.db("booksDB").collection("borrowBooks");

    // JWT token
    // **********************************************************************************
    // tala ==> use to verify ==> park e ghurte jabo
    //... banai debo ==> front e send korbo ==> abar anbo

    // token generate
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });

      // res.send({token}) // data moddhe pabo
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // clear token with log out
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    // **********************************************************************************

    // Insert data
    app.post("/books",verifyToken, async (req, res) => {
      const result = await bookCollection.insertOne(req.body);
      res.send(result);
    });
    // Get All Data
    app.get("/books", verifyToken,  async (req, res) => {
      const result = await bookCollection.find().toArray();
      res.send(result);
    });
    // get filtered data if book quantity > 0
    app.get("/filter", async (req, res) => {
      const result = await bookCollection
        .find({ quantity: { $gt: 0 } })
        .toArray();
      res.send(result);
    });
    // get single data using id
    app.get("/singleData/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    });
    // update book data
    app.put("/singleData/:id", async (req, res) => {
      const id = req.params.id;
      const bookData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateBook = {
        $set: {
          ...bookData,
        },
      };
      const result = await bookCollection.updateOne(query, updateBook, options);
      res.send(result);
    });

    // POST ******************************************
    app.post("/borrow", async (req, res) => {
      try {
        // Check if the user has already borrowed the book
        const existingBorrow = await borrowBookCollection.findOne({
          bookId: req.body.bookId,
          userEmail: req.body.userEmail,
        });

        // If the user has already Paborrowed the book, return an error response
        if (existingBorrow) {
          return res
            .status(400)
            .json({ error: "User has already borrowed this book." });
        }

        // Insert the new borrowing book
        const result = await borrowBookCollection.insertOne(req.body);

        // Decrement the quantity of the borrowed book in the book collection
        const result2 = await bookCollection.updateOne(
          { _id: new ObjectId(req.body.bookId) },
          { $inc: { quantity: -1 } }
        );

        res.send(result);
      } catch (error) {
        res
          .status(500)
          .json({ error: "An error occurred while borrowing the book." });
      }
    });

    //  *******************************************************

    // ******************************************************
    app.delete("/borrow/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id, req.query.bookId);
      const result = await borrowBookCollection.deleteOne({
        _id: new ObjectId(id),
      });
      console.log(result);
      const result2 = await bookCollection.updateOne(
        { _id: new ObjectId(req.query.bookId) },
        { $inc: { quantity: 1 } }
      );
      res.send(result);
    });

    // get data from post
    app.get("/borrow", async (req, res) => {
      const result = await borrowBookCollection.find().toArray();
      res.send(result);
    });
    // Get Borrowed book by email
    app.get("/borrow/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const result = await borrowBookCollection
        .find({ userEmail: email })
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
  res.send("welcome here!!");
});

app.listen(port, (req, res) => {
  console.log(`This project is running on port ${port}`);
});




// BORROW-BOOK: If user want they can borrow their favourite book. and each user can see all the  books they had borrowed. they will return the book within the returned date they provided
// CRUD: user have freedom to add any book at any time.also user can update any book information if any wrong information added mistakenly.
// JWT: for keeping user borrowed book secure jwt has been implemented. so that, unauthorized user will now get permit to see other's borrowed book.
// SECURITY: for security firebase authenticatin system has been used. also private route has been implemented. so that, user can not navigate all page without login the website.

