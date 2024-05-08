const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

router.get('/', async (req, res) => {
    try {
        const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        const db = client.db("theme-park");
        const rides = await db.collection("rides").find().toArray();
        await client.close();
        res.render('rides', { rides });
    } catch (err) {
        res.status(500).send("Error fetching rides: " + err.message);
    }
});

module.exports = router;
