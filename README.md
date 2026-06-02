This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## WhatsApp Reminders

The `/whatsapp-reminders` admin page can manually trigger membership expiry reminders through the WhatsApp Cloud API.

Create a local `.env.local` from `.env.example` and set:

```bash
META_TOKEN="your-meta-access-token"
WHATSAPP_BUSINESS_PHONE_NUMBER_ID="your-phone-number-id"
WHATSAPP_BUSINESS_ACCOUNT_ID="your-whatsapp-business-account-id"
WHATSAPP_API_VERSION="v25.0"
```

By default, the manual trigger sends free-form text. To use an approved Meta template instead, set:

```bash
WHATSAPP_REMINDER_TEMPLATE_NAME="your_template_name"
WHATSAPP_TEMPLATE_LANGUAGE="en_US"
```

WhatsApp sending requires a server runtime because the access token is used by an App Router API route. It will work with `next dev`, `next start`, Vercel, or another server host, but not with static export/GitHub Pages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Deploy on GitHub Pages

This project is preconfigured for static export (`output: "export"`) and GitHub Pages deployment via GitHub Actions.

1. Push your repository to GitHub.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` (or `master`) to trigger `.github/workflows/deploy.yml`.

The workflow automatically:
- installs dependencies,
- builds the app with the correct Pages base path,
- uploads the `out/` folder, and
- deploys it to GitHub Pages.
