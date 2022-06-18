import { ClientChannel } from "@geckos.io/client";
import { SnapshotInterpolation } from "@geckos.io/snapshot-interpolation";
import { Model as Serializer } from "@geckos.io/typed-array-buffer-schema";
import { Animator, RequestFrameAnimator } from "./animator";
import { signal } from "../../server/src/signal";

export interface State {
  id: string;
}

export class Hash<S extends State> {
  public readonly states = new Map<string, S>();
  public readonly onAdd = signal<S>();
  public readonly onDelete = signal<S>();
  public readonly onUpdate = signal<S>();

  update(states: S[]) {
    const ids = Array.from(this.states.keys());
    const existing = new Set<string>();
    const len = Math.max(states.length, ids.length);
    for (let i = 0; i < len; i++) {
      const newState = states[i];
      if (newState) {
        const state = this.states.get(newState.id);
        if (state) {
          // Update
          this.states.set(state.id, newState);
          this.onUpdate(newState);
        } else {
          // Add
          this.states.set(newState.id, newState);
          this.onAdd(newState);
        }
        existing.add(newState.id);
      }
      const id = ids[i];
      if (id && !existing.has(id)) {
        // Delete
        const deleted = this.states.get(id);
        this.states.delete(id);
        if (deleted) this.onDelete(deleted);
      }
    }
  }

  has(id: string) {
    return this.states.has(id);
  }

  get(id: string) {
    return this.states.get(id);
  }
}

export type Stage = Record<string, { deep?: string; hash: Hash<any> }>;

export interface RoomConfig {
  channel: ClientChannel;
  SI?: SnapshotInterpolation;
  serializer: Serializer;
  animator?: Animator;
}

export abstract class Room<O extends { fps: number }> {
  channel: ClientChannel;

  SI: SnapshotInterpolation;

  serializer: Serializer;

  animator: Animator;

  abstract stage: Stage;

  constructor(
    public readonly options: O,
    { channel, SI, serializer, animator }: RoomConfig
  ) {
    this.channel = channel;
    this.SI = SI ?? new SnapshotInterpolation(options.fps);
    this.serializer = serializer;
    this.animator = animator ?? new RequestFrameAnimator();
  }

  protected interpolate() {
    const state = this.SI.vault.get()?.state;
    if (!state) return;
    Object.keys(state).forEach((type) => {
      const hash = this.stage[type];
      if (!hash) return;
      const snap = this.SI.calcInterpolation(hash.deep ?? "", type);
      if (snap) hash.hash.update(snap.state);
    });
  }

  init(): Promise<this> | this {
    return this;
  }

  start() {
    this.channel.onRaw((buffer) => {
      if (!(buffer instanceof ArrayBuffer)) return;
      const snap = this.serializer.fromBuffer(buffer);
      const { state } = this.serializer.schema.struct as { state: object };
      Object.keys(state).forEach(
        (type) => snap.state[type] || (snap.state[type] = [])
      );
      this.SI.snapshot.add(snap);
    });
    this.animator.play().onFrame(() => this.interpolate());
  }
}
