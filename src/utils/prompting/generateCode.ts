import OpenAI from "openai"
import {
  GoogleGenerativeAI,
  ModelParams,
  Content as GeminiContent,
} from "@google/generative-ai"
import { EDIT_PROMPT, Message } from "./editPrompts"
import { applyEdits, findEditBlocks } from "./editBlocks"
import { MobjectMetadataMap } from "../../types"
import { PLAN_PROMPT } from "./planPrompts"
import { REWRITE_PROMPT, extractUpdatedCode } from "./rewritePrompting"
type Model = "gpt-4o" | "gemini-1.5-pro"
export const generateCode = async (
  userInstruction: string,
  pythonCode: string,
  apiKey: string,
  selectedMobjectIds: string[],
  mobjectMetadataMap: MobjectMetadataMap,
  modelName: Model = "gpt-4o",
  // modelName: Model = "gemini-1.5-pro",
  // approach = "rewrite"
  approach = "edit",
  logPrompts: boolean = true
) => {
  if (approach === "edit")
    return await generateCodeByEditting(
      userInstruction,
      pythonCode,
      apiKey,
      selectedMobjectIds,
      mobjectMetadataMap,
      modelName
    )
  else
    return await generateCodeByRewriting(
      userInstruction,
      pythonCode,
      apiKey,
      selectedMobjectIds,
      mobjectMetadataMap,
      modelName
    )
}
const generateCodeByEditting = async (
  userInstruction: string,
  pythonCode: string,
  apiKey: string,
  selectedMobjectIds: string[],
  mobjectMetadataMap: MobjectMetadataMap,
  modelName: string,
  logPrompts: boolean = true
) => {
  const readableSelectedMobjects = selectedMobjectIds.map((mobjectId) => {
    const { lineno, type, path } = mobjectMetadataMap[mobjectId]
    let mobjectStr = `A ${type} mobject, accessed as \`${path}\``
    if (lineno) {
      mobjectStr += `, defined on line ${lineno}`
    }
    return mobjectStr
  })
  const planMessage: Message = await PLAN_PROMPT.generateUserMessage(
    userInstruction,
    pythonCode,
    readableSelectedMobjects
  )

  const planMessages = [...PLAN_PROMPT.messages, planMessage]

  const planText = await generateChatResponse(planMessages, apiKey, modelName)
  if (planText === null) throw new Error("Error generating plan.")

  const extraction = extractPlanAndFileSlugs(planText)
  if (extraction === null) throw new Error("Malformed plan.")
  const { plan, fileSlugs } = extraction

  const editMessage: Message = await EDIT_PROMPT.generateUserMessage(
    userInstruction,
    plan,
    fileSlugs,
    pythonCode,
    readableSelectedMobjects
  )
  const editMessages = [...EDIT_PROMPT.messages, editMessage]

  const editStr = await generateChatResponse(editMessages, apiKey, modelName)
  if (editStr === null) throw new Error("Chat response should not be null.")

  const editBlocks = findEditBlocks(editStr)
  const { content, editsApplied } = applyEdits(pythonCode, editBlocks)

  if (logPrompts) {
    const allPlanMessages = [
      ...planMessages.map((message) => message.content),
      planText,
    ]
    const allEditMessages = [
      ...editMessages.map((message) => message.content),
      editStr,
    ]

    let index = 0
    for (const message of allPlanMessages) {
      console.log(`plan message ${index}: ${message}`)
      index++
    }
    index = 0
    for (const message of allEditMessages) {
      console.log(`edit message ${index}: ${message}`)
      index++
    }
  }
  return content
}

const extractPlanAndFileSlugs = (planText: string) => {
  const planRegex = /Plan:\s*([\s\S]*?)\s*Relevant Files:/
  const filesRegex = /Relevant Files:\s*([\s\S]*)/

  try {
    const planMatch = planText.match(planRegex)
    if (!planMatch)
      throw new Error("Plan section not found or improperly formatted.")

    const filesMatch = planText.match(filesRegex)
    if (!filesMatch)
      throw new Error(
        "Relevant Files section not found or improperly formatted."
      )

    const plan = planMatch[1].trim()
    const fileSlugs = filesMatch[1]
      .split("\n")
      .map((file) =>
        file
          .trim()
          .replace(/^- /, "")
          .replace(/\[([^\]]+)\]\([^\)]+\)/, "$1") // Handle misformatted files like [ex1.mdx](ex1.mdx)
          .replace(/\.(mdx|md)$/, "")
      )
      .filter((file) => file)

    return { plan, fileSlugs }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message)
    } else {
      console.error("Unexpected error:", error)
    }
    return null
  }
}

