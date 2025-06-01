const mongoose = require("mongoose");

// =============================
// Admin Schema
// =============================
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }, // Unique email
  password: { type: String,   required: true },
  token: { type: String },
});

const Admin = mongoose.model("Admin", adminSchema);

// =============================
// Event Schema
// =============================










const djSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genre: { type: String, required: true },
  location: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number, required: true, min: 0, max: 5 },
});

djSchema.pre("save", function (next) {
  this.name = this.name.toUpperCase();
  this.genre = this.genre.toUpperCase();
  this.location = this.location.toUpperCase();
  
  next();
});

const DJ = mongoose.model("DJ", djSchema);



// =============================
// Booking Schema
// =============================
// const bookingSchema = new mongoose.Schema(
//   {
//     ticketType: { type: String, required: true },
//   eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
//   status: { type: String, enum: ["Pending", "Approved", "Cancelled"], default: "Pending" },
//   },
//   { timestamps: true }
// )

// const Booking = mongoose.model("Booking", bookingSchema);

module.exports = { Admin  ,DJ};

