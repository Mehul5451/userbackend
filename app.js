const mongoose = require("mongoose");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
//const cors = require("cors");
const bcrypt = require("bcryptjs"); // For password hashing
const jwt = require("jsonwebtoken");
const axios = require("axios");
const cookieParser = require("cookie-parser");

require("./conn");

const { Userdata, djBooking , ticketBooking , Event } = require("./register");
const { Admin , DJ } = require("./login");
//const {Event} = require("../adminlogin/login");


const JWT_SECRET = "mynameisgadhadaramehulandiambcastudent";





const allowedOrigins = ["https://djbooking.vercel.app"]; // Allow multiple origins

const cors = require('cors');
const corsOptions = {
  origin: 'https://djbooking.vercel.app', // Allow only this origin
  credentials: true, // Allow credentials (cookies, etc.)
};
app.use(cookieParser())
app.use(cors(corsOptions));


app.use(express.json()); // Replaces body-parser


// POST route to handle registration
app.post("/submit", async (req, res) => {
  try {
    console.log("Request body:", req.body); // Log incoming data

    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new Userdata({ name, email, phone, password: hashedPassword });

    await user.save();
    console.log("User saved to database"); // Log this to confirm the save operation

    res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Error during user registration:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "User registration failed",
        details: error.message,
      });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await Userdata.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Generate and Store JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    user.token = token;
    await user.save(); // Save token in DB

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Error occurred during login" });
  }
});



const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Forbidden: Invalid token" });
    }
    req.user = decoded; // Store decoded user info in request
    next();
  });
};


  
// 🟢 Create a Booking
 
app.post("/bookings", authenticateToken, async (req, res) => {
  try {
    console.log("Received Booking Data:", req.body);

    const { djId, djName, date, eventLocation, eventDuration, requirements, client } = req.body;

    if (!djId || !djName || !date || !eventLocation || !eventDuration) {
      return res.status(400).json({ error: "Missing required booking fields" });
    }

    const newBooking = new djBooking({
      djId,
      djName,
      date,
      eventLocation,
      eventDuration,
      requirements,
      client,
      userId: req.user.userId, // Store authenticated user's ID
    });

    await newBooking.save();
    res.status(201).json({ success: true, message: "Booking created successfully", booking: newBooking });
  } catch (error) {
    console.error("Booking Creation Error:", error);
    res.status(500).json({ error: error.message || "Failed to create booking" });
  }
});


// 🔵 Get All Bookings
app.get("/user-bookings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Get userId from decoded token
    const bookings = await djBooking.find({ userId }); // Fetch only user's bookings
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});


app.get("/bookings", async (req, res) => {
  try {
    const bookings = await djBooking
      .find()
      .populate("userId", "email"); // <--- this is the fix

    console.log("Fetched bookings:", bookings);
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});


// 🟡 Approve or Cancel a Booking
//const mongoose = require("mongoose");  // Make sure you have mongoose imported

app.put("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid booking ID format" });
    }

    const { status } = req.body;
    if (!["Approved", "Canceled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updatedBooking = await djBooking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(updatedBooking);
  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});


// 🔴 Delete a Booking
app.delete("/bookings/:id", async (req, res) => {
  try {
    await djBooking.findByIdAndDelete(req.params.id);
    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete booking" });
  }
}); 



//show only userside dj

// app.get("/user-bookings  ", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.userId; // Get userId from decoded token
//     const bookings = await Booking.find({ userId }); // Fetch only user's bookings
//      res.json(bookings);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch bookings" });
//   }
// });


  
// // Book Ticket
// Get all ticket bookings
app.post("/book-tickets", authenticateToken, async (req, res) => {
  try {
    const { eventId, ticketType, price } = req.body;
    // if (!eventId || !ticketType || !price) {
    //   return res.status(400).json({ error: "Event ID, ticket type, and price are required" });
    // }

    const newBooking = new ticketBooking({
      eventId,
      ticketType,
      price,
      bookedBy: req.user.userId, // Extract userId from token
    });

    await newBooking.save();
    res.status(201).json({ success: true, message: "Ticket booked successfully", booking: newBooking });
  } catch (error) {
    console.error("Error booking ticket:", error);
    res.status(500).json({ error: "Failed to book ticket", details: error.message });
  }
});

