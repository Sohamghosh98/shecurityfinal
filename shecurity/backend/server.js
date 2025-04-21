require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const twilio = require("twilio");

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

// 📌 Location Schema & Model
const LocationSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now },
});

const Location = mongoose.model("Location", LocationSchema);

// 🗺 Save Location API
app.post("/save-location", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const newLocation = new Location({ latitude, longitude });
    await newLocation.save();

    res.status(201).json({ message: "✅ Location saved successfully" });
  } catch (err) {
    res.status(500).json({ error: "❌ Server error while saving location" });
  }
});

// 📲 Twilio SMS Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// 📩 Send SMS API
app.post("/send-sms", async (req, res) => {
  const { phoneNumber, message } = req.body;

  if (!phoneNumber || !message) {
    return res.status(400).json({ error: "❌ Phone number and message are required" });
  }

  try {
    const smsResponse = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log("📩 Twilio SMS Sent:", smsResponse);
    res.status(200).json({ success: true, message: "✅ Emergency SMS sent successfully!" });
  } catch (error) {
    console.error("❌ Twilio Error:", error);
    res.status(500).json({ error: "❌ Error sending SMS: " + error.message });
  }
});


// 🚀 Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
