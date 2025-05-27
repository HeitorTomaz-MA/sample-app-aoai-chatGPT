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
  const [base64File, setBase64File] = useState<string | null>(null); // Keep for potential image previews if needed later
  const [fileName, setFileName] = useState<string | null>(null); // For immediate UI feedback on selection
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const appStateContext = useContext(AppStateContext)
  const OYD_ENABLED = appStateContext?.state.frontendSettings?.oyd_enabled || false;
  const allowedFileExtensions = appStateContext?.state.frontendSettings?.allowed_file_extensions || "";

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Clear previous upload states
    setUploadedFileId(null);
    setUploadedFileName(null);
    setBase64File(null);
    setSelectedFile(null);
    setFileName(null); // Clear displayed name from previous selection

    const file = event.target.files?.[0];

    if (file) {
      const fileExtension = "." + file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = allowedFileExtensions.split(',');

      if (!allowedExtensions.includes(fileExtension)) {
        alert(`File type not allowed. Please upload one of the following file types: ${allowedFileExtensions}`);
        event.target.value = ""; // Clear the file input
        return;
      }

      setSelectedFile(file); // Store the selected file object
      setFileName(file.name); // For immediate UI feedback

      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload_azure_openai_file", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          setUploadedFileId(result.file_id);
          setUploadedFileName(result.filename);
          setFileName(result.filename); // Update displayed name to the one confirmed by backend
          setBase64File(null); // Clear base64 preview if file is uploaded via ID
        } else {
          const errorResult = await response.text();
          console.error("File upload failed:", errorResult);
          alert("File upload failed: " + errorResult);
          // Clear all file states on error
          setUploadedFileId(null);
          setUploadedFileName(null);
          setFileName(null);
          setSelectedFile(null);
          setBase64File(null);
          event.target.value = ""; // Clear the file input
        }
      } catch (error) {
        console.error("File upload exception:", error);
        alert("File upload failed: " + (error as Error).message);
        // Clear all file states on exception
        setUploadedFileId(null);
        setUploadedFileName(null);
        setFileName(null);
        setSelectedFile(null);
        setBase64File(null);
        event.target.value = ""; // Clear the file input
      } finally {
        setIsUploading(false);
      }
    } else {
        event.target.value = ""; // Clear the file input if no file was selected or selection was cancelled
    }
  };

  const sendQuestion = () => {
    if (disabled || !question.trim() || isUploading) { // Disable send if uploading
      return
    }

    let fileContentPart: { type: "image_url"; image_url: { url: string } } | { type: "file"; file: { url: string; name: string } } | null = null;

    // If a file has been uploaded and has an ID, use it.
    if (uploadedFileId && uploadedFileName) {
        // The API expects { type: "file", file: { file_id: string; name: string } }
        // This will be used to construct the message content.
        fileContentPart = { type: "file", file: { file_id: uploadedFileId, name: uploadedFileName } };
    }
    // No more base64 image sending; all files are expected to be uploaded and referenced by ID.


    const questionTextPart = { type: "text" as "text", text: question };
    const contentForRequest: ChatMessage["content"] = fileContentPart ? [questionTextPart, fileContentPart] : question.toString();

    if (conversationId) {
      onSend(contentForRequest, conversationId);
    } else {
      onSend(contentForRequest);
    }

    if (clearOnSend) {
      setQuestion('');
    }
    // Clear all file related states
    setBase64File(null);
    setFileName(null);
    setSelectedFile(null);
    setUploadedFileId(null);
    setUploadedFileName(null);
    // Reset the file input visually
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = "";
    }
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

  const sendQuestionDisabled = disabled || !question.trim() || isUploading

  const clearUploadedFile = () => {
    setUploadedFileId(null);
    setUploadedFileName(null);
    setFileName(null);
    setSelectedFile(null);
    setBase64File(null); // if used for previews
    // Reset the file input visually
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = "";
    }
  };

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
        disabled={isUploading} // Disable text field during upload
      />
      {!OYD_ENABLED && (
        <div className={styles.fileInputContainer}>
          <input
            type="file"
            id="fileInput"
            onChange={(event) => handleFileUpload(event)}
            accept={allowedFileExtensions}
            className={styles.fileInput}
            disabled={isUploading} // Disable file input during upload
          />
          <label htmlFor="fileInput" className={styles.fileLabel} aria-label='Upload File'>
            <FontIcon
              className={styles.fileIcon}
              iconName={'PhotoCollection'}
              aria-label='Upload File'
            />
          </label>
        </div>)}
      {isUploading && <div className={styles.uploadingMessage}>Uploading...</div>}
      {!isUploading && uploadedFileName && (
        <div className={styles.uploadedFileDisplay}>
          Attached: {uploadedFileName} 
          <button onClick={clearUploadedFile} className={styles.clearFileButton}>X</button>
        </div>
      )}
      {/* Display for base64 image preview if that logic is kept separate and base64File is populated */}
      {/* {!isUploading && !uploadedFileName && base64File && selectedFile?.type.startsWith('image/') && (
        <div className={styles.uploadedFileDisplay}>
          <img src={base64File} alt="Preview" style={{ maxWidth: '50px', maxHeight: '50px' }} />
          {fileName}
          <button onClick={clearUploadedFile} className={styles.clearFileButton}>X</button>
        </div>
      )} */}
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
