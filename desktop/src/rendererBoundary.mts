/** This guard runs against the actual Vite module graph, including transitive imports. */
export function assertRendererModule(raw: string): void {
  const id = raw.replaceAll("\\", "/");
  if (
    /\/node_modules\/(?:@expo\/|@anthropic-ai\/|expo(?:-|\/)|react-native(?:-|\/)|electron\/)/.test(
      id,
    ) ||
    /\/src\/(?:app|components|features|hooks|store|theme)\//.test(id) ||
    /\/desktop\/src\/(?:host\/|main\.|preload\.|window\.)/.test(id) ||
    /^(?:\0)?(?:node:|__vite-browser-external)/.test(id) || /^(?:fs|child_process|electron)(?:$|\/)/.test(id)
  ) {
    throw new Error(`Desktop renderer crossed platform boundary: ${id}`);
  }
}
