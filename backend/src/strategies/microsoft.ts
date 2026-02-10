import passport from 'passport';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import prisma from '../lib/prisma.js';

export function configureMicrosoftStrategy() {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    console.warn('Microsoft OAuth credentials not configured');
    return;
  }

  const BACKEND_URL = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:3002';
  const callbackURL = `${BACKEND_URL}/api/auth/microsoft/callback`;

  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL,
        scope: ['user.read'],
        tenant: 'common',
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName;
          if (!email) {
            return done(new Error('No email provided by Microsoft'), undefined);
          }

          // Check if account already exists
          let account = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: 'microsoft',
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
            // Link Microsoft account to existing user
            await prisma.account.create({
              data: {
                userId: user.id,
                provider: 'microsoft',
                providerAccountId: profile.id,
                accessToken,
                refreshToken,
              },
            });
          } else {
            // Create new user with Microsoft account (email not verified - needs verification)
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                // emailVerified is null - user needs to verify email
                accounts: {
                  create: {
                    provider: 'microsoft',
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
