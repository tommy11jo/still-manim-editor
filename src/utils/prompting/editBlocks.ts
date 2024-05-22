const OPENING = "```python"
// these are not directly used because GPT consistently generates them inaccurately
const HEAD = "<<<<<<< SEARCH"
const DIVIDER = "======="
const UPDATED = ">>>>>>> REPLACE"
const CLOSING = "```"

type Edit = [string, string]

export function applyEdits(content: string, edits: Edit[]): string {
  let result = content
  for (const [search, replace] of edits) {
    result = result.split(search).join(replace)
  }
  return result
}

export function findEditBlocks(content: string): Edit[] {
  // regex accepts 3 or more "<" signs because that's what GPT often generates
  const pattern = new RegExp(
    `${escapeRegExp(
      OPENING
    )}\\s*<{3,}\\s*SEARCH([\\s\\S]*?)={3,}([\\s\\S]*?)>{3,}\\s*REPLACE\\s*${escapeRegExp(
      CLOSING
    )}`,
    "g"
  )
  const matches = content.matchAll(pattern)
  const editBlocks: Edit[] = []
  for (const match of matches) {
    if (match[1] && match[2]) {
      editBlocks.push([match[1].trim(), match[2].trim()])
    }
  }
  return editBlocks
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
