const Redis = require('ioredis');
const EventEmitter = require('events');

/**
 * Message Queue utility using Redis
 */
class MessageQueue extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
  }

  /**
   * Connect to Redis
   */
  async connect() {
    try {
      const config = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      };

      // Create Redis instances
      this.redis = new Redis(config);
      this.publisher = new Redis(config);
      this.subscriber = new Redis(config);

      // Connect all instances
      await Promise.all([
        this.redis.connect(),
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      this.isConnected = true;

      // Handle connection events
      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error);
        this.isConnected = false;
        this.emit('error', error);
      });

      this.redis.on('connect', () => {
        console.log('📨 Connected to Redis message queue');
        this.isConnected = true;
        this.emit('connected');
      });

      this.redis.on('close', () => {
        console.warn('⚠️ Redis connection closed');
        this.isConnected = false;
        this.emit('disconnected');
      });

      console.log('📨 Redis message queue initialized');
      return this;
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.redis) await this.redis.disconnect();
      if (this.publisher) await this.publisher.disconnect();
      if (this.subscriber) await this.subscriber.disconnect();
      
      this.isConnected = false;
      console.log('📨 Disconnected from Redis');
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error);
      throw error;
    }
  }

  /**
   * Publish a message to a queue/topic
   */
  async publish(topic, message, options = {}) {
    try {
      if (!this.isConnected) {
        throw new Error('Message queue not connected');
      }

      const messageData = {
        id: this.generateMessageId(),
        timestamp: new Date().toISOString(),
        data: message,
        options,
        retryCount: 0
      };

      const serialized = JSON.stringify(messageData);
      
      if (options.delay) {
        // Delayed message using sorted set
        const score = Date.now() + options.delay;
        await this.redis.zadd(`delayed:${topic}`, score, serialized);
      } else {
        // Immediate message using list
        await this.redis.lpush(topic, serialized);
      }

      console.log(`📤 Published message to ${topic}:`, messageData.id);
      return messageData.id;
    } catch (error) {
      console.error('❌ Failed to publish message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a queue/topic and process messages
   */
  async subscribe(topic, handler, options = {}) {
    try {
      if (!this.isConnected) {
        throw new Error('Message queue not connected');
      }

      const { concurrency = 1, maxRetries = 3 } = options;

      console.log(`📥 Subscribing to ${topic} with concurrency: ${concurrency}`);

      // Process delayed messages
      this.processDelayedMessages(topic);

      // Process regular messages
      for (let i = 0; i < concurrency; i++) {
        this.processMessages(topic, handler, maxRetries);
      }

      return this;
    } catch (error) {
      console.error('❌ Failed to subscribe to topic:', error);
      throw error;
    }
  }

  /**
   * Process messages from a topic
   */
  async processMessages(topic, handler, maxRetries) {
    while (this.isConnected) {
      try {
        // Blocking pop from the right (FIFO)
        const result = await this.redis.brpop(topic, 5);
        
        if (result) {
          const [queueName, messageJson] = result;
          await this.handleMessage(messageJson, handler, maxRetries, topic);
        }
      } catch (error) {
        console.error(`❌ Error processing messages from ${topic}:`, error);
        // Wait before retrying
        await this.sleep(1000);
      }
    }
  }

  /**
   * Process delayed messages
   */
  async processDelayedMessages(topic) {
    const delayedKey = `delayed:${topic}`;
    
    setInterval(async () => {
      try {
        if (!this.isConnected) return;

        const now = Date.now();
        const messages = await this.redis.zrangebyscore(
          delayedKey, 
          '-inf', 
          now, 
          'LIMIT', 
          0, 
          10
        );

        for (const messageJson of messages) {
          // Move to regular queue
          await this.redis.lpush(topic, messageJson);
          await this.redis.zrem(delayedKey, messageJson);
        }
      } catch (error) {
        console.error('❌ Error processing delayed messages:', error);
      }
    }, 1000); // Check every second
  }

  /**
   * Handle individual message
   */
  async handleMessage(messageJson, handler, maxRetries, topic) {
    try {
      const message = JSON.parse(messageJson);
      
      console.log(`📨 Processing message ${message.id} from ${topic}`);

      // Execute handler
      await handler(message.data, message);
      
      console.log(`✅ Successfully processed message ${message.id}`);
    } catch (error) {
      console.error(`❌ Error handling message:`, error);
      
      const message = JSON.parse(messageJson);
      message.retryCount = (message.retryCount || 0) + 1;
      message.lastError = error.message;
      message.lastErrorAt = new Date().toISOString();

      if (message.retryCount <= maxRetries) {
        console.log(`🔄 Retrying message ${message.id} (attempt ${message.retryCount}/${maxRetries})`);
        
        // Exponential backoff
        const delay = Math.pow(2, message.retryCount) * 1000;
        
        // Re-queue with delay
        await this.publish(topic, message.data, { 
          delay,
          isRetry: true,
          originalId: message.id
        });
      } else {
        console.error(`💀 Message ${message.id} failed after ${maxRetries} retries, moving to DLQ`);
        
        // Move to dead letter queue
        await this.redis.lpush(`dlq:${topic}`, JSON.stringify(message));
      }
    }
  }

  /**
   * Subscribe to pub/sub pattern
   */
  async subscribeToPubSub(pattern, handler) {
    try {
      if (!this.isConnected) {
        throw new Error('Message queue not connected');
      }

      this.subscriber.on('pmessage', async (pattern, channel, message) => {
        try {
          const data = JSON.parse(message);
          await handler(data, { channel, pattern });
        } catch (error) {
          console.error('❌ Error handling pub/sub message:', error);
        }
      });

      await this.subscriber.psubscribe(pattern);
      console.log(`📡 Subscribed to pub/sub pattern: ${pattern}`);
    } catch (error) {
      console.error('❌ Failed to subscribe to pub/sub:', error);
      throw error;
    }
  }

  /**
   * Publish to pub/sub channel
   */
  async publishToPubSub(channel, message) {
    try {
      if (!this.isConnected) {
        throw new Error('Message queue not connected');
      }

      const serialized = JSON.stringify(message);
      await this.publisher.publish(channel, serialized);
      
      console.log(`📡 Published to pub/sub channel ${channel}`);
    } catch (error) {
      console.error('❌ Failed to publish to pub/sub:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(topic) {
    try {
      const length = await this.redis.llen(topic);
      const delayedLength = await this.redis.zcard(`delayed:${topic}`);
      const dlqLength = await this.redis.llen(`dlq:${topic}`);
      
      return {
        pending: length,
        delayed: delayedLength,
        failed: dlqLength,
        total: length + delayedLength + dlqLength
      };
    } catch (error) {
      console.error('❌ Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Pre-defined message types for the billing system
const MessageTypes = {
  // Invoice-related events
  INVOICE_GENERATION_REQUESTED: 'invoice.generation.requested',
  INVOICE_GENERATED: 'invoice.generated',
  INVOICE_PAYMENT_RECEIVED: 'invoice.payment.received',
  INVOICE_OVERDUE: 'invoice.overdue',
  
  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription.downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  
  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DEACTIVATED: 'customer.deactivated',
  
  // Billing events
  BILLING_CYCLE_STARTED: 'billing.cycle.started',
  BILLING_CYCLE_COMPLETED: 'billing.cycle.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_RETRY_SCHEDULED: 'payment.retry.scheduled'
};

// Queue names
const Queues = {
  INVOICE_GENERATION: 'invoice-generation',
  BILLING_EVENTS: 'billing-events',
  NOTIFICATIONS: 'notifications',
  WEBHOOKS: 'webhooks'
};

// Create singleton instance
const messageQueue = new MessageQueue();

module.exports = {
  messageQueue,
  MessageQueue,
  MessageTypes,
  Queues
}; 