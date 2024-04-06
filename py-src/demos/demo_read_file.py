import json
from pathlib import Path
import os
svg_str = """
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="blue" />
</svg>
"""
dir_path = Path(os.getcwd()) / "/media"
dir_path.mkdir(parents=True, exist_ok=True)
fpath = Path(dir_path / "hello.svg")
with open(fpath, "w") as fh:
      fh.write(svg_str)
json.dumps("new success")