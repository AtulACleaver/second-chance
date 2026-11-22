# load local environment variables from root env file if present

import os
from pathlib import Path

env_file = Path(__file__).resolve().parents[2] / ".env"
if env_file.exists():
    with open(env_file, encoding="utf-8") as f:
        for raw_line in f:
            clean_line = raw_line.strip()
            if clean_line and not clean_line.startswith("#") and "=" in clean_line:
                env_key, env_val = clean_line.split("=", 1)
                os.environ.setdefault(env_key.strip(), env_val.strip())
