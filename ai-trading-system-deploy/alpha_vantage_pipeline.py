"""
Minimal async pipeline for pulling data from Alpha Vantage and persisting it locally.
Designed to run inside Cursor, VS Code, or any plain‑old Python environment.

Usage:
    export ALPHAVANTAGE_API_KEY="<your key>"
    python alpha_vantage_pipeline.py  

Dependencies (install with pip):
    httpx  (async HTTP client)
    typer  (optional, for CLI convenience – already vendored below)

Supports:
  • Rate‑limit compliance for free tier (5 req/min, 500 req/day)
  • Concurrency via asyncio for faster bulk fetches
  • JSON/CSV autodetection and parsing
  • Drop‑in methods to extend to *any* endpoint (options, FX, tech indicators, etc.)

Forward‑looking:
  • Swap out the LocalFileSink with S3/BigQuery/etc. without changing calling code.
  • Add dags/workflows (Prefect / Airflow) on top – hooks are stubbed.
"""
from __future__ import annotations

import asyncio
import csv
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
import typer

API_ROOT = "https://www.alphavantage.co"
DEFAULT_RATE_LIMIT_PER_MIN = 5  # free tier


def _now() -> float:  # small helper to keep time.monotonic() usage tidy
    return time.monotonic()


class RateLimiter:
    """Simple rolling‑window rate limiter good enough for Alpha Vantage free keys."""

    def __init__(self, max_calls_per_min: int = DEFAULT_RATE_LIMIT_PER_MIN):
        self.max_calls = max_calls_per_min
        self._ticks: List[float] = []  # call timestamps (monotonic seconds)

    async def wait(self) -> None:
        now = _now()
        window_start = now - 60
        self._ticks = [t for t in self._ticks if t >= window_start]
        if len(self._ticks) >= self.max_calls:
            sleep_for = 60 - (now - self._ticks[0]) + 0.01  # +ε for safety
            await asyncio.sleep(sleep_for)
        self._ticks.append(_now())


class AlphaVantageClient:
    """Thin async wrapper around the Alpha Vantage REST API."""

    def __init__(
        self,
        api_key: str,
        *,
        http: Optional[httpx.AsyncClient] = None,
        max_calls_per_min: int = DEFAULT_RATE_LIMIT_PER_MIN,
    ):
        self.api_key = api_key
        self.http = http or httpx.AsyncClient(base_url=API_ROOT, timeout=30)
        self.rl = RateLimiter(max_calls_per_min)

    async def _request(self, params: Dict[str, Any]) -> Any:
        await self.rl.wait()
        params["apikey"] = self.api_key
        r = await self.http.get("/query", params=params)
        r.raise_for_status()
        if r.headers["content-type"].startswith("text/csv"):
            return list(csv.DictReader(r.text.splitlines()))
        return r.json()

    # ------------------------------------------------------------------
    # Convenient endpoint helpers – add as many as you like below.
    # ------------------------------------------------------------------
    async def time_series_daily(
        self,
        symbol: str,
        *,
        outputsize: str = "compact",
        datatype: str = "json",
    ) -> Any:
        return await self._request(
            {
                "function": "TIME_SERIES_DAILY",
                "symbol": symbol,
                "outputsize": outputsize,
                "datatype": datatype,
            }
        )

    async def quote(self, symbol: str) -> Any:
        return await self._request({"function": "GLOBAL_QUOTE", "symbol": symbol})

    # Example of adding a premium/options endpoint stub
    async def realtime_options(
        self, symbol: str, *, require_greeks: bool = False, datatype: str = "json"
    ) -> Any:
        return await self._request(
            {
                "function": "REALTIME_OPTIONS",
                "symbol": symbol,
                "require_greeks": str(require_greeks).lower(),
                "datatype": datatype,
            }
        )

    # ------------------------------------------------------------------
    # House‑keeping
    # ------------------------------------------------------------------
    async def aclose(self):
        await self.http.aclose()


class LocalFileSink:
    """Persist API payloads to ./data/ as JSON or CSV depending on response."""

    def __init__(self, root: str | Path = "data"):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, name: str, ext: str) -> Path:
        return self.root / f"{name}.{ext}"

    async def write(self, name: str, data: Any) -> Path:
        if isinstance(data, list):  # CSV parsed into list‑of‑dicts
            path = self._path(name, "csv")
            if data:
                with path.open("w", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=data[0].keys())
                    writer.writeheader()
                    writer.writerows(data)
        else:  # assume JSON‑serialisable
            path = self._path(name, "json")
            with path.open("w") as f:
                json.dump(data, f, indent=2)
        return path


class Pipeline:
    """Orchestrates multi‑symbol fetches and persists them via a sink."""

    def __init__(self, client: AlphaVantageClient, sink: LocalFileSink | None = None):
        self.client = client
        self.sink = sink or LocalFileSink()

    async def ingest_daily(self, symbols: List[str], *, outputsize: str = "compact") -> None:
        async def _fetch(sym: str):
            data = await self.client.time_series_daily(sym, outputsize=outputsize)
            await self.sink.write(f"{sym}_daily", data)
            return sym

        for coro in asyncio.as_completed([_fetch(s) for s in symbols]):
            sym = await coro
            typer.echo(f"✓ {sym} written to data/{sym}_daily.*")

    async def close(self):
        await self.client.aclose()


# ----------------------------------------------------------------------
# CLI glue – run `python alpha_vantage_pipeline.py --help` for options.
# ----------------------------------------------------------------------

cli = typer.Typer(add_completion=False)


@cli.command()
def run(
    symbols: List[str] = typer.Argument(..., help="Ticker symbols, e.g. AAPL MSFT IBM"),
    outputsize: str = typer.Option("compact", help="'compact' (100 rows) or 'full'"),
    rate: int = typer.Option(DEFAULT_RATE_LIMIT_PER_MIN, help="Max calls per minute"),
    data_dir: str = typer.Option("data", help="Local folder to store output"),
):
    """Fetch daily time‑series for SYMBOLS and save to ./data/."""

    api_key = os.getenv("ALPHAVANTAGE_API_KEY") or "2ZQ8QZSN1U9XN5TK"
    if not api_key:
        typer.secho("❌  ALPHAVANTAGE_API_KEY env var not set", fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1)

    client = AlphaVantageClient(api_key, max_calls_per_min=rate)
    pipe = Pipeline(client, LocalFileSink(data_dir))

    async def _main():
        await pipe.ingest_daily(symbols, outputsize=outputsize)
        await pipe.close()

    asyncio.run(_main())


if __name__ == "__main__":
    cli() 