import { useEffect, useRef, useState, useCallback } from "react";
import { APP_CONFIG } from "@/lib/constants";
import { useToast } from "./use-toast";
import { getAuthToken } from "@/lib/api-client";

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  userId?: string;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    userId
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverLoad, setServerLoad] = useState<{ connections: number; limit: number } | null>(null);
  
  const { toast } = useToast();
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastPingRef = useRef<Date>(new Date());
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      // Validate browser context before attempting connection
      if (typeof window === 'undefined') {
        console.warn('WebSocket: Browser context not ready, deferring connection');
        setTimeout(connect, 1000); // Retry after 1 second
        return;
      }
      
      // Support explicit WebSocket URL for split deployments (e.g., Vercel + Render)
      // Falls back to auto-detection for monolithic deployments (Replit, local dev)
      const wsUrl = import.meta.env.VITE_WS_URL || (() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        
        // Get host with fallback for Replit environment
        const getWebSocketHost = () => {
          // For Replit environment, use the current domain
          if (window.location.hostname.includes('replit.dev')) {
            return window.location.host || window.location.hostname;
          }
          
          // Fallback with proper validation
          return window.location.host || 'localhost:5000';
        };

        return `${protocol}//${getWebSocketHost()}/ws`;
      })();
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        lastPingRef.current = new Date();
        
        // Authenticate if userId is provided (with small delay to ensure connection is ready)
        if (userId) {
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              const token = getAuthToken();
              if (token) {
                wsRef.current.send(JSON.stringify({
                  type: "authenticate",
                  token
                }));
                console.log("🔐 Sent authentication token to WebSocket");
              } else {
                console.error("❌ No auth token found for WebSocket authentication");
              }
            }
          }, 100);
        }
        
        // Start heartbeat/ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: "ping",
              timestamp: new Date().toISOString()
            }));
          }
        }, 20000); // Send ping every 20 seconds
        
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle system messages
          if (message.type === "connected") {
            setConnectionId(message.data?.connectionId || null);
          } else if (message.type === "authenticated") {
            console.log("WebSocket authenticated for user:", message.data?.userId);
          } else if (message.type === "pong") {
            lastPingRef.current = new Date();
          } else if (message.type === "system_alert") {
            // Handle server load alerts
            const { level, message: alertMessage, data } = message.data || {};
            setServerLoad(data);
            
            // Show toast notifications for system alerts
            if (level === "warning") {
              toast({
                title: "⚠️ High Server Load",
                description: alertMessage || `${data.connections} users connected`,
                duration: 8000,
              });
            } else if (level === "critical") {
              toast({
                title: "🚨 Server At Capacity",
                description: alertMessage || `${data.connections}/${data.limit} users - some features may be slower`,
                duration: 12000,
              });
            }
          } else if (message.type === "rate_limit_exceeded") {
            toast({
              title: "Rate Limit",
              description: "Please slow down your requests",
              duration: 5000,
            });
          }
          
          onMessage?.(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        setConnectionId(null);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        onDisconnect?.();
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Connection error");
        onError?.(error);
      };

    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      
      // Handle specific WebSocket URL construction errors
      if (error instanceof Error && error.message.includes('invalid')) {
        setError("Invalid WebSocket URL - retrying in 2 seconds");
        setTimeout(connect, 2000);
      } else {
        setError("Failed to connect");
      }
    }
  }, [onMessage, onConnect, onDisconnect, onError, autoReconnect, userId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionId(null);
  }, []);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date().toISOString()
      };
      wsRef.current.send(JSON.stringify(messageWithTimestamp));
      return true;
    }
    return false;
  }, []);

  const ping = useCallback(() => {
    sendMessage({ type: "ping" });
  }, [sendMessage]);

  const subscribe = useCallback((topic: string) => {
    sendMessage({ type: "subscribe", data: { topic } });
  }, [sendMessage]);

  // Start connection on mount (only if userId is provided)
  useEffect(() => {
    // Add browser context validation
    if (userId && typeof window !== 'undefined' && window.location) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [userId]); // Only depend on userId to prevent reconnection loops

  return {
    isConnected,
    connectionId,
    error,
    serverLoad,
    connect,
    disconnect,
    sendMessage,
    ping,
    subscribe
  };
}
