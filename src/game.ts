import { World } from "./ecs/world.ts";
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
import { processBuffs } from "./ecs/systems/stats.ts";
import {
  startPlayerTurn,
  endPlayerTurn,
  isPlayerTurnOver,
  resetAITurns,
  resetIdleTurn,
} from "./ecs/systems/turn.ts";
import { processAI } from "./ecs/systems/ai.ts";
import { processHealth } from "./ecs/systems/health.ts";
import { MessageLog } from "./ecs/systems/messages.ts";
import { waitForInput, waitForRawInput } from "./input/input-handler.ts";
import {
  createInventoryScreenState,
  handleInventoryInput,
  handleInventoryKey,
  renderInventoryScreen,
  type InventoryScreenState,
} from "./ui/inventory-screen.ts";
import { computePlayerFOW } from "./ecs/systems/sensory.ts";
import { generateDungeon } from "./map/dungeon-generator.ts";
import { populateRooms, type PopulatorConfig } from "./map/room-populator.ts";

enum GameState {
  Running,
  Dead,
  Quit,
  Inventory,
}

export class Game {
  private state = GameState.Running;
  private world!: World;
  private map!: GameMap;
  private messages: MessageLog;
  private visibleTiles = new Set<string>();
  private debugVisible = false;
  private turnCounter = 0;
  private killCount = 0;
  private inventoryScreen: InventoryScreenState | null = null;

  constructor(
    private renderer: Renderer,
    private populatorConfig: PopulatorConfig,
  ) {
    this.messages = new MessageLog();
  }

  async run(): Promise<void> {
    while (true) {
      this.initNewRun();
      await this.playUntilDeath();
      if (this.state === GameState.Quit) break;
      const action = await this.showGameOver();
      if (action === "quit") break;
    }
  }

  private initNewRun(): void {
    this.world = new World();
    const { map, rooms, graph } = generateDungeon();
    this.map = map;
    this.messages = new MessageLog();
    this.state = GameState.Running;
    this.turnCounter = 1;
    this.killCount = 0;
    this.visibleTiles = new Set<string>();

    this.messages.add(
      `[spawn] Dungeon generated: ${rooms.length} rooms, ${map.width}x${map.height}`,
      "debug",
    );
    const tagSummary = rooms
      .map((r, i) => `${i}:${r.tag}(d${r.depth})`)
      .join(", ");
    this.messages.add(`[spawn] Room tags: ${tagSummary}`, "debug");
    this.messages.add(
      `[spawn] Critical path: ${graph.criticalPath.join(" → ")}`,
      "debug",
    );

    populateRooms(this.world, rooms, this.populatorConfig, this.messages);

    this.messages.setTurn(this.turnCounter);
    this.messages.add(`[turn] === Turn ${this.turnCounter} ===`, "debug");
    startPlayerTurn(this.world, this.messages);
    this.visibleTiles = computePlayerFOW(this.world, this.map, this.messages);
  }

  private getPlayerEntity(): number | undefined {
    const players = this.world.query("PlayerControlled", "Position");
    return players[0];
  }

  private openInventory(): void {
    const player = this.getPlayerEntity();
    if (!player) return;
    this.inventoryScreen = createInventoryScreenState(this.world, player);
    this.state = GameState.Inventory;
  }

  private closeInventory(): void {
    this.inventoryScreen = null;
    this.state = GameState.Running;
  }

  private async handleInventoryMode(): Promise<void> {
    const player = this.getPlayerEntity();
    if (!player || !this.inventoryScreen) {
      this.closeInventory();
      return;
    }

    const { event, raw } = await waitForRawInput();

    const action = handleInventoryInput(
      this.world,
      player,
      this.inventoryScreen,
      event,
      this.messages,
    );
    if (action === "close") {
      this.closeInventory();
      return;
    }

    if (raw.length === 1) {
      const keyAction = handleInventoryKey(
        this.world,
        player,
        this.inventoryScreen,
        raw[0]!,
        this.messages,
      );
      if (keyAction === "close") {
        this.closeInventory();
      }
    }
  }

