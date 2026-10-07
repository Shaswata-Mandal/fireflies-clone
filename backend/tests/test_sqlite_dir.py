from pathlib import Path

from app.core.database import ensure_sqlite_parent_dir


def test_missing_parent_directories_are_created(tmp_path: Path) -> None:
    db_file = tmp_path / "var" / "data" / "fireflies.db"

    ensure_sqlite_parent_dir(f"sqlite:///{db_file}")

    assert db_file.parent.is_dir()
    assert not db_file.exists()  # SQLite creates the file itself on first connect


def test_absolute_path_with_four_slashes_is_supported(tmp_path: Path) -> None:
    db_file = tmp_path / "abs" / "fireflies.db"
    url = "sqlite:///" + db_file.as_posix() if db_file.drive else f"sqlite:///{db_file}"

    ensure_sqlite_parent_dir(url)

    assert db_file.parent.is_dir()


def test_in_memory_and_non_sqlite_urls_are_ignored(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path)

    ensure_sqlite_parent_dir("sqlite://")
    ensure_sqlite_parent_dir("sqlite:///:memory:")
    ensure_sqlite_parent_dir("postgresql://user@host/db")

    assert list(tmp_path.iterdir()) == []
