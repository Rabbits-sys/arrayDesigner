import asyncio
from typing import Any

from httpx import AsyncClient
try:
    from httpx import ASGITransport  # httpx>=0.24
except Exception as e:
    raise RuntimeError("httpx is required and must support ASGITransport.") from e

from app.main import app


async def main() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Health check
        r = await client.get("/api/health")
        print("health:", r.status_code, r.json())

        # MVDR small grid
        payload: dict[str, Any] = {
            "positions": [
                {"x": -0.05, "y": 0.0, "z": 0.0},
                {"x": 0.05, "y": 0.0, "z": 0.0},
            ],
            "freq_hz": 1000,
            "look_az_deg": 0,
            "look_el_deg": 0,
            "az_start": 0,
            "az_end": 10,
            "az_step": 5,
            "el_start": 0,
            "el_end": 0,
            "el_step": 1,
            "diag_loading": 1e-3,
        }
        r2 = await client.post("/api/mvdr/beampattern", json=payload)
        print("mvdr:", r2.status_code)
        if r2.status_code != 200:
            print("error:", r2.text)
            return
        data = r2.json()
        az = data.get("az_deg", [])
        el = data.get("el_deg", [])
        z = data.get("response_db", [])
        az_n = len(az)
        el_n = len(el)
        z_m = len(z)
        z_n = len(z[0]) if z else 0
        print(f"AZ={az_n} EL={el_n} Zshape={z_m}x{z_n}")
        if z and z[0]:
            first_row_preview = ", ".join(f"{v:.1f}" for v in z[0][:5])
            print("first_row(db):", first_row_preview)


if __name__ == "__main__":
    asyncio.run(main())

