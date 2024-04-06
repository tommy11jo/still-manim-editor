import js
import json


def measure_text_and_process(text):
    bbox_str_future = js.window.sendTextForMeasurement(text)
    bbox_str = bbox_str_future
    bbox = json.loads(bbox_str)
    return bbox


bbox = measure_text_and_process("hi there")

print("pybbox", bbox)
json.dumps(bbox)