const generateCodeByRewriting = async (
  userInstruction: string,
  pythonCode: string,
  apiKey: string,
  selectedMobjectIds: string[],
  mobjectMetadataMap: MobjectMetadataMap,
  modelName: string,
  logPrompts: boolean = true
) => {
  const readableSelectedMobjects = selectedMobjectIds.map((mobjectId) => {
    const { lineno, type, path } = mobjectMetadataMap[mobjectId]
    let mobjectStr = `A ${type} mobject, accessed as \`${path}\``
    if (lineno) {
      mobjectStr += `, defined on line ${lineno}`
    }
    return mobjectStr
  })
  const planMessage: Message = await PLAN_PROMPT.generateUserMessage(
    userInstruction,
    pythonCode,
    readableSelectedMobjects
  )

  const planMessages = [...PLAN_PROMPT.messages, planMessage]

  const planText = await generateChatResponse(planMessages, apiKey, modelName)
  if (planText === null) throw new Error("Error generating plan.")

  const extraction = extractPlanAndFileSlugs(planText)
  if (extraction === null) throw new Error("Malformed plan.")
  const { plan, fileSlugs } = extraction

  const rewriteMessage: Message = await REWRITE_PROMPT.generateUserMessage(
    userInstruction,
    plan,
    fileSlugs,
    pythonCode
  )
  const rewriteMessages = [...REWRITE_PROMPT.messages, rewriteMessage]

  const rewriteStr = await generateChatResponse(
    rewriteMessages,
    apiKey,
    modelName
  )
  if (rewriteStr === null) throw new Error("Chat response should not be null.")

  const updatedCode = extractUpdatedCode(rewriteStr)

  if (logPrompts) {
    const allPlanMessages = [
      ...planMessages.map((message) => message.content),
      planText,
    ]
    const allRewriteMessages = [
      ...rewriteMessages.map((message) => message.content),
      rewriteStr,
    ]

    let index = 0
    for (const message of allPlanMessages) {
      console.log(`plan message ${index}: ${message}`)
      index++
    }
    index = 0
    for (const message of allRewriteMessages) {
      console.log(`edit message ${index}: ${message}`)
      index++
    }
  }
  return updatedCode
}

const generateOpenAIResponse = async (
  messages: Message[],
  apiKey: string,
  modelName: string,
  temperature: number = 0.4
) => {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  const chatCompletion = await openai.chat.completions.create({
    messages,
    model: modelName,
    temperature,
  })
  const text = chatCompletion.choices[0].message.content
  return text
}
const generateGoogleAIResponse = async (
  messages: Message[],
  apiKey: string,
  modelName: string,
  temperature: number = 0.4
) => {
  const sysList = messages.filter((message) => message.role === "system")
  const sysInstruction = sysList.length === 1 ? sysList[0].content : null
  const messagesFiltered = messages.filter(
    (message) => message.role !== "system"
  )

  const genAI = new GoogleGenerativeAI(apiKey)
  const modelConfig: ModelParams = {
    model: modelName,
    generationConfig: { temperature },
  }
  if (sysInstruction !== null) modelConfig.systemInstruction = sysInstruction
  const model = genAI.getGenerativeModel(modelConfig)

  const formattedMessages: GeminiContent[] = messagesFiltered.map(
    (message) => ({
      role: message.role,
      parts: [{ text: message.content }],
    })
  )

  const result = await model.generateContent({ contents: formattedMessages })
  const text = result.response.text()
  return text
}
const generateChatResponse = async (
  messages: Message[],
  apiKey: string,
  modelName: string
): Promise<string | null> => {
  const openAIModels = ["gpt-4o", "gpt-3.5-turbo"]
  const googleModels = ["gemini-1.5-pro"]
  if (openAIModels.includes(modelName))
    return await generateOpenAIResponse(messages, apiKey, modelName)
  else if (googleModels.includes(modelName))
    return await generateGoogleAIResponse(messages, apiKey, modelName)
  else throw new Error(`Model ${modelName} does not exist`)
}
