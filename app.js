const mongoose = require("mongoose");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");

require("./conn");

const { Userdata, djBooking, ticketBooking, Event } = require("./register");
const { Admin, DJ } = require("./login");

const JWT_SECRET = "mynameisgadhadaramehulandiambcastudent";

const corsOptions = {
  origin: "https://djbooking.vercel.app",
  credentials: true,
};

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());

// User Registration
app.post("/submit", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new Userdata({ name, email, phone, password: hashedPassword });
    await user.save();
    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Error during user registration:", error.message);
    res.status(500).json({ success: false, message: "User registration failed", details: error.message });
  }
});

// User Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const user = await Userdata.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });

    user.token = token;
    await user.save();

    res.status(200).json({ success: true, message: "Login successful", token });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Error occurred during login" });
  }
});

// Middleware to authenticate JWT token for users
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Forbidden: Invalid token" });
    req.user = decoded;
    next();
  });
};

// Booking routes (create, get, update, delete)
app.post("/bookings", authenticateToken, async (req, res) => {
  try {
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
      userId: req.user.userId,
    });
    await newBooking.save();
    res.status(201).json({ success: true, message: "Booking created successfully", booking: newBooking });
  } catch (error) {
    console.error("Booking Creation Error:", error);
    res.status(500).json({ error: error.message || "Failed to create booking" });
  }
});

app.get("/user-bookings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookings = await djBooking.find({ userId });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.get("/bookings", async (req, res) => {
  try {
    const bookings = await djBooking.find().populate("userId", "email");
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

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
    const updatedBooking = await djBooking.findByIdAndUpdate(id, { status }, { new: true });
    if (!updatedBooking) return res.status(404).json({ error: "Booking not found" });
    res.json(updatedBooking);
  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

app.delete("/bookings/:id", async (req, res) => {
  try {
    await djBooking.findByIdAndDelete(req.params.id);
    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

// Ticket booking routes
app.post("/book-tickets", authenticateToken, async (req, res) => {
  try {
    const { eventId, ticketType, price } = req.body;
    const newBooking = new ticketBooking({
      eventId,
      ticketType,
      price,
      bookedBy: req.user.userId,
    });
    await newBooking.save();
    res.status(201).json({ success: true, message: "Ticket booked successfully", booking: newBooking });
  } catch (error) {
    console.error("Error booking ticket:", error);
    res.status(500).json({ error: "Failed to book ticket", details: error.message });
  }
});

app.get("/ticket-bookings", async (req, res) => {
  try {
    const tickets = await ticketBooking.find()
      .populate("bookedBy", "email")
      .populate("eventId", "title");
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching ticket bookings:", error);
    res.status(500).json({ error: "Failed to fetch ticket bookings" });
  }
});

app.put("/ticket-bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["Confirmed", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    const updatedTicket = await ticketBooking.findByIdAndUpdate(id, { status }, { new: true });
    if (!updatedTicket) return res.status(404).json({ error: "Ticket booking not found" });
    res.json({ success: true, message: "Ticket status updated", ticket: updatedTicket });
  } catch (error) {
    console.error("Error updating ticket booking:", error);
    res.status(500).json({ error: "Failed to update ticket booking" });
  }
});

app.delete("/ticket-bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTicket = await ticketBooking.findByIdAndDelete(id);
    if (!deletedTicket) return res.status(404).json({ error: "Ticket booking not found" });
    res.json({ success: true, message: "Ticket booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket booking:", error);
    res.status(500).json({ error: "Failed to delete ticket booking" });
  }
});

app.get("/user-ticket-bookings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const ticketbookings = await ticketBooking.find({ bookedBy: userId }).populate("eventId", "title");
    res.json(ticketbookings);
  } catch (error) {
    console.error("Error fetching ticket bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.delete("/book-tickets/:id", authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user.userId;
    const ticket = await ticketBooking.findOneAndDelete({ _id: ticketId, bookedBy: userId });
    if (!ticket) return res.status(404).json({ error: "Ticket not found or unauthorized" });
    res.json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({ error: "Failed to delete ticket" });
  }
});

// Admin Login
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

// Admin Auth Middleware
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

// Event routes
app.post("/add-event", async (req, res) => {
  try {
    const { title, description, date, location, ticketsAvailable } = req.body;
    if (!title || !date || !location) {
      return res.status(400).json({ error: "Title, date, and location are required" });
    }
    const event = new Event({ title, description, date, location, ticketsAvailable });
    await event.save();
    res.status(201).json({ success: true, message: "Event added successfully", event });
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).json({ error: "Failed to add event" });
  }
});

app.get("/events", async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.delete("/events/:id", async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Event not found" });
    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
