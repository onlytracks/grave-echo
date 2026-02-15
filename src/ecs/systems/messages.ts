export class MessageLog {
  private messages: string[] = [];
  private maxMessages: number;

  constructor(maxMessages = 3) {
    this.maxMessages = maxMessages;
  }

  add(message: string): void {
    this.messages.push(message);
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
  }

  getMessages(): readonly string[] {
    return this.messages;
  }

  clear(): void {
    this.messages = [];
  }
}
