# User Management Frontend

This is the frontend application for the User Management System. It provides a web interface for managing user data with features including listing users, creating new users, updating existing users, and deleting users.

## Overview

The frontend application is built with Angular, providing a responsive and intuitive user interface for the User Management System. It communicates with the backend API to perform CRUD operations on user data.

## Features

- View a list of all users in a data grid
- Create new user accounts
- Update existing user information
- Delete user accounts
- Form validation with error messages
- Responsive design for desktop and mobile devices

## Technology Stack

- **Framework**: Angular 19
- **UI Components**: Angular Material
- **HTTP Communication**: Angular HttpClient
- **Routing**: Angular Router
- **Form Handling**: Angular Reactive Forms
- **Testing**: Jasmine and Karma

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v22 or later)
- npm (v9 or later)
- Angular CLI (v19.2.4 or later)

## Getting Started

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```bash
   cd user-management/frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

The application is configured to connect to the backend API running at `http://localhost:8080`. If your backend is running on a different URL, you can modify the `environment.ts` file:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1'
};
```

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Development

### Code Scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

### Building

To build the project for production, run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. The production build optimizes your application for performance and speed.

### Running Unit Tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

### Running End-to-End Tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Note: Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Project Structure

The project follows Angular best practices with a modular architecture:

```
src/
├── app/
│   ├── components/        # Reusable UI components
│   ├── models/            # Data models and interfaces
│   ├── pages/             # Page components
│   ├── services/          # API communication and business logic
│   ├── shared/            # Shared modules, pipes, and directives
│   └── app.module.ts      # Main application module
├── assets/                # Static assets
├── environments/          # Environment configuration
└── styles/                # Global styles
```

## Best Practices

This project follows the [Angular Style Guide](https://angular.io/guide/styleguide) for code quality and consistency, including:

- Using feature modules to organize related components
- Following a consistent naming convention
- Implementing lazy loading for better performance
- Utilizing reactive forms for complex form handling
- Proper error handling and user feedback

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Connecting with Backend

This frontend application is designed to work with the User Management System backend. Make sure the backend API is running before using this application. See the backend documentation for setup instructions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
