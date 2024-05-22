import { findEditBlocks, applyEdits } from "../utils/prompting/editBlocks"

test("simple math test", () => {
  const content = `Some initial content.
old_function()
Some more content.
old_variable = 5
End of content.`

  const editBlocksContent = `
\`\`\`python
<<<<<<< SEARCH
old_function()
=======
new_function()
>>>>>>> REPLACE
\`\`\`
And another change is:
\`\`\`python
<<<<<<< SEARCH
old_variable = 5
=======
new_variable = 10
>>>>>>> REPLACE
\`\`\`
`

  const expectedContent = `Some initial content.
new_function()
Some more content.
new_variable = 10
End of content.`

  const editBlocks = findEditBlocks(editBlocksContent)
  const result = applyEdits(content, editBlocks)

  expect(result).toBe(expectedContent)
})
test("modify edge weight in adjacency list", () => {
  const content = `{
      0: [(1, 2), (2, 1)],
      1: [(2, 5), (3, 11), (4, 3)],
      2: [(5, 15)],
      3: [(4, 2)],
      4: [(2, 1), (5, 4), (6, 5)],
      5: [],
      6: [(3, 1), (5, 1)],
  }`

  const editBlocksContent = `

To modify the weight of an edge, you need to update the entry in the adjacency list where the corresponding edge is defined.
In your diagram, the selected edge is accessed as \`graph[7]\`. 
To determine which edge this refers to, you must look at the original adjacency list and count edges according to the order in which they appear when you initialize the graph.

In standard dictionaries in Python 3.7+ insertion order matters, but \`WeightedGraph.from_adjacency_list\` will process edges according to the adjacency list entries.

Inspecting the adjacency list:

\`\`\`python
WEIGHTED_GRAPH1 = {
    0: [(1, 2), (2, 1)],
    1: [(2, 5), (3, 11), (4, 3)],
    2: [(5, 15)],
    3: [(4, 2)],
    4: [(2, 1), (5, 4), (6, 5)],
    5: [],
    6: [(3, 1), (5, 1)],
}
\`\`\`

So \`graph[7]\` refers to the edge (4, 2, 1). We need to set its weight to 10.
You can apply the following SEARCH/REPLACE block:
\`\`\`python
<<<<<< SEARCH
    4: [(2, 1), (5, 4), (6, 5)],
=======
    4: [(2, 10), (5, 4), (6, 5)],
>>>>>> REPLACE
\`\`\`
  `

  const expectedContent = `{
      0: [(1, 2), (2, 1)],
      1: [(2, 5), (3, 11), (4, 3)],
      2: [(5, 15)],
      3: [(4, 2)],
      4: [(2, 10), (5, 4), (6, 5)],
      5: [],
      6: [(3, 1), (5, 1)],
  }`

  const editBlocks = findEditBlocks(editBlocksContent)
  const result = applyEdits(content, editBlocks)

  expect(result).toBe(expectedContent)
})
