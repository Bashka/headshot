import geckos from "@geckos.io/client";
import Room from "./view/room";

const channel = geckos({ port: 8080 });
channel.onConnect(async (error) => {
  if (error) throw new Error("Connection failed");

  channel.on("init", ({ options }: any) => {
    Promise.resolve(new Room(options, channel).init()).then((room) =>
      room.start()
    );
  });
});
