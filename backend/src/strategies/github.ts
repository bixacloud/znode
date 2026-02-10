import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import prisma from '../lib/prisma.js';

export function configureGithubStrategy() {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.warn('GitHub OAuth credentials not configured');
    return;
  }

  const BACKEND_URL = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:3002';
  const callbackURL = `${BACKEND_URL}/api/auth/github/callback`;

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL,
        scope: ['user:email'],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email provided by GitHub'), undefined);
          }

          // Check if account already exists
          let account = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: 'github',
                providerAccountId: profile.id,
              },
            },
            include: { user: true },
          });

          if (account) {
            // Update tokens
            await prisma.account.update({
              where: { id: account.id },
              data: {
                accessToken,
                refreshToken,
              },
            });
            return done(null, account.user);
          }

          // Check if user with this email exists
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            // Link GitHub account to existing user
            await prisma.account.create({
              data: {
                userId: user.id,
                provider: 'github',
                providerAccountId: profile.id,
                accessToken,
                refreshToken,
              },
            });
          } else {
            // Create new user with GitHub account (email not verified - needs verification)
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName || profile.username,
                avatar: profile.photos?.[0]?.value,
                // emailVerified is null - user needs to verify email
                accounts: {
                  create: {
                    provider: 'github',
                    providerAccountId: profile.id,
                    accessToken,
                    refreshToken,
                  },
                },
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}
