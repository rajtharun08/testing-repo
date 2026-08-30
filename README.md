# ArgusStore: E-Commerce Target Application for ARGUS Debugger

> "A production-grade Next.js & FastAPI e-commerce application designed to demonstrate ARGUS Autonomous Closed-Loop Debugging in production."

---

## 🏗️ Technical Architecture

- **Frontend:** Next.js 14 (App Router) + React 18 + Tailwind CSS + Lucide Icons (Port 3000)
- **Backend API:** FastAPI Microservices Architecture (API Gateway on Port 8001, Pricing Service on 8002, Shipping Service on 8003, Inventory Service on 8004)
- **Production Observer:** Built-in `argus_observer_middleware` intercepting unhandled 500 exceptions, scrubbing sensitive data, and posting telemetry to ARGUS `/webhook/crash`.
- **Containerization:** Multi-stage Docker setup with Docker Compose (`docker-compose.yml`)

---

## 🚀 Running the Application with Docker

To build and launch both the Next.js frontend and Python FastAPI backend microservices simultaneously:

```bash
docker compose up --build
```

- **Storefront UI:** [http://localhost:3000](http://localhost:3000)
- **API Gateway:** [http://localhost:8001](http://localhost:8001)
- **Pricing Microservice:** [http://localhost:8002](http://localhost:8002)
- **Shipping Microservice:** [http://localhost:8003](http://localhost:8003)
- **Inventory Microservice:** [http://localhost:8004](http://localhost:8004)

To stop the containers:
```bash
docker compose down
```

---

## 💻 Local Development (Without Docker)

### 1. Run Python Backend Microservices

```bash
cd backend
pip install -r requirements.txt
python run_microservices.py
```

### 2. Run Next.js Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Promo Codes & Production Crashes for ARGUS

The storefront is designed to demonstrate ARGUS autonomous error detection, telemetry ingestion, and sandbox verification.

### Promo Code Scenarios

| Promo Code | Expected Behavior (Before ARGUS Fix) | Expected Behavior (After ARGUS Fix) | Bug Detail |
| :--- | :--- | :--- | :--- |
| `SAVE10` | **Success:** Applies 10% discount | **Success:** Applies 10% discount | Valid Promo Code |
| `SAVE20` | **Success:** Applies 20% discount | **Success:** Applies 20% discount | Valid Promo Code |
| `INVALID50` | **💥 Crashes Website (HTTP 500):** Unhandled `KeyError: 'INVALID50'` in `pricing_service.py`. Observer sends crash telemetry to ARGUS. Frontend displays live Error Console overlay. | **✅ Handled Toast Popup:** Displays `"Incorrect or invalid code"` popup notification without crashing the UI. | Missing dictionary `.get()` fallback in `calculate_pricing_logic` |
| `FREESHIP100` | **💥 Previously failed:** A full discount reached a zero-denominator tax calculation. | **✅ Handled:** Correctly applies 100% discount without a zero-denominator calculation. | Full discounts now skip tax safely. |

---

## 💥 How to Reproduce & Verify Production Crashes

### 1. Trigger `KeyError` Crash (Invalid Promo Code)
1. Go to [http://localhost:3000](http://localhost:3000).
2. Click **Add to Cart** on any product.
3. Open the **Cart** drawer $\rightarrow$ Enter promo code `INVALID50`.
4. Click **Place Order & Calculate**.
5. **Observed Behavior:**
   - The backend throws `KeyError: 'INVALID50'` in `backend/microservices/pricing_service.py`.
   - `argus_observer_middleware` intercepts the crash, generates a `trace_id`, and dispatches telemetry to ARGUS `/webhook/crash`.
   - The frontend displays the **System Runtime Exception Detected (HTTP 500)** error console banner with live telemetry details.
6. **After ARGUS Fixes the Code:**
   - When ARGUS patches `pricing_service.py` to handle invalid promo codes safely, submitting an invalid code pops up a toast notification: **"Incorrect or invalid code"** instead of crashing.

### 2. Verify the full-discount code
1. Add any product to the cart.
2. Enter promo code `FREESHIP100`.
3. Click **Place Order & Calculate**.
4. The checkout returns a valid calculation with a 100% discount and no tax error.

### 3. Trigger `KeyError` (Missing Shipping Address Field)
1. Open the **Cart** drawer $\rightarrow$ Clear the **Zip Code** input.
2. Click **Place Order & Calculate**.
3. Throws `KeyError: 'zip_code'` in `shipping_service.py`.

---

## 📁 Repository Structure

```
testing-repo/
├── frontend/                     # Next.js 14 Storefront Application
│   ├── Dockerfile                # Multi-stage standalone container build
│   ├── package.json              # Next.js & UI dependencies
│   ├── next.config.mjs           # API rewrites & standalone configuration
│   ├── tailwind.config.js        # Tailwind styling
│   ├── jsconfig.json             # Path alias mapping
│   └── src/
│       └── app/
│           ├── layout.jsx        # Root HTML shell
│           ├── page.jsx          # Storefront, cart drawer, toast & crash console
│           └── globals.css       # Tailwind base directives
│
├── backend/                      # Python FastAPI Microservices Backend
│   ├── Dockerfile                # Python microservices container
│   ├── index.py                  # Microservices API Gateway & Observer Middleware
│   ├── run_microservices.py      # Multi-service runner (Ports 8001-8004)
│   ├── requirements.txt          # Backend dependencies
│   ├── microservices/            # Domain microservices
│   │   ├── pricing_service.py    # Pricing & discount logic (ZeroDivision & KeyError bugs)
│   │   ├── shipping_service.py   # Shipping rate calculations (KeyError bug)
│   │   └── inventory_service.py  # Inventory validation (IndexError bug)
│   ├── services/                 # Business logic engines
│   │   ├── pricing_engine.py
│   │   ├── shipping_engine.py
│   │   └── inventory_engine.py
│   └── tests/                    # PyTest test suite for ARGUS Sandbox Gate
│       ├── test_pricing.py
│       └── test_shipping.py
│
├── docker-compose.yml            # Orchestrates frontend (:3000) and backend (:8001-:8004)
├── package.json                  # Root monorepo scripts
└── README.md
```
