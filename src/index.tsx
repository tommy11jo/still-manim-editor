import React from "react"
import { createRoot } from "react-dom/client"
import App from "./components/App"
import { SelectionProvider } from "./contexts/SelectionContext"
import { PyodideProvider } from "./contexts/PyodideContext"
const container = document.getElementById("app-root")!
const root = createRoot(container)
root.render(
  <SelectionProvider>
    <PyodideProvider>
      <App />
    </PyodideProvider>
  </SelectionProvider>
)
