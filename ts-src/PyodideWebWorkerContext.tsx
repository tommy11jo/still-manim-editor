import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

type ErrorInfoType = {
  customOutput: string
  errorLine: number | null
  errorMessage: string | null
}
type PyodideRunStatus = "success" | "error" | "none" | "running" | "timeout"
interface PyodideWorkerContextType {
  runPythonCodeInWorker: () => void
  metadataMapStr: string
  svgContent: any
  code: React.MutableRefObject<string>

  pyodideLoadTimeInSeconds: number
  graphicRunTimeInSeconds: number
  output: string
  setOutput: (value: string) => void
  errorMessage: string | null
  errorLine: number | null
  pyodideRunStatus: PyodideRunStatus

  isBidirectional: boolean
  setIsBidirectional: (value: boolean) => void
}

const PyodideWorkerContext = createContext<
  PyodideWorkerContextType | undefined
>(undefined)
export const usePyodideWebWorker = () => {
  const context = useContext(PyodideWorkerContext)
  if (context === undefined) {
    throw new Error("useSelection must be used within a PyodideWorkerProvider")
  }
  return context
}

export const INIT_CODE = `from smanim import *
c = Circle()
canvas.add(c)
canvas.draw()
`
const WORKER_SCRIPT = "/scripts/pyodideWorker.js"
export const PyodideWorkerProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  // for complex graphics, using bidirectional editing with settrace is a 4x slowdown
  // isBidirectional must be here, not in App.tsx, since it affects python code execution
  const [isBidirectional, setIsBidirectional] = useState(false)

  const [pyodideLoadTimeInSeconds, setPyodideLoadTimeInSeconds] = useState(0)
  const [graphicRunTimeInSeconds, setGraphicRunTimeInSeconds] = useState(0)
  const code = useRef<string>(INIT_CODE)
  const [pyodideRunStatus, setPyodideRunStatus] =
    useState<PyodideRunStatus>("none")
  const [output, setOutput] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorLine, setErrorLine] = useState<number | null>(null)
  const [metadataMapStr, setMetadataMapStr] = useState("")
  const [svgContent, setSvgContent] = useState<any>(null)
  const worker = useRef(new Worker(WORKER_SCRIPT))

  const runPythonCodeInWorker = () => {
    // kill infinite loops or other programs that run for >13s
    const timeoutId = setTimeout(() => {
      worker.current.terminate()
      setPyodideRunStatus("timeout")
      worker.current = new Worker(WORKER_SCRIPT)
    }, 13000)
    setPyodideRunStatus("running")
    worker.current.postMessage({
      pythonCode: code.current,
      isBidirectional: isBidirectional,
    })

    worker.current.onmessage = (event) => {
      clearTimeout(timeoutId)

      if (event.data.status === "success") {
        setMetadataMapStr(event.data.metadataMapStr)
        setSvgContent(event.data.svgContent)
        setPyodideRunStatus("success")
        setOutput("")
        setErrorLine(null)
        setErrorMessage(null)
        setGraphicRunTimeInSeconds(event.data.runTimeInSeconds)
        if (event.data.loadTimeInSeconds !== null) {
          setPyodideLoadTimeInSeconds(event.data.loadTimeInSeconds)
        }
      } else if (event.data.status === "error") {
        const { customOutput, errorLine, errorMessage } =
          handlePythonRuntimeError(event.data.error)
        setOutput(customOutput)
        setErrorLine(errorLine)
        setErrorMessage(errorMessage)
        setPyodideRunStatus("error")
      }
    }

    worker.current.onerror = (error) => {
      console.error(`Error in web worker running pyodide: ${error.message}`)
    }
  }

  const handlePythonRuntimeError = (error: Error): ErrorInfoType => {
    let customOutput
    let errorLine = null
    let errorMessage = null
    if (error instanceof Error) {
      const pattern = /(.*\^){8,}/g
      const errorStr = error.message
      console.error(errorStr)
      const lineRegex = /File "<exec>", line (\d+)/
      const lineMatch = lineRegex.exec(errorStr)
      if (lineMatch) {
        errorLine = parseInt(lineMatch[1])
        errorMessage = errorStr
      } else {
        console.error("Could not find line match in error message")
      }

      let lastMatch
      let match

      while ((match = pattern.exec(errorStr)) !== null) {
        lastMatch = match
      }

      if (lastMatch !== undefined) {
        const endIndex = lastMatch.index + lastMatch[0].length
        customOutput = ""
        if (lineMatch && lineMatch.length === 2)
          customOutput += "An error occured on line " + lineMatch[1] + ":\n"
        customOutput += errorStr.substring(endIndex)
      } else {
        customOutput = error.message
      }
    } else {
      customOutput = String(error)
    }
    return { customOutput, errorLine, errorMessage }
  }
  useEffect(() => {
    return () => {
      console.error("Component should not unmount")
      worker.current.terminate()
    }
  }, [])

  return (
    <PyodideWorkerContext.Provider
      value={{
        code,
        runPythonCodeInWorker,
        metadataMapStr,
        svgContent,
        isBidirectional,
        setIsBidirectional,
        pyodideLoadTimeInSeconds,
        graphicRunTimeInSeconds,
        output,
        setOutput,
        errorMessage,
        errorLine,
        pyodideRunStatus,
      }}
    >
      {children}
    </PyodideWorkerContext.Provider>
  )
}
