import Matter from "matter-js";
import { nanoid } from "nanoid";
import { Pos, Sprite } from "./types.js";
import { Person } from "./person.js";
import { dice } from "../random.js";
import { Sound } from "./sound.js";

export class Bullet {
  public readonly id = nanoid(6);

  public readonly sprite = Sprite.Bullet;

  constructor(
    public readonly body: Matter.Body,
    public speed: number,
    public ttl = 10
  ) {
    this.body.meta = { id: this.id, type: "bullet" };
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

  public energy = 1;

  public cooldown = 1;

  public scatter = dice(-0.1, 0.1);

  public fireSound = new Sound("laser", 0.4, 0.1, 500);

  constructor(public bullets = 0) {}

  abstract createBullets(pos: Pos, angle: number): Bullet[];

  fire(person: Person): Bullet[] {
    if (this.energy < 1 || this.bullets <= 0) return [];
    this.energy = 0;
    this.bullets -= 1;
    this.fireSound.position = person.body.position;
    this.fireSound.play();
    return this.createBullets(
      Matter.Vector.add(
        Matter.Vector.rotate(
          Matter.Vector.create(Person.RADIUS + 5, 0),
          person.body.angle
        ),
        person.body.position
      ),
      person.body.angle
    );
  }

  get state() {
    return {
      id: this.id,
      bullets: this.bullets,
    };
  }

  update(d: number) {
    this.fireSound.update(d);
    this.energy = Math.min(1, this.energy + this.cooldown * d);
  }
}

export class Non extends Weapon {
  public cooldown = 0;

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
    if (person.weapon instanceof Pistol) {
      person.weapon.bullets += 10;
    } else {
      person.weapon = new Pistol(10);
    }
  };

  public cooldown = 1;

  public scatter = dice(-0.075, 0.075);

  createBullets(pos: Pos, angle: number) {
    return [
      new Bullet(
        Matter.Bodies.circle(pos.x, pos.y, 3, {
          angle: angle + this.scatter(),
          isSensor: true,
        }),
        600,
        1
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
    if (person.weapon instanceof Shutgun) {
      person.weapon.bullets += 5;
    } else {
      person.weapon = new Shutgun(5);
    }
  };

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
          600,
          1.4
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
    if (person.weapon instanceof Machinegun) {
      person.weapon.bullets += 20;
    } else {
      person.weapon = new Machinegun(20);
    }
  };

  public cooldown = 7.5;

  public scatter = dice(-0.075, 0.075);

  createBullets(pos: Pos, angle: number): Bullet[] {
    return [
      new Bullet(
        Matter.Bodies.circle(pos.x, pos.y, 3, {
          angle: angle + this.scatter(),
          isSensor: true,
        }),
        600,
        2
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
