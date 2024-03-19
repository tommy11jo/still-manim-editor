import React, { useEffect, useState } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"

declare global {
  interface Window {
    loadPyodide: any
  }
}

interface Pyodide {
  loadPackage: (packages: string[] | string) => Promise<void>
  runPythonAsync: (code: string) => Promise<any>
  FS: any
}
const code1 = `
with open("output.txt", "w") as f:
    f.write("Hello from Python attempt 2!")
`
const code2 = `
print('Hello, world!') # does not show
3 + 10
`
const App = () => {
  const [pyodide, setPyodide] = useState<Pyodide | null>(null)
  const [output, setOutput] = useState("Loading...")
  //   const [code, setCode] = useState(code1)
  const [code, setCode] = useState(code2)

  useEffect(() => {
    const loadAndRun = async () => {
      const pyodide = (await window.loadPyodide()) as Pyodide
      await pyodide.loadPackage(["micropip"])
      setPyodide(pyodide)
      await runPythonCode(code, pyodide)
    }
    loadAndRun()
  }, [])

  const runPythonCode = async (newCode: string, pyodide: Pyodide | null) => {
    if (!pyodide) {
      console.error("pyodide not loaded yet")
      return
    }
    setCode(newCode)
    try {
      // Example: code 1
      let result = await pyodide.runPythonAsync(code)
      console.log("result is", result)
      setOutput(result.toString())

      // Example: code 2
      // await pyodide.runPythonAsync(newCode)
      // const fs = pyodide.FS
      // const data = fs.readFile("output.txt", { encoding: "utf8" })
      // setOutput(`File contents: ${data}`)
    } catch (error) {
      if (error instanceof Error) {
        setOutput(error.message)
      } else {
        setOutput(String(error))
      }
    }
  }
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: "50%", height: "100%" }}>
        <CodeMirror
          value={code}
          extensions={[python()]}
          onChange={(value) => {
            runPythonCode(value, pyodide)
          }}
          height="100%"
        />
      </div>
      <div style={{ width: "50%", backgroundColor: "#f5f5f5" }}>{output}</div>
    </div>
  )
}
export default App
