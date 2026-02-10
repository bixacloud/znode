import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../lib/prisma.js';

export function configureGoogleStrategy() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth credentials not configured');
    return;
  }

  const BACKEND_URL = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:3002';
  const callbackURL = `${BACKEND_URL}/api/auth/google/callback`;
  
  console.log('Google OAuth callback URL:', callbackURL);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email provided by Google'), undefined);
          }

          // Check if account already exists
          let account = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: 'google',
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
            // Link Google account to existing user
            await prisma.account.create({
              data: {
                userId: user.id,
                provider: 'google',
                providerAccountId: profile.id,
                accessToken,
                refreshToken,
              },
            });
          } else {
            // Create new user with Google account (email not verified - needs verification)
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                // emailVerified is null - user needs to verify email
                accounts: {
                  create: {
                    provider: 'google',
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
