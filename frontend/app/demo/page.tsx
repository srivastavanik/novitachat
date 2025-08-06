'use client'

import Message from '@/components/chat/Message'

export default function DemoPage() {
  const demoMessages = [
    {
      id: '1',
      content: 'Hello Nova! Can you help me understand how to use async/await in JavaScript?',
      role: 'user' as const,
      created_at: new Date().toISOString(),
      user: {
        username: 'John Doe'
      }
    },
    {
      id: '2',
      content: `Of course! I'd be happy to help you understand async/await in JavaScript.

## What is async/await?

\`async/await\` is a modern way to handle asynchronous operations in JavaScript. It makes asynchronous code look and behave more like synchronous code, making it easier to read and write.

### Basic Syntax

\`\`\`javascript
// Async function declaration
async function fetchData() {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  return data;
}
\`\`\`

### Key Points:

1. **async keyword**: Declares an asynchronous function
2. **await keyword**: Pauses execution until the promise resolves
3. **Error handling**: Use try/catch blocks for handling errors

Would you like me to show you more examples?`,
      role: 'assistant' as const,
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      content: 'Yes, please! Can you show me how to handle errors with async/await?',
      role: 'user' as const,
      created_at: new Date().toISOString(),
      user: {
        username: 'John Doe'
      }
    },
    {
      id: '4',
      content: `Absolutely! Error handling with async/await is straightforward using try/catch blocks:

\`\`\`javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const userData = await response.json();
    console.log('User data:', userData);
    return userData;
    
  } catch (error) {
    console.error('Error fetching user data:', error);
    // Handle the error appropriately
    return null;
  }
}
\`\`\`

This approach makes error handling much cleaner than traditional promise chains!`,
      role: 'assistant' as const,
      created_at: new Date().toISOString()
    }
  ]

  return (
    <div className="min-h-screen bg-[var(--nova-bg-primary)]">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--nova-bg-secondary)] border-b border-[var(--nova-border-primary)] p-4">
          <h1 className="nova-h2 text-center">Nova Chat Demo</h1>
          <p className="text-center nova-text-muted mt-2">
            Showcasing the updated message interface with Novita AI branding
          </p>
        </div>
        
        <div className="nova-slide-up">
          {demoMessages.map((message) => (
            <Message
              key={message.id}
              message={message}
              isStreaming={false}
            />
          ))}
        </div>
        
        <div className="p-4 bg-[var(--nova-bg-secondary)] border-t border-[var(--nova-border-primary)]">
          <p className="text-center nova-text-muted text-sm">
            This is a demo showcasing the updated chat interface. In the actual app, messages stream in real-time.
          </p>
        </div>
      </div>
    </div>
  )
}
