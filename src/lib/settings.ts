import { prisma } from './admin';
import { cache } from 'react';

export const getAdSettings = cache(async () => {
  try {
    const settings = await prisma.appSettings.findMany({
      where: {
        key: {
          in: [
            'AD_POSTERS_ENABLED',
            'AD_POPUNDER_ENABLED',
            'AD_NATIVE_ENABLED',
            'AD_SOCIAL_BAR_ENABLED',
            'AD_WAITING_PAGE_ENABLED'
          ]
        }
      }
    });

    const configMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    // Default to true if not explicitly set to 'false'
    const parseBool = (val?: string) => val === undefined ? true : val === 'true';

    return {
      postersEnabled: parseBool(configMap['AD_POSTERS_ENABLED']),
      popunderEnabled: parseBool(configMap['AD_POPUNDER_ENABLED']),
      nativeEnabled: parseBool(configMap['AD_NATIVE_ENABLED']),
      socialBarEnabled: parseBool(configMap['AD_SOCIAL_BAR_ENABLED']),
      waitingPageEnabled: parseBool(configMap['AD_WAITING_PAGE_ENABLED']),
    };
  } catch (error) {
    console.error('Failed to load ad settings:', error);
    return {
      postersEnabled: true,
      popunderEnabled: true,
      nativeEnabled: true,
      socialBarEnabled: true,
      waitingPageEnabled: true,
    };
  }
});
