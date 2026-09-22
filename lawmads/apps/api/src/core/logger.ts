import pino from 'pino';
import { config } from './config.js';
export const logger = pino({ level: config.isTest ? 'silent' : config.logLevel, base: { service: 'lawmads-api' } });
