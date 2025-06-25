// MCP Server for GraphQL API using Streamable HTTP
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { request, gql } from 'graphql-request';
import { z } from 'zod';

const GRAPHQL_ENDPOINT = 'https://countries.trevorblades.com/';

// Standard GraphQL introspection query
const INTROSPECTION_QUERY = gql`
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }
  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }
  fragment InputValue on __InputValue {
    name
    description
    type { ...TypeRef }
    defaultValue
  }
  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
`;

// In-memory schema cache (for this process only)
let cachedSchema = null;

// Session management
const sessions = new Map();
let sessionCounter = 0;

function generateSessionId() {
  return `session-${++sessionCounter}`;
}

// Create a single server instance
const server = new McpServer({
  name: 'graphql-mcp-server',
  version: '1.0.0',
}, { capabilities: {} });

// introspect-schema tool
server.tool(
  'introspect-schema',
  'Retrieves the GraphQL schema from the endpoint.',
  z.object({}),
  async () => {
    try {
      const schema = await request(GRAPHQL_ENDPOINT, INTROSPECTION_QUERY);
      cachedSchema = schema;
      // Return as a stringified JSON for MCP content
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(schema)
          }
        ]
      };
    } catch (err) {
      console.error('Error during schema introspection:', err);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Failed to introspect schema', details: err.message })
          }
        ]
      };
    }
  }
);

// query-graphql tool
server.tool(
  'query-graphql',
  'Executes a GraphQL query against the endpoint.',
  {
    query: z.string().describe('GraphQL query string'),
    variables: z.record(z.any()).optional().describe('GraphQL variables'),
  },
  async (args, context) => {
    // Log everything for debugging
    console.log('ARGS:', args);
    console.log('CONTEXT:', context);

    // Extract query and variables
    const query = args.query;
    const variables = args.variables;

    if (!cachedSchema) {
      const msg = 'Schema not available. Please run introspect-schema first.';
      console.error(msg);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: msg })
          }
        ]
      };
    }
    try {
      const data = await request(GRAPHQL_ENDPOINT, query, variables);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ data })
          }
        ]
      };
    } catch (err) {
      console.error('Error during GraphQL query:', err);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Failed to execute GraphQL query', details: err.message })
          }
        ]
      };
    }
  }
);

// Express server setup
const app = express();
app.use(express.json());

// Force all responses to be JSON
app.use((req, res, next) => {
  res.type('application/json');
  next();
});

// MCP endpoint
app.post('/mcp', (req, res, next) => {
  console.log('RAW BODY:', req.body);
  next();
});

app.post('/mcp', async (req, res) => {
  try {
    // Manual handling for query-graphql
    if (
      req.body &&
      req.body.method === 'tools/call' &&
      req.body.params &&
      req.body.params.name === 'query-graphql'
    ) {
      const { query, variables } = req.body.params.arguments || {};
      console.error('GRAPHQL REQUEST (manual):', { query, variables });
      try {
        const data = await request(GRAPHQL_ENDPOINT, query, variables);
        return res.json({
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data)
              }
            ]
          },
          jsonrpc: '2.0',
          id: req.body.id
        });
      } catch (err) {
        return res.json({
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Failed to execute GraphQL query', details: err.message })
              }
            ]
          },
          jsonrpc: '2.0',
          id: req.body.id
        });
      }
    }
    // Otherwise, use the SDK for other tools
    const sessionManager = {
      sessionIdGenerator: generateSessionId,
      getSession: (sessionId) => sessions.get(sessionId),
      createSession: (sessionId) => {
        const session = { id: sessionId, created: Date.now() };
        sessions.set(sessionId, session);
        return session;
      },
      deleteSession: (sessionId) => {
        sessions.delete(sessionId);
      }
    };
    const transport = new StreamableHTTPServerTransport({ sessionManager });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      transport.close();
    });
  } catch (err) {
    console.error('Error handling MCP request:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

app.listen(3000, () => {
  console.log('MCP GraphQL server listening on port 3000');
}); 