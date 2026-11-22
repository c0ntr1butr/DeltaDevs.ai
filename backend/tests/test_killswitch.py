"""Kill Switch integration tests for the authenticated demo tenant."""
import pytest
from fastapi.testclient import TestClient

from server import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_killswitch_overview_and_demo_flow(client):
    response = client.post("/api/killswitch/demo/run")
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["status"] == "completed"
    assert result["recovery"]["status"] == "recovered"
    assert result["preservation_check"]["supplier_name"] == "Northstar Components"
    assert result["preservation_check"]["supplier_bank_account"] == "MASKED-0000"
    assert result["preservation_check"]["inventory_quantity"] == 37
    assert result["preservation_check"]["healthy_agents_active"] is True

    overview = client.get("/api/killswitch/overview")
    assert overview.status_code == 200
    data = overview.json()
    assert data["quarantined_agents"] >= 1
    assert data["recovered"] >= 1


def test_sensitive_action_is_blocked_and_agent_quarantined(client):
    client.post("/api/killswitch/demo/reset")
    response = client.post("/api/killswitch/actions", json={
        "agent_id": "ks-demo-finance",
        "resource": "supplier:SUP-100",
        "action": "write",
        "purpose": "finance_operations",
        "run_id": "test-preventive-block",
        "patch": {"bank_account": "DO-NOT-COMMIT"},
    })
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["decision"] == "block"
    assert data["executed"] is False
    agents = client.get("/api/killswitch/agents").json()
    finance = next(a for a in agents if a["id"] == "ks-demo-finance")
    assert finance["kill_switch_quarantined"] is True


def test_recovery_conflict_does_not_overwrite_later_value(client):
    client.post("/api/killswitch/demo/reset")
    # Apply one legitimate change through the normal governed action route.
    response = client.post("/api/killswitch/actions", json={
        "agent_id": "ks-demo-research",
        "resource": "supplier:SUP-100",
        "action": "write",
        "purpose": "supplier_onboarding",
        "run_id": "conflict-test",
        "patch": {"notes": "initial"},
    })
    assert response.status_code == 200, response.text
    change_id = response.json()["change"]["id"]
    # Simulate another writer changing the same field after the journalled mutation.
    db_response = client.get("/api/killswitch/resources")
    assert db_response.status_code == 200
    # The API has no arbitrary direct write endpoint; this test uses a follow-up governed write.
    response2 = client.post("/api/killswitch/actions", json={
        "agent_id": "ks-demo-research",
        "resource": "supplier:SUP-100",
        "action": "write",
        "purpose": "supplier_onboarding",
        "run_id": "conflict-test-2",
        "patch": {"notes": "changed-later"},
    })
    assert response2.status_code == 200, response2.text
    recovered = client.post(f"/api/killswitch/changes/{change_id}/recover")
    assert recovered.status_code == 200, recovered.text
    assert recovered.json()["status"] == "conflict"
