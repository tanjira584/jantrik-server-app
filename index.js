const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const Stripe = require("stripe");

const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://tanjirdemo:${process.env.DB_PASS}@cluster0.3jhfr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});
/*------------Verify JWT <Token------*/
function verifyJwt(req, res, next) {
    const bearToken = req.headers.authorization;
    if (!bearToken) {
        return res.status(401).send({ message: "Unauthorize Access" });
    }

    const token = bearToken.split(" ")[1];
    jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "Forbidden Access" });
        }
        req.decoded = decoded;
        next();
    });
}
async function run() {
    try {
        await client.connect();
        const productCollection = client
            .db("jantrik-app")
            .collection("product");
        const userCollection = client.db("jantrik-app").collection("user");
        const orderCollection = client.db("jantrik-app").collection("order");
        const reviewCollection = client.db("jantrik-app").collection("review");
        const paymentCollection = client
            .db("jantrik-app")
            .collection("payment");

        /*-------Verify Admin-------*/
        async function verifyAdmin(req, res, next) {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({
                email: requester,
            });
            if (requesterAccount.role === "admin") {
                next();
            } else {
                return res.status(403).send({ message: "Forbidden Access" });
            }
        }
        /*--------Get Client Secret Key-----*/
        app.post("/client-payment-intent", verifyJwt, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        /*--------Order Place Post Controller-----*/
        app.post("/orders", verifyJwt, async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        /*-------All Order Get Controller----*/
        app.get("/orders", verifyJwt, async (req, res) => {
            const email = req.decoded.email;
            const query = { email: email };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });
        /*-------All Order Get Controller----*/
        app.get("/orders/admin", verifyJwt, verifyAdmin, async (req, res) => {
            const query = {};
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });
        /*------Single Order Get Controller----*/
        app.get("/order/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        });
        /*------Single Order Update Controller-----*/
        app.patch("/order/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            console.log(payment);
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    ...payment,
                },
            };
            const paid = await paymentCollection.insertOne(payment);
            const result = await orderCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
        /*---------Order Delete Controller-----*/
        app.delete("/order/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

        /*--------All Product Get Controller------*/
        app.get("/products", async (req, res) => {
            const query = {};
            const products = await productCollection.find(query).toArray();
            res.send(products.reverse());
        });

        /*-----Single Product Post Controller-------*/
        app.post("/products", verifyJwt, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });
        /*--------Single Product Get Controller------*/
        app.get("/product/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        });
        /*--------Single Product PATCH Controller------*/
        app.patch("/product/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const newStock = req.body.stock;
            const prod = await productCollection.findOne({ _id: ObjectId(id) });
            const updateDoc = {
                $set: {
                    ...prod,
                    stock: newStock,
                },
            };
            const result = await productCollection.updateOne(filter, updateDoc);

            res.send(result);
        });
        /*---------Product Delete Controller------*/
        app.delete("/product/:id", verifyJwt, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });
        /*-------All Review Get Controoler----*/
        app.get("/reviews", async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result.reverse());
        });
        /*-----Single Review Post Controller-----*/
        app.post("/reviews", verifyJwt, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(review);
        });

        /*------All User Get <Controller-----*/
        app.get("/users", verifyJwt, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await userCollection.find(query).toArray();
            res.send(result);
        });
        app.get("/user", verifyJwt, async (req, res) => {
            const email = req.decoded.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        });
        /*-----------Single User Patch Controller-------*/
        app.put(
            "/user/admin/:email",
            verifyJwt,

            async (req, res) => {
                const email = req.params.email;
                const user = req.body;
                const filter = { email: email };
                const updateDoc = {
                    $set: {
                        ...user,
                    },
                };

                const result = await userCollection.updateOne(
                    filter,
                    updateDoc
                );
                res.send(result);
            }
        );
        /*-------Create User Post Controller-------*/
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            const token = jwt.sign({ email: email }, process.env.JWT_TOKEN, {
                expiresIn: "1d",
            });
            res.send({ result, token });
        });
        /*---------Get The Admin User ------*/
        app.get("/admin/:email", async (req, res) => {
            const email = req.params.email;

            const user = await userCollection.findOne({ email: email });
            const isAdmin = user?.role === "admin";

            res.send({ admin: isAdmin });
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
