const sysPrompt = `
You are editing code that is written using the python library smanim.
Smanim is based on 3blue1brown's manim, which you are familiar with.
You will also be provided with relevant smanim docs to show correct library usage.

1. Rewrite the provided INITIAL PLAN so that it is the most sensible way to complete the user's instruction. Use your judgment. Make sure to use the docs when relevant.
2. Output "Now let's implement this updated plan with SEARCH/REPLACE blocks:".
3. Execute the new plan by generating SEARCH/REPLACE blocks, which will be applied to edit the diagram code.

Useful Tips:
- Do not change unrelated parts or unrelated properties of the diagram.
- The content of the SEARCH block must EXACTLY match the original diagram code (including any newlines and comments).
- Each SEARCH/REPLACE block should be as small as possible.
- You can add lines of code without truly replacing them by writing the existing line in both the SEARCH and REPLACE sections.

An example SEARCH/REPLACE block is:
\`\`\`python
# ==== SEARCH START ====
WEIGHTED_GRAPH1 = {
    0: [1, 2],
# ==== SEARCH END ====

# ==== REPLACE START ====
WEIGHTED_GRAPH1 = {
    0: [1, 2, 5],
# ==== REPLACE END ====
\`\`\`
`

export type ChatRole = "user" | "assistant" | "system"
export type Message = {
  role: ChatRole
  content: string
}
export type EditPrompt = {
  name: string
  messages: Message[]
  generateUserMessage: (
    userInstruction: string,
    currentPlan: string,
    fileSlugs: string[],
    pythonCode: string,
    readableSelectedMobjects: string[]
  ) => Promise<Message>
}

const DOC_ENDPOINT_PREFIX = `https://smanim-docs.vercel.app/api/mdx?slug=`
const fetchMdxFile = async (slug: string): Promise<string> => {
  const response = await fetch(`${DOC_ENDPOINT_PREFIX}${slug}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch document for slug: ${slug}`)
  }
  return await response.text()
}
const generateUserMessage = async (
  userInstruction: string,
  initialPlan: string,
  fileSlugs: string[],
  pythonCode: string,
  readableSelectedMobjects: string[]
): Promise<Message> => {
  const selectedMobjectsListStr = readableSelectedMobjects
    .map((mobjectStr, i) => `${i}. ${mobjectStr}`)
    .join("\n")
  const selectedMobjectsStr =
    selectedMobjectsListStr.length === 0
      ? ""
      : `
${selectedMobjectsListStr}`

  let smanimDocsStr = ""

  for (const slug of fileSlugs) {
    try {
      const document = await fetchMdxFile(slug)
      smanimDocsStr += document + "\n\n"
    } catch (error) {
      console.error(`Error fetching document for ${slug}:`, error)
    }
  }

  return {
    role: "user",
    content: `
SMANIM DOCUMENTATION:
${smanimDocsStr}

DIAGRAM CODE:
\`\`\`python
${pythonCode}
\`\`\`

SELECTED MOBJECTS (which the user likely refers to in their instruction):
${selectedMobjectsStr}

USER INSTRUCTION:
${userInstruction}

INITIAL PLAN:
${initialPlan}
`,
  }
}

export const EDIT_PROMPT: EditPrompt = {
  name: "edit_sections",
  messages: [{ role: "system", content: sysPrompt }],
  generateUserMessage,
}
