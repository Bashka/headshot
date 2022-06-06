import Matter from "matter-js";
import { nanoid } from "nanoid";
import { signal } from "../signal.js";
import { Pos, Sprite, PersonAnimation } from "./types.js";
import * as Weapon from "./weapon.js";

export class Person {
  static RADIUS = 10;

  public readonly id = nanoid(6);

  public readonly body: Matter.Body;

  public target: Pos;

  public readonly onAI = signal<number>();

  public readonly onDamage = signal<number>((value) => {
    this.hp -= value;
    if (this.hp === 0) this.onDie();
  });

  public readonly onDie = signal<void>();

  constructor(
    { x, y }: Pos,
    angle: number,
    public speed: number,
    public hp: number,
    public sprite = Sprite.ShipTiny1,
    public animation = PersonAnimation.Stay,
    public weapon: Weapon.Weapon = new Weapon.Non()
  ) {
    this.body = Matter.Bodies.circle(x, y, Person.RADIUS, { angle });
    this.body.meta = { id: this.id, type: "person" };
    this.target = Matter.Vector.add(
      this.body.position,
      Matter.Vector.rotate(Matter.Vector.create(1, 0), angle)
    );
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

  update(d: number) {
    this.onAI(d);
    this.weapon.update(d);
  }
}
