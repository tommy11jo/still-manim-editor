const DEFAULT_FS_DIR = "/home/pyodide/media"

// micropip does not support local file system at the momement, which makes development difficult
const SMANIM_WHEEL =
  // "https://files.pythonhosted.org/packages/cc/84/6914e615a7c29a87f82bebc81139231ea59e1574bba3ca8fefb37914f15d/still_manim-0.1.1-py3-none-any.whl"
  "https://test-files.pythonhosted.org/packages/ff/3a/2e340d7a2330dbb489aa39c0a37b8a8c55a13dfc6c426bcd842ad8041f17/still_manim-1.0.9-py3-none-any.whl"

self.importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js")

async function loadPyodideAndPackages() {
  try {
    // Known non-breaking bug with pyodide and monaco: https://github.com/microsoft/monaco-editor/issues/4384
    // Ideally I'd like to show the code even if pyodide is still loading. So I'm waiting on this bug fix.
    // uses python 3.11 with pyodide version 0.25.1
    const startTime = performance.now()
    self.pyodide = await self.loadPyodide()
    await self.pyodide.loadPackage(["micropip"])

    const micropip = self.pyodide.pyimport("micropip")
    await micropip.install(SMANIM_WHEEL)
    self.pyodide.pyimport("smanim")
    const endTime = performance.now()
    const loadTimeInSeconds = (endTime - startTime) / 1000
    return loadTimeInSeconds
  } catch (error) {
    console.error("Failed to load Pyodide and run init python code:", error)
    return 0
  }
}

self.onmessage = async (event) => {
  let loadTimeInSeconds = null
  if (!self.pyodide) {
    loadTimeInSeconds = await loadPyodideAndPackages()
  }

  const { pythonCode, isBidirectional } = event.data
  try {
    const startTime = performance.now()
    // Clear global namespace except for built-in and imported modules
    // Note: "from smanim import *"" must now be included in the user's file to repeatedly bring the names into the current file's global namespace
    // Typical drawings take between 0.05 and 0.30s to render
    // also resets bidirectional global state
    // must reset CONFIG and canvas manually here
    self.pyodide.runPython(`
import sys
from smanim import reset_bidirectional, CONFIG, canvas
reset_bidirectional()
CONFIG.reset_config()
canvas.reset_canvas(CONFIG)


for name in list(globals()):
    if not name.startswith('__') and name not in sys.modules:
        del globals()[name]
    `)
    // since the __file__ var and the file lines are not accessible when running with pyodide, we need to manually set them
    // see that <exec> is the correct name by running:
    // print('name is', inspect.currentframe().f_code.co_filename)
    // encoding to base64 allows me to avoid breaking on quotes or triple quotes
    const utf8Encode = new TextEncoder()
    const curCodeEncoded = btoa(
      String.fromCharCode(...utf8Encode.encode(pythonCode))
    )

    self.pyodide.runPython(`
from smanim.bidirectional.custom_linecache import CustomLineCache
import base64
decoded_code = base64.b64decode("${curCodeEncoded}").decode("utf-8")
CustomLineCache.cache("<exec>", decoded_code)`)

    // setup the tracing of var assignments
    // https://stackoverflow.com/questions/55998616/how-to-trace-code-run-in-global-scope-using-sys-settrace
    let metadataMapStr
    if (isBidirectional) {
      self.pyodide.runPython(`
from smanim.bidirectional.bidirectional import global_trace_assignments, trace_assignments
sys._getframe().f_trace = global_trace_assignments
sys.settrace(trace_assignments)`)

      metadataMapStr = self.pyodide.runPython(pythonCode)
      self.pyodide.runPython(`
sys._getframe().f_trace = None
sys.settrace(None)
`)
    } else {
      metadataMapStr = self.pyodide.runPython(pythonCode)
    }
    const svgContent = self.pyodide.FS.readFile(`${DEFAULT_FS_DIR}/test0.svg`, {
      encoding: "utf8",
    })
    const endTime = performance.now()
    const runTimeInSeconds = (endTime - startTime) / 1000
    self.postMessage({
      type: "run",
      status: "success",
      runTimeInSeconds,
      loadTimeInSeconds,
      metadataMapStr,
      svgContent,
    })
  } catch (error) {
    self.postMessage({
      type: "run",
      status: "error",
      error: error,
    })
  }
}
