import type { AxiosInstance } from 'axios';
import type { AuthService } from '../auth/authService';
import type { DefinitionGroup, SlideDefinitionType } from './types';

/**
 * Generic facade over all Storykit backend interaction (auth actions +
 * data endpoints). Extension point for new endpoints — add methods here,
 * not to individual view providers.
 */
export class StorykitApi {
  readonly onDidChangeSession;

  constructor(
    private readonly authService: AuthService,
    private readonly apiClient: AxiosInstance
  ) {
    this.onDidChangeSession = authService.onDidChangeSession;
  }

  login(): Promise<void> {
    return this.authService.login();
  }

  logout(): Promise<void> {
    return this.authService.logout();
  }

  isSignedIn(): Promise<boolean> {
    return this.authService.isSignedIn();
  }

  async getSlideDefinitionTypes(): Promise<SlideDefinitionType[]> {
    const { data } = await this.apiClient.get<SlideDefinitionType[]>(
      '/videostudio/definitionType'
    );
    return data;
  }

  async getDefinitionGroup(): Promise<DefinitionGroup> {
    const { data } = await this.apiClient.get<DefinitionGroup>(
      '/videostudio/definition/group'
    );
    return data;
  }
}
