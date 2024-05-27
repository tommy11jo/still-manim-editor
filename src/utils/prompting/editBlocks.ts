const OPENING = "```python"
const SEARCH_START = "# ==== SEARCH START ===="
const SEARCH_END = "# ==== SEARCH END ===="
const REPLACE_START = "# ==== REPLACE START ===="
const REPLACE_END = "# ==== REPLACE END ===="
const CLOSING = "```"

type Edit = [string, string]

export function applyEdits(
  content: string,
  edits: Edit[]
): { content: string; editsApplied: number } {
  let result = content
  let editsApplied = 0

  for (const [search, replace] of edits) {
    const parts = result.split(search)
    if (parts.length > 1) {
      result = parts.join(replace)
      editsApplied += parts.length - 1
    }
  }

  return { content: result, editsApplied }
}

export function findEditBlocks(content: string): Edit[] {
  const pattern = new RegExp(
    `${escapeRegExp(OPENING)}\\s*${escapeRegExp(
      SEARCH_START
    )}([\\s\\S]*?)${escapeRegExp(SEARCH_END)}\\s*${escapeRegExp(
      REPLACE_START
    )}([\\s\\S]*?)${escapeRegExp(REPLACE_END)}\\s*${escapeRegExp(CLOSING)}`,
    "g"
  )
  const matches = content.matchAll(pattern)
  const editBlocks: Edit[] = []

  for (const match of matches) {
    if (match[1] && match[2]) {
      editBlocks.push([match[1].trim(), match[2].trim()])
    } else {
      throw new Error("Malformed search and replace block detected")
    }
  }

  return editBlocks
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