  private async playUntilDeath(): Promise<void> {
    while (
      this.state === GameState.Running ||
      this.state === GameState.Inventory
    ) {
      this.render();

      if (this.state === GameState.Inventory) {
        await this.handleInventoryMode();
        continue;
      }

      const event = await waitForInput();

      if (event.type === "quit") {
        this.state = GameState.Quit;
        break;
      }

      if (event.type === "toggleDebug") {
        this.debugVisible = !this.debugVisible;
        continue;
      }

      if (event.type === "inventory") {
        this.openInventory();
        continue;
      }

      if (event.type === "pass") {
        endPlayerTurn(this.world, this.messages);
      } else {
        handlePlayerInput(this.world, this.map, event, this.messages);
        this.visibleTiles = computePlayerFOW(
          this.world,
          this.map,
          this.messages,
        );
        resetIdleTurn(this.world, this.messages);
      }

      const healthResult = processHealth(this.world, this.messages);
      this.killCount += healthResult.enemiesKilled;
      if (healthResult.playerDied) {
        this.state = GameState.Dead;
        break;
      }

      if (isPlayerTurnOver(this.world)) {
        resetAITurns(this.world, this.messages);
        processAI(this.world, this.map, this.messages);
        const aiHealthResult = processHealth(this.world, this.messages);
        this.killCount += aiHealthResult.enemiesKilled;
        if (aiHealthResult.playerDied) {
          this.state = GameState.Dead;
          break;
        }
        processBuffs(this.world);
        this.turnCounter++;
        this.messages.setTurn(this.turnCounter);
        this.messages.add(`[turn] === Turn ${this.turnCounter} ===`, "debug");
        startPlayerTurn(this.world, this.messages);
        this.visibleTiles = computePlayerFOW(
          this.world,
          this.map,
          this.messages,
        );
      }
    }
  }

  private async showGameOver(): Promise<"restart" | "quit"> {
    this.render();

    const size = this.renderer.getScreenSize();
    const layout = calculateLayout(size.width, size.height);
    const r = layout.messageLog;

    const boxW = Math.min(32, r.width - 2);
    const boxX = r.x + Math.floor((r.width - boxW) / 2);
    const boxY = r.y + 1;
    const boxH = 9;

    this.renderer.drawBox(boxX, boxY, boxW, boxH);

    const cx = boxX + 2;
    const innerW = boxW - 4;
    const title = "YOU HAVE DIED";
    const titlePad = Math.floor((innerW - title.length) / 2);

    this.renderer.drawText(cx + titlePad, boxY + 1, title, "red");

    const turnsLabel = `Turns survived: ${this.turnCounter}`;
    this.renderer.drawText(cx, boxY + 3, turnsLabel, "white");

    const killsLabel = `Enemies slain:  ${this.killCount}`;
    this.renderer.drawText(cx, boxY + 4, killsLabel, "white");

    this.renderer.drawText(cx, boxY + 6, "[Enter] Try Again", "green");
    this.renderer.drawText(cx, boxY + 7, "[Q]     Quit", "gray");

    this.renderer.flush();

    while (true) {
      const { raw } = await waitForRawInput();
      if (raw.length === 1 && (raw[0] === 0x1b || raw[0] === 0x71)) {
        return "quit";
      }
      if (raw.length === 1 && raw[0] === 0x0d) {
        return "restart";
      }
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
        this.messages.getAllMessagesWithTurns(),
      );
    } else {
      renderMessageLog(
        this.renderer,
        layout.messageLog,
        this.messages.getRecent(layout.messageLog.height - 2),
      );
    }

    if (this.state === GameState.Inventory && this.inventoryScreen) {
      const player = this.getPlayerEntity();
      if (player) {
        renderInventoryScreen(
          this.renderer,
          this.world,
          player,
          this.inventoryScreen,
          layout.gameGrid,
        );
      }
    }

    this.renderer.flush();
  }
}
