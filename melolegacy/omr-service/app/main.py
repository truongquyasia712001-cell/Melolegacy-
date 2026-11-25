from __future__ import annotations

import os
import shutil
import sqlite3
import subprocess
import threading
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

APP_VERSION = "0.1.0"
DATA_DIR = Path(os.getenv("OMR_DATA_DIR", "/data"))
JOBS_DIR = DATA_DIR / "jobs"
DB_PATH = DATA_DIR / "omr-jobs.sqlite3"
AUDIVERIS_BIN = os.getenv("AUDIVERIS_BIN", "/opt/audiveris/bin/Audiveris")
MAX_UPLOAD_BYTES = int(os.getenv("OMR_MAX_UPLOAD_BYTES", str(40 * 1024 * 1024)))
JOB_TIMEOUT_SECONDS = int(os.getenv("OMR_JOB_TIMEOUT_SECONDS", "900"))
MAX_CONCURRENT_JOBS = max(1, int(os.getenv("OMR_MAX_CONCURRENT_JOBS", "1")))
API_TOKEN = os.getenv("OMR_API_TOKEN", "").strip()
PARALLEL_SYSTEMS = os.getenv("OMR_PARALLEL_SYSTEMS", "true").strip().lower() in {"1", "true", "yes", "on"}
job_slots = threading.BoundedSemaphore(MAX_CONCURRENT_JOBS)

app = FastAPI(
    title="MeloLegacy OMR Service",
    version=APP_VERSION,
    description="PDF sheet-music recognition using the Audiveris command-line engine.",
    docs_url=None,
    redoc_url=None,
)

