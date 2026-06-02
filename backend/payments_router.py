"""Razorpay payment endpoints — student Buy Now flow.

Flow:
  1. Student picks a product + enters shipping address.
  2. Frontend calls POST /api/payments/create-order → server creates an order_doc
     in `student_orders` (status='Pending') and a Razorpay Order.
  3. Frontend opens Razorpay Checkout with the order_id.
  4. On success, frontend calls POST /api/payments/verify → server verifies the
     signature and flips the order_doc status to 'Confirmed'.
  5. Optional webhook at POST /api/payments/webhook for async events.

If RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not yet set in .env, endpoints
return a 503 with a clear error.
"""
from __future__ import annotations

import os
import uuid
import hmac
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


def _client():
    key_id = os.environ.get("RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        raise HTTPException(
            status_code=503,
            detail="Payments are not configured yet. Please ask the platform admin to set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        )
    import razorpay  # local import to keep cold-start light
    return razorpay.Client(auth=(key_id, key_secret))


class Address(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=6, max_length=20)
    line1: str = Field(min_length=1, max_length=200)
    line2: Optional[str] = ""
    city: str = Field(min_length=1, max_length=80)
    state: str = Field(min_length=1, max_length=80)
    pincode: str = Field(min_length=3, max_length=12)
    country: str = "India"


class CreateOrderReq(BaseModel):
    product_id: str
    quantity: int = Field(ge=1, le=20, default=1)
    address: Address


class VerifyReq(BaseModel):
    order_id: str  # internal student_orders id
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def attach(api_router, db: AsyncIOMotorDatabase, get_current_user):
    """Wire endpoints into the parent api router."""

    @api_router.get("/payments/config")
    async def payment_config(user: dict = Depends(get_current_user)):
        """Returns just the public key id (safe to expose) and a configured flag."""
        key_id = os.environ.get("RAZORPAY_KEY_ID") or ""
        return {"configured": bool(key_id), "key_id": key_id}

    @api_router.post("/payments/create-order")
    async def create_order(payload: CreateOrderReq, user: dict = Depends(get_current_user)):
        client = _client()
        prod = await db.products.find_one({"id": payload.product_id}, {"_id": 0})
        if not prod:
            raise HTTPException(status_code=404, detail="Product not found.")
        if (prod.get("stock") or "in") == "out":
            raise HTTPException(status_code=400, detail="This product is out of stock.")

        price = float(prod.get("price") or 0)
        if price <= 0:
            raise HTTPException(status_code=400, detail="Product price is not set. Please contact support.")
        amount_paise = int(round(price * payload.quantity * 100))

        receipt = f"rcpt_{uuid.uuid4().hex[:20]}"
        try:
            razor_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "payment_capture": 1,
                "receipt": receipt,
                "notes": {"user_id": user["user_id"], "product_id": payload.product_id},
            })
        except Exception as e:
            logger.exception("Razorpay order create failed")
            raise HTTPException(status_code=502, detail=f"Payment gateway error: {e}")

        now = datetime.now(timezone.utc).isoformat()
        order_id = f"ord_{uuid.uuid4().hex[:12]}"
        order_doc = {
            "id": order_id,
            "user_id": user["user_id"],
            "user_email": user.get("email"),
            "user_name": user.get("name"),
            "product_id": payload.product_id,
            "product_name": prod.get("name"),
            "quantity": payload.quantity,
            "price": price * payload.quantity,
            "address": payload.address.model_dump(),
            "status": "Pending",
            "razorpay_order_id": razor_order.get("id"),
            "razorpay_payment_id": None,
            "razorpay_signature": None,
            "amount_paise": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "created_at": now,
            "updated_at": now,
        }
        await db.student_orders.insert_one(order_doc)
        # Strip internal fields before returning
        order_doc.pop("razorpay_signature", None)
        return {
            "order": order_doc,
            "razorpay_order_id": razor_order.get("id"),
            "amount": amount_paise,
            "currency": "INR",
            "key_id": os.environ.get("RAZORPAY_KEY_ID"),
            "prefill": {
                "name": user.get("name") or payload.address.name,
                "email": user.get("email") or "",
                "contact": payload.address.phone,
            },
        }

    @api_router.post("/payments/verify")
    async def verify_payment(payload: VerifyReq, user: dict = Depends(get_current_user)):
        secret = os.environ.get("RAZORPAY_KEY_SECRET")
        if not secret:
            raise HTTPException(status_code=503, detail="Payments are not configured yet.")

        order = await db.student_orders.find_one({"id": payload.order_id, "user_id": user["user_id"]}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")
        if order.get("razorpay_order_id") != payload.razorpay_order_id:
            raise HTTPException(status_code=400, detail="Razorpay order id mismatch.")

        body = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
        expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, payload.razorpay_signature):
            await db.student_orders.update_one(
                {"id": payload.order_id},
                {"$set": {"status": "Cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            raise HTTPException(status_code=400, detail="Payment signature verification failed.")

        now = datetime.now(timezone.utc).isoformat()
        await db.student_orders.update_one(
            {"id": payload.order_id},
            {"$set": {
                "status": "Confirmed",
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
                "paid_at": now,
                "updated_at": now,
            }},
        )
        fresh = await db.student_orders.find_one({"id": payload.order_id}, {"_id": 0})
        fresh.pop("razorpay_signature", None)
        return {"ok": True, "order": fresh}

    @api_router.post("/payments/webhook")
    async def webhook(request: Request):
        """Razorpay webhook receiver. Verifies signature using RAZORPAY_WEBHOOK_SECRET."""
        webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET")
        if not webhook_secret:
            return {"status": "skipped", "reason": "RAZORPAY_WEBHOOK_SECRET not set"}
        body = await request.body()
        signature = request.headers.get("X-Razorpay-Signature", "")
        expected = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")
        try:
            event = (await request.json()) or {}
        except Exception:
            event = {}
        event_type = event.get("event")
        payment = (event.get("payload", {}).get("payment", {}) or {}).get("entity", {}) or {}
        razorpay_order_id = payment.get("order_id")
        if razorpay_order_id:
            new_status = {
                "payment.captured": "Confirmed",
                "payment.failed": "Cancelled",
                "refund.created": "Returned",
            }.get(event_type or "")
            if new_status:
                await db.student_orders.update_one(
                    {"razorpay_order_id": razorpay_order_id},
                    {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
        return {"ok": True}
