import Editor, { useMonaco } from "@monaco-editor/react"
import React, { useEffect, useRef } from "react"

type EditorProps = {
  code: React.MutableRefObject<string>
  title: string
  triggerRedraw: Function
  triggerCodeSave: Function
  editorHeight: string
  errorMessage?: string | null
  errorLine?: number | null
}
// const PUBLIC_LSP_PATH =
//   "../../node_modules/@typefox/pyright-browser/dist/pyright.worker.js"

// Known Bug in Monaco when resizing in chrome or edge: https://github.com/microsoft/monaco-editor/issues/4311
const CodeEditor: React.FC<EditorProps> = React.forwardRef(
  (
    {
      code,
      title,
      triggerRedraw,
      triggerCodeSave,
      editorHeight,
      errorMessage,
      errorLine,
    },
    ref
  ) => {
    const monaco = useMonaco()
    const editorRef = useRef<any>(null)

    const handleEditorDidMount = (editor: any) => {
      editorRef.current = editor
    }

    const isSwitchingFiles = useRef(false)
    // handle changing files by looking for title change and updating editor code value, which triggers onChange()
    useEffect(() => {
      if (editorRef.current) {
        isSwitchingFiles.current = true
        editorRef.current.setValue(code.current)
      }
    }, [title])

    const workerRef = useRef<Worker | null>(null)

    useEffect(() => {
      if (monaco) {
        // Setup Pyright LSP
        //   workerRef.current = new Worker(PUBLIC_LSP_PATH)
        //   workerRef.current.postMessage({
        // type: "browser/boot",
        // mode: "foreground",
        //   })

        // Additional message handling between Monaco and worker
        // Example: workerRef.current.onmessage = ...

        monaco.editor.defineTheme("customTheme", {
          base: "vs",
          inherit: true,
          rules: [],
          colors: {
            "editorError.foreground": "#FF0000",
          },
        })
        monaco.editor.setTheme("customTheme")
      }

      return () => {
        // Clean up the worker when the component is unmounted
        workerRef.current?.terminate()
      }
    }, [monaco])

    useEffect(() => {
      if (!monaco || !errorMessage || !errorLine) return
      const model = monaco.editor.getModels()[0]
      if (model) {
        monaco.editor.setModelMarkers(
          model,
          "owner",
          errorMessage
            ? [
                {
                  startLineNumber: errorLine,
                  startColumn: 1,
                  endLineNumber: errorLine,
                  endColumn: model.getLineMaxColumn(errorLine),
                  message: errorMessage,
                  severity: monaco.MarkerSeverity.Error,
                },
              ]
            : []
        )
      }
      return () => {
        if (model) {
          monaco.editor.setModelMarkers(model, "owner", []) // Clean up markers
        }
      }
    }, [monaco, errorMessage, errorLine])

    return (
      <Editor
        height={editorHeight}
        defaultLanguage="python"
        defaultValue={code.current}
        onChange={(value) => {
          if (isSwitchingFiles.current) {
            isSwitchingFiles.current = false
            return
          }
          code.current = value ?? ""
          triggerRedraw()
          triggerCodeSave()
        }}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 16,
          minimap: { enabled: false },
        }}
      />
    )
  }
)

export default CodeEditor