import Matter from "matter-js";
import { nanoid } from "nanoid";
import { types, Hash } from "../room.js";
import schema from "./schema.js";
import { Pos, PersonAnimation } from "./types.js";
import * as Weapon from "./weapon.js";
import { Person } from "./person.js";
import { Item } from "./item.js";
import * as Tiled from "../tiled.js";
import * as random from "../random.js";

declare global {
  namespace Matter {
    export interface Body {
      meta?: { id: string; type: "person" | "bullet" | "item" | "wall" };
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
  resources: Record<string, string>;
  sprites: {
    [k: number]: {
      resource: string;
      animations: {
        [k: number]: {
          speed?: number;
          frames: Array<[number, number, number, number]>;
        };
      };
    };
  };
  weapons: {
    [k: number]: string;
  };
  map: {
    tileset: {
      tile: {
        width: number;
        height: number;
      };
      image: {
        resource: string;
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

export class World implements types.World<Options> {
  public readonly state = {
    sounds: {
      state: () =>
        Array.from(this.state.persons.bodies.values()).map(
          ({ weapon: { fireSound } }) => fireSound.state
        ),
    },
    persons: new Hash<Person>(),
    weapons: {
      state: () =>
        Array.from(this.state.persons.bodies.values()).map(
          ({ id, weapon }) => ({ owner: id, ...weapon.state })
        ),
    },
    bullets: new Hash<Weapon.Bullet>(),
    items: new Hash<Item>(),
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

  constructor(public readonly options: Options, map: Tiled.Loader) {
    this.state.persons.onAdd(this.addBodies.bind(this));
    this.state.bullets.onAdd(this.addBodies.bind(this));
    this.state.items.onAdd(this.addBodies.bind(this));
    this.state.walls.onAdd(this.addBodies.bind(this));
    this.state.persons.onDelete(this.removeBodies.bind(this));
    this.state.bullets.onDelete(this.removeBodies.bind(this));
    this.state.items.onDelete(this.removeBodies.bind(this));
    this.state.walls.onDelete(this.removeBodies.bind(this));

    Matter.Events.on(this.physics, "collisionStart", ({ pairs }) =>
      pairs.forEach(({ bodyA, bodyB }) => {
        if (!bodyA.meta || !bodyB.meta) return;
        const person = this.state.persons.get(
          bodyA.meta.type === "person" ? bodyA.meta.id : bodyB.meta.id
        );
        const bullet = this.state.bullets.get(
          bodyA.meta.type === "bullet" ? bodyA.meta.id : bodyB.meta.id
        );
        if (!person || !bullet) return;

        this.state.bullets.delete(bullet);
        person.onDamage(1);
      })
    );
    Matter.Events.on(this.physics, "collisionStart", ({ pairs }) =>
      pairs.forEach(({ bodyA, bodyB }) => {
        if (!bodyA.meta || !bodyB.meta) return;
        const wall = this.state.walls.get(
          bodyA.meta.type === "wall" ? bodyA.meta.id : bodyB.meta.id
        );
        const bullet = this.state.bullets.get(
          bodyA.meta.type === "bullet" ? bodyA.meta.id : bodyB.meta.id
        );
        if (!bullet || !wall) return;

        this.state.bullets.delete(bullet);
      })
    );
    Matter.Events.on(this.physics, "collisionStart", ({ pairs }) =>
      pairs.forEach(({ bodyA, bodyB }) => {
        if (!bodyA.meta || !bodyB.meta) return;
        const person = this.state.persons.get(
          bodyA.meta.type === "person" ? bodyA.meta.id : bodyB.meta.id
        );
        const item = this.state.items.get(
          bodyA.meta.type === "item" ? bodyA.meta.id : bodyB.meta.id
        );
        if (!person || !item) return;

        this.state.items.delete(item);
        item.onTake(person);
        this.createRandomItem(800, 600);
      })
    );

    const wallsConfig = map.objects.find(({ name }) => name === "walls");
    if (wallsConfig) {
      this.createWalls(
        wallsConfig.objects.map(({ x, y, width, height }) => ({
          pos: { x: x + width / 2, y: y + height / 2 },
          width,
          height,
        }))
      );
    }
    const enemy = this.createRandomPerson(800, 600);
    enemy.weapon = new Weapon.Pistol(999);
    enemy.onAI(() => {
      if (enemy.weapon.energy === 1) {
        this.state.bullets.add(...enemy.weapon.fire(enemy));
      }
    });
    this.createRandomItem(800, 600);
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

  createWallsBox(width: number, height: number) {
    this.createWalls([
      // Top
      {
        pos: { x: width / 2, y: 0 },
        width: width + 40,
        height: 20,
      },
      // Left
      {
        pos: { x: 0, y: height / 2 },
        width: 20,
        height: height + 40,
      },
      // Down
      {
        pos: { x: width / 2, y: height },
        width: width + 40,
        height: 20,
      },
      // Right
      {
        pos: { x: width, y: height / 2 },
        width: 20,
        height: height + 40,
      },
    ]);
  }

  createWalls(walls: Array<{ pos: Pos; width: number; height: number }>) {
    this.state.walls.add(
      ...walls.map(({ pos, width, height }) => new Wall(pos, width, height))
    );
  }

  createRandomPerson(width: number, height: number) {
    return this.createPerson({
      x: 50 + Math.floor(Math.random() * (width - 100)),
      y: 50 + Math.floor(Math.random() * (height - 100)),
    });
  }

  createPerson(pos: Pos, angle = 0) {
    const person = new Person(pos, angle, 180, 5);
    person.onDie(() => {
      this.removePerson(person);
      this.createRandomPerson(800, 600);
    });
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

  createRandomItem(width: number, height: number) {
    const item = new Item({
      x: 100 + Math.floor(Math.random() * (width - 200)),
      y: 100 + Math.floor(Math.random() * (height - 200)),
    });
    item.onTake(
      Weapon.Machinegun.take
      //random.oneOf(
      //  Weapon.Machinegun.take,
      //  Weapon.Shutgun.take,
      //  Weapon.Pistol.take
      //)
    );
    this.state.items.add(item);
    return item;
  }

  key(channelId: string, data: { type: "up" | "down"; key: string }) {
    const keyboard = this.players.get(channelId)?.keyboard;
    if (!keyboard) return;
    data.type === "down" ? keyboard.add(data.key) : keyboard.delete(data.key);
  }

  rotate(channelId: string, target: Pos) {
    const person = this.getPlayerPerson(channelId);
    if (!person) return;
    person.target = target;
  }

  update(d: number) {
    this.players.forEach(({ person: id, keyboard }) => {
      const person = this.state.persons.get(id);
      if (!person) return;

      Matter.Body.setAngle(
        person.body,
        Math.atan2(person.target.y, person.target.x)
      );

      const force = Matter.Vector.create();
      if (keyboard.has("a")) {
        force.x -= 1;
      }
      if (keyboard.has("d")) {
        force.x += 1;
      }
      if (keyboard.has("w")) {
        force.y -= 1;
      }
      if (keyboard.has("s")) {
        force.y += 1;
      }
      if (force.x !== 0 || force.y !== 0) {
        person.animation = PersonAnimation.Move;
      } else {
        person.animation = PersonAnimation.Stay;
      }
      Matter.Body.setPosition(
        person.body,
        Matter.Vector.add(
          person.body.position,
          Matter.Vector.mult(Matter.Vector.normalise(force), person.speed * d)
        )
      );
      if (!(person.weapon instanceof Weapon.Non) && keyboard.has("tap")) {
        this.state.bullets.add(...person.weapon.fire(person));
      }
    });
    this.state.persons.bodies.forEach((person) => person.update(d));
    this.state.bullets.bodies.forEach((bullet) => {
      bullet.ttl -= d;
      if (bullet.ttl <= 0) return this.state.bullets.delete(bullet);

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
