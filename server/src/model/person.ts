import Matter from "matter-js";
import { nanoid } from "nanoid";
import { Weapon } from "./weapon.js";
import { Pos } from "./types.js";

export enum PersonSprite {
  Man,
}

export enum PersonAnimation {
  Stay,
}

export class Person {
  static RADIUS = 10;

  public readonly id = nanoid(6);

  public readonly body: Matter.Body;

  public weapon: Weapon | null = null;

  constructor(
    { x, y }: Pos,
    angle: number,
    public speed: number,
    public hp: number,
    public sprite = PersonSprite.Man,
    public animation = PersonAnimation.Stay
  ) {
    this.body = Matter.Bodies.circle(x, y, Person.RADIUS, { angle });
    this.body.meta = { id: this.id, type: "person" };
  }

  get state() {
    return {
      id: this.id,
      x: Math.floor(this.body.position.x),
      y: Math.floor(this.body.position.y),
      angle: this.body.angle,
      hp: this.hp,
      sprite: this.sprite,
      animation: this.animation,
    };
  }
}
