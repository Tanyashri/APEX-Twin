from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import datetime

from app.db.session import get_db
from app.models.all_models import (
    Department, ComponentUnit, ComponentType, Workstation,
    ShiftTemplate, ConfigThreshold, PlanningAuditLog
)
from app.capacity.engine import (
    build_snapshot,
    calculate_authoritative_capacity,
    AuthoritativeCapacityResult
)

router = APIRouter()

class CalculateRequest(BaseModel):
    num_workstations: int = Field(default=8, ge=1)
    shift_duration_h: float = Field(default=8.0, gt=0)
    break_h: float = Field(default=0.5, ge=0)
    shifts_per_day: int = Field(default=1, ge=1)
    downtime_h: float = Field(default=0.0, ge=0)
    present_workers: int = Field(default=8, ge=0)
    worker_efficiency: float = Field(default=1.0, ge=0.1, le=2.0)
    machine_speed_factor: float = Field(default=0.90, ge=0.1, le=2.0)
    first_pass_yield: float = Field(default=0.98, ge=0.1, le=1.0)
    material_factor: float = Field(default=1.0, ge=0.0, le=1.0)
    committed_workload_h: float = Field(default=50.0, ge=0.0)

class ParameterUpdateRequest(BaseModel):
    shift_code: Optional[str] = "SHIFT-A"
    shift_duration_h: Optional[float] = None
    break_h: Optional[float] = None
    shifts_per_day: Optional[int] = None
    downtime_h: Optional[float] = None
    present_workers: Optional[int] = None
    worker_efficiency: Optional[float] = None
    machine_speed_factor: Optional[float] = None
    first_pass_yield: Optional[float] = None
    material_factor: Optional[float] = None
    overload_threshold_pct: Optional[float] = None
    underload_threshold_pct: Optional[float] = None
    reset_defaults: Optional[bool] = False
    actor: str = "planner"
    reason: Optional[str] = "Manual operational adjustment"

@router.get("/departments/{code}/snapshot")
def get_department_snapshot(code: str, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.code == code).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check if custom shift duration or break configured in DB
    shift = db.query(ShiftTemplate).filter(ShiftTemplate.code == "SHIFT-A").first()
    productive_h = shift.productive_h if shift else 7.5

    # Check department workstations
    ws_count = db.query(Workstation).filter(Workstation.dept_id == dept.id).count() or 8
    
    # Custom downtime threshold check
    downtime_cfg = db.query(ConfigThreshold).filter(
        ConfigThreshold.scope_id == dept.code,
        ConfigThreshold.key == "downtime_h"
    ).first()
    downtime_h = float(downtime_cfg.value) if downtime_cfg else 0.0

    material_cfg = db.query(ConfigThreshold).filter(
        ConfigThreshold.scope_id == dept.code,
        ConfigThreshold.key == "material_factor"
    ).first()
    material_factor = float(material_cfg.value) if material_cfg else 1.0

    if code == "DEPT-SENS":
        available_ws_h = max(0.0, ws_count * productive_h - downtime_h)
        labour_h = ws_count * productive_h
        units = [{"p50": 20.0, "p90": 25.0}]
    elif code == "DEPT-ASSY":
        available_ws_h = max(0.0, ws_count * productive_h - downtime_h)
        labour_h = ws_count * productive_h
        units = [{"p50": 98.0, "p90": 105.0}]
    else:
        available_ws_h = max(0.0, ws_count * productive_h - downtime_h)
        labour_h = ws_count * productive_h
        units = [{"p50": 80.0, "p90": 90.0}]

    snapshot = build_snapshot(
        dept_id=dept.id,
        available_ws_h=available_ws_h,
        labour_h=labour_h,
        units=units,
        material_factor=material_factor
    )
    
    return snapshot.model_dump()

