import type { World } from "./ecs/world.ts";
import type { GameMap } from "./map/game-map.ts";
import type { Renderer } from "./renderer/renderer.ts";
import { renderGameGrid } from "./renderer/panels/game-grid.ts";
import { handlePlayerInput } from "./ecs/systems/input.ts";
import { waitForInput } from "./input/input-handler.ts";

export enum GameState {
  Gameplay,
  Quitting,
}

export class Game {
  state = GameState.Gameplay;

  constructor(
    private world: World,
    private map: GameMap,
    private renderer: Renderer,
  ) {}

  async run(): Promise<void> {
    while (this.state !== GameState.Quitting) {
      this.render();
      const event = await waitForInput();
      if (event.type === "quit") {
        this.state = GameState.Quitting;
      } else {
        handlePlayerInput(this.world, this.map, event);
      }
    }
  }

  private render(): void {
    this.renderer.clear();
    const size = this.renderer.getScreenSize();
    const gridW = Math.min(this.map.width + 2, size.width);
    const gridH = Math.min(this.map.height + 2, size.height - 1);
    renderGameGrid(
      this.renderer,
      this.world,
      this.map,
      {
        x: 0,
        y: 0,
        width: gridW,
        height: gridH,
      },
      { x: 0, y: 0 },
    );
    this.renderer.drawText(0, gridH, "Arrow keys to move, Q to quit", "gray");
    this.renderer.flush();
  }
}
