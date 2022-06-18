import { ClientChannel } from "@geckos.io/client";
import { SnapshotInterpolation } from "@geckos.io/snapshot-interpolation";
import { Model as Serializer } from "@geckos.io/typed-array-buffer-schema";
import { signal, Signal } from "../../../server/src/signal";

export interface Animator {
  onFrame: Signal<void>;
  play(): this;
  stop(): this;
}

export class RequestFrameAnimator implements Animator {
  protected _isStoped = true;

  public readonly onFrame = signal<void>();

  protected animate() {
    if (this._isStoped) return;
    requestAnimationFrame(this.animate.bind(this));
    this.onFrame();
  }

  play() {
    if (!this._isStoped) return this;
    this._isStoped = false;
    this.animate();
    return this;
  }

  stop() {
    if (this._isStoped) return this;
    this._isStoped = true;
    return this;
  }
}

export interface State {
  id: string;
}

export class Render<S extends State, V> {
  public readonly views = new Map<string, V>();
  public readonly onAdd = signal<V>();
  public readonly onDelete = signal<V>();

  constructor(
    public readonly construct: (state: S) => V,
    public readonly render: (state: S, view: V) => any = () => {}
  ) {}

  update(states: S[]) {
    const viewsIds = Array.from(this.views.keys());
    const existing = new Set<string>();
    const len = Math.max(states.length, viewsIds.length);
    for (let i = 0; i < len; i++) {
      const state = states[i];
      const id = viewsIds[i];
      if (state) {
        const view = this.views.get(state.id);
        if (view) {
          // Update
          this.render(state, view);
        } else {
          // Add
          const view = this.construct(state);
          this.views.set(state.id, view);
          this.onAdd(view);
        }
        existing.add(state.id);
      }
      if (id && !existing.has(id)) {
        // Delete
        const deleted = this.views.get(id);
        this.views.delete(id);
        if (deleted) this.onDelete(deleted);
      }
    }
  }
}

export interface View<S extends State, V = any> {
  render: Render<S, V>;
  SIDeep?: string;
}

export interface StageOptions {
  channel: ClientChannel;
  SI?: SnapshotInterpolation;
  serializer: Serializer;
  fps?: number;
  animator?: Animator;
}

export class Stage<K extends string> {
  public readonly channel: ClientChannel;

  public readonly SI: SnapshotInterpolation;

  public readonly serializer: Serializer;

  public readonly animator: Animator;

  constructor(
    public readonly views: Record<K, View<any, any>>,
    options: StageOptions
  ) {
    this.channel = options.channel;
    this.serializer = options.serializer;
    this.SI = options.SI ?? new SnapshotInterpolation(options.fps ?? 60);
    this.animator = options.animator ?? new RequestFrameAnimator();

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

  hasView(key: any): key is K {
    return (
      typeof key === "string" &&
      Object.prototype.hasOwnProperty.call(this.views, key)
    );
  }

  view(key: string) {
    return this.hasView(key) ? this.views[key] : undefined;
  }

  interpolate() {
    const state = this.SI.vault.get()?.state;
    if (!state) return this;
    Object.keys(state).forEach((type) => {
      const view = this.view(type);
      if (!view) return;
      const snap = this.SI.calcInterpolation(view.SIDeep ?? "", type);
      if (snap) view.render.update(snap.state);
    });
    return this;
  }
}

export interface Room {
  onCreated: Signal<Stage<any> | Error>;
  init(): Promise<any>;
}