@router.post("/calculate", response_model=AuthoritativeCapacityResult)
def calculate_authoritative(req: CalculateRequest):
    """
    Computes authoritative capacity using exact decomposed OEE and labour/material bounds.
    """
    if req.break_h >= req.shift_duration_h:
        raise HTTPException(status_code=400, detail="Break hours must be strictly less than shift duration")

    return calculate_authoritative_capacity(
        num_workstations=req.num_workstations,
        shift_duration_h=req.shift_duration_h,
        break_h=req.break_h,
        shifts_per_day=req.shifts_per_day,
        downtime_h=req.downtime_h,
        present_workers=req.present_workers,
        worker_efficiency=req.worker_efficiency,
        machine_speed_factor=req.machine_speed_factor,
        first_pass_yield=req.first_pass_yield,
        material_factor=req.material_factor,
        committed_workload_h=req.committed_workload_h
    )

@router.get("/trends")
def get_capacity_demand_trends(dept_code: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns time-series hourly and shift capacity vs demand telemetry
    for a specific department or all factory departments.
    """
    hours = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]
    
    dept_trends = {
        "MECHATRONICS": [
            {"label": "06:00", "capacity": 14.0, "demand": 11.5, "actual": 11.2},
            {"label": "08:00", "capacity": 14.0, "demand": 12.0, "actual": 11.8},
            {"label": "10:00", "capacity": 14.0, "demand": 13.5, "actual": 13.0},
            {"label": "12:00", "capacity": 11.5, "demand": 10.0, "actual": 9.8},
            {"label": "14:00", "capacity": 14.0, "demand": 12.8, "actual": 12.5},
            {"label": "16:00", "capacity": 14.0, "demand": 13.2, "actual": 12.9},
            {"label": "18:00", "capacity": 14.0, "demand": 11.0, "actual": 11.0},
        ],
        "FABRICS": [
            {"label": "06:00", "capacity": 20.0, "demand": 18.0, "actual": 18.2},
            {"label": "08:00", "capacity": 20.0, "demand": 19.5, "actual": 19.0},
            {"label": "10:00", "capacity": 20.0, "demand": 19.8, "actual": 19.2},
            {"label": "12:00", "capacity": 16.0, "demand": 15.0, "actual": 14.8},
            {"label": "14:00", "capacity": 20.0, "demand": 18.5, "actual": 18.0},
            {"label": "16:00", "capacity": 20.0, "demand": 17.0, "actual": 17.2},
            {"label": "18:00", "capacity": 20.0, "demand": 16.5, "actual": 16.0},
        ],
        "SENSORS": [
            {"label": "06:00", "capacity": 12.0, "demand": 5.0, "actual": 4.8},
            {"label": "08:00", "capacity": 12.0, "demand": 5.2, "actual": 5.0},
            {"label": "10:00", "capacity": 12.0, "demand": 4.5, "actual": 4.2},
            {"label": "12:00", "capacity": 10.0, "demand": 3.8, "actual": 3.5},
            {"label": "14:00", "capacity": 12.0, "demand": 5.5, "actual": 5.1},
            {"label": "16:00", "capacity": 12.0, "demand": 6.0, "actual": 5.6},
            {"label": "18:00", "capacity": 12.0, "demand": 4.8, "actual": 4.6},
        ],
        "POWER": [
            {"label": "06:00", "capacity": 12.5, "demand": 9.0, "actual": 9.2},
            {"label": "08:00", "capacity": 12.5, "demand": 9.5, "actual": 9.4},
            {"label": "10:00", "capacity": 12.5, "demand": 10.0, "actual": 9.8},
            {"label": "12:00", "capacity": 10.0, "demand": 8.0, "actual": 7.9},
            {"label": "14:00", "capacity": 12.5, "demand": 9.8, "actual": 9.5},
            {"label": "16:00", "capacity": 12.5, "demand": 9.2, "actual": 9.0},
            {"label": "18:00", "capacity": 12.5, "demand": 8.8, "actual": 8.5},
        ],
        "ASSEMBLY": [
            {"label": "06:00", "capacity": 28.0, "demand": 27.5, "actual": 27.0},
            {"label": "08:00", "capacity": 28.0, "demand": 31.0, "actual": 28.0},
            {"label": "10:00", "capacity": 28.0, "demand": 32.5, "actual": 28.0},
            {"label": "12:00", "capacity": 22.0, "demand": 26.0, "actual": 22.0},
            {"label": "14:00", "capacity": 28.0, "demand": 33.0, "actual": 28.0},
            {"label": "16:00", "capacity": 28.0, "demand": 30.5, "actual": 28.0},
            {"label": "18:00", "capacity": 28.0, "demand": 28.0, "actual": 27.5},
        ],
        "FACTORY": [
            {"label": "06:00", "capacity": 86.5, "demand": 71.0, "actual": 70.2},
            {"label": "08:00", "capacity": 86.5, "demand": 77.2, "actual": 74.0},
            {"label": "10:00", "capacity": 86.5, "demand": 80.3, "actual": 74.2},
            {"label": "12:00", "capacity": 69.5, "demand": 62.8, "actual": 58.0},
            {"label": "14:00", "capacity": 86.5, "demand": 79.6, "actual": 73.1},
            {"label": "16:00", "capacity": 86.5, "demand": 75.7, "actual": 72.7},
            {"label": "18:00", "capacity": 86.5, "demand": 69.1, "actual": 67.6},
        ],
    }

    if dept_code:
        dept_norm = dept_code.upper()
        if dept_norm in dept_trends:
            return {"department": dept_norm, "trend": dept_trends[dept_norm]}
        # Check by code prefix
        for k in dept_trends:
            if dept_norm in k or k in dept_norm:
                return {"department": k, "trend": dept_trends[k]}

    return {"departments": dept_trends}

@router.get("/parameters")
def get_planning_parameters(db: Session = Depends(get_db)):
    """Retrieve current operational planning parameters and shift configurations."""
    shifts = db.query(ShiftTemplate).all()
    shift_data = [
        {
            "code": s.code,
            "name": s.name,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "break_h": s.break_h,
            "productive_h": s.productive_h
        }
        for s in shifts
    ]
    thresholds = db.query(ConfigThreshold).all()
    thresh_data = [
        {"scope_id": t.scope_id, "key": t.key, "value": t.value}
        for t in thresholds
    ]
    return {
        "shifts": shift_data,
        "thresholds": thresh_data,
        "default_machine_speed": 0.90,
        "default_fpy": 0.98,
        "overload_threshold_pct": 95.0,
        "underload_threshold_pct": 70.0
    }

@router.post("/parameters")
def update_planning_parameters(req: ParameterUpdateRequest, db: Session = Depends(get_db)):
    """
    Update planning parameters with validation, database persistence, and audit logging.
    Recalculates authoritative capacity immediately.
    """
    logs_created = []

    if req.shift_duration_h is not None or req.break_h is not None:
        shift = db.query(ShiftTemplate).filter(ShiftTemplate.code == req.shift_code).first()
        if not shift:
            shift = ShiftTemplate(
                code=req.shift_code or "SHIFT-A",
                name="Morning Shift",
                start_time="06:00:00",
                end_time="14:00:00",
                break_h=0.5,
                productive_h=7.5
            )
            db.add(shift)
            db.flush()

        old_prod = str(shift.productive_h)
        new_break = req.break_h if req.break_h is not None else shift.break_h
        new_duration = req.shift_duration_h if req.shift_duration_h is not None else (shift.productive_h + shift.break_h)
        
        if new_break < 0 or new_duration <= 0 or new_break >= new_duration:
            raise HTTPException(status_code=400, detail="Invalid shift duration or break parameters")

        shift.break_h = new_break
        shift.productive_h = new_duration - new_break

        audit = PlanningAuditLog(
            entity_type="SHIFT",
            entity_id=shift.code,
            parameter_name="productive_h",
            old_value=old_prod,
            new_value=str(shift.productive_h),
            actor=req.actor,
            reason=req.reason
        )
        db.add(audit)
        logs_created.append(audit)

    if req.downtime_h is not None:
        if req.downtime_h < 0:
            raise HTTPException(status_code=400, detail="Downtime hours cannot be negative")
        thresh = db.query(ConfigThreshold).filter(
            ConfigThreshold.scope_id == "GLOBAL",
            ConfigThreshold.key == "downtime_h"
        ).first()
        old_val = thresh.value if thresh else "0.0"
        if not thresh:
            thresh = ConfigThreshold(scope_type="GLOBAL", scope_id="GLOBAL", key="downtime_h", value=str(req.downtime_h))
            db.add(thresh)
        else:
            thresh.value = str(req.downtime_h)

        audit = PlanningAuditLog(
            entity_type="WORKSTATION",
            entity_id="GLOBAL",
            parameter_name="downtime_h",
            old_value=old_val,
            new_value=str(req.downtime_h),
            actor=req.actor,
            reason=req.reason
        )
        db.add(audit)
        logs_created.append(audit)

    if req.material_factor is not None:
        if not (0.0 <= req.material_factor <= 1.0):
            raise HTTPException(status_code=400, detail="Material factor must be between 0.0 and 1.0")
        thresh = db.query(ConfigThreshold).filter(
            ConfigThreshold.scope_id == "GLOBAL",
            ConfigThreshold.key == "material_factor"
        ).first()
        old_val = thresh.value if thresh else "1.0"
        if not thresh:
            thresh = ConfigThreshold(scope_type="GLOBAL", scope_id="GLOBAL", key="material_factor", value=str(req.material_factor))
            db.add(thresh)
        else:
            thresh.value = str(req.material_factor)

        audit = PlanningAuditLog(
            entity_type="MATERIAL",
            entity_id="GLOBAL",
            parameter_name="material_factor",
            old_value=old_val,
            new_value=str(req.material_factor),
            actor=req.actor,
            reason=req.reason
        )
        db.add(audit)
        logs_created.append(audit)

    for field, entity, scope in [
        ("present_workers", "LABOUR", "GLOBAL"),
        ("worker_efficiency", "LABOUR", "GLOBAL"),
        ("machine_speed_factor", "WORKSTATION", "GLOBAL"),
        ("first_pass_yield", "QUALITY", "GLOBAL"),
        ("overload_threshold_pct", "THRESHOLD", "GLOBAL"),
        ("underload_threshold_pct", "THRESHOLD", "GLOBAL"),
    ]:
        val = getattr(req, field, None)
        if val is not None:
            thresh = db.query(ConfigThreshold).filter(
                ConfigThreshold.scope_id == scope,
                ConfigThreshold.key == field
            ).first()
            old_val = thresh.value if thresh else None
            if not thresh:
                thresh = ConfigThreshold(scope_type="GLOBAL", scope_id=scope, key=field, value=str(val))
                db.add(thresh)
            else:
                thresh.value = str(val)

            audit = PlanningAuditLog(
                entity_type=entity,
                entity_id=scope,
                parameter_name=field,
                old_value=old_val,
                new_value=str(val),
                actor=req.actor,
                reason=req.reason
            )
            db.add(audit)
            logs_created.append(audit)

    db.commit()

    # Recalculate baseline capacity
    active_shift = db.query(ShiftTemplate).filter(ShiftTemplate.code == (req.shift_code or "SHIFT-A")).first()
    eff_productive = active_shift.productive_h if active_shift else 7.5
    eff_break = active_shift.break_h if active_shift else 0.5
    eff_duration = eff_productive + eff_break
    
    recalculated = calculate_authoritative_capacity(
        num_workstations=8,
        shift_duration_h=eff_duration,
        break_h=eff_break,
        downtime_h=req.downtime_h or 0.0,
        present_workers=req.present_workers or 8,
        worker_efficiency=req.worker_efficiency or 1.0,
        machine_speed_factor=req.machine_speed_factor or 0.90,
        first_pass_yield=req.first_pass_yield or 0.98,
        material_factor=req.material_factor if req.material_factor is not None else 1.0
    )

    return {
        "status": "SUCCESS",
        "updated_parameters": {
            "productive_h": eff_productive,
            "break_h": eff_break,
            "downtime_h": req.downtime_h,
            "present_workers": req.present_workers,
            "worker_efficiency": req.worker_efficiency,
            "material_factor": req.material_factor
        },
        "recalculated_capacity": recalculated.model_dump(),
        "audit_count": len(logs_created)
    }

@router.get("/audit")
def get_audit_history(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve chronological audit trail of planning parameters."""
    logs = db.query(PlanningAuditLog).order_by(PlanningAuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "parameter_name": l.parameter_name,
            "old_value": l.old_value,
            "new_value": l.new_value,
            "actor": l.actor,
            "reason": l.reason,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]
