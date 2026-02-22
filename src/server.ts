import express from "express";
import path from "path";
import { Subscription } from "./subscription";
import { SubscriptionState } from "./state/subscriptionState";

const app = express();
const PORT = 3000;

app.use(express.json());

/**
 * public folder is at project root: /public
 * server.ts is in: /src
 * so we resolve: __dirname (src) -> .. -> public
 */
const publicPath = path.join(__dirname, "..", "public");
console.log("Resolved public path:", publicPath);

app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const subscription = new Subscription();

app.get("/state", (req, res) => {
  res.json({
    state: subscription.state,
    paymentConfirmed: subscription.paymentConfirmed,
    activatedAt: subscription.activatedAt,
    refunded: subscription.refunded,
    audit: subscription.getAudit()
    
  });
});

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

/**
 * ❌ Vulnerable #1: trust client "paymentConfirmed"
 * Can activate from any state (bypass)
 */
app.post("/payment/callback", (req, res) => {
  try {
    const { paymentConfirmed } = req.body;

    if (paymentConfirmed === true) {
      const previousState = subscription.state;

      subscription.state = SubscriptionState.ACTIVE;
      subscription.paymentConfirmed = true;
      subscription.activatedAt = new Date();

      const bypassDetected = previousState !== SubscriptionState.PAYMENT_PENDING;

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
 * ✅ Secure payment callback: validate state before activating
 */
app.post("/secure/payment/callback", (req, res) => {
  try {
    const { paymentConfirmed } = req.body;

    if (subscription.state !== SubscriptionState.PAYMENT_PENDING) {
      return res.status(400).json({ error: "Payment not expected in current state" });
    }

    if (paymentConfirmed !== true) {
      return res.status(400).json({ error: "Invalid payment confirmation" });
    }

    subscription.activate();

    res.json({ message: "Payment verified securely", state: subscription.state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ❌ Vulnerable #2: refund without validation
 */
app.post("/refund", (req, res) => {
  try {
    subscription.refundVulnerable();
    res.json({ message: "Refund processed (vulnerable)", state: subscription.state });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/secure/refund", (req, res) => {
  try {
    subscription.refundSecure();
    res.json({ message: "Refund processed securely", state: subscription.state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Reset (lab only)
 */
app.post("/reset", (req, res) => {
  subscription.reset();
  res.json({ message: "Reset done", state: subscription.state });
});

app.listen(PORT, () => {
  console.log("🔥 SERVER RUNNING 🔥");
  console.log(`http://localhost:${PORT}`);
});