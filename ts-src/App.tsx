import React, { useEffect, useState } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import { Still_RGBA, Still_Subpath } from "./canvas/types"
import { displayVectorized, setupCanvasCtx } from "./canvas/lib"

declare global {
  interface Window {
    loadPyodide: any
  }
}

interface Pyodide {
  loadPackage: (packages: string[] | string) => Promise<void>
  runPythonAsync: (code: string) => Promise<any>
  setDebug: Function
  FS: any
  globals: Record<string, any>
}

type VectorizedObject = {
  subpath: Still_Subpath // this might need to be 'subpaths', a list
  fillColor: Still_RGBA
  strokeColor: Still_RGBA
  strokeWidth: number
}
type VectorizedState = VectorizedObject[]

const WIDTH = 800
const HEIGHT = 800
// const CODE_PATH = "demos/demo.py"
const CODE_PATH = "demos/demo-messages.py"

const testStrokeWidth = 2
const testStrokeColor: Still_RGBA = [1, 0, 0, 1]
const testFillColor: Still_RGBA = [0, 1, 0, 0.5]

const App = () => {
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  const [vectorizedState, setVectorizedState] = useState<VectorizedState>([])

  const [pyodide, setPyodide] = useState<Pyodide | null>(null)
  const [output, setOutput] = useState("Loading...")
  const [code, setCode] = useState("")

  useEffect(() => {
    if (canvasRef) {
      const ctx = canvasRef.getContext("2d")!
      setupCanvasCtx(ctx)
      setCtx(ctx)
    }
  }, [canvasRef])

  useEffect(() => {
    for (const {
      subpath,
      fillColor,
      strokeColor,
      strokeWidth,
    } of vectorizedState) {
      displayVectorized(ctx!, subpath, fillColor, strokeColor, strokeWidth)
    }
  }, [vectorizedState])

  useEffect(() => {
    const loadAndRun = async () => {
      const initCode = await (await fetch(CODE_PATH)).text()
      setCode(initCode)

      const pyodide = (await window.loadPyodide()) as Pyodide
      // pyodide.setDebug(true)
      await pyodide.loadPackage(["micropip"])
      const response = await fetch("manim/adder.py")
      if (!response.ok) {
        throw new Error(
          `Failed to load /py-src/adder.py: ${response.statusText}`
        )
      }
      const adderPyContent = await response.text()
      await pyodide.runPythonAsync(adderPyContent)
      setPyodide(pyodide)

      await runPythonCode(initCode, pyodide)
    }
    if (ctx) loadAndRun()
  }, [ctx])

  const runPythonCode = async (newCode: string, pyodide: Pyodide | null) => {
    if (!pyodide) {
      console.error("pyodide not loaded yet")
      return
    }
    setCode(newCode)
    try {
      const resultJson = await pyodide.runPythonAsync(newCode)
      const resultArray = JSON.parse(resultJson)
      setOutput(resultJson)
      setVectorizedState([
        {
          subpath: resultArray,
          fillColor: testFillColor,
          strokeColor: testStrokeColor,
          strokeWidth: testStrokeWidth,
        },
      ])
      ctx!.clearRect(0, 0, WIDTH, HEIGHT)
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
      <div style={{ width: "50%", backgroundColor: "#f5f5f5" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}
        >
          <canvas
            ref={setCanvasRef}
            width={WIDTH}
            height={HEIGHT}
            style={{ width: "400px", height: "400px" }}
          />
          <div>Output:</div>
          <div>{output}</div>
        </div>
      </div>
    </div>
  )
}
export default App
