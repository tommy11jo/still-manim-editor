from smanim import *
import json
c = Circle()
canvas.add(c)
canvas.snapshot()
json.dumps(str(canvas.config.save_file_dir))