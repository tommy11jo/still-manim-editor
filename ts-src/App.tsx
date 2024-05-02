import React, { useCallback, useEffect, useRef, useState } from "react"
import "./index.css"
import { useSvgDownloader } from "./svgDownloader"
import { DIJKSTRA_DEMO, LEMON_DEMO, SIN_AND_COS_DEMO } from "./demos"
import CodeEditor from "./Editor"
declare global {
  interface Window {
    loadPyodide: Function
    textMeasureCtx: CanvasRenderingContext2D
    sendTextForMeasurement: Function
  }
}

interface Pyodide {
  loadPackage: (packages: string[] | string) => Promise<void>
  runPython: (code: string, options?: Record<string, any>) => any
  unpackArchive: Function
  pyimport: Function
  setDebug: Function
  FS: any
  globals: Record<string, any>
}
const REFRESH_RATE = 300 // refresh every 300ms
const CODE_SAVE_RATE = 3000 // save every 3s

const INIT_CODE = `from smanim import *
c = Circle()
canvas.add(c)
canvas.draw()
`

const DEMO_MAP = {
  lemon_logo: LEMON_DEMO,
  sin_and_cos: SIN_AND_COS_DEMO,
  dijkstras: DIJKSTRA_DEMO,
}
const DEFAULT_FS_DIR = "/home/pyodide/media"
const SMANIM_WHEEL =
  "https://test-files.pythonhosted.org/packages/94/df/53a4cb8f9b3c355ddb3e1d405fc94b933fa4c01a82b3cfe057123b35c170/still_manim-0.5.6-py3-none-any.whl"

