import React, { useEffect, useRef, useState } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import { Still_RGBA, Still_Subpath } from "./canvas/types"
import { displayVectorized, setupCanvasCtx } from "./canvas/lib"

declare global {
  interface Window {
    loadPyodide: Function
    textMeasureCtx: CanvasRenderingContext2D
    sendTextForMeasurement: Function
  }
}

interface Pyodide {
  loadPackage: (packages: string[] | string) => Promise<void>
  runPythonAsync: (code: string) => Promise<any>
  runPython: (code: string) => any
  unpackArchive: Function
  pyimport: Function
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
// const CODE_PATH = "demos/demo_messages.py"
// const CODE_PATH = "demos/demo_numpy.py"
// const CODE_PATH = "demos/demo_canvas.py"
// const CODE_PATH = "demos/demo_import.py"
// const CODE_PATH = "demos/demo_canvas_import.py"
// const CODE_PATH = "demos/demo_smanim.py"
const CODE_PATH = "demos/demo_smanim_svg.py"
// const CODE_PATH = "demos/demo_read_file.py"

const DEFAULT_FS_DIR = "/home/pyodide"
const CANVAS_ID = "smanim-canvas"

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

  // test on text
  // create a headless canvas for determining bbox sizes
  useEffect(() => {
    const textMeasurementCanvas = document.createElement("canvas")
    textMeasurementCanvas.width = WIDTH
    textMeasurementCanvas.height = HEIGHT
    const textMeasurementCtx = textMeasurementCanvas.getContext("2d")!
    textMeasurementCtx.font = "16px Arial"
    window.textMeasureCtx = textMeasurementCtx

    // window.sendTextForMeasurement = async (text: string) => {
    window.sendTextForMeasurement = (text: string) => {
      const ctx = window.textMeasureCtx
      if (!ctx) {
        console.error("Context for text measurement is not set up.")
        return
      }
      ctx.font = "16px Arial"
      const metrics = ctx.measureText(text)
      const bbox = {
        width: metrics.width,
        height: metrics.fontBoundingBoxAscent,
      }
      return JSON.stringify(bbox)
    }
  }, [])

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
      //       await pyodide.runPythonAsync(`
      // import micropip
      // await micropip.install("https://objects.githubusercontent.com/github-production-release-asset-2e65be/775641417/129580dc-1322-4f8a-b9b6-a47414cb01b9?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20240321%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240321T195455Z&X-Amz-Expires=300&X-Amz-Signature=e3ef2b4f08886e390bf3649a4ea04f07800b47d471c82ca5d6f683f2a2419325&X-Amz-SignedHeaders=host&actor_id=0&key_id=0&repo_id=775641417&response-content-disposition=attachment%3B%20filename%3Dpyodide_test_package-0.1.0-py3-none-any.whl&response-content-type=application%2Foctet-stream")`)

      // load manim package

      const micropip = pyodide.pyimport("micropip")
      // loading pandas tutor works, i need to do this for my wheel
      //   await micropip.install("pandas")
      //   await micropip.install(
      //     "https://pandastutor.com/build/pandastutor-1.0-py3-none-any.whl"
      //   )
      // const pandastutor_py = pyodide.pyimport("pandas_tutor.main")

      const smanimWheel =
        // "https://test-files.pythonhosted.org/packages/c0/b1/1c88fb6e949ec37efdd1af72c39e6bbcd8136f612b059f3d2c6e7bdde3f3/still_manim-0.1.2-py3-none-any.whl"
        "https://test-files.pythonhosted.org/packages/dc/a9/0152d07648620e0e5d25379ff3e58a28a471e7966e2af57b35cc2d82bdef/still_manim-0.1.3-py3-none-any.whl"
      await micropip.install(
        // "https://test-files.pythonhosted.org/packages/22/ae/f94bba05355db514684a13ec543fee02c293d388c000f2cc8209448ca41d/pyodide_test_package-0.1.2-py3-none-any.whl"
        smanimWheel
      )

