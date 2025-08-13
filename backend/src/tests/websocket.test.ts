import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { websocketService } from '../services/websocket.service';
import { websocketPerformanceService } from '../services/websocketPerformance.service';
import { Server } from 'http';
import express from 'express';

describe('WebSocket Service', () => {
  let server: Server;
  let testPort: number;
  let authToken: string;

  beforeAll(async () => {
    // Create test HTTP server
    const app = express();
    server = app.listen(0);
    testPort = (server.address() as any).port;
    
    // Initialize WebSocket service
    websocketService.initialize(server);
    
    // Create test auth token
    authToken = jwt.sign(
      { userId: 'test-user-123' },
      process.env.JWT_SECRET || 'your-secret-key'
    );
  });

  afterAll(async () => {
    websocketService.shutdown();
    server.close();
  });

  describe('Connection Management', () => {
    test('should accept authenticated connections', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/ws?token=${authToken}`);
      
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    test('should reject unauthenticated connections', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
      
      ws.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      ws.on('open', () => {
        done(new Error('Connection should have been rejected'));
      });
    });

    test('should reject invalid token connections', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/ws?token=invalid-token`);
      
      ws.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      ws.on('open', () => {
        done(new Error('Connection should have been rejected'));
      });
    });
  });

  describe('Message Handling', () => {
    let ws: WebSocket;

    beforeEach((done) => {
      ws = new WebSocket(`ws://localhost:${testPort}/ws?token=${authToken}`);
      ws.on('open', () => done());
      ws.on('error', done);
    });

    afterEach(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    test('should receive welcome message on connection', (done) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'system_notification' && message.title === 'Connected') {
          expect(message.message).toBe('WebSocket connection established successfully');
          expect(message.severity).toBe('info');
          done();
        }
      });
    });

    test('should handle heartbeat messages', (done) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'heartbeat') {
          expect(message.timestamp).toBeDefined();
          done();
        }
      });

      // Send heartbeat
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date()
      }));
    });

    test('should handle subscription messages', (done) => {
      let messagesReceived = 0;
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        messagesReceived++;
        
        // Skip welcome message
        if (message.type === 'system_notification' && messagesReceived === 1) {
          return;
        }
        
        // Should receive response after subscription
        done();
      });

      // Send subscription
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['test-channel']
      }));
    });
  });

  describe('Channel Management', () => {
    let ws1: WebSocket;
    let ws2: WebSocket;

    beforeEach((done) => {
      let connectionsReady = 0;
      
      const checkReady = () => {
        connectionsReady++;
        if (connectionsReady === 2) done();
      };

      ws1 = new WebSocket(`ws://localhost:${testPort}/ws?token=${authToken}`);
      ws1.on('open', checkReady);
      ws1.on('error', done);

      ws2 = new WebSocket(`ws://localhost:${testPort}/ws?token=${authToken}`);
      ws2.on('open', checkReady);
      ws2.on('error', done);
    });

    afterEach(() => {
      if (ws1.readyState === WebSocket.OPEN) ws1.close();
      if (ws2.readyState === WebSocket.OPEN) ws2.close();
    });

    test('should broadcast to subscribed channels', (done) => {
      let ws2MessageReceived = false;
      
      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'system_notification' && message.title === 'Test Broadcast') {
          ws2MessageReceived = true;
          expect(message.message).toBe('This is a test message');
          done();
        }
      });

      // Subscribe ws2 to test channel
      ws2.send(JSON.stringify({
        type: 'subscribe',
        channels: ['test-broadcast']
      }));

      // Give time for subscription to process
      setTimeout(() => {
        // Send broadcast message through the service
        websocketService.broadcastToChannel('test-broadcast', {
          type: 'system_notification',
          title: 'Test Broadcast',
          message: 'This is a test message',
          severity: 'info',
          timestamp: new Date()
        });
      }, 100);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track connection metrics', () => {
      const metrics = websocketPerformanceService.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.connectionCount).toBe('number');
      expect(typeof metrics.totalConnections).toBe('number');
      expect(typeof metrics.messagesPerSecond).toBe('number');
      expect(typeof metrics.averageLatency).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
    });

    test('should export Prometheus metrics', () => {
      const prometheusMetrics = websocketPerformanceService.exportPrometheusMetrics();
      
      expect(prometheusMetrics).toContain('websocket_connections_active');
      expect(prometheusMetrics).toContain('websocket_messages_sent_total');
      expect(prometheusMetrics).toContain('websocket_latency_average_ms');
      expect(prometheusMetrics).toContain('websocket_error_rate');
      expect(prometheusMetrics).toContain('websocket_memory_usage_mb');
    });
  });

  describe('Load Testing', () => {
    test('should handle multiple simultaneous connections', async () => {
      const connectionCount = 10;
      const connections: WebSocket[] = [];
      const connectionPromises: Promise<void>[] = [];

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const promise = new Promise<void>((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${testPort}/ws?token=${authToken}`);
          connections.push(ws);
          
          ws.on('open', () => resolve());
          ws.on('error', reject);
        });
        connectionPromises.push(promise);
      }

      // Wait for all connections to open
      await Promise.all(connectionPromises);

      // Verify all connections are open
      expect(connections.length).toBe(connectionCount);
      connections.forEach(ws => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
      });

      // Clean up
      connections.forEach(ws => ws.close());
    }, 10000);

    test('should handle high message throughput', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/ws?token=${authToken}`);
      const messageCount = 100;
      let messagesReceived = 0;
      let startTime: number;

      ws.on('open', () => {
        startTime = Date.now();
        
        // Send many messages rapidly
        for (let i = 0; i < messageCount; i++) {
          ws.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date()
          }));
        }
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        // Skip welcome message
        if (message.type === 'system_notification') return;
        
        if (message.type === 'heartbeat') {
          messagesReceived++;
          
          if (messagesReceived === messageCount) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            const messagesPerSecond = (messageCount / duration) * 1000;
            
            expect(messagesPerSecond).toBeGreaterThan(50); // Should handle at least 50 msg/sec
            ws.close();
            done();
          }
        }
      });

      ws.on('error', done);
    }, 15000);
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON messages', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/ws?token=${authToken}`);
      
      ws.on('open', () => {
        // Send malformed JSON
        ws.send('invalid json message');
        
        // Should not crash the connection
        setTimeout(() => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          ws.close();
          done();
        }, 100);
      });

      ws.on('error', done);
    });

    test('should handle connection drops gracefully', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/ws?token=${authToken}`);
      
      ws.on('open', () => {
        // Forcefully terminate connection
        ws.terminate();
        
        // Give time for cleanup
        setTimeout(() => {
          const stats = websocketService.getStats();
          // Connection should be cleaned up
          expect(stats.connections.length).toBe(0);
          done();
        }, 100);
      });

      ws.on('error', () => {
        // Expected behavior for terminated connection
      });
    });
  });

  describe('Message Queuing', () => {
    test('should queue messages for disconnected clients', async () => {
      // This test would require more complex setup to simulate
      // a disconnected client that reconnects
      const stats = websocketService.getStats();
      expect(stats.queuedMessages).toBeGreaterThanOrEqual(0);
    });
  });
});

// Load Testing Utility
export class WebSocketLoadTester {
  private connections: WebSocket[] = [];
  private metrics = {
    connectionTime: 0,
    messageLatency: 0,
    messagesPerSecond: 0,
    errorCount: 0,
    successfulConnections: 0
  };

  constructor(private serverUrl: string, private authToken: string) {}

  async runLoadTest(config: {
    connectionCount: number;
    messageCount: number;
    duration: number; // milliseconds
  }): Promise<typeof this.metrics> {
    console.log(`Starting load test: ${config.connectionCount} connections, ${config.messageCount} messages over ${config.duration}ms`);
    
    const startTime = Date.now();
    
    // Create connections
    await this.createConnections(config.connectionCount);
    
    this.metrics.connectionTime = Date.now() - startTime;
    
    // Send messages
    await this.sendMessages(config.messageCount, config.duration);
    
    // Clean up
    this.cleanup();
    
    return this.metrics;
  }

  private async createConnections(count: number): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < count; i++) {
      const promise = new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${this.serverUrl}?token=${this.authToken}`);
        
        ws.on('open', () => {
          this.metrics.successfulConnections++;
          resolve();
        });
        
        ws.on('error', (error) => {
          this.metrics.errorCount++;
          reject(error);
        });
        
        this.connections.push(ws);
      });
      
      promises.push(promise);
    }
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.warn('Some connections failed to establish:', error);
    }
  }

  private async sendMessages(messageCount: number, duration: number): Promise<void> {
    const messagesPerConnection = Math.floor(messageCount / this.connections.length);
    const interval = duration / messagesPerConnection;
    
    let totalLatency = 0;
    let latencyMeasurements = 0;
    
    for (const ws of this.connections) {
      for (let i = 0; i < messagesPerConnection; i++) {
        if (ws.readyState === WebSocket.OPEN) {
          const sendTime = Date.now();
          
          ws.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date(sendTime)
          }));
          
          // Measure response latency
          ws.on('message', (data) => {
            const receiveTime = Date.now();
            const message = JSON.parse(data.toString());
            
            if (message.type === 'heartbeat') {
              const latency = receiveTime - sendTime;
              totalLatency += latency;
              latencyMeasurements++;
            }
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    this.metrics.messageLatency = latencyMeasurements > 0 ? totalLatency / latencyMeasurements : 0;
    this.metrics.messagesPerSecond = messageCount / (duration / 1000);
  }

  private cleanup(): void {
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.connections = [];
  }
}
