import { useContext, useState } from 'react'
import { FontIcon, Stack, TextField } from '@fluentui/react'
import { SendRegular } from '@fluentui/react-icons'

import Send from '../../assets/Send.svg'

import styles from './QuestionInput.module.css'
import { ChatMessage } from '../../api'
import { AppStateContext } from '../../state/AppProvider'

interface Props {
  onSend: (question: ChatMessage['content'], id?: string) => void
  disabled: boolean
  placeholder?: string
  clearOnSend?: boolean
  conversationId?: string
}

export const QuestionInput = ({ onSend, disabled, placeholder, clearOnSend, conversationId }: Props) => {
  const [question, setQuestion] = useState<string>('')
  const [base64File, setBase64File] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const appStateContext = useContext(AppStateContext)
  const OYD_ENABLED = appStateContext?.state.frontendSettings?.oyd_enabled || false;
  const allowedFileExtensions = appStateContext?.state.frontendSettings?.allowed_file_extensions || "";

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const fileExtension = "." + file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = allowedFileExtensions.split(',');

      if (!allowedExtensions.includes(fileExtension)) {
        alert(`File type not allowed. Please upload one of the following file types: ${allowedFileExtensions}`);
        // Clear the file input
        event.target.value = "";
        setFileName(null);
        setBase64File(null);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
      await convertToBase64(file);
    }
  };

  const convertToBase64 = async (file: Blob) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64File(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const sendQuestion = () => {
    if (disabled || !question.trim()) {
      return
    }

    let fileContentPart: { type: "image_url"; image_url: { url: string } } | { type: "file"; file: { url: string; name: string } } | null = null;

    if (base64File && selectedFile && fileName) { // Ensure selectedFile and fileName are also checked
      if (selectedFile.type.startsWith('image/')) {
        fileContentPart = { type: "image_url", image_url: { url: base64File } };
      } else {
        fileContentPart = { type: "file", file: { url: base64File, name: fileName } };
      }
    }

    const questionTextPart = { type: "text" as "text", text: question }; // Added "as text" for type consistency
    const contentForRequest: ChatMessage["content"] = fileContentPart ? [questionTextPart, fileContentPart] : question.toString();


    if (conversationId) {
      onSend(contentForRequest, conversationId);
    } else {
      onSend(contentForRequest);
    }

    if (clearOnSend) {
      setQuestion('');
    }
    setBase64File(null);
    setFileName(null);
    setSelectedFile(null);
  }

  const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
    if (ev.key === 'Enter' && !ev.shiftKey && !(ev.nativeEvent?.isComposing === true)) {
      ev.preventDefault()
      sendQuestion()
    }
  }

  const onQuestionChange = (_ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
    setQuestion(newValue || '')
  }

  const sendQuestionDisabled = disabled || !question.trim()

  return (
    <Stack horizontal className={styles.questionInputContainer}>
      <TextField
        className={styles.questionInputTextArea}
        placeholder={placeholder}
        multiline
        resizable={false}
        borderless
        value={question}
        onChange={onQuestionChange}
        onKeyDown={onEnterPress}
      />
      {!OYD_ENABLED && (
        <div className={styles.fileInputContainer}>
          <input
            type="file"
            id="fileInput"
            onChange={(event) => handleFileUpload(event)}
            accept={allowedFileExtensions}
            className={styles.fileInput}
          />
          <label htmlFor="fileInput" className={styles.fileLabel} aria-label='Upload File'>
            <FontIcon
              className={styles.fileIcon}
              iconName={'PhotoCollection'}
              aria-label='Upload File'
            />
          </label>
        </div>)}
      {fileName && <p className={styles.uploadedFile}>{fileName}</p>}
      <div
        className={styles.questionInputSendButtonContainer}
        role="button"
        tabIndex={0}
        aria-label="Ask question button"
        onClick={sendQuestion}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? sendQuestion() : null)}>
        {sendQuestionDisabled ? (
          <SendRegular className={styles.questionInputSendButtonDisabled} />
        ) : (
          <img src={Send} className={styles.questionInputSendButton} alt="Send Button" />
        )}
      </div>
      <div className={styles.questionInputBottomBorder} />
    </Stack>
  )
}
