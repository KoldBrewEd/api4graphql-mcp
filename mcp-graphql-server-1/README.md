# MCP GraphQL Server

A Model Context Protocol (MCP) server for exposing GraphQL APIs as MCP tools. This server demonstrates how to bridge any GraphQL API (here, the Countries API) to the MCP ecosystem, enabling natural language and programmatic access via MCP clients like Cursor.

## Features

- Exposes GraphQL APIs as MCP tools
- Supports schema introspection and arbitrary GraphQL queries
- Compatible with Cursor, Copilot, and any MCP client
- Logs all queries and variables sent to the backend API
- Minimal session management for MCP protocol compliance

## Endpoints

- **/mcp** — Main MCP endpoint for tool calls (JSON-RPC 2.0)

## Available MCP Tools

### 1. `introspect-schema`

- **Description:** Retrieves the GraphQL schema from the backend endpoint.
- **Parameters:** None
- **Returns:** The full GraphQL schema as JSON

### 2. `query-graphql`

- **Description:** Executes a GraphQL query against the backend endpoint.
- **Parameters:**
  - `query` (string, required): The GraphQL query string
  - `variables` (object, optional): GraphQL variables
- **Returns:** The query result as JSON

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   node src/mcpServer.js
   ```
   The server will listen on port 3000 by default.

## Usage Examples

### Using curl

**Introspect the schema:**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "introspect-schema",
      "arguments": {}
    }
  }'
```

**Query all countries and their capitals:**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "query-graphql",
      "arguments": {
        "query": "query { countries { name capital } }"
      }
    }
  }'
```

### Using VSCode with GitHub Copilot

1. **Install the [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) extension in VSCode.**
2. **Add your MCP server as a tool in Copilot Labs (if available) or use a compatible MCP client extension.**
   - URL: `http://localhost:3000/mcp`
3. **In the Copilot chat or command palette, type:**
   ```
   Show me all countries and their capitals
   ```
   or
   ```
   Use the query-graphql tool with: { "query": "query { countries { name capital } }" }
   ```
4. **View the results in the Copilot chat or output panel.**

> **Note:** If you use a different MCP client extension for VSCode, follow its instructions to add the MCP server and invoke tools.

### Using Cursor

1. Add your MCP server in Cursor's MCP Tools:
   - URL: `http://localhost:3000/mcp`
2. In the chat, type:
   ```
   Show me all countries and their capitals
   ```
   or
   ```
   Use the query-graphql tool with: { "query": "query { countries { name capital } }" }
   ```
3. View the results in the chat.

## Customization

- To change the backend GraphQL API, update the `GRAPHQL_ENDPOINT` constant in `src/mcpServer.js`.
- You can add more MCP tools by registering them with `server.tool`.

## Troubleshooting

- If you see errors about missing arguments, ensure your client sends the correct JSON-RPC payload.
- If using Cursor and tools are not recognized, restart Cursor and re-add the MCP server.
- All queries and variables sent to the backend API are logged in the server terminal for debugging.

## License

MIT
