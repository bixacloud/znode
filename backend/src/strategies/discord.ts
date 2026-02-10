import passport from 'passport';
import { Strategy as DiscordStrategy, Profile } from 'passport-discord';
import prisma from '../lib/prisma.js';

export function configureDiscordStrategy() {
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    console.warn('Discord OAuth credentials not configured');
    return;
  }

  const BACKEND_URL = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:3002';
  const callbackURL = `${BACKEND_URL}/api/auth/discord/callback`;

  passport.use(
    new DiscordStrategy(
      {
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL,
        scope: ['identify', 'email'],
      },
      async (accessToken: string, refreshToken: string, profile: Profile, done: any) => {
        try {
          const email = profile.email;
          if (!email) {
            return done(new Error('No email provided by Discord'), undefined);
          }

          // Check if account already exists
          let account = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: 'discord',
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

          // Generate Discord avatar URL
          const avatarUrl = profile.avatar 
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null;

          if (user) {
            // Link Discord account to existing user
            await prisma.account.create({
              data: {
                userId: user.id,
                provider: 'discord',
                providerAccountId: profile.id,
                accessToken,
                refreshToken,
              },
            });
          } else {
            // Create new user with Discord account (email not verified - needs verification)
            user = await prisma.user.create({
              data: {
                email,
                name: profile.username,
                avatar: avatarUrl,
                // emailVerified is null - user needs to verify email
                accounts: {
                  create: {
                    provider: 'discord',
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
