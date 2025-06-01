const mongoose = require("mongoose"); // ✅ Correct relative path


mongoose.connect("mongodb://localhost:27017/DJBOOKING")
.then(() => {
  console.log("MongoDB connected");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});