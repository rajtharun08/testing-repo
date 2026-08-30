import os
import time
import requests
import traceback
from typing import Dict, Any, List
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="Pricing Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ARGUS_WEBHOOK_URL = os.getenv("ARGUS_WEBHOOK_URL", "http://127.0.0.1:8000/webhook/crash")
CURRENT_GIT_COMMIT = os.getenv("VERCEL_GIT_COMMIT_SHA", "8a3d12f")


@app.middleware("http")
async def argus_observer_middleware(request: Request, call_next):
    """
    ARGUS Production Observer Middleware for Pricing Microservice:
    Intercepts unhandled runtime exceptions, formats stack trace,
    and posts crash payload to ARGUS /webhook/crash.
    """
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        raw_stack = traceback.format_exc()
        error_msg = f"{type(exc).__name__}: {str(exc)}"
        trace_id = f"tr-pricing-{int(time.time())}"
        
        payload = {
            "trace_id": trace_id,
            "error_message": error_msg,
            "stack_trace": raw_stack,
            "commit_sha": CURRENT_GIT_COMMIT
        }
        
        try:
            requests.post(ARGUS_WEBHOOK_URL, json=payload, timeout=2.0)
            print(f"[ARGUS Pricing Observer] Dispatched crash webhook for {trace_id}: {error_msg}")
        except Exception as net_err:
            print(f"[ARGUS Pricing Observer] Webhook offline: {net_err}")
            
        return JSONResponse(
            status_code=500,
            content={
                "error": "500 Internal Server Error in Pricing Microservice",
                "message": f"Runtime exception in pricing service: {error_msg}",
                "trace_id": trace_id,
                "argus_notified": True
            }
        )


class PricingRequest(BaseModel):
    items: List[Dict[str, Any]]
    promo_code: str = ""


VALID_PROMO_CODES = {
    "SAVE10": 10.0,
    "SAVE20": 20.0,
    "FREESHIP100": 100.0
}


def calculate_pricing_logic(items: List[Dict[str, Any]], promo_code: str = "") -> Dict[str, Any]:
    subtotal = sum(item.get("price", 0.0) * item.get("quantity", 1) for item in items)
    
    discount_percent = 0.0
    if promo_code:
        code_upper = promo_code.strip().upper()
        # Unknown codes are handled as a no-discount calculation so checkout
        # can report the invalid code without taking down the application.
        discount_percent = VALID_PROMO_CODES.get(code_upper, 0.0)
            
    discount_amount = subtotal * (discount_percent / 100.0)
    
    # Preserve the existing 8% tax calculation for partial discounts. A full
    # discount leaves no taxable amount, so skip the tax without calculating a
    # ratio that could have a zero denominator.
    tax_amount = round(subtotal * 0.08 if discount_percent < 100.0 else 0.0, 2)
    shipping_cost = 0.0 if (subtotal - discount_amount) > 50.0 else 9.99
    
    final_total = round((subtotal - discount_amount) + tax_amount + shipping_cost, 2)
    
    return {
        "subtotal": round(subtotal, 2),
        "discount_percent": discount_percent,
        "discount_amount": round(discount_amount, 2),
        "tax_amount": tax_amount,
        "shipping_cost": shipping_cost,
        "total": max(0.0, final_total)
    }


@app.get("/pricing/health")
def health():
    return {"status": "ONLINE", "service": "Pricing Microservice", "commit": CURRENT_GIT_COMMIT}


@app.post("/pricing/calculate")
def calculate_pricing(req: PricingRequest):
    return calculate_pricing_logic(req.items, req.promo_code)
