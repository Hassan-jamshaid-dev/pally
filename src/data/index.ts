import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStorage } from './store';

export const storage = createStorage(AsyncStorage);
export * from './store';

