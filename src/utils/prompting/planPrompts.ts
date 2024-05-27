export type ChatRole = "user" | "assistant" | "system"
export type Message = {
  role: ChatRole
  content: string
}
export type PlanPrompt = {
  name: string
  messages: Message[]
  generateUserMessage: (
    instruction: string,
    pythonCode: string,
    readableSelectedMobjects: string[]
  ) => Promise<Message>
}
const CHEATSHEET_ENDPOINT =
  "https://smanim-docs.vercel.app/api/mdx?slug=overview"
const fetchCheatsheet = async () => {
  try {
    const response = await fetch(CHEATSHEET_ENDPOINT)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const cheatsheetText = await response.text()
    return cheatsheetText
  } catch (error) {
    console.error("Failed to fetch cheatsheet:", error)
  }
}

const sysPrompt = `
The diagram is represented by code using the python library smanim.
Smanim is based on 3blue1brown's manim, which you are familiar with.

Thoughts: Using the smanim cheatsheet, think out loud and consider which classes and functions might be relevant.
Plan: Then, Output *the simplest* plan possible in 1-4 sentences that describes how to edit the diagram to complete the user's instruction.
Relevant Files: Finally, write the filenames of 2-4 of the most relevant files (in the format "filename.mdx") from the smanim cheatsheet for completing this plan.

Do not write any code, except optionally small snippets for planning!

Example Response:
Thoughts:
{your thoughts here}

Plan:
{your plan here}

Relevant Files:
- ex1.mdx
- ex2.mdx
`

const generateUserMessage = async (
  instruction: string,
  pythonCode: string,
  readableSelectedMobjects: string[]
): Promise<Message> => {
  const cheatsheet = await fetchCheatsheet()
  const selectedMobjectsListStr = readableSelectedMobjects.map(
    (mobjectStr, i) => `${i}. ${mobjectStr}`
  )
  const selectedMobjectsStr =
    selectedMobjectsListStr.length === 0
      ? ""
      : `
SELECTED MOBJECTS (which the user likely refers to in their instruction):
${selectedMobjectsListStr}`

  return {
    role: "user",
    content: `SMANIM CHEATSHEET:
${cheatsheet},

DIAGRAM CODE:
\`\`\`python
${pythonCode}
\`\`\`

${selectedMobjectsStr}

USER INSTRUCTION:
${instruction}
`,
  }
}
export const PLAN_PROMPT: PlanPrompt = {
  name: "plan",
  messages: [{ role: "system", content: sysPrompt }],
  generateUserMessage,
}
