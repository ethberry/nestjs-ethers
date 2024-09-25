declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ACCOUNT: string;
      PRIVATE_KEY: string;
      JSON_RPC_ADDR: string;
      LATENCY: string;
      STARTING_BLOCK: string;
    }
  }
}

export {};
