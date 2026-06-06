# 🛠️ Gerador de Módulos (Module Generator)

Uma extensão poderosa e flexível para o Visual Studio Code que permite gerar ou modificar arquivos de projeto a partir de templates personalizados. Ideal para automatizar a criação de CRUDs, módulos, componentes e rotas repetitivas em qualquer linguagem ou framework (Angular, Spring Boot, React, etc.).

---

## ✨ Funcionalidades

- **Múltiplos Perfis de Projeto:** Configure diferentes geradores para o mesmo workspace (ex: "Frontend Angular" e "Backend Spring").
- **Transformação de Nomes Automática:** Digite o nome da entidade uma vez e a extensão disponibiliza variáveis em formatos como `PascalCase`, `camelCase`, `kebabCase`, etc.
- **Resolução de Caminhos de Importação:** Arquivos gerados podem referenciar facilmente o caminho de importação de outros arquivos do mesmo fluxo através de identificadores (`id`).
- **Estratégias Múltiplas:**
  - `create`: Cria novos arquivos e pastas recursivamente.
  - `inject`: Injeta blocos de código em arquivos já existentes com base em âncoras (ideal para atualizar arquivos de rotas ou módulos).
- **Variáveis Dinâmicas Globais e Locais:** Defina variáveis customizadas no `settings.json`. Se uma variável exigida pelo template não estiver configurada, a extensão solicitará o valor em tempo real durante a geração.

---

## 🚀 Como Usar

1. Abra um projeto no VS Code.
2. Certifique-se de que a extensão está configurada no seu `settings.json` (veja a seção de **Configuração** abaixo).
3. Pressione `Ctrl+Shift+P` (ou `Cmd+Shift+P` no Mac) para abrir a Paleta de Comandos.
4. Digite e selecione o comando: **`Module Generator: Generate CRUD`**.
5. Se houver mais de um projeto configurado, selecione o perfil desejado.
6. Insira o nome da entidade principal (ex: `faturaItem`, `usuario`).
7. Preencha quaisquer variáveis adicionais caso a extensão solicite.
8. Os arquivos serão gerados/atualizados e abertos automaticamente no seu editor!

---

## ⚙️ Configuração (`settings.json`)

Toda a parametrização é feita na propriedade `gerador-de-modulos` nas configurações do VS Code (`.vscode/settings.json`).

### Propriedades Principais

| Propriedade           | Tipo     | Descrição                                                                                                                                |
| :-------------------- | :------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `customTemplatesPath` | `string` | Caminho relativo no workspace onde os templates estão salvos (Ex: `.vscode/templates`). Se vazio, usa os templates internos da extensão. |
| `projects`            | `array`  | Lista de perfis de projetos (veja a estrutura abaixo).                                                                                   |

### Estrutura do `ProjectDefinition`

```json
"gerador-de-modulos.projects": [
  {
    "projectName": "Nome do Perfil (ex: Java Spring Backend)",
    "customVariables": {
      "VARIAVEL_GLOBAL": "valor_padrao"
    },
    "fileDefinitions": [
      // Lista de arquivos a serem processados
    ]
  }
]
```

### Estrutura do `FileDefinition`

Cada objeto dentro de `fileDefinitions` dita as regras para um arquivo específico:

| Propriedade       | Tipo     | Obrigatório        | Descrição                                                                                               |
| :---------------- | :------- | :----------------- | :------------------------------------------------------------------------------------------------------ |
| `id`              | `string` | Não                | Identificador único para o arquivo. Usado para gerar a variável de caminho de importação (`{Path_id}`). |
| `templateName`    | `string` | Sim                | Nome do arquivo de template (ex: `front.model.ts.template`).                                            |
| `outputFolder`    | `string` | Sim                | Caminho de saída do arquivo gerado. Suporta variáveis.                                                  |
| `outputFileName`  | `string` | Sim                | Nome do arquivo final. Suporta variáveis.                                                               |
| `strategy`        | `string` | Não                | Ação a ser executada: `create` (padrão) ou `inject`.                                                    |
| `customVariables` | `object` | Não                | Variáveis locais solicitadas/usadas apenas neste arquivo.                                               |
| `injection`       | `object` | Apenas p/ `inject` | Regras de injeção contendo `anchor` e `position` (`before` ou `after`).                                 |

---

## 🧩 Variáveis de Template

Você pode injetar variáveis nos caminhos de saída, nomes de arquivos e dentro do conteúdo do template usando as seguintes sintaxes: `{{variavel}}`, `{variavel}` ou `${variavel}`.

### 1. Variáveis Automáticas de Caso

Baseado no nome da entidade digitada no início (ex: `faturaItem`):

| Variável          | Formato Gerado                         | Exemplo de Saída |
| :---------------- | :------------------------------------- | :--------------- |
| `{PascalCase}`    | Primeira letra maiúscula, sem espaços. | `FaturaItem`     |
| `{camelCase}`     | Primeira letra minúscula, sem espaços. | `faturaItem`     |
| `{kebabCase}`     | Tudo minúsculo, separado por hífen.    | `fatura-item`    |
| `{UPCASE_KEBAB}`  | Tudo maiúsculo, com _underline_.       | `FATURA_ITEM`    |
| `{CONSTANT_CASE}` | Tudo maiúsculo, com _underline_.       | `FATURA_ITEM`    |

### 2. Referências de Caminho Automáticas (`Path_{id}`)

Se você definir um `id` em um `fileDefinition` (ex: `"id": "service"`), a extensão calculará o caminho de importação daquele arquivo e disponibilizará uma variável global chamada `Path_service`.

**Exemplo:**
Você pode usar isso no seu template de Componente para importar o Serviço automaticamente sem se preocupar com caminhos relativos complexos:

```typescript
import { {{PascalCase}}Service } from '{{Path_service}}';
```

---

## 💉 Estratégias: Create vs Inject

### Create (Padrão)

Cria o diretório (se não existir) e gera o arquivo a partir do template. Se o arquivo já existir, a extensão o preserva e emite um aviso.

### Inject

Usado para atualizar arquivos existentes. Muito útil para adicionar novas rotas em um arquivo de roteamento ou registrar injeções de dependência.

**Exemplo de configuração de injeção:**

```json
{
  "strategy": "inject",
  "templateName": "front.routeItem.template",
  "outputFolder": "src/app/pages",
  "outputFileName": "app.routes.ts",
  "injection": {
    "anchor": "//adicionar novas rotas aqui",
    "position": "before"
  }
}
```

---

## 📝 Exemplo Prático de Configuração

Coloque isto no seu `.vscode/settings.json`:

```json
{
  "gerador-de-modulos.customTemplatesPath": ".vscode/templates",
  "gerador-de-modulos.projects": [
    {
      "projectName": "Gerar Módulo Angular",
      "customVariables": {
        "MODULO": "cadastro"
      },
      "fileDefinitions": [
        {
          "id": "model",
          "templateName": "model.ts.template",
          "outputFolder": "src/app/domain",
          "outputFileName": "{{kebabCase}}.model.ts"
        },
        {
          "id": "service",
          "templateName": "service.ts.template",
          "outputFolder": "src/app/services",
          "outputFileName": "{{kebabCase}}.service.ts"
        }
      ]
    }
  ]
}
```
