import type { World } from "./ecs/world.ts";
import type { GameMap } from "./map/game-map.ts";
import type { Renderer } from "./renderer/renderer.ts";
import { renderGameGrid } from "./renderer/panels/game-grid.ts";
import { renderDebugPanel } from "./renderer/panels/debug-panel.ts";
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

  private getPlayerPos(): { x: number; y: number } | undefined {
    const players = this.world.query("PlayerControlled", "Position");
    if (players.length === 0) return undefined;
    return this.world.getComponent(players[0]!, "Position");
  }

  private calculateViewport(
    viewW: number,
    viewH: number,
  ): { x: number; y: number } {
    const playerPos = this.getPlayerPos();
    if (!playerPos) return { x: 0, y: 0 };
    return {
      x: Math.max(
        0,
        Math.min(playerPos.x - Math.floor(viewW / 2), this.map.width - viewW),
      ),
      y: Math.max(
        0,
        Math.min(playerPos.y - Math.floor(viewH / 2), this.map.height - viewH),
      ),
    };
  }

  private render(): void {
    this.renderer.clear();
    const size = this.renderer.getScreenSize();

    let gridW: number;
    const gridH = Math.min(this.map.height + 2, size.height - 6);

    gridW = Math.floor(size.width * 0.6);
    const debugW = size.width - gridW;
    renderGameGrid(
      this.renderer,
      this.world,
      this.map,
      { x: 0, y: 0, width: gridW, height: gridH },
      this.calculateViewport(gridW - 2, gridH - 2),
    );
    renderDebugPanel(this.renderer, this.world, {
      x: gridW,
      y: 0,
      width: debugW,
      height: gridH,
    });

    const players = this.world.query("PlayerControlled", "TurnActor", "Stats");
    let statusText = "arrows:move .:wait e:pickup s:swap u:use q:quit";
    if (players.length > 0) {
      const turnActor = this.world.getComponent(players[0]!, "TurnActor")!;
      const stats = this.world.getComponent(players[0]!, "Stats")!;
      const health = this.world.getComponent(players[0]!, "Health");
      const hpText = health ? `HP: ${health.current}/${health.max} | ` : "";
      const equipment = this.world.getComponent(players[0]!, "Equipment");
      const weaponName =
        equipment?.weapon !== null && equipment?.weapon !== undefined
          ? (this.world.getComponent(equipment.weapon, "Item")?.name ?? "?")
          : "fists";
      statusText = `${hpText}Moves: ${turnActor.movementRemaining}/${stats.speed} | Wpn: ${weaponName} | arrows:move .:wait e:pickup s:swap u:use q:quit`;
    }
    this.renderer.drawText(0, gridH, statusText, "gray");

    this.renderer.drawText(
      0,
      gridH + 1,
      "@:you  g:goblin  /:sword  ):bow  !:potion  #:wall  .:floor",
      "gray",
    );

    const messages = this.messages.getMessages();
    for (let i = 0; i < messages.length; i++) {
      this.renderer.drawText(0, gridH + 2 + i, messages[i]!, "yellow");
    }

    this.renderer.flush();
  }
}
