import React, { useCallback, useEffect, useRef, useState } from "react"
import "./index.css"

import { MobjectMetadataMap } from "./types"
import {
  IDRAW_SELECTION_DEMO,
  LEMON_DEMO,
  SIN_AND_COS_DEMO,
  SMANIM_INTRO,
} from "./demos"

import { useSvgDownloader } from "./svgDownloader"
import { useSelection } from "./SelectionContext"

import CodeEditor from "./Editor"
import { INIT_CODE, usePyodideWebWorker } from "./PyodideWebWorkerContext"

const REFRESH_RATE = 300 // refresh every 300ms
const CODE_SAVE_RATE = 3000 // save every 3s

const DEMO_MAP = {
  smanim_intro: SMANIM_INTRO,
  lemon_logo: LEMON_DEMO,
  selection_demo: IDRAW_SELECTION_DEMO,
  sin_and_cos: SIN_AND_COS_DEMO,
}
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
  const { attachSelectionListeners, lineNumbersToHighlight } = useSelection()

  const {
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
    setErrorMessage,
    errorLine,
    setErrorLine,
    pyodideRunStatus,
  } = usePyodideWebWorker()

  const [isLoading, setIsLoading] = useState(false)
  const [canvasRef, setCanvasRef] = useState<HTMLDivElement | null>(null)
  const width = useRef(100)
  const height = useRef(100)

  const [waitingForExecution, setWaitingForExecution] = useState(false)
  const [title, setTitle] = useState("")
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const [codeSaved, setCodeSaved] = useState(true)

  const redrawInProgress = useRef(false)
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
      setWaitingForExecution(true)
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
    if (waitingForExecution) runPythonCodeInWorker()
  }, [waitingForExecution])
  useEffect(() => {
    if (pyodideRunStatus !== "none") {
      setIsLoading(false)
    }
  }, [pyodideRunStatus])
  useEffect(() => {
    const afterRunCompletion = (result: string) => {
      if (!result) {
        setOutput(
          "Make sure that canvas.draw() is the last line of the program."
        )
        return {}
      }
      const jsonResult = JSON.parse(result)
      const bbox = jsonResult["bbox"]
      const metadataMap: MobjectMetadataMap = jsonResult["metadata"]
      width.current = bbox[2]
      height.current = bbox[3]

      setOutput("")
      setErrorLine(null)
      setErrorMessage(null)

      canvasRef!.innerHTML = svgContent
      if (isBidirectional) {
        attachSelectionListeners(metadataMap)
      }
      return metadataMap
    }
    if (metadataMapStr) {
      afterRunCompletion(metadataMapStr)
    }
    // change of metadataMapStr indicates successful new run
  }, [metadataMapStr])

  const runPythonCodeInWorkerRef = useRef(runPythonCodeInWorker)
  runPythonCodeInWorkerRef.current = runPythonCodeInWorker
  // Use the most recent runPythonCodeInWorker function but don't allow it to trigger this effect
  useEffect(() => {
    if (isBidirectional) {
      runPythonCodeInWorkerRef.current()
    }
  }, [isBidirectional])

  const triggerRedraw = useCallback(() => {
    // this fn attach listeners so mobjects can be selected
    if (canvasRef === null) return
    if (!isAutoRefreshing) {
      runPythonCodeInWorker()
    } else {
      if (!redrawInProgress.current) {
        redrawInProgress.current = true
        setTimeout(() => {
          runPythonCodeInWorker()
          redrawInProgress.current = false
        }, REFRESH_RATE)
      }
    }
  }, [canvasRef, isAutoRefreshing, isBidirectional, runPythonCodeInWorker])

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
        setCodeSaved(true)
        setCodeSaveInProgress(false)
      }, CODE_SAVE_RATE)
    }
  }, [title, codeSaveInProgress, filenames])

  const openExistingFile = (title: string) => {
    setTitle(title)
    setCodeSaved(true)
    const blobId = nameToBlob[title]
    code.current = blobToContent[blobId]
    runPythonCodeInWorker()
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

  const generateNewFile = useCallback(
    (newTitle?: string, newCode?: string) => {
      saveCurrentOpenFile(title, code.current)
      if (newTitle) {
        const newName = nextAvailableFilename(filenames, newTitle)
        setTitle(newName)
      } else {
        const newName = nextAvailableFilename(filenames)
        setTitle(newName)
      }
      code.current = newCode ? newCode : INIT_CODE
      runPythonCodeInWorker()
    },
    [title, runPythonCodeInWorker]
  )
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
    if (svgContent !== null) downloadSvg(title, svgContent)
  }
  const handleDownloadPng = () => {
    if (svgContent !== null)
      downloadSvgAsPng(title, svgContent, width.current, height.current)
  }

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault()
        triggerRedraw()
        triggerCodeSave()
      }
    }

    window.addEventListener("keydown", handleSaveShortcut)

    return () => {
      window.removeEventListener("keydown", handleSaveShortcut)
    }
  }, [triggerRedraw, triggerCodeSave])

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
      <div>
        <div className="flex items-start">
          <div>
            <input
              type="checkbox"
              checked={isAutoRefreshing}
              onChange={() => setIsAutoRefreshing(!isAutoRefreshing)}
            />
            <label>Auto-Refresh</label>
          </div>

          <div>
            <span className="muted-text">
              Or, press Command + Enter (mac) or Control + Enter (windows) to
              save and run{" "}
            </span>
          </div>
          <input
            type="checkbox"
            checked={isBidirectional}
            onChange={() => setIsBidirectional(!isBidirectional)}
            style={{
              paddingLeft: "0.6rem",
            }}
          />
          <label>Bidirectional</label>
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
            {pyodideRunStatus !== "none" ? (
              <CodeEditor
                code={code}
                setCodeSaved={setCodeSaved}
                title={title}
                triggerRedraw={triggerRedraw}
                triggerCodeSave={triggerCodeSave}
                isAutoRefreshing={isAutoRefreshing}
                editorHeight={editorHeight}
                errorMessage={errorMessage}
                errorLine={errorLine}
                lineNumbersToHighlight={lineNumbersToHighlight}
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

        <div style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
          {canvasRef === null || (isLoading && <div>Loading...</div>)}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flex: 1,
              backgroundColor:
                pyodideRunStatus === "success"
                  ? "rgba(0, 128, 0, 0.1)"
                  : pyodideRunStatus === "error"
                  ? "rgba(255, 0, 0, 0.1)"
                  : "none",

              padding: "0.3rem",
              color: "black",
            }}
          >
            {canvasRef !== null && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <span>{codeSaved ? "Saved" : "Unsaved"}</span>
                <span>Status: {pyodideRunStatus}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              {pyodideLoadTimeInSeconds !== 0 && (
                <span className="muted-text">{`Pyodide Load Time: ${pyodideLoadTimeInSeconds.toFixed(
                  2
                )}s`}</span>
              )}
              {graphicRunTimeInSeconds !== 0 && (
                <span className="muted-text">{`Graphic Run Time: ${graphicRunTimeInSeconds.toFixed(
                  2
                )}s`}</span>
              )}
            </div>
          </div>

          <div ref={setCanvasRef}></div>
          {!isLoading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.3rem",
              }}
            >
              <span className="action-text" onClick={handleDownloadSvg}>
                Download SVG
              </span>
              <span className="action-text" onClick={handleDownloadPng}>
                Download PNG
              </span>
              <span className="muted-text">
                Notes:
                <ul>
                  <li>
                    Use canvas.draw(crop=False, ignore_bg=True) to crop to size
                    and ignore the background
                  </li>
                  <li>
                    Hold Command + Click to select multiple mobjects at once on
                    mac. Or Ctrl + Click for windows.
                  </li>
                  <li>
                    All files are stored in local storage. If you reset your
                    cookies, your files will be lost.
                  </li>
                </ul>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default App
