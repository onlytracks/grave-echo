export type MessageCategory = "gameplay" | "debug";

export interface TaggedMessage {
  text: string;
  turn: number;
  category: MessageCategory;
}

export class MessageLog {
  private messages: TaggedMessage[] = [];
  private maxMessages: number;
  private currentTurn = 0;

  constructor(maxMessages = 2000) {
    this.maxMessages = maxMessages;
  }

  setTurn(turn: number): void {
    this.currentTurn = turn;
  }

  add(message: string, category: MessageCategory = "gameplay"): void {
    this.messages.push({ text: message, turn: this.currentTurn, category });
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
  }

  getMessages(): readonly string[] {
    return this.messages
      .filter((m) => m.category === "gameplay")
      .map((m) => m.text);
  }

  getRecent(count: number): readonly string[] {
    const gameplay = this.messages.filter((m) => m.category === "gameplay");
    const start = Math.max(0, gameplay.length - count);
    return gameplay.slice(start).map((m) => m.text);
  }

  getRecentAll(count: number): readonly TaggedMessage[] {
    const start = Math.max(0, this.messages.length - count);
    return this.messages.slice(start);
  }

  getMessagesWithTurns(): readonly TaggedMessage[] {
    return this.messages.filter((m) => m.category === "gameplay");
  }

  getAllMessagesWithTurns(): readonly TaggedMessage[] {
    return this.messages;
  }

  clear(): void {
    this.messages = [];
  }
}
