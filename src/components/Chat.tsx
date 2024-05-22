import React, { useEffect, useState } from "react"
import TextareaAutosize from "react-textarea-autosize"
import "./chat.css"

interface ChatBoxProps {
  handleSend: (text: string, setLoading: (value: boolean) => void) => void
  apiKey: string
  setApiKey: (value: string) => void
  setRequiresUndoAndRefresh: (value: boolean) => void
}

const ChatBox: React.FC<ChatBoxProps> = ({
  handleSend,
  apiKey,
  setApiKey,
  setRequiresUndoAndRefresh,
}) => {
  const [text, setText] = useState("")
  const [loadingChatResponse, setLoadingChatResponse] = useState(false)

  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false)
  const [tempApiKey, setTempApiKey] = useState("")

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSend(text, setLoadingChatResponse)
      setText("")
    }
  }

  const [loadingText, setLoadingText] = useState("")
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (loadingChatResponse) {
      interval = setInterval(() => {
        setLoadingText((prev) => (prev === "⏳" ? "⌛️" : "⏳"))
      }, 500)
    } else {
      setLoadingText("")
    }

    return () => clearInterval(interval)
  }, [loadingChatResponse])

  useEffect(() => {
    const storedKey = localStorage.getItem("openai_api_key") ?? ""
    setApiKey(storedKey)
    setTempApiKey(storedKey)
  }, [])

  const handleApiKeySave = () => {
    setApiKey(tempApiKey)
    localStorage.setItem("openai_api_key", tempApiKey)
    setApiKeyModalOpen(false)
  }
  const handleApiKeyCancel = () => {
    setApiKeyModalOpen(false)
    setTempApiKey("")
  }

  return (
    <>
      {apiKeyModalOpen && (
        <div className="modal-container">
          <div className="modal-content">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "0.3rem",
                alignItems: "center",
                flexDirection: "column",
                fontSize: "18px",
              }}
            >
              <span>OpenAI API Key</span>

              <input
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                style={{ width: "100%" }}
              />
              <span className="muted-text">
                To use language commands, enter your own API key. You will be
                charged by OpenAI.
              </span>
              <div>
                <span
                  onClick={handleApiKeyCancel}
                  className="action-text"
                  style={{ paddingRight: "2rem" }}
                >
                  Cancel
                </span>
                <span onClick={handleApiKeySave} className="action-text">
                  Save
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.3rem",
          padding: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "right",
            width: "80%",
          }}
        >
          <div className="chat-box">
            <TextareaAutosize
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={
                apiKey === ""
                  ? "Setup API key before using..."
                  : "Send command..."
              }
              className="textarea"
            />

            {!loadingChatResponse ? (
              <button
                onClick={() => {
                  handleSend(text, setLoadingChatResponse)
                  setText("")
                }}
                className="send-button"
                disabled={apiKey === ""}
              >
                ➤
              </button>
            ) : (
              <span>{loadingText}</span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.3rem",
            }}
          >
            <span
              className="action-text"
              onClick={() => setRequiresUndoAndRefresh(true)}
            >
              Undo
            </span>
            <span
              className="action-text"
              onClick={() => setApiKeyModalOpen(true)}
            >
              Set API Key
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

export default ChatBox
