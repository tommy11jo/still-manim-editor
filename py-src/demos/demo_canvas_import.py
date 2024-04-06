from pyodide_test_package.measure import measure_text_and_process
import json

bbox = measure_text_and_process("hi there")

print("pybbox", bbox)
json.dumps(bbox)
