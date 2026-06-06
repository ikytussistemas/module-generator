export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

export function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase(),
    )
    .replace(/[\s_-]+/g, "");
}

export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

export function toConstantCase(str: string): string {
  return toKebabCase(str).replace(/-/g, "_").toUpperCase();
}

export function applyVariables(
  text: string,
  vars: Record<string, string>,
): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    const regex1 = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    const regex2 = new RegExp(`\\{${key}\\}`, "g");
    const regex3 = new RegExp(`\\$\\{\\{?${key}\\}?\\}`, "g");
    result = result
      .replace(regex1, value)
      .replace(regex2, value)
      .replace(regex3, value);
  }
  return result;
}
