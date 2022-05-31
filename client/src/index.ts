import geckos from "@geckos.io/client";
import Room from "./view";

const channel = geckos({ port: 8080 });
channel.onConnect(async (error) => {
  if (error) throw new Error("Connection failed");

  channel.on("init", ({ options }: any) => new Room(channel, options).init());
});