      //   const testpackagePy = pyodide.pyimport("pyodide_test_package")
      const testpackagePy = pyodide.pyimport("smanim")

      // using github to host wheels didn't work due to permission errors
      //   await micropip.install(
      //     // "https://github.com/tommy11jo/pyodide_test_package/releases/download/v0.1.0/pyodide_test_package-0.1.0-py3-none-any.whl"
      //     // "https://objects.githubusercontent.com/github-production-release-asset-2e65be/775641417/1d97502e-2bfd-4dfb-aeef-d61d368dfc86?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20240321%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240321T201847Z&X-Amz-Expires=300&X-Amz-Signature=7187316461373fc733759ca4d06f2beb5ee379f3375fe986c9449f9a9b12432f&X-Amz-SignedHeaders=host&actor_id=0&key_id=0&repo_id=775641417&response-content-type=application%2Foctet-stream&response-content-disposition=attachment%3B%20filename%3Dpyodide_test_package-0.1.0-py3-none-any.whl"
      //     "https://objects.githubusercontent.com/github-production-release-asset-2e65be/775641417/1d97502e-2bfd-4dfb-aeef-d61d368dfc86?&response-content-disposition=attachment%3B%20filename%3Dpyodide_test_package-0.1.0-py3-none-any.whl"
      //     // "pyodide_package_test @ https://objects.githubusercontent.com/github-production-release-asset-2e65be/775641417/129580dc-1322-4f8a-b9b6-a47414cb01b9?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20240321%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240321T195455Z&X-Amz-Expires=300&X-Amz-Signature=e3ef2b4f08886e390bf3649a4ea04f07800b47d471c82ca5d6f683f2a2419325&X-Amz-SignedHeaders=host&actor_id=0&key_id=0&repo_id=775641417&response-content-disposition=attachment%3B%20filename%3Dpyodide_test_package-0.1.0-py3-none-any.whl&response-content-type=application%2Foctet-stream"
      //   )

      //   let manimResponse = await fetch(
      //     // "https://github.com/tommy11jo/pyodide_test_package/releases/download/v1.0.0/pyodide_test_package-0.1.0-py3-none-any.whl"
      //     "https://github.com/tommy11jo/pyodide_test_package/archive/refs/tags/v1.0.0.tar.gz"
      //   )
      //   let buffer = await manimResponse.arrayBuffer()
      //   await pyodide.unpackArchive(buffer, "gztar")
      //   pyodide.pyimport("pyodide_test_package")

      // await pyodide.loadPackage("numpy")
      // create a custom manim wheel and load it here

      const response = await fetch("manim/adder.py")
      if (!response.ok) {
        throw new Error(
          `Failed to load /py-src/adder.py: ${response.statusText}`
        )
      }
      const adderPyContent = await response.text()
      //   await pyodide.runPythonAsync(adderPyContent)
      pyodide.runPython(adderPyContent)
      setPyodide(pyodide)

      await runPythonCode(initCode, pyodide)
      // for showing that file can be read and written
      //   let file = pyodide.FS.readFile("/media/hello.svg", { encoding: "utf8" })
      //   console.log(file) // ==> "hello world!"

      //   console.log(svgContent)
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
      //   const resultJson = await pyodide.runPythonAsync(newCode)
      const resultJson = pyodide.runPython(newCode)
      const resultArray = JSON.parse(resultJson)
      setOutput(resultJson)
      //   setVectorizedState([
      //     {
      //       subpath: resultArray,
      //       fillColor: testFillColor,
      //       strokeColor: testStrokeColor,
      //       strokeWidth: testStrokeWidth,
      //     },
      //   ])
      ctx!.clearRect(0, 0, WIDTH, HEIGHT)
      // get file contents of painted output
      const svgContent = pyodide.FS.readFile(
        `${DEFAULT_FS_DIR}/media/test0.svg`,
        {
          encoding: "utf8",
        }
      )
      const container = document.getElementById(CANVAS_ID)
      container!.innerHTML = svgContent
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
          <div id={CANVAS_ID} style={{ width: "400px", height: "400px" }}></div>
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
