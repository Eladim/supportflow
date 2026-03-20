/**
 * OpenAPI 3.0 for Swagger UI — aligned with Express routes under `/api/v1`.
 * Root health: GET /health (same origin as API, not under /api/v1).
 */

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "SupportFlow API",
    version: "1.0.0",
    description:
      "Customer support ticketing API.\n\n" +
      "**Auth:** Register or login with JSON body below. Responses include `accessToken` (JWT). " +
      "Click **Authorize** and paste **only** the `accessToken` value (no `Bearer ` prefix). " +
      "Login/register also set an httpOnly refresh cookie (`sf_refresh`) — use **Try it out** from " +
      "this page (same origin) so cookies work for `/auth/refresh`.\n\n" +
      "**Health (not in this spec’s base URL):** `GET /health`",
  },
  servers: [{ url: "/api/v1", description: "API v1 (relative to API host, e.g. http://localhost:4000)" }],
  tags: [
    { name: "Auth", description: "Login, register, tokens" },
    { name: "Users", description: "Team and profile" },
    { name: "Tickets", description: "Tickets, comments, notes" },
    { name: "Comments", description: "Comment by id" },
    { name: "Notes", description: "Internal note by id" },
    { name: "Activity", description: "Global activity feed" },
    { name: "Notifications", description: "In-app notifications" },
    { name: "Analytics", description: "Dashboard metrics" },
    { name: "Uploads", description: "Attachments" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste the `accessToken` from login/register response.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          details: { type: "array", items: { type: "object" } },
        },
      },
      PublicUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          role: { type: "string", enum: ["ADMIN", "MANAGER", "AGENT"] },
          avatarUrl: { type: "string", nullable: true },
          lastSeenAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          accessToken: { type: "string", description: "JWT for Authorization header" },
          user: { $ref: "#/components/schemas/PublicUser" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password", minLength: 1 },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password", "name"],
        properties: {
          email: { type: "string", format: "email" },
          password: {
            type: "string",
            format: "password",
            minLength: 8,
            description: "At least 8 characters",
          },
          name: { type: "string", minLength: 1, maxLength: 120 },
        },
      },
      PatchMeRequest: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          avatarUrl: { type: "string", nullable: true, description: "Image URL or null to clear" },
        },
      },
      PatchRoleRequest: {
        type: "object",
        required: ["role"],
        properties: {
          role: { type: "string", enum: ["ADMIN", "MANAGER", "AGENT"] },
        },
      },
      CreateTicketRequest: {
        type: "object",
        required: ["title", "description", "category"],
        properties: {
          title: { type: "string", maxLength: 500 },
          description: { type: "string", maxLength: 20000 },
          category: { type: "string", maxLength: 120 },
          status: {
            type: "string",
            enum: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"],
          },
          priority: { type: "string", enum: ["URGENT", "HIGH", "MEDIUM", "LOW"] },
          dueAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      PatchTicketRequest: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          status: {
            type: "string",
            enum: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"],
          },
          priority: { type: "string", enum: ["URGENT", "HIGH", "MEDIUM", "LOW"] },
          dueAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      AssignTicketRequest: {
        type: "object",
        required: ["assigneeId"],
        properties: {
          assigneeId: { type: "string", format: "uuid", nullable: true, description: "User id or null to unassign" },
        },
      },
      ThreadBodyRequest: {
        type: "object",
        required: ["body"],
        properties: {
          body: { type: "string", minLength: 1, maxLength: 20000 },
          parentId: { type: "string", format: "uuid", nullable: true },
        },
      },
      PatchThreadRequest: {
        type: "object",
        required: ["body"],
        properties: {
          body: { type: "string", minLength: 1, maxLength: 20000 },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register",
        description: "Creates an AGENT user. Sets refresh cookie and returns accessToken.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
              example: {
                email: "agent@example.com",
                password: "password123",
                name: "Example Agent",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
          "409": {
            description: "Email already registered",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description: "Returns accessToken and sets httpOnly refresh cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
              example: { email: "admin@supportflow.local", password: "demo12345" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
          "401": {
            description: "Invalid credentials",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        description: "Revokes refresh session cookie. No body.",
        responses: {
          "204": { description: "No content" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        description: "Uses `sf_refresh` cookie. Call from same origin with credentials (browser); Swagger Try it out includes cookies when configured.",
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
          "401": {
            description: "Missing or invalid refresh",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/PublicUser" } },
                },
              },
            },
          },
        },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List users (team)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    users: {
                      type: "array",
                      items: {
                        allOf: [
                          { $ref: "#/components/schemas/PublicUser" },
                          {
                            type: "object",
                            properties: {
                              openTicketCount: { type: "integer" },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get my profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/PublicUser" } },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update my profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatchMeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/PublicUser" } },
                },
              },
            },
          },
        },
      },
    },
    "/users/{userId}/role": {
      patch: {
        tags: ["Users"],
        summary: "Change user role (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatchRoleRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/PublicUser" } },
                },
              },
            },
          },
          "403": { description: "Forbidden" },
        },
      },
    },
    "/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "List tickets",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"],
            },
          },
          {
            name: "priority",
            in: "query",
            schema: { type: "string", enum: ["URGENT", "HIGH", "MEDIUM", "LOW"] },
          },
          { name: "assigneeId", in: "query", schema: { type: "string", format: "uuid" } },
          {
            name: "unassigned",
            in: "query",
            description: "If true or 1, only tickets with no assignee",
            schema: { type: "string", enum: ["true", "1"] },
          },
          { name: "category", in: "query", schema: { type: "string" } },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["newest", "oldest", "priority", "dueDate"], default: "newest" },
          },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: { "200": { description: "Paginated ticket list" } },
      },
      post: {
        tags: ["Tickets"],
        summary: "Create ticket",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTicketRequest" },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/tickets/{ticketId}": {
      get: {
        tags: ["Tickets"],
        summary: "Get ticket",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OK" }, "404": { description: "Not found" } },
      },
      patch: {
        tags: ["Tickets"],
        summary: "Update ticket",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/PatchTicketRequest" } } },
        },
        responses: { "200": { description: "OK" } },
      },
      delete: {
        tags: ["Tickets"],
        summary: "Delete ticket",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "Deleted" } },
      },
    },
    "/tickets/{ticketId}/assign": {
      patch: {
        tags: ["Tickets"],
        summary: "Assign or unassign ticket",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AssignTicketRequest" },
            },
          },
        },
        responses: { "200": { description: "OK" } },
      },
    },
    "/tickets/{ticketId}/activity": {
      get: {
        tags: ["Tickets"],
        summary: "Ticket activity log",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/tickets/{ticketId}/comments": {
      get: {
        tags: ["Tickets"],
        summary: "List comments",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OK" } },
      },
      post: {
        tags: ["Tickets"],
        summary: "Add comment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ThreadBodyRequest" },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/tickets/{ticketId}/notes": {
      get: {
        tags: ["Tickets"],
        summary: "List internal notes",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OK" } },
      },
      post: {
        tags: ["Tickets"],
        summary: "Add internal note",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ThreadBodyRequest" },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/comments/{commentId}": {
      patch: {
        tags: ["Comments"],
        summary: "Edit comment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "commentId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatchThreadRequest" },
            },
          },
        },
        responses: { "200": { description: "OK" } },
      },
      delete: {
        tags: ["Comments"],
        summary: "Delete comment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "commentId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "No content" } },
      },
    },
    "/notes/{noteId}": {
      patch: {
        tags: ["Notes"],
        summary: "Edit internal note",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "noteId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatchThreadRequest" },
            },
          },
        },
        responses: { "200": { description: "OK" } },
      },
      delete: {
        tags: ["Notes"],
        summary: "Delete internal note",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "noteId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "No content" } },
      },
    },
    "/activity/recent": {
      get: {
        tags: ["Activity"],
        summary: "Recent activity",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 30 },
          },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "unreadOnly", in: "query", schema: { type: "boolean" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/notifications/{notificationId}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark notification read",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "notificationId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "200": { description: "OK" }, "404": { description: "Not found" } },
      },
    },
    "/notifications/mark-all-read": {
      post: {
        tags: ["Notifications"],
        summary: "Mark all read",
        security: [{ bearerAuth: [] }],
        responses: { "204": { description: "No content" } },
      },
    },
    "/analytics/summary": {
      get: {
        tags: ["Analytics"],
        summary: "Dashboard summary",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/uploads": {
      post: {
        tags: ["Uploads"],
        summary: "Upload attachment",
        description: "multipart/form-data: field `file` (binary) and `ticketId` (uuid).",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "ticketId"],
                properties: {
                  file: { type: "string", format: "binary" },
                  ticketId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/attachments/{attachmentId}/download": {
      get: {
        tags: ["Uploads"],
        summary: "Download attachment",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "attachmentId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "200": { description: "File stream" } },
      },
    },
  },
};
