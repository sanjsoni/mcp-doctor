import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { McpDoctorModule } from './modules/mcp-doctor/mcp-doctor.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'moonshot-mcp',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    CalculatorModule,
    McpDoctorModule,
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

