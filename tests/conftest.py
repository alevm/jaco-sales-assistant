"""Shared fixtures for jaco-sales-assistant QA test suite."""

from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def root_dir() -> Path:
    """Project root directory."""
    return ROOT_DIR


@pytest.fixture(scope="module")
def src_dir() -> Path:
    """src/ directory."""
    return ROOT_DIR / "src"


@pytest.fixture(scope="module")
def read_file():
    """Return a helper that reads a file relative to project root."""

    def _read(relative_path: str) -> str:
        return (ROOT_DIR / relative_path).read_text()

    return _read
