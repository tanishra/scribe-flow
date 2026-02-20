import os
import razorpay
import json
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from ..database import get_session
from ..schemas.db_models import User
from ..dependencies import get_current_user

# Razorpay Keys from .env
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_mock_id")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "mock_secret")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

router = APIRouter(prefix="/payment", tags=["Payment"])

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/create-order")
async def create_order(current_user: User = Depends(get_current_user)):
    """
    Creates a Razorpay Order for the frontend to initiate payment.
    """
    # 1. Mock Mode Check
    if "mock" in RAZORPAY_KEY_ID:
        return {
            "mock": True,
            "order_id": "order_mock_123",
            "amount": 49900,
            "key": RAZORPAY_KEY_ID
        }

    # 2. Real Razorpay Mode
    try:
        amount = 49900 # ₹499.00
        data = {
            "amount": amount,
            "currency": "INR",
            "receipt": f"receipt_{current_user.id}",
            "notes": {
                "user_id": current_user.id,
                "email": current_user.email
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
    """
    Verifies the payment signature and upgrades the user.
    """
    # 1. Handle Mock Success
    if "mock" in req.razorpay_order_id:
        current_user.is_premium = True
        current_user.credits_left = 9999
        session.add(current_user)
        session.commit()
        return {"status": "success", "message": "Mock upgrade successful"}

    # 2. Real Verification
    try:
        params_dict = {
            'razorpay_order_id': req.razorpay_order_id,
            'razorpay_payment_id': req.razorpay_payment_id,
            'razorpay_signature': req.razorpay_signature
        }
        # This raises an error if signature is invalid
        client.utility.verify_payment_signature(params_dict)
        
        # Success! Upgrade user
        current_user.is_premium = True
        current_user.credits_left = 9999
        session.add(current_user)
        session.commit()
        
        return {"status": "success", "message": "Payment verified and account upgraded!"}
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed")
