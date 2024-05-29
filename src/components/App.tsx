import React, { useCallback, useEffect, useRef, useState } from "react"

import "../../public/index.css"

import {
  GRAPH_DEMO,
  IDRAW_SELECTION_DEMO,
  LEMON_DEMO,
  SIN_AND_COS_DEMO,
  SMANIM_INTRO,
} from "../utils/demos"

import { useSvgDownloader } from "../utils/svgDownloader"
import { useSelection } from "../contexts/SelectionContext"

import CodeEditor from "./Editor"
import { INIT_CODE, usePyodideWebWorker } from "../contexts/PyodideContext"
import { debounce } from "lodash"
import ChatBox from "./Chat"
import { generateCode } from "../utils/prompting/generateCode"

const REFRESH_RATE_IN_MS = 300
const CODE_SAVE_RATE_IN_MS = 3000

const DEMO_MAP = {
  language_command: IDRAW_SELECTION_DEMO,
  graph_demo: GRAPH_DEMO,
  smanim_intro: SMANIM_INTRO,
  lemon_logo: LEMON_DEMO,
  sin_and_cos: SIN_AND_COS_DEMO,
}
function randId(length: number = 10): string {
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
  const {
    attachSelectionListeners,
    lineNumbersToHighlight,
    selectedMobjectIds,
  } = useSelection()

  const {
    code,
    runPythonCodeInWorker,
    mobjectMetadataMap,
    svgContent,
    isBidirectional,
    setIsBidirectional,
    pyodideLoadTimeInSeconds,
    graphicRunTimeInSeconds,
    width,
    height,
    output,
    errorMessage,
    errorLine,
    pyodideRunStatus,
    pyodideLoaded,
  } = usePyodideWebWorker()

  const { downloadSvg, downloadSvgAsPng } = useSvgDownloader()

  const [isLoading, setIsLoading] = useState(false)
  const [canvasRef, setCanvasRef] = useState<HTMLDivElement | null>(null)

  const [waitingForExecution, setWaitingForExecution] = useState(false)
  const [title, setTitle] = useState("")
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const [codeSaved, setCodeSaved] = useState(true)

  const redrawInProgress = useRef(false)

  // invariants: if name exists in filenames, then name exists as key in nameToBlob
  // if blob id exists as value in nameToBlob, then blob id exists as key in blobToContent
  const [filenames, setFilenames] = useState<string[]>([])
  const [nameToBlob, setNameToBlob] = useState<Record<string, string>>({})
  const [blobToContent, setBlobToContent] = useState<Record<string, string>>({})

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isMac, setIsMac] = useState(false)

  const [apiKey, setApiKey] = useState("")
  const [overridingContent, setOverridingContent] = useState("")
  const [requiresUndoAndRefresh, setRequiresUndoAndRefresh] = useState(false)

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsMac(userAgent.indexOf("mac") !== -1)
  }, [])

  // clear cookies to reset storage for testing
  // keep local storage in sync with state vars for managinng filenames, blob ids, and file content
  useEffect(() => {
    const curFilenamesStr = localStorage.getItem("filenames")
    const curNameToBlobStr = localStorage.getItem("nameToBlob")
    const curBlobToContentStr = localStorage.getItem("blobToContent")

    let curTitle: string | undefined
    let blobId: string | undefined
    if (!curFilenamesStr) {
      localStorage.setItem("filenames", JSON.stringify([]))
    } else {
      try {
        const filenamesList = JSON.parse(curFilenamesStr)
        setFilenames(filenamesList)
        if (filenamesList.length >= 1) {
          const fname = filenamesList[filenamesList.length - 1]
          curTitle = fname
          setTitle(fname)
        } else {
          const newTitle = nextAvailableFilename([])
          setTitle(newTitle)
        }
      } catch {
        throw Error("Error parsing filenames list and setting title")
      }
    }

    if (!curNameToBlobStr) {
      localStorage.setItem("nameToBlob", JSON.stringify({}))
    } else {
      try {
        const curNameToBlob = JSON.parse(curNameToBlobStr)
        setNameToBlob(curNameToBlob)
        if (curTitle !== undefined) blobId = curNameToBlob[curTitle]
      } catch {
        throw Error("Error parsing name to blob id string dict")
      }
    }

    if (!curBlobToContentStr) {
      localStorage.setItem("blobToContent", JSON.stringify({}))
    } else {
      try {
        const curBlobToContent = JSON.parse(curBlobToContentStr)
        setBlobToContent(curBlobToContent)
        if (blobId !== undefined) code.current = curBlobToContent[blobId]
      } catch {
        throw Error("Error parsing name to blob id to content string dict")
      }
    }

    setWaitingForExecution(true)
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
    if (waitingForExecution) {
      if (title === "") {
        const newTitle = nextAvailableFilename([])
        setTitle(newTitle)
        // triggers rereun with new title
      } else {
        runPythonCodeInWorker()
        setWaitingForExecution(false)
      }
    }
  }, [waitingForExecution, title, runPythonCodeInWorker])

  useEffect(() => {
    if (pyodideRunStatus !== "none") {
      setIsLoading(false)
    }
  }, [pyodideRunStatus])

  // effects after python run completion
  useEffect(() => {
    const afterRunCompletion = () => {
      canvasRef!.innerHTML = svgContent

      if (mobjectMetadataMap && isBidirectional) {
        attachSelectionListeners(mobjectMetadataMap)
      }
    }
    if (canvasRef !== null && mobjectMetadataMap !== null) {
      afterRunCompletion()
    }
  }, [canvasRef, mobjectMetadataMap, svgContent])

  const runPythonCodeInWorkerRef = useRef(runPythonCodeInWorker)
  runPythonCodeInWorkerRef.current = runPythonCodeInWorker
  // Use the most recent runPythonCodeInWorker function but don't allow it to trigger this effect
  useEffect(() => {
    if (
      canvasRef !== null &&
      pyodideRunStatus !== "running" &&
      pyodideRunStatus !== "none" &&
      isBidirectional
    ) {
      runPythonCodeInWorkerRef.current()
    }
  }, [canvasRef, isBidirectional])

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
        }, REFRESH_RATE_IN_MS)
      }
    }
  }, [canvasRef, isAutoRefreshing, isBidirectional, runPythonCodeInWorker])

  const triggerCodeSave = useCallback(
    debounce(
      () => {
        if (title === "") {
          console.error("Cannot save a file with an empty string title")
          return
        }
        if (!filenames.includes(title)) {
          const newBlobId = randId()
          setFilenames((filenames) => [...filenames, title])
          setNameToBlob((nameToBlob) => ({
            ...nameToBlob,
            [title]: newBlobId,
          }))
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
      },
      CODE_SAVE_RATE_IN_MS,
      { leading: true, trailing: true }
    ),
    [title, filenames, nameToBlob, blobToContent]
  )

  const openExistingFile = useCallback(
    (title: string) => {
      setTitle(title)
      setCodeSaved(true)
      const blobId = nameToBlob[title]
      code.current = blobToContent[blobId]
      if (pyodideLoaded) runPythonCodeInWorker()
    },
    [pyodideLoaded, nameToBlob, blobToContent, runPythonCodeInWorker]
  )

  const [tempTitle, setTempTitle] = useState("")
  useEffect(() => {
    setTempTitle(title)
  }, [title])
  const saveTitle = useCallback(
    (newTitle: string) => {
      if (filenames.includes(newTitle)) {
        setTempTitle(title)
        return
      }
      const oldTitle = title
      const oldBlob = nameToBlob[oldTitle]
      setTitle(newTitle)
      setFilenames(
        filenames.map((fname) => (fname == oldTitle ? newTitle : fname))
      )
      const newNameToBlob = { ...nameToBlob, [newTitle]: oldBlob }
      delete newNameToBlob[oldTitle]
      setNameToBlob(newNameToBlob)
    },
    [filenames, title, nameToBlob, blobToContent]
  )
  const handleKeyDownTitle = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        saveTitle(tempTitle)
        event.preventDefault()
        event.currentTarget.blur()
      }
    },
    [tempTitle]
  )

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

  const generateNewFile = useCallback(
    (newTitle?: string, newCode?: string) => {
      if (newTitle) {
        const newName = nextAvailableFilename(filenames, newTitle)
        setTitle(newName)
      } else {
        const newName = nextAvailableFilename(filenames)
        setTitle(newName)
      }
      code.current = newCode ? newCode : INIT_CODE

      if (pyodideLoaded) runPythonCodeInWorker()
    },
    [pyodideLoaded, title, runPythonCodeInWorker]
  )

  const deleteCurrentFile = useCallback(() => {
    setFilenames(filenames.filter((fname) => fname !== title))

    const blobId = nameToBlob[title]
    const newNameToBlob = { ...nameToBlob }
    delete newNameToBlob[title]
    setNameToBlob(newNameToBlob)

    const newBlobToContent = { ...blobToContent }
    delete newBlobToContent[blobId]
    setBlobToContent(newBlobToContent)

    generateNewFile()
  }, [filenames, nameToBlob, blobToContent, title, generateNewFile])

  const handleDownloadSvg = () => {
    if (svgContent !== null) downloadSvg(title, svgContent)
  }

  const handleDownloadPng = (scalar: number) => {
    if (svgContent !== null)
      downloadSvgAsPng(title, svgContent, width.current, height.current, scalar)
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

  const sendLanguageCommand = async (
    command: string,
    setLoading: (value: boolean) => void
  ) => {
    setLoading(true)
    const updatedCode = await generateCode(
      command,
      code.current,
      apiKey,
      selectedMobjectIds.current,
      mobjectMetadataMap
    )
    if (updatedCode) {
      code.current = updatedCode
      setOverridingContent(code.current)
    }
    triggerRedraw()
    triggerCodeSave()
    setLoading(false)
  }
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
          Still Manim Editor
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <span>
            <a
              href="https://smanim-docs.vercel.app"
              className="action-text"
              target="_blank"
            >
              Documentation
            </a>
          </span>
          <a
            href="https://github.com/tommy11jo/still-manim-editor"
            className="action-text"
            target="_blank"
          >
            Github
          </a>
        </div>
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

          <input
            type="checkbox"
            checked={isBidirectional}
            onChange={() => setIsBidirectional(!isBidirectional)}
            style={{
              paddingLeft: "0.6rem",
            }}
          />
          <label>Bidirectional</label>
          <div>
            <span className="muted-text">
              Press {isMac ? "Command" : "Control"} + Enter to save and run{" "}
            </span>
          </div>
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
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={handleKeyDownTitle}
                  className={
                    tempTitle !== title
                      ? filenames.includes(tempTitle)
                        ? "input-focus-outline-red"
                        : "input-focus-outline-green"
                      : ""
                  }
                  style={{
                    fontSize: "18px",
                  }}
                />
                {tempTitle !== title && !filenames.includes(tempTitle) && (
                  <span>
                    <span
                      className="action-text"
                      style={{ marginLeft: "0.5rem" }}
                      onClick={() => saveTitle(tempTitle)}
                    >
                      Save
                    </span>
                    <span
                      className="action-text"
                      style={{ marginLeft: "0.5rem" }}
                      onClick={() => setTempTitle(title)}
                    >
                      Cancel
                    </span>
                  </span>
                )}
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
                overridingContent={overridingContent}
                setOverridingContent={setOverridingContent}
                requiresUndoAndRefresh={requiresUndoAndRefresh}
                setRequiresUndoAndRefresh={setRequiresUndoAndRefresh}
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
          <span className="muted-text">
            Notes:
            <ul>
              <li>
                Use canvas.draw(crop=False, ignore_bg=True) to crop to size and
                ignore the background
              </li>
              <li>
                Hold Command + Click to select multiple mobjects at once on mac.
                Or Ctrl + Click for windows.
              </li>
              <li>
                All files are stored in local storage. If you reset your
                cookies, your files will be lost.
              </li>
            </ul>
          </span>
        </div>

        <div style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
          {canvasRef === null || (isLoading && <div>Loading...</div>)}
          <ChatBox
            handleSend={sendLanguageCommand}
            apiKey={apiKey}
            setApiKey={setApiKey}
            setRequiresUndoAndRefresh={setRequiresUndoAndRefresh}
            output={output}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flex: 1,
              backgroundColor:
                pyodideRunStatus === "success"
                  ? "rgba(0, 128, 0, 0.2)"
                  : pyodideRunStatus === "error" ||
                    pyodideRunStatus === "timeout"
                  ? "rgba(255, 0, 0, 0.2)"
                  : pyodideRunStatus === "running" ||
                    pyodideRunStatus === "none"
                  ? "rgba(255, 255, 0, 0.2)"
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
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                }}
              >
                <span>Download PNG: </span>
                <span
                  className="action-text"
                  onClick={() => handleDownloadPng(1)}
                >
                  1x
                </span>
                <span
                  className="action-text"
                  onClick={() => handleDownloadPng(2)}
                >
                  2x
                </span>

                <span
                  className="action-text"
                  onClick={() => handleDownloadPng(4)}
                >
                  4x
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default App
