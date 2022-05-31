import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import express from "express";
import tileset from "./map/tileset.json" assert { type: "json" };
import tilemap from "./map/tilemap.json" assert { type: "json" };
import * as Tiled from "./tiled.js";
import { Room } from "./room.js";
import { World, Person } from "./model/index.js";

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
app.get("/", (_, res) =>
  res.sendFile(path.resolve(dirname, "../../client/assets/index.html"))
);

const map = new Tiled.Loader(tileset as any, tilemap as any);
const room = new Room(
  new World.World({
    width: 800,
    height: 600,
    fps: 60,
    me: "",
    sprites: {
      [Person.PersonSprite.Man]: {
        url: "/images/man.png",
        animations: {
          [Person.PersonAnimation.Stay]: {
            speed: 0,
            frames: [[32, 64, 32, 32]],
          },
        },
      },
    },
    map: {
      tileset: {
        tile: {
          width: map.tileset.tilewidth,
          height: map.tileset.tileheight,
        },
        image: {
          url: "/images/tileset.png",
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
  })
);
room.onConnection(({ channel }) => {
  if (!channel.id) return;
  console.log(`${channel.id} connected`);
  const { world } = room;
  const person = world.createPerson({ x: 40, y: 40 }, 0);
  world.linkPlayer(channel.id, person);
  world.options.me = person.id;
  channel.on("key", (data: any) => channel.id && world.key(channel.id, data));
  channel.on(
    "rotate",
    (data: any) => channel.id && world.rotate(channel.id, data)
  );
});
room.onDisconnect(({ channel }) => {
  if (!channel.id) return;
  console.log(`${channel.id} disconected`);
  const { world } = room;
  const playerPerson = world.getPlayerPerson(channel.id);
  world.unlinkPlayer(channel.id);
  if (playerPerson) world.removePerson(playerPerson);
});
room.server.addServer(server);
room.runner.play();

server.listen(8080, "localhost", () => console.log("listen: 8080"));
