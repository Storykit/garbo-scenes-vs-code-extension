export type Environment = 'stage' | 'production';

export const ENVIRONMENTS: readonly Environment[] = ['stage', 'production'];

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  stage: 'Stage',
  production: 'Production',
};
