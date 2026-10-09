import { requireCloudActors } from './actor-runtime.js';

export function cloudHostEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  requireCloudActors(env);
  return {
    ...env,
    NODE_ENV: 'production',
    STORY_PATH: env.STORY_PATH ?? 'stories/sixth-murder/story.json',
    FRAMEWORK_DATA_DIR: env.FRAMEWORK_DATA_DIR ?? '.durable-actors/cloud',
    HOST: env.HOST ?? '127.0.0.1',
    PORT: env.PORT ?? '3188',
  };
}
