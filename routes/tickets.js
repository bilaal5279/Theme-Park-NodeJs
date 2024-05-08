const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

// Middleware for checking if a user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    } else {
        return res.redirect('/auth/login');
    }
}

// Order a ticket
router.get('/order', isAuthenticated, (req, res) => {
    res.render('orderTicket');
});

router.post('/order', isAuthenticated, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        if (!firebaseUID) {
            throw new Error("Invalid user ID");
        }

        const ticket = {
            firebaseUID: firebaseUID,
            date: new Date(req.body.date),
            fastTrackRides: [],
            usedRides: [],
            totalCost: 20,
            bought: false
        };

        await db.collection("tickets").insertOne(ticket);
        res.redirect('/tickets/current');
    } catch (err) {
        console.error("Error ordering ticket:", err);
        res.status(500).send("Error ordering ticket: " + err.message);
    }
});


// Add fast-track ride
router.post('/addFastTrack', isAuthenticated, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;
        const rideId = req.body.ride;

        if (!firebaseUID || !ObjectId.isValid(rideId)) {
            throw new Error("Invalid ID provided");
        }

        const ride = await db.collection("rides").findOne({ _id: new ObjectId(rideId) });
        const ticket = await db.collection("tickets").findOne({ firebaseUID: firebaseUID, bought: false });

        if (!ticket) {
            throw new Error("No active ticket found.");
        }

        ticket.fastTrackRides.push(ride);
        ticket.totalCost += ride.fastTrackPrice;

        await db.collection("tickets").updateOne({ _id: ticket._id }, {
            $set: {
                fastTrackRides: ticket.fastTrackRides,
                totalCost: ticket.totalCost
            }
        });

        res.redirect('/tickets/current');
    } catch (err) {
        console.error("Error adding fast-track ride:", err);
        res.status(500).send("Error adding fast-track ride: " + err.message);
    }
});

// View the current ticket
router.get('/current', isAuthenticated, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        if (!firebaseUID) {
            throw new Error("Invalid user ID");
        }

        const ticket = await db.collection("tickets").findOne({ firebaseUID: firebaseUID, bought: false });
        const rides = await db.collection("rides").find().toArray();
        res.render('currentTicket', { rides, total: ticket ? ticket.totalCost : 20 });
    } catch (err) {
        console.error("Error fetching current ticket:", err);
        res.status(500).send("Error fetching current ticket: " + err.message);
    }
});

// Confirm purchase
router.get('/confirm', isAuthenticated, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        if (!firebaseUID) {
            throw new Error("Invalid user ID");
        }

        const ticket = await db.collection("tickets").findOne({ firebaseUID: firebaseUID, bought: false });
        res.render('confirmPurchase', { total: ticket ? ticket.totalCost : 20 });
    } catch (err) {
        console.error("Error confirming purchase:", err);
        res.status(500).send("Error confirming purchase: " + err.message);
    }
});

// Buy the current ticket
router.post('/buy', isAuthenticated, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        if (!firebaseUID) {
            throw new Error("Invalid user ID");
        }

        await db.collection("tickets").updateOne({ firebaseUID: firebaseUID, bought: false }, { $set: { bought: true } });
        res.redirect('/tickets/future');
    } catch (err) {
        console.error("Error buying ticket:", err);
        res.status(500).send("Error buying ticket: " + err.message);
    }
});

router.get('/future', isAuthenticated, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        // Define today's date, normalized to the beginning of the day
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tickets = await db.collection("tickets").find({
            firebaseUID: firebaseUID,
            bought: true
        }).sort({ date: 1 }).toArray();

        // Enhance tickets with additional display logic
        tickets.forEach(ticket => {
            const ticketDate = new Date(ticket.date);
            ticketDate.setHours(0, 0, 0, 0);
            ticket.isToday = ticketDate.getTime() === today.getTime();
            ticket.isFuture = ticketDate.getTime() > today.getTime();  // Determines if the ticket date is in the future
            ticket.total = ticket.totalCost ? ticket.totalCost.toFixed(2) : "0.00"; 
        });

        res.render('viewTickets', { tickets, today });
    } catch (err) {
        console.error("Error fetching future tickets:", err);
        res.status(500).send("Error fetching future tickets: " + err.message);
    }
});




