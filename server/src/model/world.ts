import Matter from "matter-js";
import { nanoid } from "nanoid";
import { types, Hash } from "../room.js";
import schema from "./schema.js";
import { Pos } from "./types.js";
import { Bullet, Machine, Shutgun } from "./weapon.js";
import { Person, PersonAnimation } from "./person.js";

declare global {
  namespace Matter {
    export interface Body {
      meta?: { id: string; type: "person" | "bullet" | "wall" };
    }
  }
}

export class Wall {
  public readonly id = nanoid(6);

  public readonly body: Matter.Body;

  constructor(
    { x, y }: Pos,
    public readonly width: number,
    public readonly height: number
  ) {
    this.body = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: true,
    });
    this.body.meta = { id: this.id, type: "wall" };
  }

  get state() {
    return {
      id: this.id,
      x: Math.floor(this.body.vertices[0].x),
      y: Math.floor(this.body.vertices[0].y),
      width: this.width,
      height: this.height,
    };
  }
}

export interface Options {
  fps: number;
  width: number;
  height: number;
  me: string;
  sprites: {
    [k: number]: {
      url: string;
      animations: {
        [k: number]: {
          speed?: number;
          frames: Array<[number, number, number, number]>;
        };
      };
    };
  };
  map: {
    tileset: {
      tile: {
        width: number;
        height: number;
      };
      image: {
        url: string;
        width: number;
        height: number;
      };
    };
    width: number;
    height: number;
    layers: Array<{
      zIndex: number;
      tiles: number[];
    }>;
  };
}

export function collisionFilter<T>(
  filter: (pair: Matter.IPair) => T | null,
  callback: (matching: T) => any
) {
  return (e: Matter.IEventCollision<Matter.Engine>) =>
    e.pairs.forEach((pair) => {
      const matching = filter(pair);
      return matching !== null && callback(matching);
    });
}

export class World implements types.World<Options> {
  public readonly state = {
    persons: new Hash<Person>(),
    bullets: new Hash<Bullet>(),
    walls: new Hash<Wall>(),
  };

  public readonly schema = schema;

  public readonly physics = Matter.Engine.create({
    gravity: { x: 0, y: 0 },
  });

  public readonly players = new Map<
    string,
    {
      person: string;
      keyboard: Set<string>;
    }
  >();

  protected lastDelta = 0;

  constructor(public readonly options: Options) {
    this.state.persons.onAdd(this.addBodies.bind(this));
    this.state.bullets.onAdd(this.addBodies.bind(this));
    this.state.walls.onAdd(this.addBodies.bind(this));
    this.state.persons.onDelete(this.removeBodies.bind(this));
    this.state.bullets.onDelete(this.removeBodies.bind(this));
    this.state.walls.onDelete(this.removeBodies.bind(this));

    Matter.Events.on(this.physics, "collisionStart", ({ pairs }) =>
      pairs.forEach(({ bodyA, bodyB }) => {
        const [{ meta: metaA }, { meta: metaB }] = [bodyA, bodyB];
        if (!metaA || !metaB) return;
        if (metaA.type !== "person" || metaB.type !== "bullet") return;
        const person = this.state.persons.get(metaA.id);
        const bullet = this.state.bullets.get(metaB.id);
        if (!person || !bullet) return;

        person.hp -= 1;
        if (person.hp <= 0) {
          //this.removePerson(person);
        }
        this.removeBullet(bullet);
      })
    );
    Matter.Events.on(this.physics, "collisionStart", ({ pairs }) =>
      pairs.forEach(({ bodyA, bodyB }) => {
        const [{ meta: metaA }, { meta: metaB }] = [bodyA, bodyB];
        if (!metaA || !metaB) return;
        if (metaA.type !== "wall" || metaB.type !== "bullet") return;
        const wall = this.state.walls.get(metaA.id);
        const bullet = this.state.bullets.get(metaB.id);
        if (!bullet || !wall) return;

        this.removeBullet(bullet);
      })
    );

    this.createWalls([
      // Top
      {
        pos: { x: this.options.width / 2, y: 0 },
        width: this.options.width + 40,
        height: 20,
      },
      // Left
      {
        pos: { x: 0, y: this.options.height / 2 },
        width: 20,
        height: this.options.height + 40,
      },
      // Down
      {
        pos: { x: this.options.width / 2, y: this.options.height },
        width: this.options.width + 40,
        height: 20,
      },
      // Right
      {
        pos: { x: this.options.width, y: this.options.height / 2 },
        width: 20,
        height: this.options.height + 40,
      },
    ]);
    this.createPerson({ x: 200, y: 40 }, 0);
  }

