import os
import razorpay
import json
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from ..database import get_session
from ..schemas.db_models import User, Transaction
from ..dependencies import get_current_user

# Razorpay Keys from .env
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

# Initialize client only if keys exist to prevent startup crash if not using payments
client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET else None


router = APIRouter(prefix="/payment", tags=["Payment"])

class OrderRequest(BaseModel):
    plan: str # "basic" or "pro"

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str

@router.post("/create-order")
async def create_order(req: OrderRequest, current_user: User = Depends(get_current_user)):
    """Creates a Razorpay Order based on selected plan."""
    
    # Logic for amounts
    amounts = {
        "basic": 99900,  # ₹999
        "pro": 199900    # ₹1999
    }
    
    amount = amounts.get(req.plan, 99900)

    if not client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")

    try:
        data = {
            "amount": amount,
            "currency": "INR",
            "receipt": f"receipt_{current_user.id}",
            "notes": {
                "user_id": current_user.id,
                "plan": req.plan
            }
        }
        order = client.order.create(data=data)
        return {
            "mock": False,
            "order_id": order['id'],
            "amount": order['amount'],
            "key": RAZORPAY_KEY_ID
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify")
async def verify_payment(
    req: VerifyPaymentRequest, 
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Verifies payment and grants credits based on plan."""
    
    # Credit logic
    credits_map = {
        "basic": 20, # ₹999 -> 20
        "pro": 50    # ₹1999 -> 50
    }
    amounts_map = {
        "basic": 99900,
        "pro": 199900
    }
    reward = credits_map.get(req.plan, 20)
    amount = amounts_map.get(req.plan, 99900)

    if not client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")

    try:
        params_dict = {
            'razorpay_order_id': req.razorpay_order_id,
            'razorpay_payment_id': req.razorpay_payment_id,
            'razorpay_signature': req.razorpay_signature
        }
        client.utility.verify_payment_signature(params_dict)
        
        # SUCCESS: Grant credits
        current_user.credits_left += reward 
        
        # RECORD TRANSACTION
        txn = Transaction(
            user_id=current_user.id,
            plan=req.plan,
            amount=amount,
            credits_added=reward,
            razorpay_order_id=req.razorpay_order_id,
            razorpay_payment_id=req.razorpay_payment_id
        )
        session.add(txn)
        session.add(current_user)
        session.commit()
        
        return {"status": "success", "message": f"Successfully added {reward} credits!"}
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed")
