import React, { useEffect, useState } from "react"
import { displayVectorized, setupCanvasCtx } from "./canvas/lib"
import { Still_RGBA, Still_Subpath } from "./canvas/types"

interface CustomCanvasProps {
  subpaths: Still_Subpath
  fillColor: Still_RGBA
  strokeWidth: number
  strokeColor: Still_RGBA
}

const CustomCanvas = ({
  subpaths,
  fillColor,
  strokeWidth,
  strokeColor,
}: CustomCanvasProps) => {
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (canvasRef) {
      const ctx = canvasRef.getContext("2d")!
      setupCanvasCtx(ctx)
      displayVectorized(ctx, subpaths, fillColor, strokeColor, strokeWidth)
    }
  }, [canvasRef, subpaths, strokeWidth, strokeColor])

  // device pixels (800) != CSS pixels (400px), so this increases sharpness
  // p5.js editor does this too
  return (
    <canvas
      ref={setCanvasRef}
      width="800"
      height="800"
      style={{ width: "400px", height: "400px" }}
    />
  )
}

export default CustomCanvas
