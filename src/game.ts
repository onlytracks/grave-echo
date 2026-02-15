import type { World } from "./ecs/world.ts";
import type { GameMap } from "./map/game-map.ts";
import type { Renderer } from "./renderer/renderer.ts";
import { renderGameGrid } from "./renderer/panels/game-grid.ts";
import { handlePlayerInput } from "./ecs/systems/input.ts";
import {
  startPlayerTurn,
  endPlayerTurn,
  isPlayerTurnOver,
  resetAITurns,
} from "./ecs/systems/turn.ts";
import { processAI } from "./ecs/systems/ai.ts";
import { processHealth } from "./ecs/systems/health.ts";
import { MessageLog } from "./ecs/systems/messages.ts";
import { waitForInput } from "./input/input-handler.ts";

export enum GameState {
  Gameplay,
  Quitting,
  Dead,
}

export class Game {
  state = GameState.Gameplay;
  private messages = new MessageLog();

  constructor(
    private world: World,
    private map: GameMap,
    private renderer: Renderer,
  ) {}

  async run(): Promise<void> {
    startPlayerTurn(this.world);

    while (this.state === GameState.Gameplay) {
      this.render();
      const event = await waitForInput();

      if (event.type === "quit") {
        this.state = GameState.Quitting;
        break;
      }

      if (event.type === "pass") {
        endPlayerTurn(this.world);
      } else {
        handlePlayerInput(this.world, this.map, event, this.messages);
      }

      const healthResult = processHealth(this.world, this.messages);
      if (healthResult.playerDied) {
        this.state = GameState.Dead;
        break;
      }

      if (isPlayerTurnOver(this.world)) {
        resetAITurns(this.world);
        processAI(this.world, this.map, this.messages);
        const aiHealthResult = processHealth(this.world, this.messages);
        if (aiHealthResult.playerDied) {
          this.state = GameState.Dead;
          break;
        }
        startPlayerTurn(this.world);
      }
    }

    if (this.state === GameState.Dead) {
      this.render();
      this.renderer.drawText(
        0,
        this.map.height + 5,
        "You died. Press any key to quit.",
        "red",
      );
      this.renderer.flush();
      await waitForInput();
    }
  }

  private render(): void {
    this.renderer.clear();
    const size = this.renderer.getScreenSize();
    const gridW = Math.min(this.map.width + 2, size.width);
    const gridH = Math.min(this.map.height + 2, size.height - 4);
    renderGameGrid(
      this.renderer,
      this.world,
      this.map,
      { x: 0, y: 0, width: gridW, height: gridH },
      { x: 0, y: 0 },
    );

    const players = this.world.query("PlayerControlled", "TurnActor", "Stats");
    let statusText = "Arrow keys to move, Q to quit";
    if (players.length > 0) {
      const turnActor = this.world.getComponent(players[0]!, "TurnActor")!;
      const stats = this.world.getComponent(players[0]!, "Stats")!;
      const health = this.world.getComponent(players[0]!, "Health");
      const hpText = health ? `HP: ${health.current}/${health.max} | ` : "";
      statusText = `${hpText}Moves: ${turnActor.movementRemaining}/${stats.speed} | '.' to end turn | Q to quit`;
    }
    this.renderer.drawText(0, gridH, statusText, "gray");

    const messages = this.messages.getMessages();
    for (let i = 0; i < messages.length; i++) {
      this.renderer.drawText(0, gridH + 1 + i, messages[i]!, "yellow");
    }

    this.renderer.flush();
  }
}
