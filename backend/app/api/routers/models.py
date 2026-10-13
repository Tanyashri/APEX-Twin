from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.ml.retraining.manager import ModelManager

router = APIRouter()
manager = ModelManager()

class RetrainRequest(BaseModel):
    trigger_type: str = "MANUAL"
    config: Optional[Dict[str, Any]] = None

class PromoteRequest(BaseModel):
    challenger_id: str
    actor: str = "supervisor"
    reason: Optional[str] = None

class RollbackRequest(BaseModel):
    actor: str = "supervisor"
    reason: Optional[str] = None

@router.get("/champion")
def get_champion():
    """Get active champion model details, configuration, and out-of-sample metrics."""
    return manager.get_champion_info()

@router.get("/challenger")
def get_challenger():
    """Get current evaluated challenger model details if present."""
    challenger = manager.get_challenger_info()
    if not challenger:
        return {"challenger": None, "message": "No active challenger awaiting promotion"}
    return challenger

@router.get("/history")
def get_history(limit: int = 20):
    """Get history of model retraining runs and evaluations."""
    return manager.get_history(limit=limit)

@router.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    """Poll retraining job execution status, duration, metrics, and logs."""
    status = manager.get_job_status(job_id)
    if status.get("status") == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Job not found")
    return status

@router.post("/retrain")
def trigger_retrain(req: RetrainRequest):
    """Trigger an asynchronous model retraining job."""
    res = manager.trigger_retraining(trigger_type=req.trigger_type, config=req.config)
    if res["status"] in ("REJECTED_CONCURRENT", "REJECTED_COOLDOWN"):
        raise HTTPException(status_code=429, detail=res["detail"])
    return res

@router.post("/promote")
def promote_challenger(req: PromoteRequest):
    """Promote an evaluated challenger to production champion."""
    challenger = manager.get_challenger_info()
    if not challenger or challenger["version"] != req.challenger_id:
        raise HTTPException(status_code=400, detail="Invalid challenger or challenger not found")
    if not challenger.get("ready_for_promotion"):
        raise HTTPException(status_code=400, detail="Challenger failed safety criteria and cannot be promoted")
    
    manager.promote_challenger(req.challenger_id, actor=req.actor, reason=req.reason)
    return {"status": "SUCCESS", "new_champion": req.challenger_id}

@router.post("/rollback")
def rollback_model(req: RollbackRequest):
    """Roll back champion model to previous production version."""
    success = manager.rollback(actor=req.actor, reason=req.reason)
    if not success:
        raise HTTPException(status_code=400, detail="No previous champion model available for rollback")
    return {"status": "SUCCESS", "active_champion": manager.models["CHAMPION"]}

@router.get("/drift")
def get_drift_metrics():
    """Check PSI drift scores and model coverage."""
    return manager.check_drift_and_auto_trigger()
