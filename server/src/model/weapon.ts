import Matter from "matter-js";
import { nanoid } from "nanoid";
import { Person } from "./person.js";

export class Bullet {
  public readonly id = nanoid(6);

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
    };
  }
}

export abstract class Weapon {
  public energy = 1;

  public cooldown = 1;

  abstract fire(person: Person): Bullet[];
}

export class Pistol extends Weapon {
  public cooldown = 1;

  fire(person: Person) {
    const { x, y } = person.body.position;
    const pos = Matter.Vector.add(
      Matter.Vector.rotate(
        Matter.Vector.create(Person.RADIUS + 5, 0),
        person.body.angle
      ),
      Matter.Vector.create(x, y)
    );
    return [
      new Bullet(
        Matter.Bodies.circle(pos.x, pos.y, 3, {
          angle: person.body.angle,
          isSensor: true,
        }),
        400,
        1
      ),
    ];
  }
}

export class Shutgun extends Weapon {
  public cooldown = 0.75;

  fire(person: Person) {
    const { x, y } = person.body.position;
    const pos = Matter.Vector.add(
      Matter.Vector.rotate(
        Matter.Vector.create(Person.RADIUS + 5, 0),
        person.body.angle
      ),
      Matter.Vector.create(x, y)
    );
    return [
      new Bullet(
        Matter.Bodies.circle(pos.x, pos.y, 3, {
          angle: person.body.angle - 0.15,
          isSensor: true,
        }),
        400,
        0.75
      ),
      new Bullet(
        Matter.Bodies.circle(pos.x, pos.y, 3, {
          angle: person.body.angle,
          isSensor: true,
        }),
        400,
        0.75
      ),
      new Bullet(
        Matter.Bodies.circle(pos.x, pos.y, 3, {
          angle: person.body.angle + 0.15,
          isSensor: true,
        }),
        400,
        0.75
      ),
    ];
  }
}

export class Machine extends Weapon {
  public cooldown = 7.5;

  fire(person: Person) {
    const { x, y } = person.body.position;
    const pos = Matter.Vector.add(
      Matter.Vector.rotate(
        Matter.Vector.create(Person.RADIUS + 5, 0),
        person.body.angle
      ),
      Matter.Vector.create(x, y)
    );
    return [
      new Bullet(
        Matter.Bodies.circle(pos.x, pos.y, 3, {
          angle: person.body.angle,
          isSensor: true,
        }),
        600,
        2
      ),
    ];
  }
}
