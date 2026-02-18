import { SubscriptionState } from "./state/subscriptionState";

export class Subscription {
  public state: SubscriptionState;
  public paymentConfirmed: boolean;
  public activatedAt: Date | null;
  public refunded: boolean;

  constructor() {
    this.state = SubscriptionState.REGISTERED;
    this.paymentConfirmed = false;
    this.activatedAt = null;
    this.refunded = false;
  }

  selectPlan() {
    if (this.state !== SubscriptionState.REGISTERED) {
      throw new Error("Invalid state transition");
    }
    this.state = SubscriptionState.PLAN_SELECTED;
  }

  requestPayment() {
    if (this.state !== SubscriptionState.PLAN_SELECTED) {
      throw new Error("Invalid state transition");
    }
    this.state = SubscriptionState.PAYMENT_PENDING;
  }

  activate() {
    if (this.state !== SubscriptionState.PAYMENT_PENDING) {
      throw new Error("Invalid state transition");
    }
    this.state = SubscriptionState.ACTIVE;
    this.paymentConfirmed = true;
    this.activatedAt = new Date();
  }

  cancel() {
    if (this.state !== SubscriptionState.ACTIVE) {
      throw new Error("Invalid state transition");
    }
    this.state = SubscriptionState.CANCELLED;
  }

  // ❌ VULNERABLE REFUND
  refundVulnerable() {
    this.refunded = true;
  }
}
