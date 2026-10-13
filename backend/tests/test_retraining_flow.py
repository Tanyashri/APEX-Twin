import time
import os
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.ml.retraining.manager import ModelManager, ARTIFACTS_DIR
from app.ml.build_time import BuildTimePredictor
from app.db.session import SessionLocal
from app.models.all_models import ModelRun, ModelArtifact, ModelPromotionAudit

client = TestClient(app)

def test_champion_endpoint_returns_real_data():
    res = client.get("/api/models/champion")
    assert res.status_code == 200
    data = res.json()
    assert "version" in data
    assert "metrics" in data
    assert "mae" in data["metrics"]
    assert "rmse" in data["metrics"]
    assert "wape" in data["metrics"]
    assert "p75_coverage" in data["metrics"]
    assert "p90_coverage" in data["metrics"]

def test_retraining_async_job_and_persistence():
    # Trigger retraining via API
    res = client.post("/api/models/retrain", json={"trigger_type": "MANUAL"})
    assert res.status_code == 200
    job_info = res.json()
    job_id = job_info["job_id"]
    assert job_info["status"] == "QUEUED"

    # Wait for async background worker to complete
    max_wait = 15
    start = time.time()
    final_status = None
    while time.time() - start < max_wait:
        poll_res = client.get(f"/api/models/jobs/{job_id}")
        assert poll_res.status_code == 200
        poll_data = poll_res.json()
        if poll_data["status"] in ("SUCCEEDED", "FAILED"):
            final_status = poll_data["status"]
            break
        time.sleep(0.5)

    if final_status != "SUCCEEDED":
        print(f"FAILED REASON: error={poll_data.get('error')}, logs={poll_data.get('logs')}")

    assert final_status == "SUCCEEDED"
    assert poll_data["duration_s"] > 0
    assert "Challenger Metrics" in poll_data["logs"]
    assert poll_data["metrics"]["mae"] > 0

    # Verify persistence in database
    db = SessionLocal()
    try:
        run_record = db.query(ModelRun).filter(ModelRun.run_id == job_id).first()
        assert run_record is not None
        assert run_record.status == "SUCCEEDED"
        assert run_record.dataset_version is not None
        assert run_record.num_samples > 0
        assert run_record.artifact_path is not None
        assert os.path.exists(run_record.artifact_path)
    finally:
        db.close()

def test_concurrent_retraining_rejected():
    manager = ModelManager()
    # Force mock active job
    with manager._lock:
        manager._active_job_id = "mock_running_job"

    try:
        res = client.post("/api/models/retrain", json={"trigger_type": "MANUAL"})
        assert res.status_code == 429
        assert "already in progress" in res.json()["detail"]
    finally:
        with manager._lock:
            manager._active_job_id = None

def test_safety_gate_rejects_overload_regression():
    manager = ModelManager()
    
    challenger_metrics = {"mae": 0.20} # Lower overall MAE (wins overall)
    champion_metrics = {"mae": 0.40}
    
    # Regresses on overload segment
    overload_metrics = {
        "challenger_mae": 0.85, # Regressed!
        "champion_mae": 0.50
    }
    
    decision = manager.evaluate_challenger(challenger_metrics, champion_metrics, overload_metrics)
    assert decision == "REJECT_DUE_TO_OVERLOAD_REGRESSION"
    
    # Rejection leaves champion unchanged
    initial_champion = manager.models["CHAMPION"]
    assert manager.models["CHAMPION"] == initial_champion

def test_promotion_and_rollback_flow():
    manager = ModelManager()
    original_champion = manager.models["CHAMPION"]
    
    test_challenger_ver = f"v_test_{int(time.time())}"
    
    # Register challenger artifact
    db = SessionLocal()
    try:
        art = ModelArtifact(
            version=test_challenger_ver,
            model_type="BUILD_TIME_QUANTILE",
            role="CHALLENGER",
            is_active=False,
            metrics_summary_json={"mae": 0.15, "rmse": 0.22, "wape": 0.05}
        )
        db.add(art)
        db.commit()
    finally:
        db.close()

    manager.models["CHALLENGER"] = test_challenger_ver

    # Promote challenger
    promote_res = client.post("/api/models/promote", json={
        "challenger_id": test_challenger_ver,
        "actor": "qa_tester",
        "reason": "Passed all safety criteria"
    })
    assert promote_res.status_code == 200
    assert manager.models["CHAMPION"] == test_challenger_ver
    assert manager.models["PREVIOUS"] == original_champion

    # Verify audit in database
    db = SessionLocal()
    try:
        audit = db.query(ModelPromotionAudit).filter(
            ModelPromotionAudit.to_version == test_challenger_ver
        ).first()
        assert audit is not None
        assert audit.action == "PROMOTE"
        assert audit.actor == "qa_tester"
    finally:
        db.close()

    # Rollback
    rollback_res = client.post("/api/models/rollback", json={
        "actor": "qa_tester",
        "reason": "Test rollback functionality"
    })
    assert rollback_res.status_code == 200
    assert manager.models["CHAMPION"] == original_champion
    assert manager.models["PREVIOUS"] is None

def test_inference_uses_saved_artifact():
    # Create test model artifact
    predictor = BuildTimePredictor()
    df_train = pd.DataFrame({
        "std_hours": [1.0, 2.0, 3.0] * 10,
        "complexity": [1.0] * 30,
        "crew_size": [1] * 30,
        "skill_level": [2] * 30,
        "rework_history": [0] * 30,
        "actual_hours": [1.1, 2.2, 3.3] * 10
    })
    predictor.train(df_train, df_train)
    
    save_path = os.path.join(ARTIFACTS_DIR, "v_inference_test.pkl")
    predictor.save_artifact(save_path)
    assert os.path.exists(save_path)
    
    # Load and predict
    loaded = BuildTimePredictor.load_artifact(save_path)
    test_df = pd.DataFrame([{
        "std_hours": 2.0,
        "complexity": 1.0,
        "crew_size": 1,
        "skill_level": 2,
        "rework_history": 0
    }])
    preds = loaded.predict(test_df)
    assert "p50" in preds.columns
    assert preds["p50"].iloc[0] <= preds["p75"].iloc[0] <= preds["p90"].iloc[0]
