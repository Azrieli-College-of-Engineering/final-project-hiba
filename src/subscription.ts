import { SubscriptionState } from "./state/subscriptionState";

type AuditEventType =
  | "STATE_CHANGE"
  | "ATTACK_PAYMENT_BYPASS"
  | "ATTACK_REFUND_ABUSE"
  | "SECURE_BLOCKED"
  | "INFO";

export type AuditEvent = {
  time: string;
  type: AuditEventType;
  message: string;
  from?: SubscriptionState;
  to?: SubscriptionState;
};

export class Subscription {
  public state: SubscriptionState;
  public paymentConfirmed: boolean;
  public activatedAt: Date | null;
  public refunded: boolean;

  private audit: AuditEvent[] = [];

  constructor() {
    this.state = SubscriptionState.REGISTERED;
    this.paymentConfirmed = false;
    this.activatedAt = null;
    this.refunded = false;

    this.log("INFO", "Subscription created");
  }

  private now(): string {
    return new Date().toISOString();
  }

  private log(type: AuditEventType, message: string, from?: SubscriptionState, to?: SubscriptionState) {
    this.audit.unshift({ time: this.now(), type, message, from, to });
    // keep last 50 logs only
    this.audit = this.audit.slice(0, 50);
  }

  public getAudit(): AuditEvent[] {
    return this.audit;
  }

  private transition(to: SubscriptionState) {
    const from = this.state;
    this.state = to;
    this.log("STATE_CHANGE", `State changed: ${from} -> ${to}`, from, to);
  }

  selectPlan() {
    if (this.state !== SubscriptionState.REGISTERED) {
      this.log("SECURE_BLOCKED", "Blocked selectPlan: invalid state", this.state, SubscriptionState.PLAN_SELECTED);
      throw new Error("Invalid state transition");
    }
    this.transition(SubscriptionState.PLAN_SELECTED);
  }

  requestPayment() {
    if (this.state !== SubscriptionState.PLAN_SELECTED) {
      this.log("SECURE_BLOCKED", "Blocked requestPayment: invalid state", this.state, SubscriptionState.PAYMENT_PENDING);
      throw new Error("Invalid state transition");
    }
    this.transition(SubscriptionState.PAYMENT_PENDING);
  }

  activate() {
    // ✅ Idempotency: no double activate
    if (this.state === SubscriptionState.ACTIVE) {
      this.log("SECURE_BLOCKED", "Blocked activate: already ACTIVE", this.state, SubscriptionState.ACTIVE);
      throw new Error("Already activated");
    }

    if (this.state !== SubscriptionState.PAYMENT_PENDING) {
      this.log("SECURE_BLOCKED", "Blocked activate: payment not pending", this.state, SubscriptionState.ACTIVE);
      throw new Error("Invalid state transition");
    }

    this.paymentConfirmed = true;
    this.activatedAt = new Date();
    this.transition(SubscriptionState.ACTIVE);
  }

  cancel() {
    if (this.state !== SubscriptionState.ACTIVE) {
      this.log("SECURE_BLOCKED", "Blocked cancel: not ACTIVE", this.state, SubscriptionState.CANCELLED);
      throw new Error("Invalid state transition");
    }
    this.transition(SubscriptionState.CANCELLED);
  }

  // ❌ Vulnerable: refund without validation (can be abused)
  refundVulnerable() {
    if (this.refunded === true) {
      this.log("ATTACK_REFUND_ABUSE", "Refund called multiple times (vulnerable)");
    } else {
      this.log("ATTACK_REFUND_ABUSE", "Refund processed without validation (vulnerable)");
    }
    this.refunded = true;
  }

  // ✅ Secure: refund only if ACTIVE + paid + not refunded yet
  refundSecure() {
    if (this.refunded === true) {
      this.log("SECURE_BLOCKED", "Blocked refund: already refunded");
      throw new Error("Already refunded");
    }

    if (this.state !== SubscriptionState.ACTIVE || this.paymentConfirmed !== true) {
      this.log("SECURE_BLOCKED", "Blocked refund: invalid state/payment", this.state);
      throw new Error("Refund not allowed in current state");
    }

    this.refunded = true;
    this.log("STATE_CHANGE", "Refund processed securely");
  }

  reset() {
    this.state = SubscriptionState.REGISTERED;
    this.paymentConfirmed = false;
    this.activatedAt = null;
    this.refunded = false;
    this.audit = [];
    this.log("INFO", "Reset done");
  }
}