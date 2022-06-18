import Matter from "matter-js";
import { nanoid } from "nanoid";
import { Pos, Sprite } from "./types.js";
import { Person } from "./person.js";
import { dice } from "../random.js";
import { Sound } from "./sound.js";

export interface BulletOptions {
  speed?: number;
  ttl?: number;
  damage?: number;
}

export class Bullet {
  public readonly id = nanoid(6);

  public readonly sprite = Sprite.Bullet;

  public speed;

  public damage;

  public ttl;

  constructor(
    public readonly body: Matter.Body,
    { speed, ttl, damage }: BulletOptions
  ) {
    this.body.meta = { id: this.id, type: "bullet" };
    this.speed = speed ?? 100;
    this.ttl = ttl ?? 100;
    this.damage = damage ?? 1;
  }

  get state() {
    return {
      id: this.id,
      x: Math.floor(this.body.position.x),
      y: Math.floor(this.body.position.y),
      angle: this.body.angle,
      sprite: this.sprite,
    };
  }
}

export enum WeaponType {
  Non,
  Pistol,
  Shutgun,
  Machinegun,
}

export abstract class Weapon {
  public readonly id = nanoid(6);

  public readonly type: WeaponType = WeaponType.Non;

  public energy = 1;

  public cooldown = 1;

  public consumption = 1;

  public scatter = dice(-0.1, 0.1);

  public fireSound: Sound | null = null;

  constructor() {}

  abstract createBullets(pos: Pos, angle: number): Bullet[];

  fire(pos: Pos, angle: number): Bullet[] {
    if (this.energy < 1) return [];
    this.energy = 0;
    if (this.fireSound) {
      this.fireSound.position = pos;
      this.fireSound.play();
    }
    return this.createBullets(pos, angle);
  }

  get state() {
    return {
      id: this.id,
    };
  }

  update(d: number) {
    this.fireSound?.update(d);
    this.energy = Math.min(1, this.energy + this.cooldown * d);
  }
}

export class Non extends Weapon {
  public cooldown = 0;

  public consumption = 0;

  createBullets() {
    return [];
  }

  get state() {
    return {
      ...super.state,
      type: WeaponType.Non,
    };
  }
}

export class Pistol extends Weapon {
  static take = (person: Person) => {
    if (!(person.weapon instanceof Pistol)) {
      person.weapon = new Pistol();
    }
  };

  public readonly type = WeaponType.Pistol;

  public fireSound = new Sound("laser", 0.4, 0.1, 500);

  public cooldown = 1;

  public scatter = dice(-0.075, 0.075);

  createBullets(pos: Pos, angle: number) {
    return [
      new Bullet(
        Matter.Bodies.circle(pos.x, pos.y, 3, {
          angle: angle + this.scatter(),
          isSensor: true,
        }),
        {
          speed: 600,
          damage: 1,
        }
      ),
    ];
  }

  get state() {
    return {
      ...super.state,
      type: WeaponType.Pistol,
    };
  }
}

export class Shutgun extends Weapon {
  static take = (person: Person) => {
    if (!(person.weapon instanceof Shutgun)) {
      person.weapon = new Shutgun();
    }
  };

  public readonly type = WeaponType.Shutgun;


  public fireSound = new Sound("laser", 0.4, 0.1, 500);

  public cooldown = 0.75;

  public scatter = dice(-0.2, 0.2);

  createBullets(pos: Pos, angle: number): Bullet[] {
    return Array.from(new Array(6).keys()).map(
      () =>
        new Bullet(
          Matter.Bodies.circle(pos.x, pos.y, 3, {
            angle: angle + this.scatter(),
            isSensor: true,
          }),
          {
            speed: 600,
            ttl: 1.4,
            damage: 2,
          }
        )
    );
  }

  get state() {
    return {
      ...super.state,
      type: WeaponType.Shutgun,
    };
  }
}

export class Machinegun extends Weapon {
  static take = (person: Person) => {
    if (!(person.weapon instanceof Machinegun)) {
      person.weapon = new Machinegun();
    }
  };

  public readonly type = WeaponType.Machinegun;

  public fireSound = new Sound("laser", 0.4, 0.1, 500);

  public cooldown = 7.5;

  public scatter = dice(-0.075, 0.075);

  createBullets(pos: Pos, angle: number): Bullet[] {
    return [
      new Bullet(
        Matter.Bodies.circle(pos.x, pos.y, 3, {
          angle: angle + this.scatter(),
          isSensor: true,
        }),
        {
          speed: 600,
          ttl: 2,
          damage: 1,
        }
      ),
    ];
  }

  get state() {
    return {
      ...super.state,
      type: WeaponType.Machinegun,
    };
  }
}
