import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { ProjectDefinition } from "./uteis/interfacesUteis";
import {
  applyVariables,
  toCamelCase,
  toConstantCase,
  toKebabCase,
  toPascalCase,
} from "./uteis/templateUtils";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "module-generator.generateCRUD",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage("Abra um projeto no VS Code primeiro.");
        return;
      }
      const rootPath = workspaceFolders[0].uri.fsPath;

      const config = vscode.workspace.getConfiguration("gerador-de-modulos");
      const customTemplatesPath =
        config.get<string>("customTemplatesPath") || "";
      const projects = config.get<ProjectDefinition[]>("projects") || [];

      if (projects.length === 0) return;

      let selectedProject: ProjectDefinition | undefined;

      if (projects.length === 1) {
        selectedProject = projects[0];
      } else {
        const projectNames = projects.map((p) => p.projectName);
        const selection = await vscode.window.showQuickPick(projectNames, {
          placeHolder: "Selecione o perfil do projeto",
        });
        if (!selection) return;
        selectedProject = projects.find((p) => p.projectName === selection);
      }

      if (!selectedProject || !selectedProject.fileDefinitions) return;

      const entityInput = await vscode.window.showInputBox({
        prompt: `Gerando para [${selectedProject.projectName}] - Digite o nome da entidade`,
        placeHolder: "faturaItem",
      });

      if (!entityInput) return;

      const mapVariables: Record<string, string> = {
        PascalCase: toPascalCase(entityInput),
        camelCase: toCamelCase(entityInput),
        kebabCase: toKebabCase(entityInput),
        UPCASE_KEBAB: toKebabCase(entityInput).toUpperCase().replace("-", "_"),
        CONSTANT_CASE: toConstantCase(entityInput),
        ...(selectedProject.customVariables || {}),
      };

      try {
        for (const fileDef of selectedProject.fileDefinitions) {
          if (fileDef.customVariables) {
            for (const key of Object.keys(fileDef.customVariables)) {
              const macroPresente =
                fileDef.outputFolder.includes(key) ||
                fileDef.outputFileName.includes(key);
              if (macroPresente && mapVariables[key] === undefined) {
                const defaultValue = fileDef.customVariables[key];
                const userInput = await vscode.window.showInputBox({
                  prompt: `Defina o valor global para a variável: ${key}`,
                  value: defaultValue,
                  placeHolder: `Ex do arquivo: ${fileDef.outputFileName}`,
                });

                if (userInput === undefined) return; // Cancelou com ESC
                mapVariables[key] = userInput || defaultValue;
              }
            }
          }
        }

        for (const fileDef of selectedProject.fileDefinitions) {
          const resolvedFolderRelative = applyVariables(
            fileDef.outputFolder,
            mapVariables,
          );
          const resolvedFileName = applyVariables(
            fileDef.outputFileName,
            mapVariables,
          );

          if (fileDef.id) {
            const importPath = path.posix.join(
              resolvedFolderRelative,
              resolvedFileName.replace(".ts", ""),
            );
            mapVariables[`Path_${fileDef.id}`] = importPath;
          }
        }

        let filesCreatedOrUpdated = 0;
        const filesToOpen: string[] = [];

        for (const fileDef of selectedProject.fileDefinitions) {
          const localVariables: Record<string, string> = {};

          if (fileDef.customVariables) {
            for (const [key, defaultValue] of Object.entries(
              fileDef.customVariables,
            )) {
              if (mapVariables[key] !== undefined) {
                localVariables[key] = mapVariables[key];
              } else {
                const userInput = await vscode.window.showInputBox({
                  prompt: `[${fileDef.templateName}] Valor para: ${key}`,
                  value: defaultValue,
                });
                if (userInput === undefined) return;
                localVariables[key] = userInput || defaultValue;
              }
            }
          }

          const currentFileVariables = { ...mapVariables, ...localVariables };
          const resolvedFolderRelative = applyVariables(
            fileDef.outputFolder,
            currentFileVariables,
          );
          const resolvedFileName = applyVariables(
            fileDef.outputFileName,
            currentFileVariables,
          );

          const outputFolderPath = path.join(rootPath, resolvedFolderRelative);
          const outputFilePath = path.join(outputFolderPath, resolvedFileName);

          let templateToUse = path.join(
            context.extensionPath,
            "templates",
            fileDef.templateName,
          );
          if (customTemplatesPath) {
            const customTemplateFullPath = path.join(
              rootPath,
              customTemplatesPath,
              fileDef.templateName,
            );
            if (fs.existsSync(customTemplateFullPath))
              templateToUse = customTemplateFullPath;
          }

          if (!fs.existsSync(templateToUse)) {
            vscode.window.showErrorMessage(
              `Template não encontrado: ${fileDef.templateName}`,
            );
            continue;
          }

          let templateContent = fs.readFileSync(templateToUse, "utf8");
          templateContent = applyVariables(
            templateContent,
            currentFileVariables,
          );

          const strategy = fileDef.strategy || "create";

          if (strategy === "create") {
            if (!fs.existsSync(outputFolderPath))
              fs.mkdirSync(outputFolderPath, { recursive: true });

            if (!fs.existsSync(outputFilePath)) {
              fs.writeFileSync(outputFilePath, templateContent, "utf8");
              filesCreatedOrUpdated++;
            } else {
              vscode.window.showWarningMessage(
                `O arquivo ${resolvedFileName} já existe.`,
              );
            }
          } else if (strategy === "inject") {
            vscode.window.showInformationMessage("Identificado Inject");

            if (!fs.existsSync(outputFilePath)) {
              vscode.window.showErrorMessage(
                `Arquivo para injeção não existe: ${outputFilePath}`,
              );
              continue;
            }

            if (!fileDef.injection || !fileDef.injection.anchor) {
              vscode.window.showErrorMessage(
                `Configuração 'injection.anchor' ausente para ${fileDef.templateName}`,
              );
              continue;
            }

            let fileContent = fs.readFileSync(outputFilePath, "utf8");
            const anchor = fileDef.injection.anchor;
            const position = fileDef.injection.position || "before";

            vscode.window.showInformationMessage(
              "Ancora do inject" + fileDef.templateName,
            );

            if (!fileContent.includes(anchor)) {
              vscode.window.showWarningMessage(
                `Âncora "${anchor}" não encontrada no arquivo ${resolvedFileName}. Injeção ignorada.`,
              );
              continue;
            }

            if (fileContent.includes(templateContent.trim())) {
              vscode.window.showWarningMessage(
                `O código do template [${fileDef.templateName}] já está presente em ${resolvedFileName}.`,
              );
              if (!filesToOpen.includes(outputFilePath))
                filesToOpen.push(outputFilePath);
              continue;
            }

            const lines = fileContent.split(/\r?\n/);
            const targetIndex = lines.findIndex((line) =>
              line.includes(anchor),
            );

            if (position === "before") {
              lines.splice(targetIndex, 0, templateContent);
            } else {
              lines.splice(targetIndex + 1, 0, templateContent);
            }

            fs.writeFileSync(outputFilePath, lines.join("\n"), "utf8");
            filesCreatedOrUpdated++;
          }

          if (!filesToOpen.includes(outputFilePath)) {
            filesToOpen.push(outputFilePath);
          }
        }

        for (const filePath of filesToOpen) {
          if (fs.existsSync(filePath)) {
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc, { preview: false });
          }
        }

        vscode.window.showInformationMessage(
          `Processamento concluído! ${filesCreatedOrUpdated} alteração(ões) realizada(s).`,
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Erro: ${error}`);
      }
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
