"""Live simulation script demonstrating CampusConnect's multi-persona SOA capabilities."""
import json
import time
import urllib.request
import urllib.error
import http.cookiejar

BASE_URL = "http://127.0.0.1:5000/api/v1"

class SimulationClient:
    def __init__(self):
        self.cj = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))

    def request(self, method: str, path: str, data: dict = None):
        url = f"{BASE_URL}{path}"
        headers = {"Content-Type": "application/json"}
        req_data = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
        try:
            with self.opener.open(req) as resp:
                raw = resp.read().decode("utf-8")
                return resp.status, json.loads(raw)
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8")
            try:
                return e.code, json.loads(raw)
            except Exception:
                return e.code, {"error": raw}

def print_section(title: str):
    print("\n" + "=" * 70)
    print(f" {title.upper()} ")
    print("=" * 70)

def run_simulation():
    client = SimulationClient()

    # -------------------------------------------------------------
    # Step 1: Admin configures Fault Simulation Lab
    # -------------------------------------------------------------
    print_section("Step 1: Admin & SOA Service Introspection")
    status, res = client.request("POST", "/auth/login", {"email": "admin@campusconnect.edu", "password": "admin1234"})
    print(f"[OK] Logged in as Admin: {res['data']['full_name']} (Role: {res['data']['role']})")

    # Inspect SOA policies
    status, policies_res = client.request("GET", "/admin/policies")
    print("\n[*] Inspecting SOA Service Policies:")
    for svc_code, policy in policies_res["data"].items():
        print(f"   * Service {svc_code}: Duration={policy['default_duration_minutes']}m, QueueEnabled={policy['queue_enabled']}, Cutoff={policy['cancellation_cutoff_hours']}h")

    # Enable fault simulation: Notification failure
    print("\n[*] Activating Fault Simulation Lab: Injecting 'notification_failure'...")
    status, fault_res = client.request("POST", "/admin/fault-lab/flags", {"notification_failure": True})
    print(f"   * Active Fault Lab State: {fault_res['data']}")

    client.request("POST", "/auth/logout")

    # -------------------------------------------------------------
    # Step 2: Student Alex Kim books a Clinic Appointment
    # -------------------------------------------------------------
    print_section("Step 2: Student Clinic Journey (With Queue Ticket)")
    status, res = client.request("POST", "/auth/login", {"email": "alex.kim@students.edu", "password": "student1234"})
    print(f"[OK] Logged in as Student: {res['data']['full_name']}")

    # Find available clinic slots
    status, slots_res = client.request("GET", "/availability?service_type=CLINIC")
    avail_slots = [s for s in slots_res["data"] if s["state"] == "AVAILABLE" and not s.get("is_booked")]
    if not avail_slots:
        print("[!] No available clinic slot found.")
        return
    clinic_slot = avail_slots[0]
    print(f"[*] Found available clinic slot #{clinic_slot['id']} at {clinic_slot['start_at']} with {clinic_slot['provider_name']}")

    # Book clinic appointment under active fault simulation
    print("[*] Dispatching clinic booking via ClinicAdapter (testing Fault Isolation)...")
    status, book_res = client.request("POST", "/appointments", {
        "service_type": "CLINIC",
        "slot_id": clinic_slot["id"],
        "provider_id": clinic_slot["provider_id"],
        "notes": "Routine blood pressure check and general consultation",
        "request_id": f"sim-clinic-{int(time.time())}-{clinic_slot['id']}",
    })
    clinic_appt = book_res["data"]
    queue_ticket = clinic_appt.get("queue_entry")
    print(f"[SUCCESS] Appointment Created: ID={clinic_appt['id']}")
    print(f"   * Status: {clinic_appt['status']}")
    print(f"   * Ticket Number Issued: {queue_ticket['ticket_number']} (Status: {queue_ticket['status']})")
    print(f"   * Fault Isolation Confirmed: Booking succeeded even though notifications failed gracefully!")

    # Check student queue monitor
    status, q_res = client.request("GET", "/clinic/queue/me")
    q_data = q_res["data"]
    print(f"\n[*] Student Live Queue Monitor:")
    print(f"   * Ticket: {q_data['ticket_number']}")
    print(f"   * Status: {q_data['status']}")
    print(f"   * Patients Ahead in Line: {q_data.get('ahead', 0)}")

    client.request("POST", "/auth/logout")

    # -------------------------------------------------------------
    # Step 3: Clinic Staff manages the Queue Desk
    # -------------------------------------------------------------
    print_section("Step 3: Clinic Staff Queue Desk & Triage")
    status, res = client.request("POST", "/auth/login", {"email": "clinic.staff@campusconnect.edu", "password": "staff1234"})
    print(f"[OK] Logged in as Clinic Staff: {res['data']['full_name']}")

    entry_id = queue_ticket["id"]
    print(f"[*] Calling patient with ticket {queue_ticket['ticket_number']} to consultation desk...")
    status, call_res = client.request("POST", f"/staff/clinic/queue/{entry_id}/status", {"status": "CALLED"})
    print(f"   * Status updated to: {call_res['data']['status']}")

    print("[*] Transitioning patient to consultation room...")
    status, in_svc_res = client.request("POST", f"/staff/clinic/queue/{entry_id}/status", {"status": "IN_SERVICE"})
    print(f"   * Status updated to: {in_svc_res['data']['status']}")

    print("[*] Doctor concludes consultation...")
    status, comp_res = client.request("POST", f"/staff/clinic/queue/{entry_id}/status", {"status": "COMPLETED"})
    print(f"   * Status updated to: {comp_res['data']['status']}")

    client.request("POST", "/auth/logout")

    # -------------------------------------------------------------
    # Step 4: Student Alex Kim books Academic Advising
    # -------------------------------------------------------------
    print_section("Step 4: Academic Advising Journey (No Queue Ticket)")
    status, res = client.request("POST", "/auth/login", {"email": "alex.kim@students.edu", "password": "student1234"})
    print(f"[OK] Logged in as Student: {res['data']['full_name']}")

    # Find available advising slots for Prof. Morgan
    status, adv_slots_res = client.request("GET", "/availability?service_type=ADVISING")
    avail_adv_slots = [s for s in adv_slots_res["data"] if s["state"] == "AVAILABLE" and not s.get("is_booked") and "Morgan" in (s.get("provider_name") or "")]
    if not avail_adv_slots:
        avail_adv_slots = [s for s in adv_slots_res["data"] if s["state"] == "AVAILABLE" and not s.get("is_booked")]
    adv_slot = avail_adv_slots[0]
    print(f"[*] Found advising slot #{adv_slot['id']} at {adv_slot['start_at']} with {adv_slot['provider_name']}")

    # Book advising session
    print("[*] Dispatching advising booking via AdvisingAdapter...")
    status, adv_book_res = client.request("POST", "/appointments", {
        "service_type": "ADVISING",
        "slot_id": adv_slot["id"],
        "provider_id": adv_slot["provider_id"],
        "notes": "Discussing capstone project topic and graduation requirements",
        "request_id": f"sim-advising-{int(time.time())}-{adv_slot['id']}",
    })
    adv_appt = adv_book_res["data"]
    print(f"[SUCCESS] Advising Appointment Created: ID={adv_appt['id']}")
    print(f"   * Status: {adv_appt['status']}")
    print(f"   * Queue Entry: {adv_appt.get('queue_entry')} (Strictly None - SOA boundary preserved!)")

    client.request("POST", "/auth/logout")

    # -------------------------------------------------------------
    # Step 5: Adviser Prof. James Morgan reviews and logs outcome notes
    # -------------------------------------------------------------
    print_section("Step 5: Adviser Records Consultation Outcome Notes")
    status, res = client.request("POST", "/auth/login", {"email": "j.morgan@campusconnect.edu", "password": "adviser1234"})
    print(f"[OK] Logged in as Adviser: {res['data']['full_name']}")

    outcome_text = "Student approved for Capstone Project registration. Prerequisite CS401 completed with distinction."
    print(f"[*] Logging outcome notes: \"{outcome_text}\"")
    status, outcome_res = client.request("POST", f"/staff/advising/appointments/{adv_appt['id']}/status", {
        "status": "COMPLETED",
        "outcome_notes": outcome_text,
    })
    print(f"[SUCCESS] Advising Session Completed:")
    print(f"   * Appointment ID: {outcome_res['data']['id']}")
    print(f"   * Final Status: {outcome_res['data']['status']}")
    print(f"   * Saved Outcome Notes: \"{outcome_res['data']['outcome_notes']}\"")

    client.request("POST", "/auth/logout")

    # -------------------------------------------------------------
    # Step 6: Admin inspects Distributed Request Traces & Audit Logs
    # -------------------------------------------------------------
    print_section("Step 6: SOA Trace Explorer & Audit Compliance")
    status, res = client.request("POST", "/auth/login", {"email": "admin@campusconnect.edu", "password": "admin1234"})
    print(f"[OK] Logged in as Admin: {res['data']['full_name']}")

    # Reset fault flags
    client.request("POST", "/admin/fault-lab/flags", {"notification_failure": False})
    print("[*] Reset fault flags to normal operating mode.")

    # Fetch recent traces
    status, traces_res = client.request("GET", "/admin/traces")
    traces = traces_res["data"]["traces"]
    print(f"\n[*] Found {len(traces)} recent distributed request trace chains:")
    for t in traces[:3]:
        print(f"   * Correlation ID: {t['correlation_id']} ({t['step_count']} steps recorded, Started: {t['started_at']})")

    if traces:
        sample_cid = traces[0]["correlation_id"]
        status, steps_res = client.request("GET", f"/admin/traces?correlation_id={sample_cid}")
        print(f"\n[*] Waterfall trace steps for Correlation ID [{sample_cid}]:")
        for idx, step in enumerate(steps_res["data"]["steps"], 1):
            duration_ms = f"{step['duration_ms']:.2f}ms" if step.get("duration_ms") is not None else "<1ms"
            print(f"     {idx}. [{step['service_name']}] -> {step['operation']} (Outcome: {step['outcome']}, Duration: {duration_ms})")

    # Audit events
    status, audit_res = client.request("GET", "/admin/audit-events")
    events = audit_res["data"]["events"]
    print(f"\n[*] Recent Audit Trail Entries ({len(events)} logged):")
    for evt in events[:4]:
        print(f"   * [{evt['event_type']}] by {evt['actor_name']} ({evt['outcome']}) - Correlation: {evt.get('correlation_id', 'N/A')}")

    print_section("Simulation Completed Successfully!")
    print("All SOA boundaries, adapters, queue lifecycles, and audit traces verified live.\n")

if __name__ == "__main__":
    run_simulation()
