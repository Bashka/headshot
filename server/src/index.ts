import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import express from "express";
import tileset from "./map/tileset.json" assert { type: "json" };
import tilemap from "./map/tilemap.json" assert { type: "json" };
import * as Tiled from "./tiled.js";
import { Room } from "./room.js";
import { Sprite, PersonAnimation } from "./model/types.js";
import { World, Weapon } from "./model/index.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
app.use(
  "/dist",
  express.static(path.resolve(dirname, "../../client/assets/dist"))
);
app.use(
  "/images",
  express.static(path.resolve(dirname, "../../client/assets/images"))
);
app.use(
  "/sounds",
  express.static(path.resolve(dirname, "../../client/assets/sounds"))
);
app.get("/", (_, res) =>
  res.sendFile(path.resolve(dirname, "../../client/assets/index.html"))
);

const map = new Tiled.Loader(tileset as any, tilemap as any);
const room = new Room(
  new World.World(
    {
      width: 1366,
      height: 768,
      fps: 60,
      me: "",
      resources: {
        ground: "/images/ground.png",
        shipTiny1: "/images/ship_tiny1.png",
        bullet: "/images/bullet.png",
        laser: "/sounds/laser.mp3",
      },
      sprites: {
        [Sprite.Bullet]: {
          resource: "bullet",
          animations: {
            [0]: {
              speed: 0,
              frames: [[0, 0, 16, 16]],
            },
          },
        },
        [Sprite.ShipTiny1]: {
          resource: "shipTiny1",
          animations: {
            [PersonAnimation.Stay]: {
              speed: 0,
              frames: [[0, 0, 28, 33]],
            },
            [PersonAnimation.Move]: {
              speed: 0,
              frames: [[28, 0, 28, 33]],
            },
          },
        },
      },
      weapons: {
        [Weapon.WeaponType.Non]: "non",
        [Weapon.WeaponType.Pistol]: "pistol",
        [Weapon.WeaponType.Shutgun]: "shutgun",
        [Weapon.WeaponType.Machinegun]: "machinegun",
      },
      map: {
        tileset: {
          tile: {
            width: map.tileset.tilewidth,
            height: map.tileset.tileheight,
          },
          image: {
            resource: "ground",
            width: map.tileset.imagewidth,
            height: map.tileset.imageheight,
          },
        },
        width: map.width,
        height: map.height,
        layers: map.tiles.map(({ data, properties }) => ({
          tiles: data,
          zIndex:
            properties?.find(
              (property): property is Tiled.Config.IntProperty =>
                property.name === "zIndex" && property.type === "int"
            )?.value ?? 0,
        })),
      },
    },
    map
  )
);
room.onConnection(({ channel }) => {
  if (!channel.id) return;
  console.log(`${channel.id} connected`);
  const { world } = room;
  const person = world.createPerson({ x: 40, y: 40 });
  world.linkPlayer(channel.id, person);
  world.options.me = person.id;
  channel.on("key", (data: any) => channel.id && world.key(channel.id, data));
  channel.on(
    "rotate",
    (data: any) => channel.id && world.rotate(channel.id, data)
  );

  world.createRandomPerson(200, 200, { owner: person.id });
  world.createRandomPerson(200, 200, { owner: person.id });
  world.createRandomPerson(200, 200, { owner: person.id });
  world.createRandomPerson(200, 200, { owner: person.id });
  world.createRandomPerson(200, 200, { owner: person.id });
  world.createRandomPerson(200, 200, { owner: person.id });
  world.createRandomPerson(200, 200, { owner: person.id });
  world.createRandomPerson(200, 200, { owner: person.id });
  world.createRandomPerson(200, 200, { owner: person.id });
  world.createRandomPerson(200, 200, { owner: person.id });
});
room.onDisconnect(({ channel }) => {
  if (!channel.id) return;
  console.log(`${channel.id} disconected`);
  const { world } = room;
  const playerPerson = world.getPlayerPerson(channel.id);
  world.unlinkPlayer(channel.id);
  if (!playerPerson) return;
  world.removePerson(playerPerson);

  world.state.persons.bodies.forEach((person) => {
    if (person.owner !== playerPerson.id) return;
    world.removePerson(person);
  });
});
room.server.addServer(server);
room.runner.play();

server.listen(8080, "localhost", () => console.log("listen: 8080"));
