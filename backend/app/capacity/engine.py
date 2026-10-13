import numpy as np
from pydantic import BaseModel
from typing import List, Optional

class CapacitySnapshot(BaseModel):
    dept_id: str
    usable_h: float
    usable_h_p10: float
    workload_expected: float
    workload_p75: float
    workload_p90: float
    load_expected: float
    load_p75: float
    load_p90: float
    stress_load: float
    classification: str
    binding_constraint: Optional[str] = "HEALTHY"
    oee: Optional[float] = 0.85
    gross_h: Optional[float] = None
    net_h: Optional[float] = None
    available_ws_h: Optional[float] = None
    labour_h: Optional[float] = None

class AuthoritativeCapacityResult(BaseModel):
    gross_h: float
    net_h: float
    break_h: float
    downtime_h: float
    available_ws_h: float
    availability: float
    performance: float
    quality: float
    oee: float
    effective_machine_capacity_h: float
    labour_h: float
    labour_constrained_h: float
    material_factor: float
    material_constrained_h: float
    usable_h: float
    usable_h_p10: float
    committed_workload_h: float
    remaining_capacity_h: float
    capacity_balance_h: float
    binding_constraint: str
    explanation: str

def classify_load(usable_h: float, load_expected: float, load_risk: float) -> str:
    if usable_h <= 0:
        return "UNAVAILABLE"
    
    # Boundary logic: 69.9 -> UNDERLOAD, 70 -> HEALTHY, 95 -> HEALTHY, 95.1 -> OVERLOAD
    if load_expected > 95.0:
        return "OVERLOAD"
    elif load_expected <= 95.0 and load_risk > 95.0:
        return "OVERLOAD_RISK"
    elif load_expected < 70.0:
        return "UNDERLOAD"
    else:
        return "HEALTHY"

def calculate_capacity(
    available_ws_h: float, 
    labour_h: float, 
    efficiency: float = 0.85, 
    material_factor: float = 1.0,
    pessimistic_factor: float = 0.8
):
    binding_h = min(available_ws_h, labour_h)
    usable_h = binding_h * efficiency * material_factor
    usable_h_p10 = usable_h * pessimistic_factor
    return usable_h, usable_h_p10

def calculate_authoritative_capacity(
    num_workstations: int,
    shift_duration_h: float,
    break_h: float = 0.5,
    shifts_per_day: int = 1,
    downtime_h: float = 0.0,
    present_workers: int = 0,
    worker_productive_h: Optional[float] = None,
    worker_efficiency: float = 1.0,
    skill_qualification_factor: float = 1.0,
    machine_speed_factor: float = 0.90,
    first_pass_yield: float = 0.98,
    material_factor: float = 1.0,
    committed_workload_h: float = 0.0,
    pessimistic_factor: float = 0.8
) -> AuthoritativeCapacityResult:
    """
    Authoritative backend capacity service.
    Distinguishes gross hours, net hours after breaks, machine availability after downtime,
    effective productive capacity, committed workload, remaining capacity,
    labour-constrained capacity and material-constrained capacity.
    OEE = Availability x Performance x Quality.
    """
    gross_h = float(num_workstations * shift_duration_h * shifts_per_day)
    total_break_h = float(num_workstations * break_h * shifts_per_day)
    net_h = max(0.0, gross_h - total_break_h)

    # Machine Availability after downtime
    available_ws_h = max(0.0, net_h - downtime_h)
    availability = (available_ws_h / net_h) if net_h > 0 else 0.0

    # Performance and Quality (avoid double counting)
    performance = min(1.2, max(0.3, machine_speed_factor))
    quality = min(1.0, max(0.5, first_pass_yield))

    oee = availability * performance * quality
    effective_machine_capacity_h = available_ws_h * performance * quality

    # Labour capacity
    single_worker_productive = worker_productive_h if worker_productive_h is not None else max(0.0, shift_duration_h - break_h)
    labour_h = float(present_workers * single_worker_productive * shifts_per_day * worker_efficiency * skill_qualification_factor)

    # Binding constraints
    binding_resource_h = min(available_ws_h, labour_h) if present_workers > 0 else available_ws_h
    labour_constrained_h = min(effective_machine_capacity_h, labour_h * performance * quality)

    # Material factor
    clamped_material_factor = min(1.0, max(0.0, material_factor))
    usable_h = binding_resource_h * performance * quality * clamped_material_factor
    material_constrained_h = binding_resource_h * performance * quality * clamped_material_factor

    usable_h_p10 = usable_h * pessimistic_factor
    remaining_capacity_h = max(0.0, usable_h - committed_workload_h)
    capacity_balance_h = committed_workload_h - usable_h

    # Identify binding constraint and explanation
    if usable_h <= 0:
        binding_constraint = "UNAVAILABLE"
        explanation = "Line capacity zero due to complete shutdown, zero staffing, or 100% downtime."
    elif clamped_material_factor < 1.0 and clamped_material_factor < (binding_resource_h / max(1.0, available_ws_h)):
        binding_constraint = "MATERIAL_CONSTRAINED"
        explanation = f"BOM component shortage limits usable line throughput to {clamped_material_factor*100:.1f}%."
    elif present_workers > 0 and labour_h < available_ws_h:
        binding_constraint = "LABOUR_BOUND"
        explanation = f"Available workstations ({available_ws_h:.1f}h) exceed active labour ({labour_h:.1f}h); staffing is the binding bottleneck."
    elif downtime_h > 0:
        binding_constraint = "DOWNTIME_CONSTRAINED"
        explanation = f"Equipment maintenance ({downtime_h:.1f}h downtime) limits availability to {availability*100:.1f}%."
    else:
        binding_constraint = "MACHINE_BOUND"
        explanation = f"Line running nominal; workstation calendar ({available_ws_h:.1f}h) sets upper bound."

    return AuthoritativeCapacityResult(
        gross_h=round(gross_h, 2),
        net_h=round(net_h, 2),
        break_h=round(total_break_h, 2),
        downtime_h=round(downtime_h, 2),
        available_ws_h=round(available_ws_h, 2),
        availability=round(availability, 4),
        performance=round(performance, 4),
        quality=round(quality, 4),
        oee=round(oee, 4),
        effective_machine_capacity_h=round(effective_machine_capacity_h, 2),
        labour_h=round(labour_h, 2),
        labour_constrained_h=round(labour_constrained_h, 2),
        material_factor=round(clamped_material_factor, 4),
        material_constrained_h=round(material_constrained_h, 2),
        usable_h=round(usable_h, 2),
        usable_h_p10=round(usable_h_p10, 2),
        committed_workload_h=round(committed_workload_h, 2),
        remaining_capacity_h=round(remaining_capacity_h, 2),
        capacity_balance_h=round(capacity_balance_h, 2),
        binding_constraint=binding_constraint,
        explanation=explanation
    )

