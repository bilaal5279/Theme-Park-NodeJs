// Import required modules and middleware
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import firebaseAdmin from 'firebase-admin'; // Not used in the snippet but may be needed for authentication
import { allowed } from '../authcontroller.js'; // Middleware to ensure user is authenticated

const router = express.Router();

// Display the order ticket form
router.get('/order', allowed, (req, res) => {
    res.render('orderTicket'); // Render the ticket ordering page
});

// Handle submission of the order ticket form
router.post('/order', allowed, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park"); // Connect to the 'theme-park' database
        const firebaseUID = req.session.userId; // Retrieve user ID from session

        // Ensure a valid user ID is provided
        if (!firebaseUID) {
            throw new Error("Invalid user ID");
        }

        // Create a new ticket document
        const ticket = {
            firebaseUID: firebaseUID,
            date: new Date(req.body.date), // Parse the date provided in the form
            fastTrackRides: [],
            usedRides: [],
            totalCost: 20,
            bought: false
        };

        // Insert the new ticket into the database
        await db.collection("tickets").insertOne(ticket);
        res.redirect('/tickets/current'); // Redirect to the current tickets page after order
    } catch (err) {
        console.error("Error ordering ticket:", err);
        res.status(500).send("Error ordering ticket: " + err.message);
    }
});

// Add a fast-track ride to an existing ticket
router.post('/addFastTrack', allowed, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;
        const rideId = req.body.ride;

        // Validate user ID and ride ID
        if (!firebaseUID || !ObjectId.isValid(rideId)) {
            throw new Error("Invalid ID provided");
        }

        // Retrieve the specific ride and the current active ticket
        const ride = await db.collection("rides").findOne({ _id: new ObjectId(rideId) });
        const ticket = await db.collection("tickets").findOne({ firebaseUID: firebaseUID, bought: false });

        // Check if a valid ticket exists
        if (!ticket) {
            throw new Error("No active ticket found.");
        }

        // Add the ride to the fast track rides array and update the total cost
        ticket.fastTrackRides.push(ride);
        ticket.totalCost += ride.fastTrackPrice;

        // Update the ticket in the database
        await db.collection("tickets").updateOne({ _id: ticket._id }, {
            $set: {
                fastTrackRides: ticket.fastTrackRides,
                totalCost: ticket.totalCost
            }
        });

        res.redirect('/tickets/current'); // Redirect back to current tickets page
    } catch (err) {
        console.error("Error adding fast-track ride:", err);
        res.status(500).send("Error adding fast-track ride: " + err.message);
    }
});

// View details of the current ticket
router.get('/current', allowed, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        // Validate the firebaseUID
        if (!firebaseUID) {
            throw new Error("Invalid user ID");
        }

        // Fetch the ticket that hasn't been purchased yet
        const ticket = await db.collection("tickets").findOne({ firebaseUID: firebaseUID, bought: false });
        const rides = await db.collection("rides").find().toArray(); // Retrieve all rides for display

        // Render the current ticket view
        res.render('currentTicket', { rides, total: ticket ? ticket.totalCost : 20 });
    } catch (err) {
        console.error("Error fetching current ticket:", err);
        res.status(500).send("Error fetching current ticket: " + err.message);
    }
});

// Confirm the purchase of the ticket
router.get('/confirm', allowed, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        // Validate the firebaseUID
        if (!firebaseUID) {
            throw new Error("Invalid user ID");
        }

        // Fetch the un-purchased ticket for confirmation
        const ticket = await db.collection("tickets").findOne({ firebaseUID: firebaseUID, bought: false });
        res.render('confirmPurchase', { total: ticket ? ticket.totalCost : 20 }); // Show confirmation view
    } catch (err) {
        console.error("Error confirming purchase:", err);
        res.status(500).send("Error confirming purchase: " + err.message);
    }
});

// Process the ticket purchase
router.post('/buy', allowed, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        // Validate the firebaseUID
        if (!firebaseUID) {
            throw new Error("Invalid user ID");
        }

        // Mark the ticket as bought in the database
        await db.collection("tickets").updateOne({ firebaseUID: firebaseUID, bought: false }, { $set: { bought: true } });
        res.redirect('/tickets/future'); // Redirect to view future tickets
    } catch (err) {
        console.error("Error buying ticket:", err);
        res.status(500).send("Error buying ticket: " + err.message);
    }
});