// ✅ GET: Fetch All Ticket Bookings
app.get("/ticket-bookings",  async (req, res) => {
  try {
    const tickets = await ticketBooking.find().populate("bookedBy" , "email").populate("eventId" , "title");
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching ticket bookings:", error);
    res.status(500).json({ error: "Failed to fetch ticket bookings" });
  }
});

// ✅ PUT: Update Ticket Booking Status
app.put("/ticket-bookings/:id",  async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Confirmed", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updatedTicket = await ticketBooking.findByIdAndUpdate(id, { status }, { new: true });

    if (!updatedTicket) {
      return res.status(404).json({ error: "Ticket booking not found" });
    }

    res.json({ success: true, message: "Ticket status updated", ticket: updatedTicket });
  } catch (error) {
    console.error("Error updating ticket booking:", error);
    res.status(500).json({ error: "Failed to update ticket booking" });
  }
});

// ✅ DELETE: Cancel Ticket Booking
app.delete("/ticket-bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTicket = await ticketBooking.findByIdAndDelete(id);

    if (!deletedTicket) {
      return res.status(404).json({ error: "Ticket booking not found" });
    }

    res.json({ success: true, message: "Ticket booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket booking:", error);
    res.status(500).json({ error: "Failed to delete ticket booking" });
  }
});


///booked ticket in user side

// 📌 Get booked tickets for the logged-in user
app.get("/user-ticket-bookings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Ensure that userId is coming from the decoded token
    const ticketbookings = await ticketBooking.find({ bookedBy: userId }).populate("eventId" , "title") ; // Ensure this field matches the one used in your model
    res.json(ticketbookings);  // This should return an array of ticket bookings
  } catch (error) {
    console.error("Error fetching ticket bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

  

// 📌 Delete a booked ticket by ID
app.delete("/book-tickets/:id", authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id; // Extract user ID from JWT

    const ticket = await ticketBooking.findOneAndDelete({ _id: ticketId, user: userId });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found or unauthorized" });
    }

    res.json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({ error: "Failed to delete ticket" });
  }
});



// ADMIN SIDE BACKEND

app.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Admin.findOne({ email });
    if (!user) return res.status(404).json({ error: "Admin not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid admin credentials" });

    // Add role for admin in token (optional)
    const adminToken = jwt.sign({ userId: user._id, email: user.email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });

    res.json({ success: true, message: "Admin login successful", token: adminToken });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Error occurred during admin login" });
  }
});


// Auth Middleware
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized, token required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    const admin = await Admin.findById(decoded.userId);
    if (!admin) {
      return res.status(401).json({ message: "Unauthorized, admin not found" });
    }
    req.admin = admin;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// Protected admin route
app.get("/admin", authMiddleware, (req, res) => {
  res.json({ message: "Admin authorized", admin: req.admin });
});

// Admin Logout
app.post("/admin-logout", async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =========================  
   Event Management
========================= */

// Add Event
app.post("/events", authMiddleware, async (req, res) => {
  const { title, date, time, location, description, djs, tickets, imageUrl } = req.body;

  // Validate fields
  if (!title || !date || !time || !location || !description || !djs || !tickets) {
    return res.status(400).json({ message: "Missing required event details" });
  }

  try {
    const newEvent = new Event({ title, date, time, location, description, djs, tickets, imageUrl });
    await newEvent.save();
    res.status(201).json({ message: "Event added successfully", event: newEvent });
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).json({ message: "Error saving event" });
  }
});

// Delete event
app.delete("/events/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Find and delete the event by its ID
    const event = await Event.findByIdAndDelete(id);

    // If the event is not found
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Error deleting event" });
  }
});

// Get Events
app.get("/events", async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Error fetching events" });
  }
});app.get("/dj", async (req, res) => {
  try {
    const djs = await DJ.find();
    res.json(djs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/dj", async (req, res) => {
  const { name, genre, location, price, rating } = req.body;
  const newDJ = new DJ({ name, genre, location, price, rating });

  try {
    const savedDJ = await newDJ.save();
    res.status(201).json(savedDJ);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a DJ
app.delete("/dj/:id", async (req, res) => {
  try {
    await DJ.findByIdAndDelete(req.params.id);
    res.json({ message: "DJ deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});





app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});



