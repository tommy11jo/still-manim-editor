import React, { createContext, useContext, useRef, useState } from "react"
import { MobjectMetadataMap } from "../types"

interface SelectionContextType {
  attachSelectionListeners: (metadata: any) => void
  needsCanvasClickListener: React.MutableRefObject<boolean>
  selectedMobjectIds: React.MutableRefObject<string[]>
  lineNumbersToHighlight: number[]
}

const SelectionContext = createContext<SelectionContextType | undefined>(
  undefined
)

export const useSelection = () => {
  const context = useContext(SelectionContext)
  if (context === undefined) {
    throw new Error("useSelection must be used within a SelectionProvider")
  }
  return context
}

export const SelectionProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const selectedMobjectIds = useRef<string[]>([])
  const needsCanvasClickListener = useRef<boolean>(true)
  const commandClickSequenceStarted = useRef<boolean>(true)
  const [lineNumbersToHighlight, setLineNumbersToHighlight] = useState<
    number[]
  >([])

  const setupCanvasClickListener = (metadataMap: MobjectMetadataMap) => {
    if (Object.keys(metadataMap).length === 0) {
      console.error("Empty metadata map")
      return
    }
    const svgCanvas = document.getElementById(
      "smanim-canvas"
    ) as unknown as SVGSVGElement

    let svgBgRect = null

    if ("bg_rect" in metadataMap) {
      const trueBgRectId = metadataMap["bg_rect"].id
      svgBgRect = document.getElementById(trueBgRectId)
    }
    svgCanvas.addEventListener("click", (event) => {
      // clicks on empty areas or on background element
      if (event.target === event.currentTarget || event.target === svgBgRect) {
        event.preventDefault()
        resetFromPreviousSelection(null, metadataMap)
        const highlightedElements =
          document.querySelectorAll(".smanim-highlights")
        highlightedElements.forEach((element) => element.remove())
        selectedMobjectIds.current = []
        setLineNumbersToHighlight([])
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
    group.setAttribute("class", "smanim-highlights")
    // Note: Adding padding causes inconsistency between boxes created by smanim repo and those shown by this repo. That's ok for now.
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
    svgCanvas.appendChild(group)
  }

  const resetFromPreviousSelection = (
    newMobjectId: string | null,
    mobjectMetadatas: MobjectMetadataMap
  ) => {
    if (selectedMobjectIds.current.length === 0) {
      return
    }
    const resetLevelAndUp = (parentId: string) => {
      /* sets the default hoverability and clickability */
      if (parentId === "None") return
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
    const removeSiblingInteractivity = (mobjectId: string) => {
      const parentId = mobjectMetadatas[mobjectId].parent
      if (!parentId || parentId === "None" || parentId === "canvas") return

      for (const siblingId of mobjectMetadatas[parentId].children) {
        const element = document.getElementById(
          siblingId
        ) as unknown as SVGGraphicsElement
        element.style.pointerEvents = "none"
        element.classList.remove("clickable")
      }
    }
    selectedMobjectIds.current.forEach((prevSelMobjectId) => {
      const prevSelMobjectData = mobjectMetadatas[prevSelMobjectId]
      if (newMobjectId === null) {
        resetLevelAndUp(prevSelMobjectData.parent)
        removeChildInteractivity(prevSelMobjectId)
      } else if (prevSelMobjectId === mobjectMetadatas[newMobjectId].parent) {
        // if the newly selected mobject is a child of the previously selected mobject
        removeChildInteractivity(prevSelMobjectId)
        removeSiblingInteractivity(prevSelMobjectId)
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
        // if the newly selected mobject is in a different branch of the canvas tree
        resetLevelAndUp(prevSelMobjectData.parent)
      }
    })
  }
  const attachSelectionListeners = (metadataMap: MobjectMetadataMap) => {
    selectedMobjectIds.current = []
    setLineNumbersToHighlight([])
    if (needsCanvasClickListener) {
      setupCanvasClickListener(metadataMap)
      needsCanvasClickListener.current = false
    }
    Object.entries(metadataMap).forEach(([mobjectId, mobjectData]) => {
      if (mobjectId === "canvas" || mobjectId === "bg_rect") return
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
        if (event.metaKey || event.ctrlKey) {
          commandClickSequenceStarted.current = true
          selectedMobjectIds.current.push(mobjectId)
        } else {
          commandClickSequenceStarted.current = false
          resetFromPreviousSelection(mobjectId, metadataMap)
          const highlightedElements =
            document.querySelectorAll(".smanim-highlights")
          highlightedElements.forEach((element) => element.remove())
          selectedMobjectIds.current = [mobjectId]
        }

        // since this element is selected, set pointer events to none so children can be captured by clicks
        element.style.pointerEvents = "none"

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

        const lineNumbers: number[] = []
        for (const curId of selectedMobjectIds.current) {
          const curLineno = metadataMap[curId]["lineno"]
          if (curLineno !== null && curLineno !== -1)
            lineNumbers.push(curLineno)
        }
        setLineNumbersToHighlight(lineNumbers)
      })
    })
  }

  return (
    <SelectionContext.Provider
      value={{
        attachSelectionListeners,
        needsCanvasClickListener,
        selectedMobjectIds,
        lineNumbersToHighlight,
      }}
    >
      {children}
    </SelectionContext.Provider>
  )
}
