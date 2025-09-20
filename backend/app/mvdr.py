import numpy as np

# Speed of sound (m/s)
C_DEFAULT = 343.0


def unit_vector_from_angles(az_deg: float, el_deg: float) -> np.ndarray:
    """
    Convert azimuth and elevation angles (degrees) to a 3D unit direction vector.
    - Azimuth: degrees, 0 along +x, increases towards +y (right-handed), range [0, 360)
    - Elevation: degrees, 0 in xy-plane, +90 toward +z
    """
    az = np.deg2rad(az_deg)
    el = np.deg2rad(el_deg)
    # Spherical to Cartesian (physics):
    ux = np.cos(el) * np.cos(az)
    uy = np.cos(el) * np.sin(az)
    uz = np.sin(el)
    return np.array([ux, uy, uz], dtype=float)


def steering_vector(positions_m: np.ndarray, freq_hz: float, look_az_deg: float, look_el_deg: float, c: float = C_DEFAULT) -> np.ndarray:
    """
    Compute narrowband plane-wave steering vector a for a given look direction.
    positions_m: shape (M, 3)
    Returns a: shape (M,), complex64
    """
    k = 2.0 * np.pi * freq_hz / c
    u = unit_vector_from_angles(look_az_deg, look_el_deg)
    phase = k * (positions_m @ u)  # shape (M,)
    return np.exp(1j * phase)


def mvdr_weights(positions_m: np.ndarray, freq_hz: float, look_az_deg: float, look_el_deg: float, R: np.ndarray | None = None, c: float = C_DEFAULT, diag_loading: float = 1e-3) -> np.ndarray:
    """
    MVDR weight vector w = R^{-1} a / (a^H R^{-1} a)
    If R is None, use identity with small diagonal loading (equivalent to normalized steering vector).
    positions_m: (M,3)
    Returns w: (M,) complex128
    """
    M = positions_m.shape[0]
    a0 = steering_vector(positions_m, freq_hz, look_az_deg, look_el_deg, c)
    if R is None:
        R = np.eye(M, dtype=np.complex128)
    else:
        R = R.astype(np.complex128, copy=False)
    # Diagonal loading for robustness
    R_loaded = R + diag_loading * np.eye(M, dtype=np.complex128)
    Rinv_a = np.linalg.solve(R_loaded, a0)
    denom = np.conj(a0) @ Rinv_a
    if np.isclose(denom, 0.0):
        # Fallback to normalized steering vector
        w = a0 / np.sqrt(np.vdot(a0, a0))
    else:
        w = Rinv_a / denom
    return w


def beampattern_response(positions_m: np.ndarray, freq_hz: float, w: np.ndarray, az_deg: np.ndarray, el_deg: np.ndarray, c: float = C_DEFAULT) -> np.ndarray:
    """
    Compute array response B(az, el) = w^H a(az, el) over a grid.
    az_deg: shape (N_az,), el_deg: shape (N_el,)
    Returns magnitude response |B| with shape (N_el, N_az)
    """
    k = 2.0 * np.pi * freq_hz / c
    # Build grid unit vectors of shape (N_el, N_az, 3)
    az_r = np.deg2rad(az_deg)[None, :]  # (1, N_az)
    el_r = np.deg2rad(el_deg)[:, None]  # (N_el, 1)
    ux = np.cos(el_r) * np.cos(az_r)    # (N_el, N_az)
    uy = np.cos(el_r) * np.sin(az_r)    # (N_el, N_az)
    uz = np.sin(el_r) * np.ones_like(az_r)  # broadcast to (N_el, N_az)
    U = np.stack([ux, uy, uz], axis=-1)  # (N_el, N_az, 3)
    # positions (M,3)
    # Compute phase for each grid dir: (N_el, N_az, M)
    phase = k * (U @ positions_m.T)  # broadcasting matmul, result (N_el, N_az, M)
    A = np.exp(1j * phase)  # steering vectors for all directions
    # Beamformer response: w^H a -> sum_m conj(w_m) * a_m
    B = np.tensordot(np.conj(w), A, axes=(0, 2))  # (N_el, N_az)
    return np.abs(B)


def normalize_to_db(arr: np.ndarray, floor_db: float = -60.0) -> np.ndarray:
    """
    Normalize magnitude array to 0 dB max, convert to dB, and floor at floor_db.
    """
    arr = np.asarray(arr)
    maxv = np.max(arr) + 1e-12
    db = 20.0 * np.log10(np.clip(arr / maxv, 1e-12, None))
    db = np.maximum(db, floor_db)
    return db
