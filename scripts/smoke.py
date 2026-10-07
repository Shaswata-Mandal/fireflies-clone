#!/usr/bin/env python3
"""Post-deploy smoke test. Standard library only.

    python scripts/smoke.py [BASE_URL]        # default http://localhost:8000

Checks /health, /health/db, the seeded meetings, then a create -> read -> delete -> 404 round trip.
Prints PASS/FAIL per step and exits 1 if any step failed.
"""

import json
import sys
import urllib.error
import urllib.request
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

DEFAULT_BASE_URL = "http://localhost:8000"
TIMEOUT_SECONDS = 60  # the first request after a host's idle spin-down can take a while
API = "/api/v1"
HTTP_OK, HTTP_CREATED, HTTP_NO_CONTENT, HTTP_NOT_FOUND = 200, 201, 204, 404

Response = tuple[int, Any]


def request(base_url: str, method: str, path: str, body: dict[str, Any] | None = None) -> Response:
    """Return (status, parsed JSON or None). HTTP error statuses are returned, not raised."""
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req = urllib.request.Request(base_url + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as res:
            raw, status = res.read(), res.status
    except urllib.error.HTTPError as err:
        raw, status = err.read(), err.code
    return status, (json.loads(raw) if raw else None)


class Smoke:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.failures = 0
        self.meeting_id: int | None = None  # set while the smoke meeting exists, for cleanup
        self.created_id: int | None = None  # remembered for the 404 check after deletion

    def call(self, method: str, path: str, body: dict[str, Any] | None = None) -> Response:
        return request(self.base_url, method, path, body)

    def step(self, name: str, check: Callable[[], str | None]) -> bool:
        """Run `check`; it returns None on success or a failure reason. Any exception is a FAIL."""
        try:
            problem = check()
        except Exception as exc:  # a smoke test reports every failure instead of crashing
            problem = f"{type(exc).__name__}: {exc}"
        if problem is None:
            print(f"PASS  {name}")
            return True
        print(f"FAIL  {name} - {problem}")
        self.failures += 1
        return False

    def expect(
        self, method: str, path: str, status: int, body: dict[str, Any] | None = None
    ) -> tuple[str | None, Any]:
        """Call and compare the status; returns (failure reason or None, parsed JSON)."""
        got, data = self.call(method, path, body)
        if got != status:
            return f"expected HTTP {status}, got {got}: {data}", data
        return None, data

    # -- steps --------------------------------------------------------------------------------

    def health(self) -> str | None:
        problem, data = self.expect("GET", "/health", HTTP_OK)
        return problem or (None if data == {"status": "ok"} else f"unexpected body {data}")

    def health_db(self) -> str | None:
        problem, data = self.expect("GET", "/health/db", HTTP_OK)
        return problem or (None if data == {"status": "ok"} else f"unexpected body {data}")

    def seeded(self) -> str | None:
        problem, data = self.expect("GET", f"{API}/meetings", HTTP_OK)
        if problem:
            return problem
        return None if data["total"] >= 1 else "no meetings (is SEED_ON_STARTUP=true?)"

    def create(self) -> str | None:
        stamp = datetime.now(UTC)
        body = {
            "title": f"Smoke test {stamp:%Y-%m-%d %H:%M:%S}",
            "meeting_date": stamp.isoformat(),
            "participants": [{"name": "Smoke Tester"}],
            "transcript_text": "[00:00:05] Smoke Tester: Checking that the deploy works.",
        }
        problem, data = self.expect("POST", f"{API}/meetings", HTTP_CREATED, body)
        if problem:
            return problem
        self.meeting_id = self.created_id = data["id"]
        return None

    def read(self) -> str | None:
        problem, data = self.expect("GET", f"{API}/meetings/{self.meeting_id}", HTTP_OK)
        if problem:
            return problem
        return None if data["id"] == self.meeting_id else f"wrong meeting returned: {data}"

    def delete(self) -> str | None:
        problem, _ = self.expect("DELETE", f"{API}/meetings/{self.meeting_id}", HTTP_NO_CONTENT)
        if problem is None:
            self.meeting_id = None  # deleted, so cleanup has nothing left to do
        return problem

    def gone(self) -> str | None:
        problem, _ = self.expect("GET", f"{API}/meetings/{self.created_id}", HTTP_NOT_FOUND)
        return problem

    def cleanup(self) -> None:
        """Best effort: do not leave a smoke meeting behind when a middle step failed."""
        if self.meeting_id is not None:
            self.call("DELETE", f"{API}/meetings/{self.meeting_id}")

    # -- run ----------------------------------------------------------------------------------

    def run(self) -> int:
        print(f"Smoke test against {self.base_url}")
        self.step("GET /health", self.health)
        self.step("GET /health/db", self.health_db)
        self.step("GET /api/v1/meetings has a seeded meeting", self.seeded)
        if self.step("POST /api/v1/meetings creates a meeting", self.create):
            self.step("GET /api/v1/meetings/{id} reads it", self.read)
            self.step("DELETE /api/v1/meetings/{id}", self.delete)
            self.step("GET /api/v1/meetings/{id} is 404 after delete", self.gone)
        self.cleanup()
        print("PASS" if self.failures == 0 else f"FAIL ({self.failures} step(s) failed)")
        return 1 if self.failures else 0


def main() -> int:
    base_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BASE_URL
    return Smoke(base_url).run()


if __name__ == "__main__":
    sys.exit(main())
