import express from "express";
import { Subscription } from "./subscription";
import { SubscriptionState } from "./state/subscriptionState";

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve static frontend
app.use(express.static("src/public"));

const subscription = new Subscription();

// API: get current state
app.get("/state", (req, res) => {
  res.json({ state: subscription.state });
});

// Step 1
app.post("/select-plan", (req, res) => {
  try {
    subscription.selectPlan();
    res.json({ message: "Plan selected", state: subscription.state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Step 2
app.post("/request-payment", (req, res) => {
  try {
    subscription.requestPayment();
    res.json({ message: "Payment requested", state: subscription.state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ❌ VULNERABLE ENDPOINT #1
 * Client can fake payment confirmation
 */
app.post("/payment/callback", (req, res) => {
  try {
    const { paymentConfirmed } = req.body;

    if (paymentConfirmed === true) {

      const previousState = subscription.state;

      // ❌ Bypass activation directly
      subscription.state = SubscriptionState.ACTIVE;
      subscription.paymentConfirmed = true;
      subscription.activatedAt = new Date();

      const bypassDetected =
        previousState !== SubscriptionState.PAYMENT_PENDING;

      return res.json({
        message: "Payment accepted (vulnerable)",
        state: subscription.state,
        bypass: bypassDetected,
        previousState
      });
    }

    res.status(400).json({ error: "Payment not confirmed" });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ SECURE VERSION
 * Proper validation before activation
 */
app.post("/secure/payment/callback", (req, res) => {
  try {
    const { paymentConfirmed } = req.body;

    // Proper validation
    if (subscription.state !== SubscriptionState.PAYMENT_PENDING) {
      return res.status(400).json({ error: "Payment not expected in current state" });
    }

    if (paymentConfirmed !== true) {
      return res.status(400).json({ error: "Invalid payment confirmation" });
    }

    subscription.activate();

    res.json({
      message: "Payment verified securely",
      state: subscription.state
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Normal activation
app.post("/activate", (req, res) => {
  try {
    subscription.activate();
    res.json({ message: "Subscription activated", state: subscription.state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel
app.post("/cancel", (req, res) => {
  try {
    subscription.cancel();
    res.json({ message: "Subscription cancelled", state: subscription.state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ❌ VULNERABLE ENDPOINT #2
 * Refund without validation
 */
app.post("/refund", (req, res) => {
  try {
    subscription.refundVulnerable();
    res.json({
      message: "Refund processed (vulnerable)",
      state: subscription.state
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset (lab only)
app.post("/reset", (req, res) => {
  subscription.state = SubscriptionState.REGISTERED;
  subscription.paymentConfirmed = false;
  subscription.activatedAt = null;
  subscription.refunded = false;

  res.json({ message: "Reset done", state: subscription.state });
});

app.listen(PORT, () => {
  console.log("🔥 SERVER RUNNING 🔥");
  console.log(`http://localhost:${PORT}`);
});
