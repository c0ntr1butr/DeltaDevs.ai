"""Framework-specific middleware for Agentflow.

Every middleware here is *lazy*: it only imports the target framework inside
the constructor / call, so `pip install agentflow` alone stays lightweight.
Install the framework you use with the corresponding extra, e.g.::

    pip install agentflow[langgraph]
    pip install agentflow[openai]
    pip install agentflow[crewai]
    pip install agentflow[google]
    pip install agentflow[mcp]
"""
from importlib import import_module
from typing import Any


def _require(module: str, extra: str) -> Any:
    try:
        return import_module(module)
    except ModuleNotFoundError as e:
        raise RuntimeError(
            f"'{module}' is required for agentflow.middleware.{extra}. "
            f"Install it with:  pip install agentflow[{extra}]"
        ) from e


__all__ = ["_require"]
