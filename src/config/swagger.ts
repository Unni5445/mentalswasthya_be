import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mental Swasthya API',
      version: '1.0.0',
      description: 'API documentation for the Mental Swasthya backend',
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
    security: [
      {
        apiKey: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './app.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export default specs;
