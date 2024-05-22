import OpenAI from "openai"
import { EDIT_PROMPT, Message } from "./editPrompts"
import { applyEdits, findEditBlocks } from "./editBlocks"
import { MobjectMetadataMap } from "../../types"

export const generateCode = async (
  instruction: string,
  pythonCode: string,
  apiKey: string,
  selectedMobjectIds: string[],
  mobjectMetadataMap: MobjectMetadataMap,
  // model: string = "gpt-3.5-turbo"
  model: string = "gpt-4o",
  temperature: number = 0.4
) => {
  const readableSelectedMobjects = selectedMobjectIds.map((mobjectId) => {
    const { lineno, type, path } = mobjectMetadataMap[mobjectId]
    let mobjectStr = `A ${type} mobject, accessed as \`${path}\``
    if (lineno) {
      mobjectStr += `, defined on line ${lineno}`
    }
    return mobjectStr
  })

  const newMessage: Message = EDIT_PROMPT.generateUserMessage(
    instruction,
    pythonCode,
    readableSelectedMobjects
  )
  const allMessages = [...EDIT_PROMPT.messages, newMessage]

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

  const chatCompletion = await openai.chat.completions.create({
    messages: allMessages,
    model,
    temperature,
  })
  console.log("messages are", allMessages)
  const responseStr = chatCompletion.choices[0].message.content
  if (responseStr === null) throw new Error("Chat response should not be null.")

  console.log("response is", responseStr)
  const editBlocks = findEditBlocks(responseStr)
  const result = applyEdits(pythonCode, editBlocks)
  console.log("result is", result)
  return result
}