def monte_carlo_workload(units: List[dict], num_draws: int = 2000, seed: int = 42):
    """
    units: list of dicts with 'p50', 'p75', 'p90' expected hours.
    Returns (expected, p75, p90) aggregated workload.
    """
    if not units:
        return 0.0, 0.0, 0.0
        
    np.random.seed(seed)
    total_draws = np.zeros(num_draws)
    
    for u in units:
        p50 = u.get("p50", 1.0)
        p90 = u.get("p90", p50 * 1.2)
        
        std = (p90 - p50) / 1.28
        if std <= 0:
            std = 0.1
        
        draws = np.random.normal(p50, std, num_draws)
        draws = np.clip(draws, a_min=0, a_max=None)
        total_draws += draws
        
    expected = float(np.mean(total_draws))
    p75 = float(np.percentile(total_draws, 75))
    p90 = float(np.percentile(total_draws, 90))
    
    return expected, p75, p90

def build_snapshot(dept_id: str, available_ws_h: float, labour_h: float, units: List[dict], material_factor: float = 1.0):
    usable_h, usable_h_p10 = calculate_capacity(available_ws_h, labour_h, material_factor=material_factor)
    
    workload_exp, workload_p75, workload_p90 = monte_carlo_workload(units)
    
    load_exp = (workload_exp / usable_h * 100) if usable_h > 0 else 0
    load_p75 = (workload_p75 / usable_h * 100) if usable_h > 0 else 0
    load_p90 = (workload_p90 / usable_h * 100) if usable_h > 0 else 0
    stress_load = (workload_p90 / usable_h_p10 * 100) if usable_h_p10 > 0 else 0
    
    classification = classify_load(usable_h, load_exp, load_p75)
    
    return CapacitySnapshot(
        dept_id=dept_id,
        usable_h=usable_h,
        usable_h_p10=usable_h_p10,
        workload_expected=workload_exp,
        workload_p75=workload_p75,
        workload_p90=workload_p90,
        load_expected=load_exp,
        load_p75=load_p75,
        load_p90=load_p90,
        stress_load=stress_load,
        classification=classification,
        binding_constraint="LABOUR_BOUND" if labour_h < available_ws_h else "MACHINE_BOUND"
    )
