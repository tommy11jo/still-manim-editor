import { Still_RGBA, Still_Subpath } from "./types"

function definePath(
  ctx: CanvasRenderingContext2D,
  subpaths: Still_Subpath
): void {
  subpaths.forEach((subpath) => {
    ctx.beginPath()
    for (let i = 0; i < subpath.length; i += 4) {
      const start = subpath[i]
      const control1 = subpath[i + 1]
      const control2 = subpath[i + 2]
      const end = subpath[i + 3]

      if (i === 0) {
        ctx.moveTo(start[0], start[1])
      }

      ctx.bezierCurveTo(
        control1[0],
        control1[1],
        control2[0],
        control2[1],
        end[0],
        end[1]
      )
    }
    ctx.closePath()
  })
}
function applyStroke(
  ctx: CanvasRenderingContext2D,
  width: number,
  rgba: Still_RGBA
): void {
  const [r, g, b, a] = rgba
  ctx.strokeStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`
  ctx.lineWidth = width
  ctx.stroke()
}

function applyFill(ctx: CanvasRenderingContext2D, rgba: Still_RGBA): void {
  const [r, g, b, a] = rgba
  ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`
  ctx.fill()
}

export function displayVectorized(
  ctx: CanvasRenderingContext2D,
  subpaths: Still_Subpath,
  fillRGBA: Still_RGBA, // does not support gradients, like manim does
  strokeRGBA: Still_RGBA,
  strokeWidth: number
) {
  definePath(ctx, subpaths)
  applyStroke(ctx, strokeWidth, strokeRGBA)
  applyFill(ctx, fillRGBA)
}
export function setupCanvasCtx(ctx: CanvasRenderingContext2D) {
  // ctx.imageSmoothingEnabled = true
  // https://stackoverflow.com/questions/4261090/html5-canvas-and-anti-aliasing
  ctx.translate(0.5, 0.5)
}