function randId(): string {
  const length = 10
  let result = ""
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const charactersLength = characters.length
  let counter = 0
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
    counter += 1
  }
  return result
}
const App = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [loadTimeInSeconds, setLoadTimeInSeconds] = useState(0)
  const [canvasRef, setCanvasRef] = useState<HTMLDivElement | null>(null)
  const width = useRef(100)
  const height = useRef(100)

  const [pyodide, setPyodide] = useState<Pyodide | null>(null)
  const [output, setOutput] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorLine, setErrorLine] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const code = useRef<string>(INIT_CODE)

  const [redrawInitiated, setRedrawInitiated] = useState(false)
  const redrawPending = useRef(false)
  const [codeSaveInProgress, setCodeSaveInProgress] = useState(false)

  // invariants: if name exists in filenames, then name exists as key in nameToBlob
  // if blob id exists as value in nameToBlob, then blob id exists as key in blobToContent
  const [filenames, setFilenames] = useState<string[]>([])
  const [nameToBlob, setNameToBlob] = useState<Record<string, string>>({})
  const [blobToContent, setBlobToContent] = useState<Record<string, string>>({})

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const { downloadSvg, downloadSvgAsPng } = useSvgDownloader()
  // hard reset used for testing
  // localStorage.clear()
  // keep local storage in sync with state vars for managinng filenames, blob ids, and file content
  useEffect(() => {
    const curFilenamesStr = localStorage.getItem("filenames")
    const curNameToBlobStr = localStorage.getItem("nameToBlob")
    const curBlobToContentStr = localStorage.getItem("blobToContent")
    let curTitle
    let curNameToBlob
    if (!curFilenamesStr) {
      localStorage.setItem("filenames", JSON.stringify([]))
    } else {
      const filenamesList = JSON.parse(curFilenamesStr)
      setFilenames(filenamesList)
      if (filenamesList.length > 0) {
        curTitle = filenamesList[filenamesList.length - 1]
        setTitle(curTitle)
      }
    }

    if (!curNameToBlobStr) {
      localStorage.setItem("nameToBlob", JSON.stringify({}))
    } else {
      curNameToBlob = JSON.parse(curNameToBlobStr)
      setNameToBlob(curNameToBlob)
    }

    if (!curBlobToContentStr) {
      localStorage.setItem("blobToContent", JSON.stringify({}))
    } else {
      const curBlobToContent = JSON.parse(curBlobToContentStr)
      setBlobToContent(curBlobToContent)
      if (curTitle === undefined || curNameToBlob == undefined) return
      const blobId = curNameToBlob[curTitle]
      code.current = curBlobToContent[blobId]
    }
    // invariant: title is guaranteed to be updated within 3 seconds of mounting, so the first save will use the updated title
  }, [])
  useEffect(() => {
    localStorage.setItem("filenames", JSON.stringify(filenames))
  }, [filenames])

  useEffect(() => {
    localStorage.setItem("nameToBlob", JSON.stringify(nameToBlob))
  }, [nameToBlob])

  useEffect(() => {
    localStorage.setItem("blobToContent", JSON.stringify(blobToContent))
  }, [blobToContent])

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
      setIsLoading(true)
      const startTime = performance.now()

      try {
        // Known non-breaking bug with pyodide and monaco: https://github.com/microsoft/monaco-editor/issues/4384
        // Ideally I'd like to show the code even if pyodide is still loading. So I'm waiting on this bug fix.
        const loadedPyodide = (await window.loadPyodide()) as Pyodide
        await loadedPyodide.loadPackage(["micropip"])

        const micropip = loadedPyodide.pyimport("micropip")
        await micropip.install(SMANIM_WHEEL)
        loadedPyodide.pyimport("smanim")
        setPyodide(loadedPyodide)

        await runCurrentCode(code.current, loadedPyodide)
        setIsLoading(false)
        const endTime = performance.now()
        setLoadTimeInSeconds((endTime - startTime) / 1000)
      } catch (error) {
        console.error("Failed to load Pyodide and run init python code:", error)
      }
    }
    if (canvasRef !== null) loadAndRun()
  }, [canvasRef])

  const runCurrentCode = async (curCode: string, pyodide: Pyodide | null) => {
    if (!pyodide) {
      console.error("pyodide not loaded yet")
      return
    }
    if (!curCode) return
    try {
      // Clear global namespace except for built-in and imported modules
      // Note: "from smanim import *"" must now be included in the user's file to repeatedly bring the names into the current file's global namespace
      // Typical drawings take between 0.05 and 0.30s to render
      // const startTime = performance.now()
      // also resets bidirectional global state
      pyodide.runPython(`
import sys
from smanim.bidirectional.bidirectional import reset_bidirectional
reset_bidirectional()
for name in list(globals()):
    if not name.startswith('__') and name not in sys.modules:
        print(name)
        del globals()[name]
    `)
      // since the __file__ var and the file lines are not accessible when running with pyodide, we need to manually set them
      // assumes the python code doesn't use triple quotes anywhere (yikes)
      // see that <exec> is the correct name by running:
      // print('name is', inspect.currentframe().f_code.co_filename)
      pyodide.runPython(`
from smanim.bidirectional.custom_linecache import CustomLineCache
CustomLineCache.cache("<exec>", """${curCode}""")`)

      // setup the tracing of var assignments
      // https://stackoverflow.com/questions/55998616/how-to-trace-code-run-in-global-scope-using-sys-settrace
      pyodide.runPython(`
from smanim.bidirectional.bidirectional import global_trace_assignments, trace_assignments
sys._getframe().f_trace = global_trace_assignments
sys.settrace(trace_assignments)`)

      const result = pyodide.runPython(curCode)
      pyodide.runPython(`
sys._getframe().f_trace = None
sys.settrace(None)
`)
      // const endTime = performance.now()
      // console.log("python code run time:", (endTime - startTime) / 1000)

      if (!result) {
        setOutput(
          "Make sure that canvas.draw() is the last line of the program."
        )
        return
      }
      const bbox = JSON.parse(result)
      width.current = bbox[2]
      height.current = bbox[3]

      setOutput("")
      setErrorLine(null)
      setErrorMessage(null)
      const svgContent = pyodide.FS.readFile(`${DEFAULT_FS_DIR}/test0.svg`, {
        encoding: "utf8",
      })
      // TODO: If I make shareable urls, I need to render svgs as image bitmap, not as interactive svg for security reasons
      canvasRef!.innerHTML = svgContent
    } catch (error) {
      if (error instanceof Error) {
        const pattern = /(.*\^){8,}/g
        const errorStr = error.message
        const lineRegex = /File "<exec>", line (\d+)/ // Regular expression to find "line number"
        const lineMatch = lineRegex.exec(errorStr)
        if (lineMatch) {
          setErrorLine(parseInt(lineMatch[1]))
          setErrorMessage(errorStr)
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
          let customOutput = ""
          if (lineMatch && lineMatch.length === 2)
            customOutput += "An error occured on line " + lineMatch[1] + ":\n"
          customOutput += errorStr.substring(endIndex)
          setOutput(customOutput)
        } else {
          setOutput(error.message)
        }
      } else {
        setOutput(String(error))
      }
    }
  }

  const triggerRedraw = useCallback(() => {
    if (canvasRef === null) return
    if (!redrawInitiated) {
      setRedrawInitiated(true)
      setTimeout(() => {
        runCurrentCode(code.current, pyodide)
        if (redrawPending.current) {
          redrawPending.current = false
          setRedrawInitiated(false)
          triggerRedraw()
        } else {
          setRedrawInitiated(false)
        }
      }, REFRESH_RATE)
    } else {
      redrawPending.current = true
    }
  }, [redrawInitiated, pyodide, canvasRef])

  const triggerCodeSave = useCallback(() => {
    if (!codeSaveInProgress) {
      setCodeSaveInProgress(true)
      if (title === "") {
        console.error("Cannot save a file with an empty string title")
        return
      }
      setTimeout(() => {
        if (!filenames.includes(title)) {
          const newBlobId = randId()
          setFilenames((filenames) => [...filenames, title])
          setNameToBlob((nameToBlob) => ({ ...nameToBlob, [title]: newBlobId }))
          setBlobToContent((blobToContent) => ({
            ...blobToContent,
            [newBlobId]: code.current,
          }))
        } else {
          const blobId = nameToBlob[title]
          setBlobToContent((blobToContent) => ({
            ...blobToContent,
            [blobId]: code.current,
          }))
        }
        // ensure most recently used file is listed first
        if (filenames[filenames.length - 1] !== title) {
          const newFilenames = filenames.filter((fname) => fname !== title)
          newFilenames.push(title)
          setFilenames(newFilenames)
        }
        setCodeSaveInProgress(false)
      }, CODE_SAVE_RATE)
    }
  }, [title, codeSaveInProgress, filenames])

  const openExistingFile = (title: string) => {
    if (!pyodide) return
    setTitle(title)
    const blobId = nameToBlob[title]
    code.current = blobToContent[blobId]
    runCurrentCode(code.current, pyodide)
  }

  const handleKeyDownTitle = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  const updateTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const oldTitle = title
    const oldContent = nameToBlob[oldTitle]
    const newTitle = event.target.value
    setTitle(newTitle)
    setFilenames(
      filenames.map((fname) => (fname == oldTitle ? newTitle : fname))
    )

    setNameToBlob((nameToBlob) => ({ ...nameToBlob, [newTitle]: oldContent }))
  }

  const nextAvailableFilename = (
    filenamesList: string[],
    prefix: string = "test"
  ): string => {
    let curIndex = 0
    let newName = prefix + curIndex.toString()
    while (filenamesList.includes(newName)) {
      curIndex += 1
      newName = prefix + curIndex.toString()
    }
    return newName
  }
  const saveCurrentOpenFile = (title: string, codeStr: string) => {
    const currentBlob = nameToBlob[title]
    blobToContent[currentBlob] = codeStr
    localStorage.setItem("blobToContent", JSON.stringify(blobToContent))
  }

  const generateNewFile = (newTitle?: string, newCode?: string) => {
    saveCurrentOpenFile(title, code.current)
    if (newTitle) {
      const newName = nextAvailableFilename(filenames, newTitle)
      setTitle(newName)
    } else {
      const newName = nextAvailableFilename(filenames)
      setTitle(newName)
    }
    code.current = newCode ? newCode : INIT_CODE
    runCurrentCode(code.current, pyodide)
  }
  const deleteCurrentFile = () => {
    setFilenames((filenames) => filenames.filter((fname) => fname !== title))
    const blobId = nameToBlob[title]
    setNameToBlob((current) => {
      const copy = { ...current }
      delete copy[title]
      return copy
    })
    setBlobToContent((current) => {
      const copy = { ...current }
      delete current[blobId]
      return copy
    })
    const newName = nextAvailableFilename(filenames)
    setTitle(newName)
    code.current = ""
  }

  const handleDownloadSvg = () => {
    if (!pyodide) return
    const svgContent = pyodide.FS.readFile(`${DEFAULT_FS_DIR}/test0.svg`, {
      encoding: "utf8",
    })
    downloadSvg(title, svgContent)
  }
  const handleDownloadPng = () => {
    if (!pyodide) return
    const svgContent = pyodide.FS.readFile(`${DEFAULT_FS_DIR}/test0.svg`, {
      encoding: "utf8",
    })
    downloadSvgAsPng(title, svgContent, width.current, height.current)
  }

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "r") {
        event.preventDefault()
        triggerRedraw()
        triggerCodeSave()
      }
    }

    window.addEventListener("keydown", handleSaveShortcut)

    return () => {
      window.removeEventListener("keydown", handleSaveShortcut)
    }
    // add all vars from triggerRedraw() and triggerCodeSave() and their descendents to deps array
  }, [
    title,
    codeSaveInProgress,
    filenames,
    redrawInitiated,
    pyodide,
    canvasRef,
  ])
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
      <div
        className="muted-text"
        style={{
          display: "flex",
          gap: "0.8rem",
        }}
      >
        <span className="muted-text">Previous Diagrams:</span>

        <ul
          style={{
            listStyleType: "none",
            display: "flex",
            padding: 0,
            margin: 0,
          }}
        >
          {filenames
            .slice()
            .reverse()
            .map((fname, ind) => (
              <li
                key={ind}
                className="action-text"
                style={{ padding: 0, paddingRight: "1rem", margin: 0 }}
                onClick={() => {
                  openExistingFile(fname)
                }}
              >
                {fname}
              </li>
            ))}
        </ul>
      </div>
      <div
        style={{
          display: "flex",
          paddingBottom: "1rem",
          gap: "0.8rem",
        }}
      >
        <span className="muted-text">Example Diagrams:</span>
        <ul
          style={{
            listStyleType: "none",
            display: "flex",
            padding: 0,
            margin: 0,
          }}
        >
          {Object.entries(DEMO_MAP).map(([fname, codeStr], ind) => (
            <li
              key={ind}
              className="action-text"
              style={{ padding: 0, paddingRight: "1rem", margin: 0 }}
              onClick={() => {
                generateNewFile(fname, codeStr)
              }}
            >
              {fname}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-start">
        <input
          type="checkbox"
          checked={isAutoRefreshing}
          onChange={() => setIsAutoRefreshing(!isAutoRefreshing)}
        />
        <label>Auto-Refresh</label>
        <div>
          <span className="muted-text">
            Or, press Cmd + R (mac) or Control + R (windows) to save and run{" "}
          </span>
        </div>
      </div>

      <div className="split-layout" style={{ display: "flex", width: "100%" }}>
        <div style={{ flex: 1, height: "100%" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "0.2rem",
              border: "2px solid #f5f5f5",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.4rem",
              }}
            >
              <div>
                <span className="muted-text">File Name: </span>
                <input
                  value={title}
                  onChange={updateTitle}
                  onKeyDown={handleKeyDownTitle}
                  style={{
                    fontSize: "18px",
                  }}
                />
              </div>

              <div>
                <span
                  onClick={() => generateNewFile()}
                  className="action-text"
                  style={{ paddingRight: "2rem" }}
                >
                  New File
                </span>
                <span
                  onClick={() => {
                    setDeleteModalOpen(true)
                  }}
                  className="action-text"
                >
                  Delete File
                </span>
              </div>
            </div>
          </div>
          {deleteModalOpen && (
            <div className="modal-container">
              <div className="modal-content">
                <p>{`Are you sure you want to delete the file "${title}"?`}</p>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "center",
                  }}
                >
                  <span
                    className="action-text"
                    onClick={() => {
                      deleteCurrentFile()
                      setDeleteModalOpen(false)
                    }}
                  >
                    Yes
                  </span>
                  <span
                    className="action-text"
                    onClick={() => {
                      setDeleteModalOpen(false)
                    }}
                  >
                    No
                  </span>
                </div>
              </div>
            </div>
          )}
          <div
            style={{
              flex: "1 1 0%",
              overflow: "auto",
              maxWidth: "100%",
            }}
          >
            {pyodide ? (
              <CodeEditor
                code={code}
                title={title}
                triggerRedraw={triggerRedraw}
                triggerCodeSave={triggerCodeSave}
                isAutoRefreshing={isAutoRefreshing}
                editorHeight={editorHeight}
                errorMessage={errorMessage}
                errorLine={errorLine}
              />
            ) : (
              "Loading..."
            )}
          </div>
          <div
            className="whitespace-pre-wrap break-words"
            style={{
              height: "10rem",
              maxHeight: "10rem",
              border: "2px solid #f5f5f5",
              overflowY: "auto",
            }}
          >
            <div>Console:</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{output}</div>
          </div>
        </div>
        <div style={{ flex: 1, backgroundColor: "#f5f5f5", padding: "0.3rem" }}>
          {canvasRef === null || (isLoading && <div>Loading...</div>)}
          {loadTimeInSeconds !== 0 && (
            <span
              className="muted-text"
              style={{
                display: "flex",
                justifyContent: "flex-end",
              }}
            >{`Pyodide Load Time: ${loadTimeInSeconds.toFixed(2)}s`}</span>
          )}
          <div ref={setCanvasRef}></div>
          {!isLoading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <span className="action-text" onClick={handleDownloadSvg}>
                Download SVG
              </span>
              <span className="action-text" onClick={handleDownloadPng}>
                Download PNG
              </span>
              <span className="muted-text">
                Note: Use canvas.draw(crop=False, ignore_bg=True) to crop to
                size and ignore the background
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default App
