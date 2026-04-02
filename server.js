require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));  // Put index.html here

// MongoDB (free Atlas URI in .env)
mongoose.connect(process.env.MONGODB_URI);

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  concern: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Appointment = mongoose.model('Appointment', appointmentSchema);

// Email setup (Gmail or SendGrid in .env)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  // App password
  }
});

// Booking route
app.post('/book', async (req, res) => {
  try {
    const { name, phone, concern } = req.body;

    // Save to DB
    const newBooking = new Appointment({ name, phone, concern });
    await newBooking.save();

    // Send email to clinic
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: '9833393399vs@gmail.com',  // Clinic email
      subject: 'New Appointment Booking - Glow Skin & Laser',
      html: `
        <h2>New Booking Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Concern:</strong> ${concern}</p>
        <p>Booked on: ${new Date().toLocaleString('en-IN')}</p>
      `
    });

    res.json({ success: true, message: 'Booking confirmed! We\'ll contact you soon.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



