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
        "basic": 49900, # ₹499
        "pro": 99900    # ₹999
    }
    
    amount = amounts.get(req.plan, 49900)

    if "mock" in RAZORPAY_KEY_ID:
        return {
            "mock": True,
            "order_id": "order_mock_" + os.urandom(4).hex(),
            "amount": amount,
            "key": RAZORPAY_KEY_ID
        }

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
        "basic": 20, # ₹499 -> 20
        "pro": 50    # ₹999 -> 50
    }
    reward = credits_map.get(req.plan, 20)

    if "mock" in req.razorpay_order_id:
        current_user.is_premium = True
        current_user.credits_left += reward
        session.add(current_user)
        session.commit()
        return {"status": "success", "message": f"Mock upgrade: {reward} credits added."}

    try:
        params_dict = {
            'razorpay_order_id': req.razorpay_order_id,
            'razorpay_payment_id': req.razorpay_payment_id,
            'razorpay_signature': req.razorpay_signature
        }
        client.utility.verify_payment_signature(params_dict)
        
        # SUCCESS: Grant credits
        current_user.is_premium = True
        current_user.credits_left += reward 
        session.add(current_user)
        session.commit()
        
        return {"status": "success", "message": f"Successfully added {reward} credits!"}
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed")
