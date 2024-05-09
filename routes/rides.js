// Import the express router and MongoDB client
import { MongoClient } from 'mongodb';
import express from 'express';
const router = express.Router();

// Define a GET route for the home page that handles ride fetching
router.get('/', async (req, res) => {
    try {
        // Create a new MongoDB client instance with connection options
        const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        
        // Connect to the MongoDB server
        await client.connect();
        
        // Select the 'theme-park' database and fetch all rides from the 'rides' collection
        const db = client.db("theme-park");
        const rides = await db.collection("rides").find().toArray();
        
        // Close the MongoDB client
        await client.close();
        
        // Send the fetched rides data to the 'rides' view for rendering
        res.render('rides', { rides });
    } catch (err) {
        // Handle any errors that occur during the fetch operation
        res.status(500).send("Error fetching rides: " + err.message);
    }
});

// Export the router for use in the main server file
export default router;
