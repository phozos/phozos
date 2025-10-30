import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // Global rules (less strict)
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Strict rules for API routes only
    files: ['server/routes/**/*.ts', 'server/routes.ts'],
    rules: {
      // Prevent direct res.json() usage in API routes - ENFORCE NEW STANDARDS
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='res'][callee.property.name='json']",
          message: 'Use sendSuccess() or sendError() instead of res.json() in API routes. Import from ../utils/response or ./utils/response'
        },
        {
          selector: "CallExpression[callee.property.name='json'][callee.object.type='CallExpression'][callee.object.callee.property.name='status'][callee.object.callee.object.name='res']",
          message: 'Use sendError() instead of res.status().json() in API routes. Import from ../utils/response or ./utils/response'
        }
      ],
      // Stricter TypeScript rules for API routes
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      // Prevent console.log in production routes (warn only)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    }
  },
  {
    // Allow res.json in utility files
    files: ['server/utils/response.ts', 'server/middleware/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off'
    }
  },
  {
    // Client-side security rules - prevent CSRF bypass
    files: ['client/**/*.ts', 'client/**/*.tsx'],
    languageOptions: {
      globals: {
        window: 'readonly',
        globalThis: 'readonly',
        self: 'readonly',
        fetch: 'readonly'
      }
    },
    rules: {
      // Prevent ALL forms of fetch usage - enforce secure api-client
      'no-restricted-syntax': [
        'error',
        // Direct fetch calls
        {
          selector: 'CallExpression[callee.name="fetch"]',
          message: 'Raw fetch() is prohibited for security reasons. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // Global object fetch calls (direct property access)
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="fetch"]',
          message: 'Raw window.fetch() is prohibited for security reasons. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        {
          selector: 'CallExpression[callee.object.name="globalThis"][callee.property.name="fetch"]',
          message: 'Raw globalThis.fetch() is prohibited for security reasons. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        {
          selector: 'CallExpression[callee.object.name="self"][callee.property.name="fetch"]',
          message: 'Raw self.fetch() is prohibited for security reasons. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // Computed property access (bracket notation)
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.computed=true][callee.property.value="fetch"]',
          message: 'Raw fetch access via computed properties is prohibited for security reasons. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // Prevent reading fetch for aliasing (direct access)
        {
          selector: 'MemberExpression[object.name=/^(window|globalThis|self)$/][property.name="fetch"]',
          message: 'Accessing fetch property for aliasing is prohibited. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // Prevent reading fetch for aliasing (computed access)
        {
          selector: 'MemberExpression[computed=true][property.value="fetch"]',
          message: 'Accessing fetch property via computed syntax is prohibited. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // Prevent variable aliasing of fetch
        {
          selector: 'VariableDeclarator[init.name="fetch"]',
          message: 'Aliasing fetch to a variable is prohibited. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        {
          selector: 'VariableDeclarator[init.type="MemberExpression"][init.object.name=/^(window|globalThis|self)$/][init.property.name="fetch"]',
          message: 'Aliasing fetch from global objects is prohibited. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // Prevent destructuring fetch
        {
          selector: 'VariableDeclarator[id.type="ObjectPattern"] > Property[key.name="fetch"]',
          message: 'Destructuring fetch from objects is prohibited. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // Prevent assignment aliasing
        {
          selector: 'AssignmentExpression[right.name="fetch"]',
          message: 'Assigning fetch to variables is prohibited. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // XMLHttpRequest blocking - new expressions
        {
          selector: 'NewExpression[callee.name="XMLHttpRequest"]',
          message: 'new XMLHttpRequest() is prohibited for security reasons. Use the secure api client from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        {
          selector: 'NewExpression[callee.type="MemberExpression"][callee.object.name=/^(window|globalThis|self)$/][callee.property.name="XMLHttpRequest"]',
          message: 'new window.XMLHttpRequest() is prohibited for security reasons. Use the secure api client from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        {
          selector: 'NewExpression[callee.type="MemberExpression"][callee.computed=true][callee.property.value="XMLHttpRequest"]',
          message: 'new window["XMLHttpRequest"]() is prohibited for security reasons. Use the secure api client from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // XMLHttpRequest blocking - member access
        {
          selector: 'MemberExpression[object.name=/^(window|globalThis|self)$/][property.name="XMLHttpRequest"]',
          message: 'Accessing XMLHttpRequest is prohibited for security reasons. Use the secure api client from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        {
          selector: 'MemberExpression[computed=true][property.value="XMLHttpRequest"]',
          message: 'Accessing ["XMLHttpRequest"] is prohibited for security reasons. Use the secure api client from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // XMLHttpRequest aliasing prevention
        {
          selector: 'VariableDeclarator[init.name="XMLHttpRequest"]',
          message: 'Aliasing XMLHttpRequest is prohibited for security reasons. Use the secure api client from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        {
          selector: 'AssignmentExpression[right.name="XMLHttpRequest"]',
          message: 'Aliasing XMLHttpRequest is prohibited for security reasons. Use the secure api client from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // Dynamic import blocking
        {
          selector: 'ImportExpression[source.value=/^(axios|ky|superagent)(\\/.*)?$/]',
          message: 'Dynamic importing HTTP clients is prohibited for security reasons. Use the secure api client from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        // Computed destructuring of fetch
        {
          selector: 'VariableDeclarator[id.type="ObjectPattern"] > Property[computed=true][key.value="fetch"]',
          message: 'Computed destructuring of fetch is prohibited for security reasons. Use the secure api client from "@/lib/api-client" instead to ensure CSRF protection.'
        }
      ],
      // Prevent fetch and XMLHttpRequest as global identifiers
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Raw fetch is prohibited for security reasons. Use api.get(), api.post(), api.put(), or api.delete() from "@/lib/api-client" instead to ensure CSRF protection.'
        },
        {
          name: 'XMLHttpRequest',
          message: 'Raw XMLHttpRequest is prohibited for security reasons. Use the secure api client from "@/lib/api-client" instead to ensure CSRF protection.'
        }
      ],
      // Completely block insecure queryClient imports and other HTTP clients
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/queryClient',
              message: 'The queryClient module is prohibited for security reasons. Use the secure "api" client from "@/lib/api-client" instead to ensure CSRF protection.'
            },
            {
              name: 'axios',
              message: 'Direct HTTP clients like axios are prohibited. Use the secure "api" client from "@/lib/api-client" instead to ensure CSRF protection.'
            },
            {
              name: 'ky',
              message: 'Direct HTTP clients like ky are prohibited. Use the secure "api" client from "@/lib/api-client" instead to ensure CSRF protection.'
            },
            {
              name: 'superagent',
              message: 'Direct HTTP clients like superagent are prohibited. Use the secure "api" client from "@/lib/api-client" instead to ensure CSRF protection.'
            }
          ],
          patterns: [
            {
              group: ['**/lib/queryClient{,.*}', '**/queryClient{,.*}', '@/**/lib/queryClient{,.*}', '*/lib/queryClient{,.*}', 'axios{,/*}', 'ky{,/*}', 'superagent{,/*}'],
              message: 'HTTP clients and insecure modules are prohibited via any path. Use the secure "api" client from "@/lib/api-client" instead to ensure CSRF protection.'
            }
          ]
        }
      ]
    }
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.js',
    ],
  }
];