// View future tickets that have been bought
router.get('/future', allowed, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        // Set today's date normalized to midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all future tickets
        const tickets = await db.collection("tickets").find({
            firebaseUID: firebaseUID,
            bought: true
        }).sort({ date: 1 }).toArray();

        // Enhance ticket data for display
        tickets.forEach(ticket => {
            const ticketDate = new Date(ticket.date);
            ticketDate.setHours(0, 0, 0, 0);
            ticket.isToday = ticketDate.getTime() === today.getTime();
            ticket.isFuture = ticketDate.getTime() > today.getTime();
            ticket.total = ticket.totalCost ? ticket.totalCost.toFixed(2) : "0.00";
        });

        res.render('viewTickets', { tickets, today }); // Render the future tickets view
    } catch (err) {
        console.error("Error fetching future tickets:", err);
        res.status(500).send("Error fetching future tickets: " + err.message);
    }
});

// View past tickets
router.get('/past', allowed, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        // Validate the firebaseUID
        if (!firebaseUID) {
            throw new Error("Invalid user ID");
        }

        // Fetch all past tickets
        const tickets = await db.collection("tickets").find({
            firebaseUID: firebaseUID,
            date: { $lt: new Date() },
            bought: true
        }).toArray();

        res.render('pastTickets', { tickets }); // Render the past tickets view
    } catch (err) {
        console.error("Error fetching past tickets:", err);
        res.status(500).send("Error fetching past tickets: " + err.message);
    }
});

// Amend an existing ticket
router.get('/amend/:id', allowed, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const ticketId = new ObjectId(req.params.id); // Convert parameter to ObjectId
        const firebaseUID = req.session.userId;

        // Fetch the ticket that matches the ID and is still active
        const ticket = await db.collection("tickets").findOne({
            _id: ticketId,
            firebaseUID: firebaseUID,
            date: { $gte: new Date() },
            bought: true
        });

        // Ensure the ticket is valid for amendments
        if (!ticket) {
            throw new Error("No future ticket found");
        }

        const availableRides = await db.collection("rides").find().toArray(); // Fetch all available rides
        res.render('amendTicket', { ticket, availableRides }); // Render the ticket amendment page
    } catch (err) {
        console.error("Error rendering amend ticket page:", err);
        res.status(500).send("Error rendering amend ticket page: " + err.message);
    }
});

// Handle the amendment of a ticket
router.post('/amend', allowed, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;
        const ticketId = req.body.ticketId;
        const rideId = req.body.rideId;

        // Validate all IDs before processing
        if (!firebaseUID || !ObjectId.isValid(ticketId) || !ObjectId.isValid(rideId)) {
            throw new Error("Invalid ID provided");
        }

        const ticketObjectId = new ObjectId(ticketId); // Convert ticket ID to ObjectId
        const rideObjectId = new ObjectId(rideId); // Convert ride ID to ObjectId

        // Fetch the ride and the ticket to be amended
        const ride = await db.collection("rides").findOne({ _id: rideObjectId });
        const ticket = await db.collection("tickets").findOne({
            _id: ticketObjectId,
            firebaseUID: firebaseUID,
            date: { $gte: new Date() },
            bought: true
        });

        // Ensure the ticket and ride are valid
        if (!ticket) {
            throw new Error("No future ticket found");
        }

        // Add the ride to the ticket's fast track rides and update the total cost
        ticket.fastTrackRides.push(ride);
        ticket.totalCost += ride.fastTrackPrice;

        // Update the ticket in the database
        await db.collection("tickets").updateOne({ _id: ticket._id }, {
            $set: {
                fastTrackRides: ticket.fastTrackRides,
                totalCost: ticket.totalCost
            }
        });

        res.redirect('/tickets/future'); // Redirect to the future tickets page
    } catch (err) {
        console.error("Error amending future ticket:", err);
        res.status(500).send("Error amending future ticket: " + err.message);
    }
});

// View remaining rides for the current ticket
router.get('/remaining', allowed, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        // Set today's date normalized to midnight for accurate comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch the ticket valid for today
        const ticket = await db.collection("tickets").findOne({
            firebaseUID: firebaseUID,
            date: today,
            bought: true
        });

        // Handle case where there is no valid ticket for today
        if (!ticket) {
            throw new Error("No valid ticket found for today.");
        }

        // Fetch details of each ride included in the ticket
        const rideDetails = await Promise.all(ticket.fastTrackRides.map(rideId =>
            db.collection("rides").findOne({ _id: rideId })
        ));

        res.render('remainingRides', { rides: rideDetails }); // Render the remaining rides view
    } catch (err) {
        console.error("Error viewing remaining fast-track rides:", err);
        res.status(500).send("Error viewing remaining fast-track rides: " + err.message);
    }
});

// Handle user logout
router.get('/logout', allowed, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error logging out:", err);
            return res.status(500).send("An error occurred during logout.");
        } else {
            res.redirect('/auth/login'); // Redirect to login page after logout
        }
    });
});

export default router; // Export the router for use in the main app
