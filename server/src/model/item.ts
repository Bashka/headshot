import Matter from "matter-js";
import { nanoid } from "nanoid";
import { signal } from "../signal.js";
import { Person } from "./person.js";
import { Pos } from "./types.js";

export class Item {
  public readonly id = nanoid(6);

  public readonly body: Matter.Body;

  public readonly onTake = signal<Person>();

  constructor({ x, y }: Pos) {
    this.body = Matter.Bodies.rectangle(x, y, 10, 10, { isSensor: true });
    this.body.meta = { id: this.id, type: "item" };
  }

  get state() {
    return {
      id: this.id,
      x: Math.floor(this.body.vertices[0].x),
      y: Math.floor(this.body.vertices[0].y),
    };
  }
}
