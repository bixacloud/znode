import passport from 'passport';
import { configureGoogleStrategy } from './google.js';
import { configureFacebookStrategy } from './facebook.js';
import { configureMicrosoftStrategy } from './microsoft.js';
import { configureDiscordStrategy } from './discord.js';
import { configureGithubStrategy } from './github.js';

export function configurePassport() {
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const { prisma } = await import('../lib/prisma.js');
      const user = await prisma.user.findUnique({
        where: { id },
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Configure all OAuth strategies
  configureGoogleStrategy();
  configureFacebookStrategy();
  configureMicrosoftStrategy();
  configureDiscordStrategy();
  configureGithubStrategy();
}
