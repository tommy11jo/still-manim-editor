import { Canvg, presets } from "canvg"

export function useSvgDownloader() {
  const downloadSvg = (fileName: string, svgContent: string) => {
    const blob = new Blob([svgContent], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadSvgAsPng = async (
    fileName: string,
    svgContent: string,
    width: number,
    height: number
  ) => {
    const preset = presets.offscreen()
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext("2d")!
    // converting to context and rendering typically takes 0.02s-0.04s, so its not a bottleneck
    // for adding selection boxes, I can either directly add to the svg or convert to canvas
    const v = await Canvg.from(ctx, svgContent, preset)
    await v.render()

    const blob = await canvas.convertToBlob()
    const pngUrl = URL.createObjectURL(blob)

    const svgBlob = new Blob([svgContent], {
      type: "image/svg+xml;charset=utf-8",
    })
    const svgUrl = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const downloadLink = document.createElement("a")
      downloadLink.href = pngUrl
      downloadLink.download = fileName
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URL.revokeObjectURL(pngUrl)
      URL.revokeObjectURL(svgUrl)
    }
    img.src = svgUrl
  }

  return { downloadSvg, downloadSvgAsPng }
}
