# demo with importing extra local code and using filesystem
a = Adder() # imported at start
with open("output.txt", "w") as f:
    result = a.add(10, 20)
    f.write("Hello from Python attempt 2!" + str(result))