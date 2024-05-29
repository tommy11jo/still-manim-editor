import OpenAI from "openai"
import { EDIT_PROMPT, Message } from "./editPrompts"
import { applyEdits, findEditBlocks } from "./editBlocks"
import { MobjectMetadataMap } from "../../types"
import { PLAN_PROMPT } from "./planPrompts"
import { REWRITE_PROMPT, extractUpdatedCode } from "./rewritePrompting"

export const generateCode = async (
  userInstruction: string,
  pythonCode: string,
  apiKey: string,
  selectedMobjectIds: string[],
  mobjectMetadataMap: MobjectMetadataMap,
  //   model: string = "gpt-3.5-turbo",
  model: string = "gpt-4o",
  temperature: number = 0.4,
  //   approach = "rewrite"
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
      model,
      temperature
    )
  else
    return await generateCodeByRewriting(
      userInstruction,
      pythonCode,
      apiKey,
      selectedMobjectIds,
      mobjectMetadataMap,
      model,
      temperature
    )
}
const generateCodeByEditting = async (
  userInstruction: string,
  pythonCode: string,
  apiKey: string,
  selectedMobjectIds: string[],
  mobjectMetadataMap: MobjectMetadataMap,
  //   model: string = "gpt-3.5-turbo",
  model: string = "gpt-4o",
  temperature: number = 0.4,
  logPrompts: boolean = true
) => {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
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

  const planCompletion = await openai.chat.completions.create({
    messages: planMessages,
    model,
    temperature,
  })
  const planText = planCompletion.choices[0].message.content
  if (planText === null) throw new Error("Error generating plan.")

  const extraction = extractPlanAndFileSlugs(planText)
  if (extraction === null) throw new Error("Malformed plan.")
  const { plan, fileSlugs } = extraction

  const editMessage: Message = await EDIT_PROMPT.generateUserMessage(
    userInstruction,
    plan,
    fileSlugs,
    pythonCode
  )
  const editMessages = [...EDIT_PROMPT.messages, editMessage]

  const editCompletion = await openai.chat.completions.create({
    messages: editMessages,
    model,
    temperature,
  })
  const responseStr = editCompletion.choices[0].message.content
  if (responseStr === null) throw new Error("Chat response should not be null.")

  const editBlocks = findEditBlocks(responseStr)
  const { content, editsApplied } = applyEdits(pythonCode, editBlocks)

  if (logPrompts) {
    const allPlanMessages = [
      ...planMessages.map((message) => message.content),
      planText,
    ]
    const allEditMessages = [
      ...editMessages.map((message) => message.content),
      responseStr,
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
  //   model: string = "gpt-3.5-turbo",
  model: string = "gpt-4o",
  temperature: number = 0.4,
  logPrompts: boolean = true
) => {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
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

  const planCompletion = await openai.chat.completions.create({
    messages: planMessages,
    model,
    temperature,
  })
  const planText = planCompletion.choices[0].message.content
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

  const rewriteCompletion = await openai.chat.completions.create({
    messages: rewriteMessages,
    model,
    temperature,
  })
  const responseStr = rewriteCompletion.choices[0].message.content
  if (responseStr === null) throw new Error("Chat response should not be null.")

  const updatedCode = extractUpdatedCode(responseStr)

  if (logPrompts) {
    const allPlanMessages = [
      ...planMessages.map((message) => message.content),
      planText,
    ]
    const allRewriteMessages = [
      ...rewriteMessages.map((message) => message.content),
      responseStr,
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
