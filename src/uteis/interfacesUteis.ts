export interface InjectionConfig {
  anchor: string;
  position?: "before" | "after";
}

export interface FileDefinition {
  id?: string;
  strategy?: "create" | "inject";
  templateName: string;
  outputFolder: string;
  outputFileName: string;
  customVariables?: Record<string, string>;
  injection?: InjectionConfig;
}

export interface ProjectDefinition {
  projectName: string;
  customVariables?: Record<string, string>;
  fileDefinitions: FileDefinition[];
}
