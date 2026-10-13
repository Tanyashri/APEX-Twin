from fastapi.testclient import TestClient
from app.main import app
from app.capacity.engine import calculate_authoritative_capacity

client = TestClient(app)

def test_authoritative_shift_duration_change_scales_capacity():
    """
    Acceptance criterion: Changing 7.5-hour shifts to 8 hours changes capacity
    according to the authoritative formula.
    """
    # 8 workstations, 1 shift, 0 downtime, speed=1.0, quality=1.0
    cap_7_5 = calculate_authoritative_capacity(
        num_workstations=8,
        shift_duration_h=8.0,
        break_h=0.5, # productive = 8.0 - 0.5 = 7.5h
        machine_speed_factor=1.0,
        first_pass_yield=1.0,
        present_workers=8
    )
    
    cap_8_0 = calculate_authoritative_capacity(
        num_workstations=8,
        shift_duration_h=8.5,
        break_h=0.5, # productive = 8.5 - 0.5 = 8.0h
        machine_speed_factor=1.0,
        first_pass_yield=1.0,
        present_workers=8
    )

    # Net hours ratio must match exactly 8.0 / 7.5
    assert cap_7_5.net_h == 8 * 7.5 # 60.0 h
    assert cap_8_0.net_h == 8 * 8.0 # 64.0 h
    assert round(cap_8_0.net_h / cap_7_5.net_h, 4) == round(8.0 / 7.5, 4)
    assert cap_8_0.usable_h > cap_7_5.usable_h

def test_machine_downtime_reduces_availability_and_oee():
    cap_nominal = calculate_authoritative_capacity(
        num_workstations=10,
        shift_duration_h=8.0,
        break_h=0.5,
        downtime_h=0.0
    )
    assert cap_nominal.availability == 1.0

    # 15 hours of planned and unplanned downtime
    cap_downtime = calculate_authoritative_capacity(
        num_workstations=10,
        shift_duration_h=8.0,
        break_h=0.5,
        downtime_h=15.0
    )
    # Net hours = 10 * 7.5 = 75h. Available = 75 - 15 = 60h. Availability = 60/75 = 0.8
    assert cap_downtime.availability == 0.8
    assert cap_downtime.oee < cap_nominal.oee
    assert cap_downtime.binding_constraint in ("DOWNTIME_CONSTRAINED", "MACHINE_BOUND")

def test_labour_shortage_binds_capacity():
    # 10 workstations available (75 net h), but only 4 workers present (30 labour h)
    cap = calculate_authoritative_capacity(
        num_workstations=10,
        shift_duration_h=8.0,
        break_h=0.5,
        present_workers=4
    )
    assert cap.binding_constraint == "LABOUR_BOUND"
    assert cap.labour_h < cap.available_ws_h
    # Usable capacity should be bounded by labour hours
    assert cap.usable_h <= cap.labour_h

def test_material_shortage_limits_usable_capacity():
    # 50% material shortage
    cap = calculate_authoritative_capacity(
        num_workstations=8,
        shift_duration_h=8.0,
        break_h=0.5,
        present_workers=8,
        material_factor=0.50
    )
    assert cap.binding_constraint == "MATERIAL_CONSTRAINED"
    assert "shortage" in cap.explanation.lower()

def test_parameter_persistence_survives_and_logs_audit():
    # Update shift parameter via API
    res = client.post("/api/capacity/parameters", json={
        "shift_code": "SHIFT-A",
        "shift_duration_h": 8.5,
        "break_h": 0.5,
        "downtime_h": 2.0,
        "material_factor": 0.95,
        "actor": "lead_planner",
        "reason": "Overtime extension for order surge"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["updated_parameters"]["productive_h"] == 8.0
    assert data["audit_count"] >= 1

    # Verify query returns persisted parameters
    param_res = client.get("/api/capacity/parameters")
    assert param_res.status_code == 200
    shifts = param_res.json()["shifts"]
    shift_a = next(s for s in shifts if s["code"] == "SHIFT-A")
    assert shift_a["productive_h"] == 8.0

    # Verify audit log recorded
    audit_res = client.get("/api/capacity/audit")
    assert audit_res.status_code == 200
    audit_list = audit_res.json()
    assert len(audit_list) > 0
    latest = audit_list[0]
    assert latest["actor"] == "lead_planner"
    assert latest["reason"] == "Overtime extension for order surge"
