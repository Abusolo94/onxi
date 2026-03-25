 require("dotenv").config()
const express = require("express");
const axios = require("axios");
const { db } = require("../firebaseAdmin");
 

 const verifyPayment = async (req, res) => {
  const { reference } = req.params;

  if (!reference) {
    return res.status(400).json({ error: "Missing reference" });
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data.data;

    if (!data || data.status !== "success") {
      return res.json({
        success: false,
        message: "Payment not successful",
      });
    }

    const email = data.customer.email;

    // 🔥 Find user by email
    const userSnap = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (userSnap.empty) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDoc = userSnap.docs[0];
    const uid = userDoc.id;

    // ✅ Save subscription record
    await db.collection("subscriptions").doc(reference).set({
      email,
      reference: data.reference,
      status: "active",
      plan: data.plan || null,
      subscriptionCode: data.authorization?.authorization_code || null,
      createdAt: new Date(),
    });

    // ✅ VERY IMPORTANT → update user
    await db.collection("users").doc(uid).update({
      subscriptionStatus: "active",
      subscriptionPlan: data.plan || null,
      updatedAt: new Date(),
    });

    return res.json({
      success: true,
      message: "Subscription activated",
    });
  } catch (err) {
    console.error("VERIFY ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};



const checkSubscription = async (req, res) => {
  const { email } = req.params;

  try {
    const doc = await db.collection("subscriptions").doc(email).get();

    if (!doc.exists) {
      return res.json({
        active: false,
        message: "No subscription found",
      });
    }

    const data = doc.data(); 

    if (data.status !== "active") {
      return res.json({
        active: false,
        message: "Subscription inactive",
      });
    }

    return res.json({
      active: true,
      subscription: data,
    });
  } catch (error) {
    console.error("CHECK ERROR:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};


const AddSubcription = async (req, res) => {
  const { email, planCode } = req.body;

  if (!email || !planCode) {
    return res.status(400).json({ error: "Email and planCode are required" });
  }

  try {
    // ✅ Initialize Paystack transaction tied to a plan
    const init = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: planCode *100,
        plan: planCode, // ✅ attach the plan directly
        callback_url: `${process.env.CLIENT_URL}/stacksuccess`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({
      success: true,
      authorization_url: init.data.data.authorization_url,
    });
  } catch (err) {
    console.error(
      "❌ Paystack initialize error:",
      err.response?.data || err.message
    );
    res.status(400).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
};

module.exports = {verifyPayment, checkSubscription, AddSubcription}