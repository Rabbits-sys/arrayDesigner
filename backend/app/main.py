from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException
from pydantic import BaseModel, Field
from typing import List
import numpy as np

from .mvdr import mvdr_weights, beampattern_response, normalize_to_db


class Position(BaseModel):
    x: float
    y: float
    z: float


class BeampatternRequest(BaseModel):
    positions: List[Position] = Field(..., description="Microphone positions in meters, in XYZ coordinates")
    freq_hz: float = Field(..., gt=0)
    look_az_deg: float = Field(..., ge=-360, le=360)
    look_el_deg: float = Field(..., ge=-90, le=90)
    # Grid control
    az_start: float = 0.0
    az_end: float = 360.0
    az_step: float = 2.0
    el_start: float = -90.0
    el_end: float = 90.0
    el_step: float = 2.0
    # Speed of sound and robustness
    c: float = 343.0
    diag_loading: float = 1e-3


class BeampatternResponse(BaseModel):
    az_deg: List[float]
    el_deg: List[float]
    response_db: List[List[float]]


app = FastAPI(title="Array Designer Backend", version="0.1.0")

# CORS: allow local dev ports
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _make_grid(start: float, end: float, step: float) -> np.ndarray:
    """Robust 1D grid builder handling float steps and inclusive end when close.
    Ensures at least one point if start==end.
    """
    if step <= 0:
        raise HTTPException(status_code=400, detail="step must be > 0")
    if end < start:
        raise HTTPException(status_code=400, detail="end must be >= start")
    span = end - start
    if np.isclose(span, 0.0, atol=1e-12):
        return np.array([start], dtype=float)
    n = int(np.floor(span / step + 1e-9)) + 1  # number of points by step
    arr = start + step * np.arange(n, dtype=float)
    # include end if within one small epsilon of the next step or if not reached
    if arr[-1] < end - 1e-7:
        arr = np.append(arr, end)
    elif not np.isclose(arr[-1], end, atol=1e-7):
        # If exceeded slightly (due to rounding), clip last to end if very close
        if arr[-1] > end and (arr[-1] - end) < 1e-7:
            arr[-1] = end
    return arr


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/mvdr/beampattern", response_model=BeampatternResponse)
async def mvdr_beampattern(req: BeampatternRequest):
    # Build numpy array of positions
    positions = np.array([[p.x, p.y, p.z] for p in req.positions], dtype=float)
    if positions.ndim != 2 or positions.shape[1] != 3 or positions.shape[0] < 1:
        raise HTTPException(status_code=400, detail="positions must be shape (M,3) with M>=1")

    # Build angle grids (robust to float rounding)
    try:
        az = _make_grid(req.az_start, req.az_end, req.az_step)
        el = _make_grid(req.el_start, req.el_end, req.el_step)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"invalid grid parameters: {e}")

    # Compute MVDR weights at look direction
    try:
        w = mvdr_weights(
            positions_m=positions,
            freq_hz=req.freq_hz,
            look_az_deg=req.look_az_deg,
            look_el_deg=req.look_el_deg,
            c=req.c,
            diag_loading=req.diag_loading,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to compute MVDR weights: {e}")

    # Compute response over grid
    try:
        resp = beampattern_response(
            positions_m=positions,
            freq_hz=req.freq_hz,
            w=w,
            az_deg=az,
            el_deg=el,
            c=req.c,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to compute beampattern: {e}")

    resp_db = normalize_to_db(resp, floor_db=-60.0)

    return BeampatternResponse(
        az_deg=az.tolist(),
        el_deg=el.tolist(),
        response_db=resp_db.tolist(),
    )


# Entrypoint for uvicorn: `python -m uvicorn backend.app.main:app --reload`
