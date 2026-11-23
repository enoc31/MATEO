interface SlackRequest {
  method: string;
  headers: Record<string, string>;
  body: string;
}

interface SlackResponse {
  setHeader(name: string, value: string): void;
  status(code: number): SlackResponse;
  json(value: unknown): SlackResponse;
  end(): SlackResponse;
}

export default function handler(request: SlackRequest, response: SlackResponse): Promise<unknown>;
