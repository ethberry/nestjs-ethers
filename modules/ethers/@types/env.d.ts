declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GEMUNION_API_KEY: string;
      ACCOUNT: string;
      PRIVATE_KEY: string;
      JSON_RPC_ADDR: string;
      LATENCY: string;
      STARTING_BLOCK: string;
    }
  }
}

export {};
