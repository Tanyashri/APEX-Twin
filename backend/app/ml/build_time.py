import lightgbm as lgb
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

class BuildTimePredictor:
    def __init__(self):
        self.models = {}
        self.alphas = [0.5, 0.75, 0.9]
        self.is_trained = False
        
    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract features per Phase 7 requirements."""
        # Dummy feature extraction for the structure
        features = ["std_hours", "complexity", "crew_size", "skill_level", "rework_history"]
        # Ensure all columns exist, fill with 0 if not
        for f in features:
            if f not in df.columns:
                df[f] = 1.0 # Default value
        return df[features]
        
    def train(self, df_train: pd.DataFrame, df_val: pd.DataFrame):
        X_train = self._prepare_features(df_train)
        y_train = df_train["actual_hours"]
        
        X_val = self._prepare_features(df_val)
        y_val = df_val["actual_hours"]
        
        for alpha in self.alphas:
            model = lgb.LGBMRegressor(
                objective="quantile",
                alpha=alpha,
                n_estimators=100,
                learning_rate=0.1,
                random_state=42,
                verbosity=-1
            )
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                callbacks=[lgb.early_stopping(stopping_rounds=10)]
            )
            self.models[alpha] = model
            
        self.is_trained = True
        
    def baseline_predict(self, row: pd.Series) -> Tuple[float, float, float]:
        """Phase 5 baseline predictor"""
        std_h = row.get("std_hours", 1.0)
        complexity = row.get("complexity", 1.0)
        
        expected = std_h * complexity
        # Empirical quantiles from baseline
        p75 = expected * 1.15
        p90 = expected * 1.30
        return expected, p75, p90
        
    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.is_trained:
            # Cold start fallback
            preds = df.apply(self.baseline_predict, axis=1, result_type='expand')
            preds.columns = ['p50', 'p75', 'p90']
            preds['fallback_used'] = True
            return preds
            
        X = self._prepare_features(df)
        
        preds = pd.DataFrame(index=df.index)
        for alpha in self.alphas:
            preds[f"p_{alpha}"] = self.models[alpha].predict(X)
            
        # Enforce monotonicity: P50 <= P75 <= P90
        preds['p50'] = preds['p_0.5']
        preds['p75'] = np.maximum(preds['p50'], preds['p_0.75'])
        preds['p90'] = np.maximum(preds['p75'], preds['p_0.9'])
        
        preds['fallback_used'] = False
        
        return preds[['p50', 'p75', 'p90', 'fallback_used']]

    def evaluate(self, df_test: pd.DataFrame) -> Dict[str, Any]:
        """Calculate metrics on holdout set to check if beats baseline, including MAE, RMSE, WAPE, quantile losses, and coverage."""
        if not self.is_trained:
            preds = self.predict(df_test)
            y_true = df_test["actual_hours"].values
            y_p50 = preds['p50'].values
            errors = np.abs(y_p50 - y_true)
            mae = float(np.mean(errors))
            rmse = float(np.sqrt(np.mean((y_p50 - y_true) ** 2)))
            sum_y = float(np.sum(np.abs(y_true)))
            wape = float(np.sum(errors) / sum_y) if sum_y > 0 else 0.0
            p75_cov = float(np.mean(y_true <= preds['p75'].values))
            p90_cov = float(np.mean(y_true <= preds['p90'].values))
            return {
                "mae": mae,
                "rmse": rmse,
                "wape": wape,
                "ml_mae": mae,
                "baseline_mae": mae,
                "beats_baseline": False,
                "p75_coverage": p75_cov,
                "p90_coverage": p90_cov,
                "fallback_used": True,
                "sample_count": len(df_test)
            }
            
        preds = self.predict(df_test)
        y_true = df_test["actual_hours"].values
        y_p50 = preds['p50'].values
        y_p75 = preds['p75'].values
        y_p90 = preds['p90'].values
        
        baseline_preds = df_test.apply(self.baseline_predict, axis=1, result_type='expand')
        baseline_mae = float(np.mean(np.abs(baseline_preds[0].values - y_true)))
        
        # Overall metrics
        errors = np.abs(y_p50 - y_true)
        mae = float(np.mean(errors))
        rmse = float(np.sqrt(np.mean((y_p50 - y_true) ** 2)))
        sum_y = float(np.sum(np.abs(y_true)))
        wape = float(np.sum(errors) / sum_y) if sum_y > 0 else 0.0
        
        # Quantile pinball losses
        def pinball_loss(y, q_pred, alpha):
            diff = y - q_pred
            return float(np.mean(np.maximum(alpha * diff, (alpha - 1.0) * diff)))
            
        loss_p50 = pinball_loss(y_true, y_p50, 0.5)
        loss_p75 = pinball_loss(y_true, y_p75, 0.75)
        loss_p90 = pinball_loss(y_true, y_p90, 0.9)
        
        # Coverages
        coverage_p75 = float(np.mean(y_true <= y_p75))
        coverage_p90 = float(np.mean(y_true <= y_p90))
        
        metrics = {
            "mae": mae,
            "rmse": rmse,
            "wape": wape,
            "ml_mae": mae,
            "baseline_mae": baseline_mae,
            "beats_baseline": bool(mae < baseline_mae),
            "quantile_loss_p50": loss_p50,
            "quantile_loss_p75": loss_p75,
            "quantile_loss_p90": loss_p90,
            "p75_coverage": coverage_p75,
            "p90_coverage": coverage_p90,
            "sample_count": len(df_test)
        }
        
        # Segment breakdowns if available
        segment_metrics = {}
        for seg_col in ["segment", "load_segment", "dept_code"]:
            if seg_col in df_test.columns:
                segment_metrics[seg_col] = {}
                for seg_val, group in df_test.groupby(seg_col):
                    g_idx = group.index
                    g_true = group["actual_hours"].values
                    g_p50 = preds.loc[g_idx, 'p50'].values
                    g_mae = float(np.mean(np.abs(g_p50 - g_true)))
                    segment_metrics[seg_col][str(seg_val)] = {
                        "mae": g_mae,
                        "count": len(group)
                    }
        metrics["segment_metrics"] = segment_metrics
        return metrics

    def save_artifact(self, filepath: str):
        """Serialize trained models and configuration to disk."""
        import pickle
        payload = {
            "models": self.models,
            "alphas": self.alphas,
            "is_trained": self.is_trained
        }
        with open(filepath, "wb") as f:
            pickle.dump(payload, f)

    @classmethod
    def load_artifact(cls, filepath: str) -> "BuildTimePredictor":
        """Deserialize trained models and configuration from disk."""
        import pickle
        predictor = cls()
        with open(filepath, "rb") as f:
            payload = pickle.load(f)
        predictor.models = payload["models"]
        predictor.alphas = payload["alphas"]
        predictor.is_trained = payload["is_trained"]
        return predictor

