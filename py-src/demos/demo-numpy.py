import numpy as np
import json

a = np.array([2, 3, 4])
b = np.array([0, 1, 0])
result = int(a.dot(b))
json.dumps([result])
