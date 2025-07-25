import { setupGracefulShutdown } from './graceful-shutdown';

// Setup graceful shutdown for Node.js environment
export function setupServer() {
  setupGracefulShutdown();
} 