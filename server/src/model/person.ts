import Matter from "matter-js";
import { nanoid } from "nanoid";
import { signal } from "../signal.js";
import { Pos, Sprite, PersonAnimation } from "./types.js";
import * as Weapon from "./weapon.js";

export interface Options {
  angle?: number;
  speed?: number;
  hp?: number;
  ammo?: number;
  weapon?: Weapon.Weapon;
  owner?: string;
}

export class Person {
  static RADIUS = 10;

  public readonly id = nanoid(6);

  public readonly body: Matter.Body;

  public target: Pos;

  public speed: number;

  public hp: number;

  public ammo: number;

  public weapon: Weapon.Weapon;

  public sprite: Sprite = Sprite.ShipTiny1;

  public animation: PersonAnimation = PersonAnimation.Stay;

  public owner: string;

  public readonly onAI = signal<number>();

  public readonly onDamage = signal<number>((value) => {
    this.hp = Math.max(0, this.hp - value);
    if (this.hp === 0) this.onDie();
  });

  public readonly onDie = signal<void>();

  constructor(
    { x, y }: Pos,
    { angle, speed, hp, ammo, weapon, owner }: Options = {}
  ) {
    this.body = Matter.Bodies.circle(x, y, Person.RADIUS, {
      angle: angle ?? 0,
    });
    this.body.meta = { id: this.id, type: "person" };
    this.target = Matter.Vector.add(
      this.body.position,
      Matter.Vector.rotate(Matter.Vector.create(1, 0), this.body.angle)
    );
    this.speed = speed ?? 100;
    this.hp = hp ?? 100;
    this.ammo = ammo ?? 100;
    this.weapon = weapon ?? new Weapon.Non();
    this.owner = owner ?? " ".repeat(6);
  }

  get state() {
    return {
      id: this.id,
      x: Math.floor(this.body.position.x),
      y: Math.floor(this.body.position.y),
      angle: this.body.angle,
      sprite: this.sprite,
      animation: this.animation,
      hp: this.hp,
      ammo: this.ammo,
      weapon: this.weapon.type,
      owner: this.owner,
    };
  }

  fire() {
    if (this.weapon instanceof Weapon.Non) return [];
    if (this.weapon.energy < 1) return [];
    if (this.ammo < this.weapon.consumption) return [];
    this.ammo -= this.weapon.consumption;
    return this.weapon.fire(
      Matter.Vector.add(
        Matter.Vector.rotate(
          Matter.Vector.create(Person.RADIUS + 5, 0),
          this.body.angle
        ),
        this.body.position
      ),
      this.body.angle
    );
  }

  update(d: number) {
    this.onAI(d);
    this.weapon.update(d);
  }
}
