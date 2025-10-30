import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { JwtService } from '../../security/jwtService';
import type { IForumService } from '../domain/forum.service';
import { BaseService } from '../base.service';
import { container, TYPES } from '../container';

/**
 * WebSocket Service - Core Connection Management (Phase 5.4)
 * 
 * Responsibilities:
 * - WebSocket server initialization and lifecycle
 * - Connection management (connect, authenticate, disconnect)
 * - Core message routing (sendToUser, broadcastToAll)
 * - Authentication via JWT
 * - Basic connection monitoring and statistics
 * 
 * Domain-specific message handling is delegated to WebSocketEventHandlers:
 * - ChatMessageHandler - Chat messages and read status
 * - NotificationHandler - User notifications
 * - ApplicationStatusHandler - Application updates
 * - ForumHandler - Forum posts, polls, and comments
 */

interface SimpleConnection {
  id: string;
  userId?: string;
  ws: WebSocket;
}

export class WebSocketService extends BaseService {
  private wss: WebSocketServer;
  private connections = new Map<string, SimpleConnection>();
  private jwtService: JwtService;

  constructor(
    server: Server,
    private forumService?: IForumService,
    jwtService: JwtService = container.get<JwtService>(TYPES.JwtService)
  ) {
    super();
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.jwtService = jwtService;
    this.setupEventHandlers();
    this.startBasicMonitoring();
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const connectionId = this.generateConnectionId();
      const connection: SimpleConnection = {
        id: connectionId,
        ws
      };

      this.connections.set(connectionId, connection);
      console.log(`WebSocket connected: ${connectionId} (${this.connections.size} total)`);

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(connectionId, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          this.sendToConnection(connectionId, {
            type: 'error',
            message: 'Invalid message format'
          });
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.connections.delete(connectionId);
        console.log(`WebSocket disconnected: ${connectionId} (${this.connections.size} remaining)`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        this.connections.delete(connectionId);
      });

      // Send welcome message
      this.sendToConnection(connectionId, {
        type: 'connected',
        connectionId,
        timestamp: new Date().toISOString()
      });
    });
  }

  private handleMessage(connectionId: string, message: any) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    switch (message.type) {
      case 'authenticate':
        // Secure authentication: verify JWT token instead of trusting client userId
        try {
          if (!message.token) {
            this.sendToConnection(connectionId, {
              type: 'auth_error',
              message: 'Authentication token required'
            });
            return;
          }

          // Verify JWT token and extract userId from verified payload
          const payload = this.jwtService.verify(message.token);
          connection.userId = payload.userId;
          
          this.sendToConnection(connectionId, {
            type: 'authenticated',
            userId: payload.userId
          });
          console.log(`🔐 User authenticated via JWT: ${payload.userId}`);
        } catch (error) {
          console.error('WebSocket authentication failed:', error);
          this.sendToConnection(connectionId, {
            type: 'auth_error',
            message: 'Invalid authentication token'
          });
          // Close connection for security
          connection.ws.close(1008, 'Authentication failed');
          this.connections.delete(connectionId);
        }
        break;

      case 'ping':
        this.sendToConnection(connectionId, {
          type: 'pong',
          timestamp: new Date().toISOString()
        });
        break;

      case 'subscribe':
        // Simple subscription handling
        this.sendToConnection(connectionId, {
          type: 'subscribed',
          topic: message.topic,
          timestamp: new Date().toISOString()
        });
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connectionId: string, message: any) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send to connection ${connectionId}:`, error);
      }
    }
  }

  /**
   * Send message to specific user (all their connections)
   */
  public async sendToUser(userId: string, message: any) {
    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId && conn.ws.readyState === WebSocket.OPEN);

    userConnections.forEach(connection => {
      this.sendToConnection(connection.id, message);
    });
  }

  /**
   * Broadcast message to all connected users
   */
  public broadcastToAll(message: any) {
    const connections = Array.from(this.connections.values())
      .filter(conn => conn.ws.readyState === WebSocket.OPEN);
    
    connections.forEach(connection => {
      this.sendToConnection(connection.id, message);
    });
  }

  /**
   * Get all authenticated connections (for domain handlers)
   */
  public getAuthenticatedConnections(): Array<{ userId: string; connectionId: string }> {
    return Array.from(this.connections.values())
      .filter(conn => conn.userId && conn.ws.readyState === WebSocket.OPEN)
      .map(conn => ({ userId: conn.userId!, connectionId: conn.id }));
  }

  /**
   * Get basic connection statistics
   */
  public getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      authenticatedConnections: Array.from(this.connections.values()).filter(c => c.userId).length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Basic monitoring - simple connection count logging
   */
  private startBasicMonitoring() {
    setInterval(() => {
      const activeConnections = this.connections.size;
      console.log(`WebSocket monitoring: ${activeConnections} active connections | Peak: ${Math.max(activeConnections, 0)} | Total messages: 0`);
    }, 30000); // Every 30 seconds
  }

  /**
   * Generate simple connection ID
   */
  private generateConnectionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Clean shutdown
   */
  public close() {
    this.wss.close();
  }
}