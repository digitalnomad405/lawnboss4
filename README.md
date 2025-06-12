# LawnBoss

A comprehensive lawn care business management system built with React, TypeScript, and Supabase.

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- A Supabase account
- A SendGrid account (for email functionality)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/digitalnomad405/lawnboss4.git
   cd lawnboss4
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or if you use yarn
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp env.example .env
   ```
   
   Then open `.env` in your text editor and fill in the values:
   - `SENDGRID_API_KEY`: Your SendGrid API key
   - `SENDGRID_FROM_EMAIL`: Verified sender email in SendGrid
   - `SENDGRID_FROM_NAME`: Display name for emails
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

4. **Start the development server**
   ```bash
   npm run dev
   # or with yarn
   yarn dev
   ```

   The application should now be running at `http://localhost:3000`

### Database Setup

1. **Install Supabase CLI** (if you need to work with migrations)
   ```bash
   npm install -g supabase-cli
   ```

2. **Run migrations**
   ```bash
   supabase migration up
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
lawnboss4/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript type definitions
├── supabase/              # Supabase configuration and migrations
│   ├── migrations/        # Database migrations
│   └── functions/         # Edge functions
├── public/                # Static assets
└── ...config files
```

## Features

- Customer Management
- Service Scheduling
- Invoice Generation
- Crew Management
- Property Management
- Email Notifications
- Service History Tracking

## Development Guidelines

1. **Git Workflow**
   - Create feature branches from `main`
   - Use descriptive commit messages
   - Submit pull requests for review

2. **Code Style**
   - Follow ESLint configuration
   - Use TypeScript strictly
   - Write comments for complex logic

3. **Environment Variables**
   - Never commit `.env` files
   - Update `env.example` when adding new variables
   - Document all environment variables

## Troubleshooting

Common issues and solutions:

1. **Database Connection Issues**
   - Verify Supabase credentials in `.env`
   - Check if Supabase project is active
   - Ensure IP is allowed in Supabase dashboard

2. **Email Sending Issues**
   - Verify SendGrid API key
   - Check if sender email is verified
   - Review SendGrid dashboard for errors

3. **Build Errors**
   - Clear `node_modules` and reinstall
   - Update dependencies
   - Check TypeScript errors

## Support

For support, please:
1. Check existing GitHub issues
2. Review documentation
3. Create a new issue with detailed information

## License

[Add your license information here]

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Remember to keep sensitive information secure and never commit API keys or credentials.
