export interface LocalGenerateOptions {
  modelPath?: string;
  maxTokens?: number;
  temperature?: number;
}

export class LocalClient {
  async status() {
    if (typeof (window as any).llm?.status === 'function') {
      try {
        return await (window as any).llm.status();
      } catch (err) {
        return { available: false, error: (err as Error).message };
      }
    }
    return { available: false };
  }

  async generate(prompt: string, options: LocalGenerateOptions = {}) {
    if (typeof (window as any).llm?.generate !== 'function') {
      throw new Error('Local LLM bridge is not available (window.llm.generate)');
    }

    const payload = { prompt, options };
    const res = await (window as any).llm.generate(payload);

    if (!res) throw new Error('No response from local LLM bridge');
    if (!res.success) throw new Error(res.error || 'Local LLM generation failed');

    return res.text || '';
  }
}
