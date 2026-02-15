import type { ComponentMap, ComponentType } from "./components.ts";

export type Entity = number;

export class World {
  private nextId = 1;
  private entities = new Set<Entity>();
  private components = new Map<
    ComponentType,
    Map<Entity, ComponentMap[ComponentType]>
  >();

  createEntity(): Entity {
    const id = this.nextId++;
    this.entities.add(id);
    return id;
  }

  destroyEntity(entity: Entity): void {
    this.entities.delete(entity);
    for (const store of this.components.values()) {
      store.delete(entity);
    }
  }

  addComponent<K extends ComponentType>(
    entity: Entity,
    type: K,
    data: ComponentMap[K],
  ): void {
    if (!this.entities.has(entity)) return;
    let store = this.components.get(type) as
      | Map<Entity, ComponentMap[K]>
      | undefined;
    if (!store) {
      store = new Map();
      this.components.set(
        type,
        store as Map<Entity, ComponentMap[ComponentType]>,
      );
    }
    store.set(entity, data);
  }

  getComponent<K extends ComponentType>(
    entity: Entity,
    type: K,
  ): ComponentMap[K] | undefined {
    const store = this.components.get(type) as
      | Map<Entity, ComponentMap[K]>
      | undefined;
    return store?.get(entity);
  }

  removeComponent(entity: Entity, type: ComponentType): void {
    this.components.get(type)?.delete(entity);
  }

  hasComponent(entity: Entity, type: ComponentType): boolean {
    return this.components.get(type)?.has(entity) ?? false;
  }

  query(...types: ComponentType[]): Entity[] {
    const results: Entity[] = [];
    for (const entity of this.entities) {
      if (types.every((t) => this.hasComponent(entity, t))) {
        results.push(entity);
      }
    }
    return results;
  }
}
