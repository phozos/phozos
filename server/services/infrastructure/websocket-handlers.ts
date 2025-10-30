import { WebSocketService } from './websocket';
import type { IForumService } from '../domain/forum.service';

/**
 * Base handler interface for WebSocket domain-specific handlers
 */
export interface IWebSocketHandler {
  readonly name: string;
}

/**
 * Chat Message Handler
 * Handles real-time chat messages between students and counselors
 */
export class ChatMessageHandler implements IWebSocketHandler {
  readonly name = 'ChatMessageHandler';

  constructor(private wsService: WebSocketService) {}

  /**
   * Broadcast chat message to student and counselor
   */
  async broadcastChatMessage(studentId: string, counselorId: string, messageData: any): Promise<void> {
    const recipients = [studentId, counselorId];
    
    recipients.forEach(userId => {
      this.wsService.sendToUser(userId, {
        type: 'chat_message',
        data: messageData,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Broadcast message read status
   */
  async broadcastMessageReadStatus(studentId: string, counselorId: string, messageId: string, readData: any): Promise<void> {
    const recipients = [studentId, counselorId];
    
    recipients.forEach(userId => {
      this.wsService.sendToUser(userId, {
        type: 'message_read',
        data: {
          messageId,
          ...readData
        },
        timestamp: new Date().toISOString()
      });
    });
  }
}

/**
 * Notification Handler
 * Handles real-time notification delivery to users
 */
export class NotificationHandler implements IWebSocketHandler {
  readonly name = 'NotificationHandler';

  constructor(private wsService: WebSocketService) {}

  /**
   * Send notification to specific user
   */
  async sendNotification(userId: string, notification: any): Promise<void> {
    this.wsService.sendToUser(userId, {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Application Status Handler
 * Handles real-time application status updates
 */
export class ApplicationStatusHandler implements IWebSocketHandler {
  readonly name = 'ApplicationStatusHandler';

  constructor(private wsService: WebSocketService) {}

  /**
   * Send application update to user
   */
  async sendApplicationUpdate(userId: string, applicationData: any): Promise<void> {
    this.wsService.sendToUser(userId, {
      type: 'application_update',
      data: applicationData,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Forum Handler
 * Handles real-time forum updates including polls, posts, and comments
 */
export class ForumHandler implements IWebSocketHandler {
  readonly name = 'ForumHandler';

  constructor(
    private wsService: WebSocketService,
    private forumService?: IForumService
  ) {}

  /**
   * Broadcast poll update with user-specific privacy handling
   */
  async broadcastPollUpdateWithPrivacy(postId: string, votingUserId: string): Promise<void> {
    try {
      if (!this.forumService) {
        console.warn('ForumService not injected, skipping poll update broadcast');
        return;
      }

      const connections = this.wsService.getAuthenticatedConnections();
      
      for (const connection of connections) {
        try {
          const pollData = await this.forumService.getUserSpecificPollData(postId, connection.userId);
          
          if (pollData) {
            const message = {
              type: "poll_vote_update",
              data: {
                postId,
                pollOptions: pollData.pollOptions,
                userVotes: pollData.userVotes,
                showResults: pollData.showResults,
                votingUserId: votingUserId,
                timestamp: new Date().toISOString()
              }
            };

            this.wsService.sendToUser(connection.userId, message);
          }
        } catch (error) {
          console.error(`Failed to send poll update to user ${connection.userId}:`, error);
        }
      }
      
    } catch (error) {
      console.error("Error in broadcastPollUpdateWithPrivacy:", error);
    }
  }

  /**
   * Broadcast forum post created event
   */
  async broadcastPostCreated(postData: any): Promise<void> {
    this.wsService.broadcastToAll({
      type: 'forum_post_created',
      data: { post: postData },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast forum post updated event
   */
  async broadcastPostUpdated(postId: string): Promise<void> {
    this.wsService.broadcastToAll({
      type: 'forum_post_updated',
      data: { postId },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast post like update
   */
  async broadcastPostLikeUpdate(postId: string, likeCount: number, likedBy: string[]): Promise<void> {
    this.wsService.broadcastToAll({
      type: 'forum_post_like_update',
      data: { postId, likeCount, likedBy },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast comment created event
   */
  async broadcastCommentCreated(postId: string, commentData: any): Promise<void> {
    this.wsService.broadcastToAll({
      type: 'forum_comment_created',
      data: { postId, comment: commentData },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * WebSocket Event Handlers Manager
 * Centralizes all domain-specific WebSocket handlers
 */
export class WebSocketEventHandlers {
  public readonly chat: ChatMessageHandler;
  public readonly notification: NotificationHandler;
  public readonly applicationStatus: ApplicationStatusHandler;
  public readonly forum: ForumHandler;

  constructor(wsService: WebSocketService, forumService?: IForumService) {
    this.chat = new ChatMessageHandler(wsService);
    this.notification = new NotificationHandler(wsService);
    this.applicationStatus = new ApplicationStatusHandler(wsService);
    this.forum = new ForumHandler(wsService, forumService);
  }

  /**
   * Get all handlers for testing/debugging
   */
  getAllHandlers(): IWebSocketHandler[] {
    return [
      this.chat,
      this.notification,
      this.applicationStatus,
      this.forum
    ];
  }
}
