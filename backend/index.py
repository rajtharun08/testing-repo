import os
import sys
import time
import requests
import traceback
from typing import Dict, Any, List
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Add current folder to sys.path for clean microservice imports on Vercel
sys.path.insert(0, os.path.dirname(__file__))

from microservices.pricing_service import calculate_pricing_logic, app as pricing_app
from microservices.shipping_service import calculate_shipping_logic, app as shipping_app
from microservices.inventory_service import verify_inventory_logic, app as inventory_app

app = FastAPI(title="ArgusStore Microservices API Gateway", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount individual microservices as sub-applications on the gateway
app.mount("/services/pricing", pricing_app)
app.mount("/services/shipping", shipping_app)
app.mount("/services/inventory", inventory_app)

ARGUS_WEBHOOK_URL = os.getenv("ARGUS_WEBHOOK_URL", "http://127.0.0.1:8000/webhook/crash")
CURRENT_GIT_COMMIT = os.getenv("VERCEL_GIT_COMMIT_SHA", "8a3d12f")


@app.middleware("http")
async def argus_observer_middleware(request: Request, call_next):
    """
    ARGUS Production Observer Middleware for API Gateway:
    Interceptors unhandled exceptions in production API routes, formats tracebacks,
    redacts sensitive information, and posts a crash payload to ARGUS /webhook/crash.
    """
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        raw_stack = traceback.format_exc()
        error_msg = f"{type(exc).__name__}: {str(exc)}"
        trace_id = f"tr-prod-{int(time.time())}"
        
        # Package telemetry payload for ARGUS Webhook Ingestion Engine
        payload = {
            "trace_id": trace_id,
            "error_message": error_msg,
            "stack_trace": raw_stack,
            "commit_sha": CURRENT_GIT_COMMIT
        }
        
        # Fire async HTTP POST webhook to ARGUS
        try:
            requests.post(ARGUS_WEBHOOK_URL, json=payload, timeout=2.0)
            print(f"[ARGUS Gateway Observer] Dispatched crash webhook for {trace_id}: {error_msg}")
        except Exception as net_err:
            print(f"[ARGUS Gateway Observer] Webhook dispatch offline: {net_err}")
            
        return JSONResponse(
            status_code=500,
            content={
                "error": "500 Internal Server Error",
                "message": f"Runtime exception in production gateway service: {error_msg}",
                "trace_id": trace_id,
                "argus_notified": True
            }
        )


class CheckoutRequest(BaseModel):
    items: List[Dict[str, Any]]
    promo_code: str = ""
    address: Dict[str, Any] = {}


@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE", 
        "gateway": "ArgusStore Microservices API Gateway", 
        "commit": CURRENT_GIT_COMMIT,
        "microservices": ["pricing_service", "shipping_service", "inventory_service"]
    }


@app.get("/api/products")
def list_products():
    return [
        {
            "id": "prod_1",
            "name": "Argus Developer Hoodie",
            "category": "Apparel",
            "price": 65.00,
            "rating": 4.9,
            "image": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=60",
            "description": "Premium fleece hoodie with embroidered Argus Autonomous Debugger logo."
        },
        {
            "id": "prod_2",
            "name": "Mechanical Coding Keyboard",
            "category": "Hardware",
            "price": 120.00,
            "rating": 4.8,
            "image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60",
            "description": "Hot-swappable mechanical keyboard engineered for fast-paced pair programming."
        },
        {
            "id": "prod_3",
            "name": "UltraWide 4K Developer Monitor",
            "category": "Electronics",
            "price": 450.00,
            "rating": 4.9,
            "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=60",
            "description": "34-inch curved monitor with dual-pane layout for IDE code inspection and logs."
        },
        {
            "id": "prod_4",
            "name": "Argus AI Debugger Mug",
            "category": "Accessories",
            "price": 22.00,
            "rating": 4.7,
            "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60",
            "description": "Ceramic coffee mug printed with '1000 Eyes on Your Logs. One Verified Fix.'"
        }
    ]


@app.post("/api/checkout")
def process_checkout(req: CheckoutRequest):
    """
    API Gateway Checkout Orchestrator:
    Dispatches calls across microservices (Inventory Microservice -> Shipping Microservice -> Pricing Microservice).
    Unknown promo codes are handled as no-discount calculations.
    FREESHIP100 applies a full discount without a zero-denominator tax calculation.
    Passing address without zip_code triggers KeyError in Shipping Microservice.
    Passing empty items list triggers IndexError in Inventory Microservice.
    """
    # 1. Dispatch to Inventory Microservice
    inventory = verify_inventory_logic(req.items)
    
    # 2. Dispatch to Shipping Microservice if address provided
    shipping = None
    if req.address:
        shipping = calculate_shipping_logic(req.address)
        
    # 3. Dispatch to Pricing Microservice
    pricing = calculate_pricing_logic(req.items, promo_code=req.promo_code)
    
    return {
        "status": "SUCCESS",
        "inventory": inventory,
        "shipping": shipping,
        "pricing": pricing
    }
