import React, { useEffect, useRef, useState } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import "./index.css"
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

const CODE_PATH = "demos/demo_smanim_svg.py"

const DEFAULT_FS_DIR = "/home/pyodide/media"
const SMANIM_WHEEL =
  "https://test-files.pythonhosted.org/packages/ea/f2/44471037de4d4a2ffebb7595898de40ad25278a57423a1fe2aaf0bc3449c/still_manim-0.1.8-py3-none-any.whl"

// TODO: linting and language server
// https://www.npmjs.com/package/@qualified/codemirror-workspace
const App = () => {
  const [canvasRef, setCanvasRef] = useState<HTMLDivElement | null>(null)

  const [pyodide, setPyodide] = useState<Pyodide | null>(null)
  const [output, setOutput] = useState("")
  const [code, setCode] = useState("")
  const [redrawPending, setRedrawPending] = useState(false)

  // workaround since I can't set height using css which allows responsiveness
  const [editorHeight, setEditorHeight] = useState("50rem")
  useEffect(() => {
    const updateHeight = () => {
      if (window.innerWidth < 75 * 16) {
        // 75rem in pixels, assuming 1rem = 16px
        // matching .split-layout in index.css
        setEditorHeight("20rem")
      } else {
        setEditorHeight("50rem")
      }
    }

    window.addEventListener("resize", updateHeight)
    updateHeight()

    return () => window.removeEventListener("resize", updateHeight)
  }, [])

  useEffect(() => {
    const loadAndRun = async () => {
      const response = await fetch(CODE_PATH)
      const initCode = await response.text()
      setCode(initCode)

      const pyodide = (await window.loadPyodide()) as Pyodide
      // pyodide.setDebug(true)
      await pyodide.loadPackage(["micropip"])
      const micropip = pyodide.pyimport("micropip")
      await micropip.install(SMANIM_WHEEL)
      pyodide.pyimport("smanim")

      setPyodide(pyodide)
      await runCurrentCode(initCode, pyodide)
    }
    if (canvasRef !== null) loadAndRun()
  }, [canvasRef])

  const runCurrentCode = async (code: string, pyodide: Pyodide | null) => {
    if (!pyodide) {
      console.error("pyodide not loaded yet")
      return
    }
    try {
      pyodide.runPython(code)
      setOutput("")
      const svgContent = pyodide.FS.readFile(`${DEFAULT_FS_DIR}/test0.svg`, {
        encoding: "utf8",
      })
      canvasRef!.innerHTML = svgContent
    } catch (error) {
      if (error instanceof Error) {
        const pattern = /(.*\^){8,}/g
        const errorStr = error.message
        let lastMatch
        let match

        while ((match = pattern.exec(errorStr)) !== null) {
          lastMatch = match
        }

        if (lastMatch !== undefined) {
          const endIndex = lastMatch.index + lastMatch[0].length
          setOutput(errorStr.substring(endIndex))
        } else {
          setOutput(error.message)
        }
      } else {
        setOutput(String(error))
      }
    }
  }
  useEffect(() => {
    if (canvasRef === null) return
    if (redrawPending) {
      setTimeout(() => {
        runCurrentCode(code, pyodide)
        setRedrawPending(false)
      }, 500)
    }
  }, [redrawPending, code, pyodide, canvasRef])
  const triggerRedraw = () => {
    if (!redrawPending) {
      setRedrawPending(true)
    }
  }
  console.log(output)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        padding: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.8rem",
        }}
      >
        <img
          src="/public/still-life.svg"
          alt="Lemons"
          style={{ width: "5rem", height: "5rem" }}
        ></img>
        <div
          className="smanim"
          style={{
            display: "flex",
            fontSize: "50px",
          }}
        >
          Still Manim
        </div>
        <a
          href="https://github.com/tommy11jo/still-manim"
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: "auto", textDecoration: "none" }}
          className="smanim"
        >
          <img
            src="public/github-logo.png"
            style={{ width: "3rem", height: "3rem" }}
          ></img>
        </a>
      </div>

      <div className="split-layout" style={{ display: "flex", width: "100%" }}>
        <div style={{ flex: 1, height: "100%" }}>
          <CodeMirror
            value={code}
            extensions={[python()]}
            onChange={(value) => {
              setCode(value)
              triggerRedraw()
            }}
            height={editorHeight}
            style={{ fontSize: "16px" }}
          />
          <div
            style={{
              height: "10rem",
              maxHeight: "10rem",
              border: "2px solid #f5f5f5",
              overflowY: "auto",
            }}
          >
            <div>Console:</div>
            <div>{output}</div>
          </div>
        </div>
        <div style={{ flex: 1, backgroundColor: "#f5f5f5", padding: "0.3rem" }}>
          {canvasRef === null ||
            (!canvasRef.innerHTML && <div>Loading...</div>)}
          <div ref={setCanvasRef}></div>
        </div>
      </div>
    </div>
  )
}
export default App
