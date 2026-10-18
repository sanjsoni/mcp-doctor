
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

type Finding = {
  tool: string;
  severity: 'high' | 'medium' | 'low';
  code: string;
  message: string;
  recommendation: string;
};

export class McpDoctorTools {
  @Tool({
    name: 'audit_mcp_tools',
    description:
      'Audit MCP tool definitions for documentation, input schema, naming, and potential safety issues. Returns prioritized findings and actionable recommendations. This is a static heuristic audit, not a security certification.',
    inputSchema: z.object({
      tools: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          inputSchema: z.record(z.unknown()).optional()
        })
      ).min(1).max(100).describe('MCP tool definitions to audit')
    }),
    examples: {
      request: {
        tools: [
          {
            name: 'delete_all',
            description: 'Does stuff',
            inputSchema: { type: 'object', properties: {} }
          }
        ]
      },
      response: {
        toolsAudited: 1,
        score: 50,
        summary: { high: 1, medium: 1, low: 1 },
        findings: []
      }
    }
  })
  async auditMcpTools(input: any, ctx: ExecutionContext) {
    const findings: Finding[] = [];
    const seen = new Set<string>();

    const add = (
      tool: string,
      severity: Finding['severity'],
      code: string,
      message: string,
      recommendation: string
    ) => findings.push({ tool, severity, code, message, recommendation });

    for (const item of input.tools) {
      const name = item.name.trim();
      const description = item.description?.trim() ?? '';
      const schema = item.inputSchema;

      if (!name) {
        add('(unnamed)', 'high', 'EMPTY_NAME',
          'The tool name is empty.',
          'Provide a stable, descriptive, unique name.');
      } else if (seen.has(name)) {
        add(name, 'high', 'DUPLICATE_NAME',
          'Another tool uses the same name.',
          'Give each tool a unique name so callers can distinguish them.');
      }
      seen.add(name);

      if (!description) {
        add(name || '(unnamed)', 'medium', 'MISSING_DESCRIPTION',
          'The tool has no description.',
          'Explain what it does, when to use it, its effects, and important limitations.');
      } else if (description.length < 25 || /^(does stuff|helper|test|tool|misc\.?)$/i.test(description)) {
        add(name, 'low', 'WEAK_DESCRIPTION',
          'The description may not tell a model when or how to use this tool.',
          'Use a specific description with purpose, inputs, effects, and constraints.');
      }

      if (!schema) {
        add(name, 'medium', 'MISSING_SCHEMA',
          'No input schema was provided.',
          'Define an object schema with properties and required fields, even for tools with no arguments.');
      } else {
        if (schema.type !== 'object') {
          add(name, 'medium', 'NON_OBJECT_SCHEMA',
            'The input schema is not declared as an object.',
            'Use a clear object schema unless a different input shape is intentional and supported.');
        }

        if (schema.type === 'object' && !schema.properties) {
          add(name, 'medium', 'MISSING_PROPERTIES',
            'The object schema does not declare properties.',
            'Declare accepted input properties, their types, and which are required.');
        }

        if (schema.type === 'object' &&
            schema.additionalProperties === true) {
          add(name, 'medium', 'OPEN_SCHEMA',
            'The schema explicitly allows additional properties.',
            'Consider additionalProperties: false when strict input validation is appropriate.');
        }
      }

      if (/(delete|remove|drop|destroy|overwrite|execute|deploy|payment|transfer|send)/i.test(name + ' ' + description)) {
        if (!/(confirm|approval|permission|authori[sz]|dry.?run|reversib|backup)/i.test(description)) {
          add(name, 'high', 'SENSITIVE_ACTION_REVIEW',
            'The name or description suggests a potentially sensitive action, but no safeguard is documented.',
            'Document authorization, confirmation, scope limits, and a dry-run or recovery option where appropriate. This heuristic does not prove the tool is unsafe.');
        }
      }
    }

    const summary = {
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length
    };

    const possibleChecks = input.tools.length * 3;
    const deductions = summary.high * 20 + summary.medium * 10 + summary.low * 5;
    const score = Math.max(0, Math.min(100,
      Math.round(100 - (deductions / Math.max(1, possibleChecks)) * 10)
    ));

    ctx.logger.info('MCP tool audit completed', {
      toolsAudited: input.tools.length,
      findingCount: findings.length
    });

    return {
      auditor: 'MCP Doctor',
      auditType: 'static-heuristic',
      toolsAudited: input.tools.length,
      score,
      summary,
      findings,
      disclaimer: 'Heuristic results only. A low finding count does not establish that a tool is secure. Review implementation, authorization, and runtime behavior separately.'
    };
  }
}
