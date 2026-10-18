
import { Module } from '@nitrostack/core';
import { McpDoctorTools } from './mcp-doctor.tools.js';

@Module({
  name: 'mcp-doctor',
  description: 'Static quality and safety auditing for MCP tool definitions',
  controllers: [McpDoctorTools]
})
export class McpDoctorModule {}