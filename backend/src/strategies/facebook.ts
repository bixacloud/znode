import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import prisma from '../lib/prisma.js';

export function configureFacebookStrategy() {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    console.warn('Facebook OAuth credentials not configured');
    return;
  }

  const BACKEND_URL = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:3002';
  const callbackURL = `${BACKEND_URL}/api/auth/facebook/callback`;

  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL,
        profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email provided by Facebook'), undefined);
          }

          // Check if account already exists
          let account = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: 'facebook',
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
            // Link Facebook account to existing user
            await prisma.account.create({
              data: {
                userId: user.id,
                provider: 'facebook',
                providerAccountId: profile.id,
                accessToken,
                refreshToken,
              },
            });
          } else {
            // Create new user with Facebook account (email not verified - needs verification)
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                // emailVerified is null - user needs to verify email
                accounts: {
                  create: {
                    provider: 'facebook',
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
