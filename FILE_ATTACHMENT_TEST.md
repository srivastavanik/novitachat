# File Attachment Verification

## Frontend → Backend Flow

### 1. Frontend (ChatInput.tsx)
- ✅ File selection handled with `fileInputRef` and `imageInputRef`
- ✅ Files converted to base64 using `fileToBase64` function
- ✅ Attachments formatted as:
  ```javascript
  {
    name: att.file.name,
    type: att.type === 'image' ? 'image' : 'document',
    mimeType: att.file.type,
    size: att.file.size,
    data: base64
  }
  ```
- ✅ Attachments included in `messageData` sent via socket

### 2. Socket Communication (chat/page.tsx)
- ✅ Socket emits `chat:stream` with messageData including attachments
- ✅ Message data structure:
  ```javascript
  {
    conversationId: string,
    content: string,
    userId: string,
    attachments: [...],
    webSearch?: boolean,
    deepResearch?: boolean,
    thinking?: boolean,
    style?: any
  }
  ```

### 3. Backend (chat.controller.ts)
- ✅ `handleStreamingChat` receives attachments in data parameter
- ✅ Saves attachments using:
  ```javascript
  await MessageModel.addAttachment(userMessage.id, {
    filename: attachment.name,
    mime_type: attachment.mimeType,
    size: attachment.size,
    type: attachment.type,
    data: attachment.data
  });
  ```
- ✅ Returns attachments with user message

### 4. Display (Message.tsx)
- ✅ Displays image attachments with base64 data
- ✅ Shows document attachments with download links
- ✅ Properly formats file sizes

## Testing Steps

1. **Test Image Upload**:
   - Click the image button (camera icon)
   - Select an image file
   - Verify preview appears in ChatInput
   - Send message
   - Check if image appears in the message

2. **Test Document Upload**:
   - Click the paperclip button
   - Select a PDF or text file
   - Verify file info appears in ChatInput
   - Send message
   - Check if file appears with download link

3. **Debug with Browser DevTools**:
   - Open Network tab
   - Filter by WS (WebSocket)
   - Send a message with attachment
   - Check the "chat:stream" event payload
   - Verify attachments array is included

4. **Backend Logs**:
   - Check console logs for "Saved attachments" messages
   - Verify attachment data is being saved to database

## Common Issues & Solutions

### Issue: Attachments not showing in message
**Solution**: Check if `messageWithAttachments` is being properly sent in `user_message_saved` event

### Issue: Large files failing
**Solution**: Check `MAX_FILE_SIZE` environment variable (default: 10MB)

### Issue: Images not displaying
**Solution**: Verify base64 data format and MIME type are correct

### Issue: Attachments array empty in socket
**Solution**: 
1. Add console.log in handleSendMessage:
   ```javascript
   console.log('Sending attachments:', messageData.attachments);
   ```
2. Check if attachments are being passed from ChatInput onSend callback

## Quick Debug Code

Add this to `handleSendMessage` in chat/page.tsx:
```javascript
console.log('Message data being sent:', {
  ...messageData,
  attachments: messageData.attachments?.map(a => ({
    name: a.name,
    type: a.type,
    size: a.size,
    hasData: !!a.data
  }))
});
```

Add this to backend `handleStreamingChat`:
```javascript
console.log('Received attachments:', attachments?.map(a => ({
  name: a.name,
  type: a.type,
  size: a.size,
  hasData: !!a.data
})));
