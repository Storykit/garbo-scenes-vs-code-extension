import type { JsonSchema, UISchemaElement } from "@jsonforms/core";

export type TVideoDefinitionAccessCategory = "basic" | "premium" | "custom";
export interface IPreview {
  /**
   *  atTime: decimal percentage value between 0 and 1
   */
  atTime: number;
  /**
   *  clamp: values (start and end) should be provided in ms
   */
  clamp?: {
    start: number;
    end: number;
  };
}
export type TVideoSlideDefinitionStatus = "deprecated" | "newest" | "last";
export interface IVideoDefinition {
  _id: string;

  dataSchema: JsonSchema;
  uiSchema: UISchemaElement;
  customUiSchema?: UISchemaElement;
  displayName: string;
}
export interface IVideoSlideDefinition extends IVideoDefinition {
  created?: string;
  updated?: string;
  accessCategory: TVideoDefinitionAccessCategory;
  availableForClients: string[];
  availableForAgencies: string[];
  definitionGroup?: string;
  infoLink: string;
  previewVideo: string;
  timings: {
    duration: number;
    inheritsFrom?: string;
    editable?: boolean;
  };
  /**
   * Information that's needed to be rendered by garbo
   */
  garbo?: {
    /**
     *  Location of the garbo scene definition.
     *  Used when sent to render with garbo.
     */
    sceneLocation?: {
      key: string;
      bucket: string;
    };
    preview: IPreview;
  };
  /** ID reference to a Slide Definition Layout */
  layout?: string;
  definitionType:
    | string
    | {
        name: string;
        _id: string;
      };
  status: TVideoSlideDefinitionStatus;
  lockedDefaultFields: string[];
  variables?: unknown;
}
export interface SlideDefinitionType {
  _id: string;
  name: string;
}

export interface DefinitionGroup {
  definitions: IVideoSlideDefinition[];
}
