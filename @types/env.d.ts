declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GEMUNION_API_KEY: string;
    }
  }
}

export {};
