# CampusConnect: Educational Service-Oriented Architecture (SOA) Platform

> **Tagline:** One campus. Easier appointments. Better-connected services.  
> **Architecture Pattern:** Modular Monolith with Explicit SOA Service Boundaries, Adapters, Distributed Correlation Tracing, and Fault Isolation.

---

## 📌 Executive Summary & Architecture Overview

**CampusConnect** is a full-stack campus appointment and queue-management platform engineered as an educational prototype of **Service-Oriented Architecture (SOA)**. Rather than introducing the operational complexity of distributed microservices, CampusConnect implements a disciplined **modular monolith**:

- **Two Distinct Consumer Applications**:
  1. **Campus Clinic**: Discover clinic slots, book appointments, receive an automated queue ticket (`Q001`+), monitor live queue progress, and manage triage from the clinic desk.
  2. **Academic Advising**: Find faculty advisers and available 45-minute slots, schedule degree audits, reschedule, and record consultation notes—**strictly without a clinic queue ticket**.
- **Shared Core Business Services**:
  - `AppointmentManagementService` (Booking, rescheduling, cancellation, idempotency protection)
  - `AvailabilityService` (Provider slot management, concurrency checks, overlap prevention)
  - `Identity & RBAC Service` (Session cookie authentication, role-based decorators)
  - `NotificationService` (Safe async messaging with fault isolation)
  - `Audit & Request Trace Service` (Correlation ID tracing and compliance log)
- **Adapter Layer**:
  - `ClinicAdapter` validates clinic context, reserves the slot, generates a queue ticket, and emits notifications.
  - `AdvisingAdapter` coordinates advising booking directly through core appointment services without queue entry generation.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** & npm installed

### 1. Backend Setup & Seed
```bash
# Navigate to project root
cd Antigravity-soa

# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Run backend automated tests (39 tests, 100% pass rate)
python -m pytest backend/tests -v

# 3. Seed demo accounts, services, providers, slots & traces
python -m flask --app backend/run.py seed-demo

# 4. Start Flask backend (port 5000)
python backend/run.py
```

### 2. Frontend Setup & Run
```bash
# Open a new terminal in the frontend directory
cd Antigravity-soa/frontend

# 1. Install dependencies
npm install

# 2. Run frontend unit/component tests (13 tests)
npm test

# 3. Verify TypeScript build
npm run build

# 4. Start Vite development server (port 5173)
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 👥 Demo Accounts

The database is pre-seeded with synthetic demonstration accounts:

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Student** | `alex.kim@students.edu` | `student1234` | Book clinic/advising, view tickets, cancel, reschedule |
| **Clinic Staff** | `clinic.staff@campusconnect.edu` | `staff1234` | Live queue desk, call next patient, advance status |
| **Adviser** | `j.morgan@campusconnect.edu` | `adviser1234` | Advising schedule, mark session completed, log notes |
| **Admin** | `admin@campusconnect.edu` | `admin1234` | SOA Technical Console, Trace Explorer, Fault Lab |

*Note: You can copy or auto-fill demo credentials using the one-click banner on the `/login` page.*

---

## 🔬 SOA Technical Console & Fault Lab

1. Sign in as **`admin@campusconnect.edu`**.
2. Navigate to **SOA Technical Console** (`/app/admin/soa-console`):
   - Inspect the **Service Registry**: base paths, owning modules, and health checks.
   - Review 7-day cross-service booking ingestion metrics.
3. Open **Distributed Traces** (`/app/admin/traces`):
   - Trace any booking by its `X-Correlation-ID`.
   - Inspect the waterfall timeline: `ClinicAdapter` -> `AppointmentService` -> `ClinicQueueService` -> `NotificationService`.
4. Open **Fault Simulation Lab** (`/app/admin/fault-lab`):
   - **Simulate Slot Contention (409)**: Demonstrates atomic rollback and client notification when slots are concurrently taken.
   - **Simulate Notification Failure**: Demonstrates **fault isolation**—the booking and queue ticket are safely preserved even if notifications fail.
   - Run the live in-browser execution console to test real-time JSON responses.

---

## 🧪 Automated Test Suite

### 1. Backend Pytest Suite (39 Tests, 100% Pass Rate)
Run the full pytest suite:
```bash
python -m pytest backend/tests -v
```

### 2. Frontend Vitest Suite (13 Tests, 100% Pass Rate)
Run the component and API client test suite:
```bash
cd frontend
npm test
```

### Verified Test Scenarios:
- `TC-01`: Authentication (valid, invalid, unauthenticated session rejection)
- `TC-02`: Role-based access control (students blocked from staff & admin endpoints)
- `TC-03`: Appointment ownership (students cannot view/modify other students' bookings)
- `TC-04`: Clinic booking generates appointment AND queue ticket
- `TC-05`: Advising booking creates appointment WITHOUT queue ticket
- `TC-06`: Concurrency/conflict rejection (HTTP 409 `SLOT_UNAVAILABLE`)
- `TC-08`: Idempotency key replay (returns original booking without duplicating)
- `TC-09`: Cancellation releases slot back to available pool
- `TC-10`: Reschedule failure preserves original booking
- `TC-11`: Queue state machine validation (`WAITING` -> `CALLED` valid; invalid transitions rejected)
- `TC-12`: Notification failure isolation (appointment persists)
- `TC-13`: Audit trail records correlation IDs with no credentials or sensitive tokens
- `TC-14`: Adviser manages session outcomes & records persistent consultation notes
- `TC-16`: Staff retrieves provider schedule across all slots
- `TC-17`: Staff publishes new availability slots, blocks, and unblocks slots
- `TC-18`: SOA service policies contrast Clinic (queue-enabled) vs Advising
- `TC-19`: API contracts registry verifies endpoint schema definitions and RBAC roles
- `TC-20`: End-to-End smoke tests covering multi-persona authentication, booking lifecycles, and fault isolation

---

## 🛡️ Disclaimer
This is an educational prototype. It uses synthetic demonstration data only and does not store actual medical or protected student information.

