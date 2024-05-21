import React, { useState } from "react"
import TextareaAutosize from "react-textarea-autosize"
import "../chatBox.css"

interface ChatBoxProps {
  handleSend: (text: string) => void
}

const ChatBox: React.FC<ChatBoxProps> = ({ handleSend }) => {
  const [text, setText] = useState("")

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSend(text)
      setText("")
    }
  }

  return (
    <div className="chat-box">
      <TextareaAutosize
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Send command..."
        className="textarea"
      />
      <button
        onClick={() => {
          handleSend(text)
          setText("")
        }}
        className="send-button"
      >
        ➤
      </button>
    </div>
  )
}

export default ChatBox
