export const aiConfig = {
  // AI_MODE: 'local' | 'remote' | 'hybrid'
  AI_MODE: (import.meta.env.VITE_AI_MODE || 'local') as 'local' | 'remote' | 'hybrid',

  // Local runtime settings (used when AI_MODE === 'local')
  LOCAL: {
    // Optional path for model file if using a local binary that requires it
    modelPath: (import.meta.env.VITE_AI_LOCAL_MODEL_PATH || '') as string,
    // Optional path to a local HTTP wrapper URL (e.g., http://127.0.0.1:8080/generate)
    localHttpUrl: (import.meta.env.VITE_AI_LOCAL_HTTP_URL || '') as string,
    // Optional binary path (for Electron main process to spawn)
    binaryPath: (import.meta.env.VITE_AI_LOCAL_BINARY_PATH || '') as string
  }
};
