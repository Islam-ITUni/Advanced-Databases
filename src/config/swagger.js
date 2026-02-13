const swaggerJsdoc = require('swagger-jsdoc');

function buildSwaggerSpec() {
  const jsonBody = {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          additionalProperties: true
        }
      }
    }
  };

  const options = {
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'Coffee Shop Management API',
        version: '1.0.0',
        description:
          'REST API for coffee shop operations using Node.js, Express, and MongoDB. Includes authentication, shop/order CRUD, advanced MongoDB updates, and aggregation analytics.'
      },
      servers: [{ url: 'http://localhost:5000/api/v1', description: 'Local server' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [{ bearerAuth: [] }],
      paths: {
        '/health': {
          get: {
            tags: ['System'],
            summary: 'Health check',
            security: [],
            responses: {
              200: { description: 'Service is healthy' }
            }
          }
        },
        '/auth/register': {
          post: {
            tags: ['Auth'],
            summary: 'Register user',
            security: [],
            requestBody: jsonBody,
            responses: {
              201: { description: 'User registered' },
              400: { description: 'Validation failed' }
            }
          }
        },
        '/auth/login': {
          post: {
            tags: ['Auth'],
            summary: 'Login user',
            security: [],
            requestBody: jsonBody,
            responses: {
              200: { description: 'Login successful' },
              401: { description: 'Invalid credentials' }
            }
          }
        },
        '/auth/me': {
          get: {
            tags: ['Auth'],
            summary: 'Get current user',
            responses: {
              200: { description: 'Current user profile' },
              401: { description: 'Unauthorized' }
            }
          }
        },
        '/shops': {
          get: {
            tags: ['Shops'],
            summary: 'List shops',
            responses: { 200: { description: 'Shops list' } }
          },
          post: {
            tags: ['Shops'],
            summary: 'Create shop',
            requestBody: jsonBody,
            responses: { 201: { description: 'Shop created' } }
          }
        },
        '/shops/{id}': {
          get: {
            tags: ['Shops'],
            summary: 'Get shop by id',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'Shop details' } }
          },
          patch: {
            tags: ['Shops'],
            summary: 'Update shop',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            requestBody: jsonBody,
            responses: { 200: { description: 'Shop updated' } }
          },
          delete: {
            tags: ['Shops'],
            summary: 'Archive shop',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'Shop archived' } }
          }
        },
        '/shops/{id}/staff': {
          post: {
            tags: ['Shops'],
            summary: 'Add staff to shop',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            requestBody: jsonBody,
            responses: { 201: { description: 'Staff member added' } }
          }
        },
        '/shops/{id}/staff/{userId}': {
          delete: {
            tags: ['Shops'],
            summary: 'Remove staff from shop',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'Staff member removed' } }
          }
        },
        '/orders': {
          get: {
            tags: ['Orders'],
            summary: 'List orders',
            responses: { 200: { description: 'Orders list' } }
          },
          post: {
            tags: ['Orders'],
            summary: 'Create order',
            requestBody: jsonBody,
            responses: { 201: { description: 'Order created' } }
          }
        },
        '/orders/{id}': {
          get: {
            tags: ['Orders'],
            summary: 'Get order by id',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'Order details' } }
          },
          patch: {
            tags: ['Orders'],
            summary: 'Update order',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            requestBody: jsonBody,
            responses: { 200: { description: 'Order updated' } }
          },
          delete: {
            tags: ['Orders'],
            summary: 'Delete order',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'Order deleted' } }
          }
        },
        '/orders/{id}/items': {
          post: {
            tags: ['Orders'],
            summary: 'Add order item',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            requestBody: jsonBody,
            responses: { 201: { description: 'Order item added' } }
          }
        },
        '/orders/{id}/items/{itemId}/quantity': {
          patch: {
            tags: ['Orders'],
            summary: 'Update order item quantity',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }
            ],
            requestBody: jsonBody,
            responses: { 200: { description: 'Order item quantity updated' } }
          }
        },
        '/orders/{id}/items/{itemId}/status': {
          patch: {
            tags: ['Orders'],
            summary: 'Update order item status',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }
            ],
            requestBody: jsonBody,
            responses: { 200: { description: 'Order item status updated' } }
          }
        },
        '/orders/{id}/items/{itemId}': {
          delete: {
            tags: ['Orders'],
            summary: 'Remove order item',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'Order item removed' } }
          }
        },
        '/orders/{id}/notes': {
          post: {
            tags: ['Orders'],
            summary: 'Add order note',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            requestBody: jsonBody,
            responses: { 201: { description: 'Order note added' } }
          }
        },
        '/orders/{id}/notes/{noteId}': {
          delete: {
            tags: ['Orders'],
            summary: 'Remove order note',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'noteId', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'Order note removed' } }
          }
        },
        '/analytics/shops/{shopId}/summary': {
          get: {
            tags: ['Analytics'],
            summary: 'Shop sales summary',
            parameters: [
              { name: 'shopId', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'Shop analytics summary' } }
          }
        },
        '/analytics/staff/performance': {
          get: {
            tags: ['Analytics'],
            summary: 'Staff performance analytics',
            responses: { 200: { description: 'Staff analytics' } }
          }
        },
        '/users': {
          get: {
            tags: ['Users'],
            summary: 'List users (admin)',
            responses: { 200: { description: 'Users list' } }
          }
        },
        '/users/{id}/role': {
          patch: {
            tags: ['Users'],
            summary: 'Update user role (admin)',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            requestBody: jsonBody,
            responses: { 200: { description: 'User role updated' } }
          }
        }
      }
    },
    apis: []
  };

  return swaggerJsdoc(options);
}

module.exports = buildSwaggerSpec;
