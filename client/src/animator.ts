import { signal, Signal } from "../../server/src/signal";

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