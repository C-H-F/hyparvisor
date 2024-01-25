import { generateOpenApiDocument } from 'trpc-openapi';

import { appRouter } from './routers/appRouter.js';

// Generate OpenAPI schema document
export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Hyparvisor API',
  description:
    'OpenAPI compliant REST API for Hyparvisor built using tRPC with Express',
  version: '1.0.0',
  baseUrl: '/api/rest',
  docsUrl: 'https://github.com/C-H-F/hyparvisor',
  tags: ['user', 'file', 'vm', 'system', 'demo'],
});
