import type { World } from "./ecs/world.ts";
import type { GameMap } from "./map/game-map.ts";
import type { Renderer } from "./renderer/renderer.ts";
import { calculateLayout } from "./renderer/layout.ts";
import { renderGameGrid } from "./renderer/panels/game-grid.ts";
import { renderDebugPanel } from "./renderer/panels/debug-panel.ts";
import { renderPlayerStats } from "./renderer/panels/player-stats.ts";
import { renderTargetInfo } from "./renderer/panels/target-info.ts";
import { renderMessageLog } from "./renderer/panels/message-log.ts";
import { renderEquipment } from "./renderer/panels/equipment.ts";
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
import { computePlayerFOW } from "./ecs/systems/sensory.ts";

export enum GameState {
  Gameplay,
  Quitting,
  Dead,
}

export class Game {
  state = GameState.Gameplay;
  private messages = new MessageLog();
  private visibleTiles = new Set<string>();
  private debugVisible = false;
  private turnCounter = 0;

  constructor(
    private world: World,
    private map: GameMap,
    private renderer: Renderer,
  ) {}

  async run(): Promise<void> {
    this.turnCounter = 1;
    this.messages.setTurn(this.turnCounter);
    startPlayerTurn(this.world);
    this.visibleTiles = computePlayerFOW(this.world, this.map);

    while (this.state === GameState.Gameplay) {
      this.render();
      const event = await waitForInput();

      if (event.type === "quit") {
        this.state = GameState.Quitting;
        break;
      }

      if (event.type === "toggleDebug") {
        this.debugVisible = !this.debugVisible;
        continue;
      }

      if (event.type === "pass") {
        endPlayerTurn(this.world);
      } else {
        handlePlayerInput(this.world, this.map, event, this.messages);
        this.visibleTiles = computePlayerFOW(this.world, this.map);
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
        this.turnCounter++;
        this.messages.setTurn(this.turnCounter);
        startPlayerTurn(this.world);
        this.visibleTiles = computePlayerFOW(this.world, this.map);
      }
    }

    if (this.state === GameState.Dead) {
      this.render();
      const size = this.renderer.getScreenSize();
      const layout = calculateLayout(size.width, size.height);
      this.renderer.drawText(
        layout.messageLog.x + 2,
        layout.messageLog.y + layout.messageLog.height - 2,
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
    const layout = calculateLayout(size.width, size.height);

    const viewport = this.calculateViewport(
      layout.gameGrid.width - 2,
      layout.gameGrid.height - 2,
    );
    renderGameGrid(
      this.renderer,
      this.world,
      this.map,
      layout.gameGrid,
      viewport,
      this.visibleTiles,
    );

    renderPlayerStats(this.renderer, this.world, layout.playerStats);
    renderTargetInfo(this.renderer, this.world, layout.targetInfo, null);
    renderEquipment(this.renderer, this.world, layout.equipment);

    if (this.debugVisible) {
      renderDebugPanel(
        this.renderer,
        this.world,
        layout.messageLog,
        this.messages.getMessagesWithTurns(),
      );
    } else {
      renderMessageLog(
        this.renderer,
        layout.messageLog,
        this.messages.getRecent(layout.messageLog.height - 2),
      );
    }

    this.renderer.flush();
  }
}
