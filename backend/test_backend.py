from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get('/api/health')
    assert r.status_code == 200
    assert r.json().get('status') == 'ok'


def test_mvdr_small():
    payload = {
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
    r = client.post('/api/mvdr/beampattern', json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert 'az_deg' in data and 'el_deg' in data and 'response_db' in data
    assert len(data['az_deg']) >= 1
    assert len(data['el_deg']) >= 1
    assert len(data['response_db']) == len(data['el_deg'])
    assert len(data['response_db'][0]) == len(data['az_deg'])

if __name__ == '__main__':
    test_health()
    print('health: ok')
    test_mvdr_small()
    print('mvdr_small: ok')
    print('ALL TESTS PASSED')

