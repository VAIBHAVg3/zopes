const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static(path.join(__dirname, "docs")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "docs", "index.html"));
});
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
});
});

const registrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{10}$/,
    },
    concern: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

const Registration = mongoose.model(
  "Registration",
  registrationSchema
);

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
  });
});

app.post("/register", async (req, res) => {
  try {
    const { name, phone, concern } = req.body;

    if (!name || !phone || !concern) {
      return res.status(400).json({
        success: false,
        message: "Name, phone number, and concern are required.",
      });
    }

    const cleanName = String(name).trim();
    const cleanPhone = String(phone)
      .replace(/\s+/g, "")
      .trim();
    const cleanConcern = String(concern).trim();

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid name.",
      });
    }

    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number.",
      });
    }

    if (cleanConcern.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Please describe the concern.",
      });
    }

    const registration = await Registration.create({
      name: cleanName,
      phone: cleanPhone,
      concern: cleanConcern,
    });

    await emailTransporter.sendMail({
      from: `Website Registration <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      replyTo: process.env.EMAIL_USER,
      subject: `New appointment request from ${cleanName}`,
      text: `
New website registration

Name: ${cleanName}
Phone: ${cleanPhone}
Concern: ${cleanConcern}
Registration ID: ${registration._id}
      `,
      html: `
        <h2>New Website Registration</h2>
        <p><strong>Name:</strong> ${escapeHtml(cleanName)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(cleanPhone)}</p>
        <p><strong>Concern:</strong> ${escapeHtml(cleanConcern)}</p>
        <p><strong>Registration ID:</strong> ${registration._id}</p>
      `,
    });

    return res.status(201).json({
      success: true,
      message: "Request submitted successfully.",
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit the request right now.",
    });
  }
});

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });

    emailTransporter.verify((error) => {
      if (error) {
        console.error(
          "Gmail transporter check failed. The website is still running:",
          error.message
        );
      } else {
        console.log("Email transporter ready");
      }
    });
  } catch (error) {
    console.error("MongoDB startup failed:", error.message);
    process.exit(1);
  }
}

startServer();