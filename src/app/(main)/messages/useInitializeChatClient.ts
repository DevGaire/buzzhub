import kyInstance from "@/lib/ky";
import { withRetry, handleError } from "@/lib/error-handling";
import { toast } from "@/components/ui/use-toast";
import { useEffect, useState, useCallback } from "react";
import { StreamChat } from "stream-chat";
import { useSession } from "../SessionProvider";

interface ChatClientState {
  chatClient: StreamChat | null;
  isLoading: boolean;
  error: Error | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed';
}

export default function useInitializeChatClient() {
  const { user } = useSession();
  const [state, setState] = useState<ChatClientState>({
    chatClient: null,
    isLoading: true,
    error: null,
    connectionStatus: 'disconnected'
  });

  const connectClient = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null, connectionStatus: 'connecting' }));
    
    try {
      const client = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_KEY!);
      
      // Use retry logic for connection
      await withRetry(
        async () => {
          const tokenResponse = await kyInstance
            .get("/api/get-token")
            .json<{ token: string }>();
          
          await client.connectUser(
            {
              id: user.id,
              username: user.username || undefined,
              name: user.displayName,
              image: user.avatarUrl || undefined,
            },
            tokenResponse.token
          );
          
          return client;
        },
        {
          maxAttempts: 3,
          delayMs: 2000,
          backoff: true,
          onRetry: (attempt, error) => {
            console.warn(`Chat connection attempt ${attempt} failed:`, error);
            toast({
              title: "Connection Issues",
              description: `Retrying chat connection... (Attempt ${attempt})`,
              variant: "default",
            });
          }
        }
      );
      
      setState({
        chatClient: client,
        isLoading: false,
        error: null,
        connectionStatus: 'connected'
      });
      
      // Set up connection monitoring
      client.on('connection.changed', (event) => {
        setState(prev => ({
          ...prev,
          connectionStatus: event.online ? 'connected' : 'disconnected'
        }));
        
        if (!event.online) {
          toast({
            title: "Connection Lost",
            description: "Chat connection lost. Trying to reconnect...",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Connected",
            description: "Chat connection restored.",
            variant: "default",
          });
        }
      });
      
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      setState({
        chatClient: null,
        isLoading: false,
        error: error as Error,
        connectionStatus: 'failed'
      });
      
      handleError(error, 'Chat Connection');
    }
  }, [user.id, user.username, user.displayName, user.avatarUrl]);

  const retry = useCallback(() => {
    connectClient();
  }, [connectClient]);

  useEffect(() => {
    connectClient();

    return () => {
      if (state.chatClient) {
        setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        state.chatClient
          .disconnectUser()
          .catch((error) => console.error("Failed to disconnect user", error))
          .then(() => console.log("Chat connection closed"));
      }
    };
  }, [connectClient]);

  return {
    chatClient: state.chatClient,
    isLoading: state.isLoading,
    error: state.error,
    connectionStatus: state.connectionStatus,
    retry
  };
}
