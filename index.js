const { MongoClient, ServerApiVersion , ObjectId} = require('mongodb');
const express = require('express')
const app = express()
const port = process.env.PORT || 1000 
require('dotenv').config()
const cors = require('cors')
//Middleware
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tostkkh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
const bookCollection=client.db('booksDB').collection('books')
const borrowBookCollection=client.db('booksDB').collection('borrowBooks')

// Insert data
app.post('/books',async(req,res)=>{
      const result = await bookCollection.insertOne(req.body)
      res.send(result)
    })
    // Get All Data
      app.get('/books',async(req,res)=>{
          const result = await bookCollection.find().toArray()
          res.send(result) 
      })
    // get filtered data if book quantity > 0
    app.get('/filter',async(req,res)=>{
      const result = await bookCollection.find({quantity:{$gt: 0}}).toArray()
      res.send(result)
    })
    // get single data using id
    app.get('/singleData/:id',async(req,res)=>{
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await bookCollection.findOne(query)
      res.send(result)
    })
    // update book data
    app.put('/singleData/:id',async(req,res)=>{
      const id = req.params.id 
      const bookData = req.body 
      const query = {_id: new ObjectId(id)}
      const options = {upsert:true}
      const updateBook ={
        $set:{
          ...bookData 
        }
      }
      const result = await bookCollection.updateOne(query, updateBook,options)
      res.send(result)
    })

// POST ******************************************
app.post('/borrow', async (req, res) => {
    // Check the number of books already borrowed by the user
    const userBorrowedBooks = await borrowBookCollection.find({
      userEmail: req.body.userEmail
    }).toArray();

    
    if (userBorrowedBooks.length >= 2) {
      return res.status(400).json({ error: "User has already borrowed two books." });
    }

    // Check if the user has already borrowed the book
    const existingBorrow = await borrowBookCollection.findOne({
      bookId: req.body.bookId,
      userEmail: req.body.userEmail
    });

    // If the user has already borrowed the book, return an error response
    if (existingBorrow) {
      return res.status(400).json({ error: "User has already borrowed this book." });
    }

    // Insert the new borrowing book
    const result = await borrowBookCollection.insertOne(req.body);

    // Decrement the quantity of the borrowed book in the book collection
    const result2 = await bookCollection.updateOne(
      { _id: new ObjectId(req.body.bookId) },
      { $inc: { quantity: -1 } }
    );

    res.send(result);

});    
      //  *******************************************************

    // ******************************************************
    app.delete('/borrow/:id',async(req,res)=>{
      const id =req.params.id
     console.log(id,req.query.bookId)
      const result = await borrowBookCollection.deleteOne({_id:new ObjectId(id)})
      console.log(result)
      const result2 = await bookCollection.updateOne(
        { _id:new ObjectId(req.query.bookId) },
        { $inc: { quantity: 1 } } 
    );
      res.send(result)
    })


  
    // get data from post
  app.get('/borrow',async(req,res)=>{
    const result =await borrowBookCollection.find().toArray()
    res.send(result) 
  })
  // Get Borrowed book by email 
  app.get('/borrow/:email',async(req,res)=>{
    console.log(req.params.email)
   const result = await borrowBookCollection.find({userEmail:req.params.email}).toArray()
   res.send(result)
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


app.get('/',(req,res)=>{
    res.send('welcome here!!')
})

app.listen(port,(req,res)=>{
    console.log(`This project is running on port ${port}`)
})     