  protected addBodies(entities: Array<{ body: Matter.Body }>) {
    entities.forEach(({ body }) =>
      Matter.Composite.add(this.physics.world, body)
    );
  }

  protected removeBodies(entities: Array<{ body: Matter.Body }>) {
    entities.forEach(({ body }) =>
      Matter.Composite.remove(this.physics.world, body)
    );
  }

  createWalls(walls: Array<{ pos: Pos; width: number; height: number }>) {
    this.state.walls.add(
      ...walls.map(({ pos, width, height }) => new Wall(pos, width, height))
    );
  }

  createPerson(pos: Pos, angle: number) {
    const person = new Person(pos, angle, 150, 5);
    person.weapon = new Shutgun();
    this.state.persons.add(person);
    return person;
  }

  removePerson(person: Person) {
    this.state.persons.delete(person);
  }

  linkPlayer(channelId: string, { id }: Person) {
    this.players.set(channelId, {
      person: id,
      keyboard: new Set(),
    });
    return this;
  }

  unlinkPlayer(channelId: string) {
    this.players.delete(channelId);
    return this;
  }

  getPlayerPerson(channelId: string) {
    const player = this.players.get(channelId);
    if (player) return this.state.persons.get(player.person);
    return null;
  }

  addBullet(bullets: Bullet[]) {
    this.state.bullets.add(...bullets);
  }

  removeBullet(bullet: Bullet) {
    this.state.bullets.delete(bullet);
  }

  key(channelId: string, data: { type: "up" | "down"; key: string }) {
    const keyboard = this.players.get(channelId)?.keyboard;
    if (!keyboard) return;
    data.type === "down" ? keyboard.add(data.key) : keyboard.delete(data.key);
  }

  rotate(channelId: string, angle: number) {
    const person = this.getPlayerPerson(channelId);
    if (person) Matter.Body.setAngle(person.body, angle);
  }

  update(d: number) {
    this.players.forEach(({ person: id, keyboard }) => {
      const person = this.state.persons.get(id);
      if (!person) return;

      const force = Matter.Vector.create();
      if (keyboard.has("a")) {
        force.x -= 1;
        person.animation = PersonAnimation.Stay;
      }
      if (keyboard.has("d")) {
        force.x += 1;
        person.animation = PersonAnimation.Stay;
      }
      if (keyboard.has("w")) {
        force.y -= 1;
        person.animation = PersonAnimation.Stay;
      }
      if (keyboard.has("s")) {
        force.y += 1;
        person.animation = PersonAnimation.Stay;
      }
      if (keyboard.size === 0) {
        person.animation = PersonAnimation.Stay;
      }
      Matter.Body.setPosition(
        person.body,
        Matter.Vector.add(
          person.body.position,
          Matter.Vector.mult(Matter.Vector.normalise(force), person.speed * d)
        )
      );
      const weapon = person.weapon;
      if (weapon) {
        if (keyboard.has("tap") && weapon.energy === 1) {
          this.addBullet(weapon.fire(person));
          weapon.energy = 0;
        }
        weapon.energy = Math.min(1, weapon.energy + weapon.cooldown * d);
      }
    });
    this.state.bullets.bodies.forEach((bullet) => {
      bullet.ttl -= d;
      if (bullet.ttl <= 0) return this.removeBullet(bullet);

      Matter.Body.setPosition(
        bullet.body,
        Matter.Vector.add(
          bullet.body.position,
          Matter.Vector.rotate(
            Matter.Vector.create(bullet.speed * d, 0),
            bullet.body.angle
          )
        )
      );
    });

    Matter.Engine.update(
      this.physics,
      d * 1000,
      this.lastDelta === 0 ? 1 : (d * 1000) / this.lastDelta
    );
    this.lastDelta = d * 1000;
  }
}
