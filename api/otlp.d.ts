interface OtlpRequest {
  method: string;
  url: string;
  query: { signal?: string; path?: string };
  headers: Record<string, string>;
  body?: Buffer;
}

interface OtlpResponse {
  setHeader(name: string, value: string): void;
  status(code: number): OtlpResponse;
  json(value: unknown): OtlpResponse;
  send(value: string): OtlpResponse;
  end(): OtlpResponse;
}

export default function handler(request: OtlpRequest, response: OtlpResponse): Promise<unknown>;
