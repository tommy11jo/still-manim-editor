import { findEditBlocks, applyEdits } from "../utils/prompting/editBlocks"

test("simple math test", () => {
  const content = `Some initial content.
old_function()
Some more content.
old_variable = 5
End of content.`

  const editBlocksContent = `
\`\`\`python
# ==== SEARCH START ====
old_function()
# ==== SEARCH END ====
# ==== REPLACE START ====
new_function()
# ==== REPLACE END ====
\`\`\`
And another change is:
\`\`\`python
# ==== SEARCH START ====
old_variable = 5
# ==== SEARCH END ====
# ==== REPLACE START ====
new_variable = 10
# ==== REPLACE END ====
\`\`\`
`

  const expectedContent = `Some initial content.
new_function()
Some more content.
new_variable = 10
End of content.`

  const editBlocks = findEditBlocks(editBlocksContent)
  const result = applyEdits(content, editBlocks)

  expect(result.content).toBe(expectedContent)
})

test("indent test", () => {
  const content = `Some initial content.
old_function()
    indent
old_variable = 5
End of content.`

  const editBlocksContent = `
\`\`\`python
# ==== SEARCH START ====
    indent
# ==== SEARCH END ====
# ==== REPLACE START ====
unindent
# ==== REPLACE END ====
\`\`\`
`

  const expectedContent = `Some initial content.
old_function()
unindent
old_variable = 5
End of content.`

  const editBlocks = findEditBlocks(editBlocksContent)
  const result = applyEdits(content, editBlocks)

  expect(result.content).toBe(expectedContent)
})

test("harder indent test", () => {
  const content = `a b
    c d
e f`

  const editBlocksContent = `
  Some text here.
\`\`\`python
# ==== SEARCH START ====
    c d
# ==== SEARCH END ====

# ==== REPLACE START ====
c d
    x y z
# ==== REPLACE END ====
\`\`\`
`

  const expectedContent = `a b
c d
    x y z
e f`

  const editBlocks = findEditBlocks(editBlocksContent)
  const result = applyEdits(content, editBlocks)

  expect(result.content).toBe(expectedContent)
})
