import express from "express";
import path from "path";
import { Subscription } from "./subscription";
import { SubscriptionState } from "./state/subscriptionState";

const app = express();
const PORT = 3000;

app.use(express.json());
console.log("Serving static from:", path.join(__dirname, "../public"));

// Serve frontend
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const subscription = new Subscription();

/* ================= STATE ================= */

app.get("/state", (req, res) => {
  res.json({
    state: subscription.state,
    paymentConfirmed: subscription.paymentConfirmed,
    activatedAt: subscription.activatedAt,
    refunded: subscription.refunded
  });
});

/* ================= NORMAL FLOW ================= */

app.post("/select-plan", (req, res) => {
  try {
    subscription.selectPlan();
    res.json({ message: "Plan selected", state: subscription.state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/request-payment", (req, res) => {
  try {
    subscription.requestPayment();
    res.json({ message: "Payment requested", state: subscription.state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/activate", (req, res) => {
  try {
    subscription.activate();
    res.json({ message: "Subscription activated", state: subscription.state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/* ================= ❌ VULNERABLE PAYMENT ================= */

app.post("/payment/callback", (req, res) => {
  const { paymentConfirmed } = req.body;

  if (paymentConfirmed === true) {
    const previousState = subscription.state;

    // ❌ Business Logic Bypass
    subscription.state = SubscriptionState.ACTIVE;
    subscription.paymentConfirmed = true;
    subscription.activatedAt = new Date();

    return res.json({
      message: "Payment accepted (vulnerable)",
      previousState,
      state: subscription.state
    });
  }

  res.status(400).json({ error: "Payment not confirmed" });
});

/* ================= ✅ SECURE VERSION ================= */

app.post("/secure/payment/callback", (req, res) => {
  const { paymentConfirmed } = req.body;

  if (subscription.state !== SubscriptionState.PAYMENT_PENDING) {
    return res.status(400).json({
      error: "Payment not expected in current state"
    });
  }

  if (paymentConfirmed !== true) {
    return res.status(400).json({
      error: "Invalid payment confirmation"
    });
  }

  subscription.activate();

  res.json({
    message: "Payment verified securely",
    state: subscription.state
  });
});

/* ================= ❌ VULNERABLE REFUND ================= */

app.post("/refund", (req, res) => {
  subscription.refundVulnerable();
  res.json({
    message: "Refund processed (vulnerable)",
    refunded: subscription.refunded
  });
});

/* ================= RESET ================= */

app.post("/reset", (req, res) => {
  subscription.state = SubscriptionState.REGISTERED;
  subscription.paymentConfirmed = false;
  subscription.activatedAt = null;
  subscription.refunded = false;

  res.json({ message: "Reset done" });
});

/* ================= START ================= */

app.listen(PORT, () => {
  console.log("SERVER RUNNING");
  console.log(`http://localhost:${PORT}`);
});