export interface TaggedMessage {
  text: string;
  turn: number;
}

export class MessageLog {
  private messages: TaggedMessage[] = [];
  private maxMessages: number;
  private currentTurn = 0;

  constructor(maxMessages = 50) {
    this.maxMessages = maxMessages;
  }

  setTurn(turn: number): void {
    this.currentTurn = turn;
  }

  add(message: string): void {
    this.messages.push({ text: message, turn: this.currentTurn });
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
  }

  getMessages(): readonly string[] {
    return this.messages.map((m) => m.text);
  }

  getRecent(count: number): readonly string[] {
    const start = Math.max(0, this.messages.length - count);
    return this.messages.slice(start).map((m) => m.text);
  }

  getMessagesWithTurns(): readonly TaggedMessage[] {
    return this.messages;
  }

  clear(): void {
    this.messages = [];
  }
}
