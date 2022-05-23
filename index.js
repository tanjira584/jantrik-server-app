const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://tanjirdemo:${process.env.DB_PASS}@cluster0.3jhfr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

async function run() {
    try {
        await client.connect();
        const productCollection = client
            .db("jantrik-app")
            .collection("product");

        app.get("/products", async (req, res) => {
            const query = {};
            const products = await productCollection.find(query).toArray();
            res.send(products);
        });
    } finally {
    }
}
run().catch(console.dir);
app.get("/", async (req, res) => {
    res.send("Hello, This is Jantrik Web Server");
});
app.listen(port, () => {
    console.log("Server Running Successfully");
});
