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

// used for selection
type Point = [number, number]

interface MobjectMetadata {
  //   points: Point[]
  parent: string
  type: "vmobject" | "text" | "group"
  id: string
  children: string[]
  classname: string
}

type MobjectMetadataMap = Record<string, MobjectMetadata>

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
  "https://test-files.pythonhosted.org/packages/84/a9/a072a7e8952979c52f79212cdd63502a679b0bef0123c3912a8f11a938f2/still_manim-0.7.4-py3-none-any.whl"

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
  const [isBidirectional, setIsBidirectional] = useState(true)

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

  const needsCanvasClickListener = useRef<boolean>(true)
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

        const metadata = runCurrentCode(code.current, loadedPyodide)
        attachSelectionListeners(metadata)
        setIsLoading(false)
        const endTime = performance.now()
        setLoadTimeInSeconds((endTime - startTime) / 1000)
      } catch (error) {
        console.error("Failed to load Pyodide and run init python code:", error)
      }
    }
    if (canvasRef !== null) loadAndRun()
  }, [canvasRef])

  const runCurrentCode = (
    curCode: string,
    pyodide: Pyodide | null
  ): MobjectMetadataMap => {
    if (!pyodide) {
      console.error("pyodide not loaded yet")
      return {}
    }
    if (!curCode) return {}
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
        return {}
      }
      const jsonResult = JSON.parse(result)
      const bbox = jsonResult["bbox"]
      const metadata: MobjectMetadataMap = jsonResult["metadata"] // contains all mobject bbox metadata
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

      return metadata
    } catch (error) {
      if (error instanceof Error) {
        const pattern = /(.*\^){8,}/g
        const errorStr = error.message
        console.error(errorStr)
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
      return {}
    }
  }

  //   const selectedMobjectIds = useRef<string[]>([])
  const selectedMobjectId = useRef<string | null>(null)
  const setupCanvasClickListener = (metadataMap: MobjectMetadataMap) => {
    const svgCanvas = document.getElementById(
      "smanim-canvas"
    ) as unknown as SVGSVGElement

    const trueBgRectId = metadataMap["bg_rect"].id
    const svgBgRect = document.getElementById(trueBgRectId)
    svgCanvas.addEventListener("click", (event) => {
      // clicks on empty areas or on background element
      if (event.target === event.currentTarget || event.target === svgBgRect) {
        event.preventDefault()
        resetFromPreviousSelection(null, metadataMap)
        const highlightedElements = document.querySelector("#smanim-highlights")
        if (highlightedElements) highlightedElements.remove()
        selectedMobjectId.current = null
      }
    })
  }
  const highlightSelectedElements = (
    svgElements: SVGGraphicsElement[],
    mobjectTypes: string[],
    mobjectClassnames: string[]
  ) => {
    const svgCanvas = document.getElementById(
      "smanim-canvas"
    ) as unknown as SVGSVGElement
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g")
    group.setAttribute("id", "smanim-highlights")
    // TODO: Fix inconsistency, padding should be applied to selection boxes generated by smanim, not just to boxes once they are selected
    const padding = 4

    for (let i = 0; i < svgElements.length; i++) {
      const svgElement = svgElements[i]
      const bbox = svgElement.getBBox()
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      )
      const newX = bbox.x - padding
      const newY = bbox.y - padding
      const newWidth = bbox.width + padding * 2
      const newHeight = bbox.height + padding * 2
      rect.setAttribute("x", newX.toString())
      rect.setAttribute("y", newY.toString())
      rect.setAttribute("width", newWidth.toString())
      rect.setAttribute("height", newHeight.toString())
      rect.setAttribute("fill", "none")
      rect.setAttribute("stroke", "blue")
      rect.setAttribute("stroke-width", "2")
      if (mobjectTypes[i] === "group") {
        rect.setAttribute("stroke-dasharray", "5,5")
      }
      group.appendChild(rect)

      const label = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      )
      label.setAttribute("x", `${newX + newWidth / 2}`)
      label.setAttribute("y", `${newY - 5}`)
      label.setAttribute("font-size", "14px")
      label.setAttribute("fill", "grey")
      label.setAttribute("text-anchor", "middle")
      label.textContent = mobjectClassnames[i]
      group.appendChild(label)
    }
    // Maybe TODO: ordering could be improved here
    svgCanvas.appendChild(group)
  }

  const resetFromPreviousSelection = (
    newMobjectId: string | null,
    mobjectMetadatas: MobjectMetadataMap
  ) => {
    const prevSelMobjectId = selectedMobjectId.current
    const resetLevelAndUp = (parentId: string) => {
      /* sets the default hoverability and clickability */
      if (parentId === "none") return
      // reset all direct children (except bg_rect) of the canvas root node to be clickable and hoverable, and the rest not to be
      for (const childId of mobjectMetadatas[parentId].children) {
        const childEl = document.getElementById(
          childId
        ) as unknown as SVGGraphicsElement
        if (parentId === "canvas" && childId !== "bg_rect") {
          // Understand pointer-events and svg painting at:
          // https://www.smashingmagazine.com/2018/05/svg-interaction-pointer-events-property/
          childEl.style.pointerEvents = "auto"
          childEl.classList.add("clickable")
        } else {
          childEl.style.pointerEvents = "none"
          childEl.classList.remove("clickable")
        }
      }
      const grandParentId = mobjectMetadatas[parentId].parent
      resetLevelAndUp(grandParentId)
    }
    if (prevSelMobjectId === null) {
      return
    }

    const removeChildInteractivity = (mobjectId: string) => {
      // the canvas is impossible to select, so this will never "undo" hoverability or clickability of top-level mobjects
      for (const childId of mobjectMetadatas[mobjectId].children) {
        const element = document.getElementById(
          childId
        ) as unknown as SVGGraphicsElement
        element.style.pointerEvents = "none"
        element.classList.remove("clickable")
      }
    }
    const prevSelMobjectData = mobjectMetadatas[prevSelMobjectId]
    if (newMobjectId === null) {
      resetLevelAndUp(prevSelMobjectData.parent)
      removeChildInteractivity(prevSelMobjectId)
    } else if (prevSelMobjectId === mobjectMetadatas[newMobjectId].parent) {
      // if the newly selected mobject is a child of the previously selected mobject
      removeChildInteractivity(prevSelMobjectId)
    } else if (
      prevSelMobjectData.parent === mobjectMetadatas[newMobjectId].parent
    ) {
      // if the newly selected mobject is a sibling of the previously selected mobject
      const element = document.getElementById(
        prevSelMobjectId
      ) as unknown as SVGGraphicsElement
      element.style.pointerEvents = "auto"
      element.classList.add("clickable")

      removeChildInteractivity(prevSelMobjectId)
    } else {
      // newly selected mobject is in a different branch of the canvas tree
      resetLevelAndUp(prevSelMobjectData.parent)
    }
  }
  const attachSelectionListeners = (metadataMap: MobjectMetadataMap) => {
    if (needsCanvasClickListener) {
      setupCanvasClickListener(metadataMap)
      needsCanvasClickListener.current = false
    }
    for (const [mobjectId, mobjectData] of Object.entries(metadataMap)) {
      if (mobjectId === "canvas" || mobjectId === "bg_rect") continue
      const element = document.getElementById(
        mobjectId
      ) as unknown as SVGGraphicsElement
      if (!element) {
        console.error(
          `Element with ID ${mobjectId} not found. It has data: ${JSON.stringify(
            mobjectData
          )}`
        )
        return
      }
      if (mobjectData.parent === "canvas") {
        element.classList.add("clickable")
        element.style.pointerEvents = "all"
      } else {
        element.style.pointerEvents = "none"
      }

      element.addEventListener("click", (event) => {
        if (selectedMobjectId.current === mobjectData.id) {
          return
        }

        // since this element is selected, set pointer events to none so children can be captured by clicks
        element.style.pointerEvents = "none"
        resetFromPreviousSelection(mobjectId, metadataMap)

        selectedMobjectId.current = mobjectId

        const highlightedElements = document.querySelector("#smanim-highlights")
        if (highlightedElements) highlightedElements.remove()
        highlightSelectedElements(
          [element],
          [mobjectData.type],
          [mobjectData.classname]
        )

        // siblings and children must become clickable and hoverable
        const activeMobjectIds = mobjectData.children
          .concat(metadataMap[mobjectData.parent].children)
          .filter((curId) => curId !== mobjectId)

        for (const activeMobjectId of activeMobjectIds) {
          const element = document.getElementById(
            activeMobjectId
          ) as unknown as SVGGraphicsElement

          element.classList.add("clickable")
          element.style.pointerEvents = "all"
        }
      })
    }
  }

  const triggerRedraw = useCallback(() => {
    // this fn attach listeners so mobjects can be selected
    if (canvasRef === null) return
    if (!isAutoRefreshing) {
      const metadata = runCurrentCode(code.current, pyodide)
      if (isBidirectional) {
        selectedMobjectId.current = null
        attachSelectionListeners(metadata)
      }
    } else {
      if (!redrawInitiated) {
        setRedrawInitiated(true)
        setTimeout(() => {
          const metadata = runCurrentCode(code.current, pyodide)
          if (redrawPending.current) {
            redrawPending.current = false
            setRedrawInitiated(false)
            triggerRedraw()
            if (isBidirectional) {
              selectedMobjectId.current = null
              attachSelectionListeners(metadata)
            }
          } else {
            setRedrawInitiated(false)
          }
        }, REFRESH_RATE)
      } else {
        redrawPending.current = true
      }
    }
  }, [
    canvasRef,
    isAutoRefreshing,
    code,
    isBidirectional,
    redrawInitiated,
    pyodide,
    runCurrentCode,
    attachSelectionListeners,
  ])

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
    const metadata = runCurrentCode(code.current, pyodide)
    if (isBidirectional) {
      selectedMobjectId.current = null
      needsCanvasClickListener.current = true
      attachSelectionListeners(metadata)
    }
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
    const metadata = runCurrentCode(code.current, pyodide)
    if (isBidirectional) {
      selectedMobjectId.current = null
      needsCanvasClickListener.current = true
      attachSelectionListeners(metadata)
    }
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
      <div className="flex items-start">
        <input
          type="checkbox"
          checked={isAutoRefreshing}
          onChange={() => setIsAutoRefreshing(!isAutoRefreshing)}
        />
        <label>Auto-Refresh</label>
        <div>
          <span className="muted-text">
            Or, press Command + Enter (mac) or Control + Enter (windows) to save
            and run{" "}
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
