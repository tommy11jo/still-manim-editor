import React, { useEffect, useState } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import CustomCanvas from "./CustomCanvas"
import { Still_RGBA, Still_Subpath } from "./canvas/types"

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

const code2 = `
print('Hello, world!') # does not show
3 + 10
`

const App = () => {
  const [pyodide, setPyodide] = useState<Pyodide | null>(null)
  const [output, setOutput] = useState("Loading...")
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
      await pyodide.runPythonAsync(newCode)
      const fs = pyodide.FS
      const data = fs.readFile("output.txt", { encoding: "utf8" })
      setOutput(`File contents: ${data}`)
    } catch (error) {
      if (error instanceof Error) {
        setOutput(error.message)
      } else {
        setOutput(String(error))
      }
    }
  }
  const subpaths: Still_Subpath = [
    [
      [10, 10],
      [100, 100],
      [200, 100],
      [300, 10],
      [300, 10],
      [400, -80],
      [500, -80],
      [600, 10],
    ],
    [
      [50, 150],
      [150, 250],
      [250, 250],
      [350, 150],
      [350, 150],
      [450, 50],
      [550, 50],
      [650, 150],
      [650, 150],
      [750, 250],
      [850, 250],
      [950, 150],
    ],
  ]
  const strokeWidth = 2
  const strokeColor: Still_RGBA = [1, 0, 0, 1]
  const fillColor: Still_RGBA = [0, 1, 0, 0.5]
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
      <div style={{ width: "50%", backgroundColor: "#f5f5f5" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}
        >
          <CustomCanvas
            subpaths={subpaths}
            fillColor={fillColor}
            strokeWidth={strokeWidth}
            strokeColor={strokeColor}
          />
          <div>Output:</div>
          <div>{output}</div>
        </div>
      </div>
    </div>
  )
}
export default App
