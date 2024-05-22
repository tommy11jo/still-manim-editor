// Goal: Try various methods for creating diffs
// 1. Single-stage: make a plan and generate a list of SEARCH/REPLACE blocks in one query
// 2. Two-stage: make a plan in one stage and generate a list of SEARCH/REPLACE blocks in another stage

const userInstructionDemo = "Add an edge between these vertices"
const diagramCodeDemo = `
\`\`\`python
from smanim import *
canvas.set_dimensions(6, 6)
WEIGHTED_GRAPH1 = {
    0: [1, 2],
    1: [2, 3, 4],
    2: [5],
    3: [4],
    4: [2, 5, 6],
    5: [],
    6: [3, 5],
}
vertices, edges = Graph.from_adjacency_list(WEIGHTED_GRAPH1)
graph = Graph(
        vertices,
        edges,
        vertex_config={"fill_color": GRAY, "radius": 0.2},
        edge_type=Arrow,
        layout_config={"seed": 2},
        include_vertex_labels=True,
    )

start_vertex = graph.vertices[0]
start_vertex.set_color(RED)
pointer = Arrow.points_at(start_vertex, direction=LEFT, color=RED, length=0.5)
start_text = Text("start", color=RED).next_to(pointer)
canvas.add(graph, pointer, start_text)
canvas.draw()
\`\`\`
`

const sysPrompt = `
You are writing code with the python library smanim.
Smanim is based on 3blue1brown's manim, which you are familiar with.

Complete the user's instruction by outputting SEARCH/REPLACE blocks to edit the diagram code.
The user might be selecting mobjects in the diagram with their mouse and might refer to them in their instruction.

You MUST:
1. Think step-by-step to devise a plan in about one paragraph.
2. Based on the plan, list changes to the code in short sentences.
3. For each change, describe it with a *SEARCH/REPLACE block* per the examples below.

Useful Tips:
- Keep the SEARCH/REPLACE block as small as possible.
- Do not change unrelated chunks of code.
- You can add lines of code without truly replacing them by writing the existing line in both the SEARCH and REPLACE sections.
`

export type ChatRole = "user" | "assistant" | "system"
export type Message = {
  role: ChatRole
  content: string
}
export type Prompt = {
  name: string
  messages: Message[]
  generateUserMessage: (
    instruction: string,
    pythonCode: string,
    readableSelectedMobjects: string[]
  ) => Message
}

const exampleMessages: Message[] = [
  {
    role: "user",
    content: `DIAGRAM CODE:
${diagramCodeDemo}

INSTRUCTION:
${userInstructionDemo}
`,
  },
  {
    role: "assistant",
    content: `To add an edge between these vertices, you can update the original graph adjacency list representation in \`WEIGHTED_GRAPH1\`.
The first selected mobject is the vertex labeled 5.
The second selected mobject, the \`start_vertex\`, is defined in the code as \`g.vertices[0]\`. So it is the vertex labeled 0.
So, you just need to add the edge (0, 5) to the adjacency list.

You can apply the following SEARCH/REPLACE block:
\`\`\`python
<<<<<<< SEARCH
WEIGHTED_GRAPH1 = {
    0: [1, 2],
=======
WEIGHTED_GRAPH1 = {
    0: [1, 2, 5],
>>>>>>> REPLACE
\`\`\`
`,
  },
]
const generateUserMessage = (
  instruction: string,
  pythonCode: string,
  readableSelectedMobjects: string[]
): Message => {
  const selectedMobjectsListStr = readableSelectedMobjects.map(
    (mobjectStr, i) => `${i}. ${mobjectStr}`
  )
  const selectedMobjectsStr =
    selectedMobjectsListStr.length === 0
      ? ""
      : `
SELECTED MOBJECTS:
${selectedMobjectsListStr}
`
  return {
    role: "user",
    content: `DIAGRAM CODE:
\`\`\`python
${pythonCode}
\`\`\`

${selectedMobjectsStr}

INSTRUCTION:
${instruction}
`,
  }
}

export const EDIT_PROMPT: Prompt = {
  name: "edit_sections",
  messages: [{ role: "system", content: sysPrompt }, ...exampleMessages],
  generateUserMessage,
}