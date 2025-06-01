const mongoose = require("mongoose");

// ✅ User Schema (Includes Token for Authentication)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  token: { type: String }, // ✅ Added Token Field
});

const Userdata = mongoose.model("User", userSchema);

// ✅ Booking Schema
const djbookingSchema = new mongoose.Schema({
  djId: { type: String, required: true },
  djName: { type: String, required: true },
  date: { type: String, required: true },
  eventLocation: { type: String, required: true },
  eventDuration: { type: String, required: true },
  requirements: { type: String },
  client: { type: String }, 
  status: { type: String, default: "pending" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
});

const djBooking = mongoose.model("DJBooking", djbookingSchema);


// admin schema

// const adminSchema = new mongoose.Schema({
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   token: { type: String },  // Optionally store the token in the database
// });

// const AdminSche = mongoose.model("Admin", adminSchema);


const ticketBookingSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ticketType: { type: String, required: true }, // E.g., VIP, General
  price: { type: Number, required: true },
  bookingDate: { type: Date, default: Date.now },
  status: { type: String, default: "Pending" }, // Can be "Confirmed", "Cancelled"
});
const ticketBooking = mongoose.model("TicketBooking", ticketBookingSchema);


const ticketSchema = new mongoose.Schema({
  ticketType: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  djs: { type: [String], required: true },
  tickets: { type: [ticketSchema], required: true },
  imageUrl: { type: String, default: null },
});

const Event = mongoose.model("Event", eventSchema);
// ✅ Export Models
module.exports = { Userdata, djBooking , ticketBooking ,Event };