origins = [item.strip() for item in os.getenv("OMR_ALLOWED_ORIGINS", "").split(",") if item.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_storage() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    with connect_db() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                error TEXT,
                result_path TEXT,
                output_files TEXT
            )
            """
        )


@app.on_event("startup")
def startup() -> None:
    initialize_storage()


def authorize(authorization: str | None = Header(default=None)) -> None:
    if not API_TOKEN:
        if os.getenv("OMR_ENV", "development").lower() == "production":
            raise HTTPException(status_code=503, detail="OMR_API_TOKEN is required in production")
        return
    expected = f"Bearer {API_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


def get_job(job_id: str) -> sqlite3.Row | None:
    with connect_db() as connection:
        return connection.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()


def update_job(job_id: str, **values: Any) -> None:
    allowed = {"status", "updated_at", "error", "result_path", "output_files"}
    assignments = []
    parameters: list[Any] = []
    for key, value in values.items():
        if key not in allowed:
            raise ValueError(f"Unsupported job field: {key}")
        assignments.append(f"{key} = ?")
        parameters.append(value)
    assignments.append("updated_at = ?")
    parameters.append(now_iso())
    parameters.append(job_id)
    with connect_db() as connection:
        connection.execute(f"UPDATE jobs SET {', '.join(assignments)} WHERE id = ?", parameters)


def public_job(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "filename": row["filename"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "error": row["error"],
        "output_files": row["output_files"].split("\n") if row["output_files"] else [],
        "download_url": f"/v1/jobs/{row['id']}/result" if row["status"] == "completed" else None,
    }


def process_job(job_id: str) -> None:
    with job_slots:
        row = get_job(job_id)
        if row is None:
            return
        job_dir = JOBS_DIR / job_id
        input_pdf = job_dir / "source.pdf"
        output_dir = job_dir / "output"
        output_dir.mkdir(parents=True, exist_ok=True)
        update_job(job_id, status="processing", error=None)
        try:
            command = [
                AUDIVERIS_BIN,
                *(["-constant", "org.audiveris.omr.ui.action.AdvancedTopics$Constants.processSystemsInParallel=true"] if PARALLEL_SYSTEMS else []),
                "-batch",
                "-export",
                "-save",
                "-swap",
                "-output",
                str(output_dir),
                "--",
                str(input_pdf),
            ]
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=JOB_TIMEOUT_SECONDS,
                check=False,
            )
            if completed.returncode != 0:
                detail = (completed.stderr or completed.stdout or "Audiveris exited with an error")[-3000:]
                raise RuntimeError(detail)
            mxl_files = sorted(output_dir.rglob("*.mxl"))
            xml_files = sorted(output_dir.rglob("*.musicxml"))
            score_files = mxl_files + xml_files
            if not score_files:
                raise RuntimeError("Audiveris finished but did not produce a MusicXML/MXL file.")
            archive_path = job_dir / "musicxml-results.zip"
            with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                for score_file in score_files:
                    archive.write(score_file, arcname=str(score_file.relative_to(output_dir)))
            update_job(
                job_id,
                status="completed",
                result_path=str(archive_path),
                output_files="\n".join(file.name for file in score_files),
            )
        except subprocess.TimeoutExpired:
            update_job(job_id, status="failed", error=f"Recognition exceeded {JOB_TIMEOUT_SECONDS} seconds.")
        except Exception as error:  # The error is recorded for the user and operator.
            update_job(job_id, status="failed", error=str(error)[:3000])


@app.get("/health")
def health() -> dict[str, str]:
    executable = Path(AUDIVERIS_BIN)
    return {
        "service": "MeloLegacy OMR",
        "version": APP_VERSION,
        "engine": "Audiveris 5.11.0",
        "engine_available": str(executable.exists()).lower(),
    }


@app.post("/v1/jobs", status_code=202, dependencies=[Depends(authorize)])
async def create_job(background_tasks: BackgroundTasks, pdf: UploadFile = File(...)) -> dict[str, Any]:
    if not pdf.filename or Path(pdf.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=415, detail="Only PDF sheet-music files are accepted.")

    job_id = uuid.uuid4().hex
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=False)
    input_path = job_dir / "source.pdf"
    total = 0
    header = b""

    try:
        with input_path.open("wb") as target:
            while chunk := await pdf.read(1024 * 1024):
                if not header:
                    header = chunk[:8]
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail=f"PDF exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.")
                target.write(chunk)
        if not header.startswith(b"%PDF-"):
            raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF.")
        created = now_iso()
        with connect_db() as connection:
            connection.execute(
                "INSERT INTO jobs (id, filename, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (job_id, Path(pdf.filename).name[:255], "queued", created, created),
            )
        background_tasks.add_task(process_job, job_id)
        row = get_job(job_id)
        return public_job(row)
    except Exception:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise
    finally:
        await pdf.close()


@app.get("/v1/jobs/{job_id}", dependencies=[Depends(authorize)])
def read_job(job_id: str) -> dict[str, Any]:
    row = get_job(job_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Recognition job not found.")
    return public_job(row)



@app.get("/v1/jobs/{job_id}/musicxml", dependencies=[Depends(authorize)])
def read_musicxml(job_id: str) -> Response:
    row = get_job(job_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Recognition job not found.")
    if row["status"] != "completed" or not row["result_path"]:
        raise HTTPException(status_code=409, detail="MusicXML result is not ready.")
    archive_path = Path(row["result_path"]).resolve()
    if JOBS_DIR.resolve() not in archive_path.parents or not archive_path.is_file():
        raise HTTPException(status_code=404, detail="Recognition result is no longer available.")

    try:
        with zipfile.ZipFile(archive_path) as archive:
            names = archive.namelist()
            xml_candidates = [name for name in names if name.lower().endswith(".musicxml")]
            if not xml_candidates:
                mxl_candidates = [name for name in names if name.lower().endswith(".mxl")]
                if not mxl_candidates:
                    raise RuntimeError("No MusicXML or compressed MXL file was found.")
                with zipfile.ZipFile(archive.open(mxl_candidates[0])) as mxl:
                    container = next((name for name in mxl.namelist() if name.lower() == "meta-inf/container.xml"), None)
                    score_name = None
                    if container:
                        import xml.etree.ElementTree as ET
                        root = ET.fromstring(mxl.read(container))
                        for element in root.iter():
                            if element.tag.endswith("rootfile") and element.attrib.get("full-path"):
                                score_name = element.attrib["full-path"]
                                break
                    if not score_name:
                        score_name = next((name for name in mxl.namelist() if name.lower().endswith((".musicxml", ".xml")) and not name.lower().startswith("meta-inf/")), None)
                    if not score_name:
                        raise RuntimeError("The MXL container does not identify a MusicXML score.")
                    xml_bytes = mxl.read(score_name)
            else:
                xml_bytes = archive.read(xml_candidates[0])
        return Response(
            content=xml_bytes.decode("utf-8-sig"),
            media_type="application/vnd.recordare.musicxml+xml",
            headers={"Content-Disposition": f'inline; filename="melolegacy-{job_id}.musicxml"'},
        )
    except (zipfile.BadZipFile, KeyError, RuntimeError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=422, detail=f"Could not read MusicXML output: {error}") from error


@app.get("/v1/jobs/{job_id}/result", dependencies=[Depends(authorize)])
def download_result(job_id: str) -> FileResponse:
    row = get_job(job_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Recognition job not found.")
    if row["status"] != "completed" or not row["result_path"]:
        raise HTTPException(status_code=409, detail="MusicXML result is not ready.")
    result_path = Path(row["result_path"]).resolve()
    if JOBS_DIR.resolve() not in result_path.parents or not result_path.is_file():
        raise HTTPException(status_code=404, detail="Recognition result is no longer available.")
    return FileResponse(
        result_path,
        media_type="application/zip",
        filename=f"melolegacy-{job_id}-musicxml.zip",
    )
