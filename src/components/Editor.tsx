import Editor, { useMonaco } from "@monaco-editor/react"
import React, { useEffect, useRef, useState } from "react"

type EditorProps = {
  code: React.MutableRefObject<string>
  setCodeSaved: (codeSaved: boolean) => void
  title: string
  triggerRedraw: Function
  triggerCodeSave: Function
  isAutoRefreshing: boolean
  editorHeight: string
  errorMessage: string | null
  errorLine: number | null
  lineNumbersToHighlight: number[]
  overridingContent: string // used for programmatic responses to change editor content without breaking edit history
  setOverridingContent: (value: string) => void
  requiresUndoAndRefresh: boolean // used to undo a language command
  setRequiresUndoAndRefresh: (value: boolean) => void
}

// Known Bug in Monaco when resizing in chrome or edge: https://github.com/microsoft/monaco-editor/issues/4311
// affects development, not production
const CodeEditor: React.FC<EditorProps> = ({
  code,
  setCodeSaved,
  title,
  triggerRedraw,
  triggerCodeSave,
  isAutoRefreshing,
  editorHeight,
  errorMessage,
  errorLine,
  lineNumbersToHighlight,
  overridingContent,
  setOverridingContent,
  requiresUndoAndRefresh,
  setRequiresUndoAndRefresh,
}) => {
  const monaco = useMonaco()
  const editorRef = useRef<any>(null)
  const [decorations, setDecorations] = useState<string[]>([])

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    updateDecorations()
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
  // prevents freezing editor when user spams "Enter" key
  const actionRunning = useRef(false)
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("customTheme", {
        base: "vs",
        inherit: true,
        rules: [],
        colors: {
          "editorError.foreground": "#FF0000",
        },
      })
      monaco.editor.setTheme("customTheme")

      // Note that I have another listener for this key command attached to the window, but it gets overridden by monaco so I need this listener too
      const executeCode = {
        id: "run-code",
        label: "Run Code",
        contextMenuOrder: 2,
        contextMenuGroupId: "1_modification",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => {
          if (!actionRunning.current) {
            actionRunning.current = true
            triggerRedraw()
            triggerCodeSave()
            actionRunning.current = false
          }
        },
      }
      monaco.editor.addEditorAction(executeCode)
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [monaco, triggerRedraw, triggerCodeSave])

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
        monaco.editor.setModelMarkers(model, "owner", [])
      }
    }
  }, [monaco, errorMessage, errorLine])

  useEffect(() => {
    updateDecorations()
    return () => {
      if (editorRef.current) {
        editorRef.current.deltaDecorations(decorations, [])
      }
    }
  }, [monaco, lineNumbersToHighlight])
  const updateDecorations = () => {
    if (editorRef.current && monaco) {
      const newDecorations = lineNumbersToHighlight.map((lineNumber) => ({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: "line-highlight",
          overviewRuler: {
            color: "rgba(135, 206, 235, 0.5)",
            position: monaco.editor.OverviewRulerLane.Full,
          },
        },
      }))
      const ids = editorRef.current.deltaDecorations(
        decorations,
        newDecorations
      )
      setDecorations(ids)
    }
  }

  // Functionality for LLM language commands
  const makeEditsProgrammatically = (newValue: string) => {
    if (editorRef.current) {
      const model = editorRef.current.getModel()
      editorRef.current.pushUndoStop()
      editorRef.current.executeEdits("my-source", [
        {
          range: model.getFullModelRange(),
          text: newValue,
          forceMoveMarkers: true,
        },
      ])
      editorRef.current.pushUndoStop()
    }
  }

  useEffect(() => {
    if (overridingContent !== "") {
      makeEditsProgrammatically(overridingContent)
      setOverridingContent("")
    }
  }, [overridingContent])

  useEffect(() => {
    if (requiresUndoAndRefresh && editorRef.current) {
      editorRef.current.trigger("keyboard", "undo", null)
      code.current = editorRef.current.getValue()

      triggerCodeSave()
      triggerRedraw()
      setRequiresUndoAndRefresh(false)
    }
  }, [requiresUndoAndRefresh])

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
        setCodeSaved(false)
        if (isAutoRefreshing) {
          triggerRedraw()
          triggerCodeSave()
        }
      }}
      onMount={handleEditorDidMount}
      options={{
        fontSize: 16,
        minimap: { enabled: false },
      }}
    />
  )
}

export default CodeEditor
