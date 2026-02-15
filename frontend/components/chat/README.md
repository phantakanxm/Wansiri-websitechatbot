# Chatbot UI Components

A modern, responsive chatbot interface built with Next.js, shadcn/ui, and Tailwind CSS.

## Features

- 🎨 **Modern Design** - Clean, professional UI with glassmorphism effects
- 🌙 **Dark Mode Support** - Automatic theme switching with next-themes
- 📝 **Markdown Rendering** - Full markdown support with code highlighting
- 🌍 **Multi-language** - Support for Thai, English, and Korean
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- ⚡ **Streaming Ready** - Built-in support for streaming responses
- 🎯 **Type Safe** - Full TypeScript support

## Components

### ChatContainer

Main wrapper component that handles message display and scrolling.

```tsx
import { ChatContainer } from '@/components/chat';

<ChatContainer
  messages={messages}
  isTyping={isLoading}
  onSuggestionClick={handleSuggestion}
  emptyStateSuggestions={suggestions}
/>
```

**Props:**
- `messages` - Array of chat messages
- `isTyping` - Show typing indicator
- `onSuggestionClick` - Callback when suggestion is clicked
- `emptyStateSuggestions` - Suggestions for empty state

### ChatMessage

Individual message bubble with markdown and code highlighting.

```tsx
import { ChatMessage } from '@/components/chat';

<ChatMessage 
  message={message} 
  onRetry={handleRetry}
/>
```

**Props:**
- `message` - ChatMessage object
- `onRetry` - Optional callback for retry on error

### ChatInput

Input field with auto-resize, keyboard shortcuts, and send button.

```tsx
import { ChatInput } from '@/components/chat';

<ChatInput
  onSend={handleSend}
  isLoading={isLoading}
  placeholder="Type a message..."
/>
```

**Props:**
- `onSend` - Callback when message is sent
- `isLoading` - Show loading state
- `placeholder` - Input placeholder text

### TypingIndicator

Animated dots to indicate AI is typing.

```tsx
import { TypingIndicator } from '@/components/chat';

<TypingIndicator />
```

### EmptyState

Welcome screen with suggestion buttons.

```tsx
import { EmptyState } from '@/components/chat';

<EmptyState
  title="Welcome"
  description="How can I help you?"
  suggestions={['Option 1', 'Option 2']}
  onSuggestionClick={handleSuggestion}
/>
```

## Hooks

### useChat

Manage chat state and API interactions.

```tsx
import { useChat } from '@/lib/hooks/use-chat';

const { messages, isLoading, sendMessage, resetSession } = useChat({
  apiUrl: '/api/chat',
  onError: (error) => console.error(error),
});
```

### useChatLanguage

Manage language selection and detection.

```tsx
import { useChatLanguage } from '@/lib/hooks/use-chat';

const { 
  languageMode, 
  selectedLanguage, 
  selectLanguage,
  resetToAuto 
} = useChatLanguage();
```

## Complete Example

```tsx
'use client';

import { ChatContainer, ChatInput } from '@/components/chat';
import { useChat, useChatLanguage } from '@/lib/hooks/use-chat';

export default function ChatPage() {
  const { messages, isLoading, sendMessage, resetSession } = useChat({
    apiUrl: '/api/chat',
  });

  const { suggestions } = useChatLanguage();

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        <ChatContainer
          messages={messages}
          isTyping={isLoading}
          onSuggestionClick={sendMessage}
          emptyStateSuggestions={suggestions}
        />
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
```

## Styling

Components use Tailwind CSS with custom CSS variables for theming. Key features:

- Custom scrollbar styling
- Glassmorphism effects via `.glass` class
- Animation utilities (fade-in, slide-up, bounce-fast)
- Prose styles for markdown content

## Customization

### Changing Colors

Edit CSS variables in `globals.css`:

```css
:root {
  --primary: 222 47% 31%;
  --accent: 263 70% 50%;
}
```

### Adding Languages

Add to `lib/chat-config.ts`:

```typescript
export const LANGUAGE_CONFIG = {
  ...existing languages...,
  jp: {
    name: '日本語',
    flag: '🇯🇵',
    suggestions: ['...'],
  },
};
```

## File Structure

```
components/chat/
├── chat-container.tsx    # Message list container
├── chat-message.tsx      # Individual message bubble
├── chat-input.tsx        # Input with send button
├── typing-indicator.tsx  # Loading animation
├── empty-state.tsx       # Welcome screen
└── index.ts              # Barrel exports

lib/
├── chat-config.ts        # Types and configuration
└── hooks/
    └── use-chat.ts       # Chat state management
```
