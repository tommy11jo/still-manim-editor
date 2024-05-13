import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { SelectionProvider } from "./SelectionContext"
import { PyodideWorkerProvider } from "./PyodideWebWorkerContext"
const container = document.getElementById("app-root")!
const root = createRoot(container)
root.render(
  <SelectionProvider>
    <PyodideWorkerProvider>
      <App />
    </PyodideWorkerProvider>
  </SelectionProvider>
)
