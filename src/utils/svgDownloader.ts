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
    height: number,
    scaleFactor: number = 2
  ) => {
    const scaledWidth = width * scaleFactor
    const scaledHeight = height * scaleFactor

    const preset = presets.offscreen()
    const canvas = new OffscreenCanvas(scaledWidth, scaledHeight)
    const ctx = canvas.getContext("2d")!

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
