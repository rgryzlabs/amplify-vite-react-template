import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import { uploadData, getUrl, remove } from 'aws-amplify/storage';

const client = generateClient<Schema>();

function App() {
  const { user, signOut } = useAuthenticator();
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
    loadProfilePicture();
  }, []);

  async function loadProfilePicture() {
    try {
      if (user?.userId) {
        const imageKey = `profiles/${user.userId}/profile.jpg`;
        const { url } = await getUrl({ key: imageKey });
        setProfilePicture(url.toString());
      }
    } catch (error) {
      console.log('No profile picture found');
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user?.userId) return;

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const imageKey = `profiles/${user.userId}/profile.jpg`;
      
      // Upload the file to S3
      await uploadData({
        key: imageKey,
        data: file,
        options: {
          contentType: file.type,
        }
      });

      // Reload the profile picture
      await loadProfilePicture();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function createTodo() {
    client.models.Todo.create({ content: window.prompt("Todo content") });
  }
    
  function deleteTodo(id: string) {
    client.models.Todo.delete({ id })
  }

  async function handleAskAI(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {  // You'll need to create this endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      setResponse(data.response);
    } catch (error) {
      console.error('Error asking AI:', error);
      setResponse('Sorry, there was an error processing your request.');
    } finally {
      setIsLoading(false);
      setPrompt('');
    }
  }

  return (
    <main>
      <div className="profile-section">
        {(previewUrl || profilePicture) && (
          <img 
            src={previewUrl || profilePicture || ''}
            alt="Profile" 
            style={{ width: 100, height: 100, borderRadius: '50%' }}
          />
        )}
        <div className="upload-section">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ marginBottom: '1rem' }}
          />
        </div>
      </div>

      <h1>{user?.signInDetails?.loginId}'s todos</h1>
      <button onClick={createTodo}>+ new</button>
      <ul>
        {todos.map((todo) => (
          <li 
            onClick={() => deleteTodo(todo.id)}
            key={todo.id}>
            {todo.content}
          </li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>

      <div className="chat-section">
        <h2>Ask AI</h2>
        <form onSubmit={handleAskAI} className="chat-form">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask me anything..."
            className="chat-input"
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="chat-button"
          >
            {isLoading ? 'Thinking...' : 'Ask'}
          </button>
        </form>
        {response && (
          <div className="chat-response">
            <p>{response}</p>
          </div>
        )}
      </div>

      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default App;
