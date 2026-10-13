import { Platform } from 'react-native';
import type { AppRole } from '@/lib/deskAppRole';

export const APP_ROLE: AppRole = Platform.OS === 'web' ? 'web-controller' : 'phone-controller';
