const sysPrompt = `
You are rewriting the diagram code below.
The diagram code is written using the python library smanim.
Smanim is based on 3blue1brown's manim, which you are familiar with, but its syntax varies sometimes.
You will also be provided with relevant smanim docs to show correct library usage.

1. Write a new plan to edit the diagram code. The new plan should be the most sensible and simple plan to complete the user's instruction, given the relevant docs.
2. Rewrite the code completely, after writing "UPDATED CODE:".

The response format should be:
NEW PLAN:
{your new plan}

UPDATED CODE:
\`\`\`python
{your code}

\`\`\`
`

export type ChatRole = "user" | "assistant" | "system"
export type Message = {
  role: ChatRole
  content: string
}
export type RewritePrompt = {
  name: string
  messages: Message[]
  generateUserMessage: (
    userInstruction: string,
    currentPlan: string,
    fileSlugs: string[],
    pythonCode: string
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
  currentPlan: string,
  fileSlugs: string[],
  pythonCode: string
): Promise<Message> => {
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

USER INSTRUCTION:
${userInstruction}

CURRENT PLAN:
${currentPlan}
`,
  }
}

export const REWRITE_PROMPT: RewritePrompt = {
  name: "rewrite",
  messages: [{ role: "system", content: sysPrompt }],
  generateUserMessage,
}

export function extractUpdatedCode(llmOutput: string): string {
  const updatedCodeMarker = "UPDATED CODE:"
  const startIndex = llmOutput.indexOf(updatedCodeMarker)

  if (startIndex === -1) {
    throw new Error("UPDATED CODE marker not found in the LLM output")
  }

  const codeBlockStartMarker = "```python"
  const codeBlockStartIndex = llmOutput.indexOf(
    codeBlockStartMarker,
    startIndex
  )

  if (codeBlockStartIndex === -1) {
    throw new Error(
      "Code block start not found after UPDATED CODE marker in the LLM output"
    )
  }

  const codeBlockEndMarker = "```"
  const codeBlockEndIndex = llmOutput.indexOf(
    codeBlockEndMarker,
    codeBlockStartIndex + codeBlockStartMarker.length
  )

  if (codeBlockEndIndex === -1) {
    throw new Error(
      "Code block end not found after UPDATED CODE marker in the LLM output"
    )
  }

  const code = llmOutput
    .substring(
      codeBlockStartIndex + codeBlockStartMarker.length,
      codeBlockEndIndex
    )
    .trim()

  return code
}
