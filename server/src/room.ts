import type { Entity } from "@geckos.io/snapshot-interpolation/lib/types";
import { geckos, GeckosServer, ServerChannel } from "@geckos.io/server";
import { SnapshotInterpolation } from "@geckos.io/snapshot-interpolation";
import Schema from "@geckos.io/typed-array-buffer-schema";
import { Signal, signal } from "./signal.js";
import { Runner, ElasticRunner } from "./runner.js";

export namespace types {
  export type Thunk<T> = (() => T) | T;

  export interface Body<S extends Entity> {
    state: Thunk<S>;
  }

  export type StateOf<B> = B extends Body<infer S> ? S : never;

  export interface Bodies<B extends Body<any>> {
    onAdd: Signal<B[]>;
    onDelete: Signal<B[]>;
    state: StateOf<B>[];
  }

  export interface World<O> {
    options: Readonly<O>;
    state: Readonly<Record<string, Body<any>>>;
    schema: Readonly<Schema.Model>;
    update(delta: number): any;
  }
}

export class Hash<B extends types.Body<any>> implements types.Bodies<B> {
  public readonly bodies = new Map<string, B>();

  public readonly onAdd = signal<B[]>();

  public readonly onDelete = signal<B[]>();

  get size() {
    return this.bodies.size;
  }

  get(id: string) {
    return this.bodies.get(id);
  }

  add(...values: B[]) {
    const added = values.reduce<B[]>((result, value) => {
      if (this.bodies.has(value.state.id)) return result;
      this.bodies.set(value.state.id, value);
      return [...result, value];
    }, []);
    if (added.length > 0) this.onAdd(added);
    return added;
  }

  delete(...values: B[]) {
    const deleted = values.reduce<B[]>((result, value) => {
      if (!this.bodies.has(value.state.id)) return result;
      this.bodies.delete(value.state.id);
      return [...result, value];
    }, []);
    if (deleted.length > 0) this.onDelete(deleted);
    return deleted;
  }

  get state() {
    return Array.from(this.bodies.values()).map(({ state }) =>
      typeof state === "function" ? state() : state
    );
  }
}

export interface RoomOptions {
  server?: GeckosServer;
  runner?: Runner;
  SI?: SnapshotInterpolation;
}

export class Room<W extends types.World<{ fps: number }>> {
  public readonly server: GeckosServer;

  public readonly runner: Runner;

  public readonly SI: SnapshotInterpolation;

  public readonly onConnection = signal<{ channel: ServerChannel }>();

  public readonly onDisconnect = signal<{
    channel: ServerChannel;
    reason: "closed" | "disconnected" | "failed";
  }>();

  constructor(public readonly world: W, options: RoomOptions = {}) {
    this.server = options.server ?? geckos();
    this.runner = options.runner ?? new ElasticRunner(world.options.fps);
    this.SI = options.SI ?? new SnapshotInterpolation(world.options.fps);

    this.server.onConnection((channel) => {
      this.onConnection({ channel });
      channel.emit("init", { options: this.world.options }, { reliable: true });
      channel.onDisconnect((reason) => this.onDisconnect({ channel, reason }));
    });
    this.runner.onTick((d) => {
      this.world.update(d);
      this.emitSnap();
    });
  }

  emitSnap() {
    const state = Object.entries(this.world.state).reduce(
      (result, [name, { state }]) => ({
        ...result,
        [name]: typeof state === "function" ? state() : state,
      }),
      {}
    );
    const struct = this.world.schema.schema.struct as { state: object };
    const snap = this.SI.snapshot.create(
      Object.keys(struct.state).reduce(
        (res, name) => ({
          ...res,
          [name]: state[name as keyof typeof state],
        }),
        {}
      )
    );
    this.server.raw.emit(this.world.schema.toBuffer(snap));
    return this;
  }
}
