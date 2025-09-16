# Expense Tracker - Setup Guide

## Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- Clerk account for authentication

## Environment Setup

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Configure Database
Edit the `.env` file and set your PostgreSQL connection strings:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/expensetracker"
DIRECT_URL="postgresql://username:password@localhost:5432/expensetracker"
```

### 3. Configure Clerk Authentication
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application or use existing one
3. Copy your publishable key and secret key
4. Add them to your `.env` file:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_actual_publishable_key"
CLERK_SECRET_KEY="sk_test_your_actual_secret_key"
```

### 4. Configure Resend for Email Sending
1. Go to [Resend Dashboard](https://resend.com)
2. Create an account and get your API key
3. Verify your domain (e.g., yourdomain.com) in the Resend dashboard under Domains
4. Add the API key and from email to your `.env` file:

```bash
RESEND_API_KEY="your_resend_api_key"
FROM_EMAIL="noreply@yourdomain.com"
```

### 5. Install Dependencies
```bash
npm install
```

### 6. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Optional: Seed database with sample data
# npx prisma db seed
```

### 6. Start Development Server
```bash
npm run dev
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify database credentials in `.env` file
- Check if database `expensetracker` exists

### Clerk Authentication Issues
- Verify Clerk keys are correct
- Check that the Clerk application is properly configured

### Environment Variables Not Loading
- Ensure `.env` file is in the root directory
- Restart the development server after changing environment variables

### Resend Email Issues
- Ensure `RESEND_API_KEY` is set correctly in your `.env` file
- Verify your domain in the Resend dashboard and set `FROM_EMAIL` to an email from that domain
- Check that the recipient email is valid and not blocked
- Confirm your Resend account has sending limits and credits available