// View past tickets
router.get('/past', isAuthenticated, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        if (!firebaseUID) {
            throw new Error("Invalid user ID");
        }

        const tickets = await db.collection("tickets").find({ firebaseUID: firebaseUID, date: { $lt: new Date() }, bought: true }).toArray();
        res.render('pastTickets', { tickets });
    } catch (err) {
        console.error("Error fetching past tickets:", err);
        res.status(500).send("Error fetching past tickets: " + err.message);
    }
});


// Render the amend ticket page
router.get('/amend/:id', isAuthenticated, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const ticketId = new ObjectId(req.params.id);
        const firebaseUID = req.session.userId;

        const ticket = await db.collection("tickets").findOne({ _id: ticketId, firebaseUID: firebaseUID, date: { $gte: new Date() }, bought: true });
        if (!ticket) {
            throw new Error("No future ticket found");
        }

        const availableRides = await db.collection("rides").find().toArray();
        res.render('amendTicket', { ticket, availableRides });
    } catch (err) {
        console.error("Error rendering amend ticket page:", err);
        res.status(500).send("Error rendering amend ticket page: " + err.message);
    }
});

router.post('/amend', isAuthenticated, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;
        const ticketId = req.body.ticketId;
        const rideId = req.body.rideId;

        // Validate the IDs before converting to ObjectId
        if (!firebaseUID || !ObjectId.isValid(ticketId) || !ObjectId.isValid(rideId)) {
            throw new Error("Invalid ID provided");
        }

        // Convert IDs to ObjectId
        const ticketObjectId = new ObjectId(ticketId);
        const rideObjectId = new ObjectId(rideId);

        const ride = await db.collection("rides").findOne({ _id: rideObjectId });
        const ticket = await db.collection("tickets").findOne({ _id: ticketObjectId, firebaseUID: firebaseUID, date: { $gte: new Date() }, bought: true });

        if (!ticket) {
            throw new Error("No future ticket found");
        }

        ticket.fastTrackRides.push(ride);
        ticket.totalCost += ride.fastTrackPrice;
        await db.collection("tickets").updateOne({ _id: ticket._id }, { $set: { fastTrackRides: ticket.fastTrackRides, totalCost: ticket.totalCost } });
        res.redirect('/tickets/future');
    } catch (err) {
        console.error("Error amending future ticket:", err);
        res.status(500).send("Error amending future ticket: " + err.message);
    }
});


// View all rides left available on the current ticket
router.get('/remaining', isAuthenticated, async (req, res) => {
    try {
        const db = req.dbClient.db("theme-park");
        const firebaseUID = req.session.userId;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find the current ticket
        const ticket = await db.collection("tickets").findOne({
            firebaseUID: firebaseUID,
            date: today,
            bought: true
        });

        if (!ticket) {
            throw new Error("No valid ticket found for today.");
        }

        // Optionally, fetch details of each ride in fastTrackRides array
        const rideDetails = await Promise.all(ticket.fastTrackRides.map(rideId =>
            db.collection("rides").findOne({ _id: rideId })
        ));

        res.render('remainingRides', { rides: rideDetails });
    } catch (err) {
        console.error("Error viewing remaining fast-track rides:", err);
        res.status(500).send("Error viewing remaining fast-track rides: " + err.message);
    }
});



// Logout
router.get('/logout', isAuthenticated, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error logging out:", err);
            return res.status(500).send("An error occurred during logout.");
        } else {
            res.redirect('/auth/login');
        }
    });
});


module.exports = router;

