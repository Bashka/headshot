import { nanoid } from "nanoid";
import { Pos } from "./types.js";

export class Sound {
  public readonly id = nanoid(6);

  protected currentTime = 0;

  protected isPlayed = false;

  constructor(
    public readonly resource: string,
    public volume = 1,
    public duration = 1,
    public range = 100,
    public position: Pos = { x: 0, y: 0 }
  ) {}

  play() {
    this.isPlayed = true;
  }

  stop() {
    this.isPlayed = false;
    this.currentTime = 0;
  }

  get state() {
    return {
      id: this.id,
      resource: this.resource.padEnd(10),
      volume: this.volume,
      range: this.range,
      x: Math.floor(this.position.x),
      y: Math.floor(this.position.y),
      isPlayed: Number(this.isPlayed),
    };
  }

  update(d: number) {
    if (this.isPlayed) {
      this.currentTime = Math.min(this.duration, this.currentTime + d);
      if (this.currentTime >= this.duration) this.stop();
    }
  }
}
