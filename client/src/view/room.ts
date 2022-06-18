import { ClientChannel } from "@geckos.io/client";
import * as PixiJS from "pixi.js";
import serializer from "../../../server/src/model/schema";
import { Viewport } from "pixi-viewport";
import { Tap } from "@yandeu/tap";
import { Room, Hash } from "../stage";
import { keyboard, playAnimation, playSound } from "../utils";
import {
  Options,
  SoundState,
  PersonState,
  ItemState,
  BulletState,
  WallState,
} from "./model";
import * as UIView from "./ui";
import * as WorldView from "./world";

export default class extends Room<Options> {
  stage = {
    sounds: {
      hash: new Hash<SoundState>(),
    },
    persons: {
      deep: "x y angle(rad)",
      hash: new Hash<PersonState>(),
    },
    items: {
      hash: new Hash<ItemState>(),
    },
    bullets: {
      deep: "x y",
      hash: new Hash<BulletState>(),
    },
    walls: {
      hash: new Hash<WallState>(),
    },
  };

  public readonly pixi: PixiJS.Application;

  constructor(options: Options, channel: ClientChannel) {
    super(options, {
      channel,
      serializer,
    });
    this.pixi = new PixiJS.Application({
      width: options.width,
      height: options.height,
    });
  }

  protected createBackground({ baseTexture }: PixiJS.Texture) {
    const {
      map: {
        width: mapW,
        layers,
        tileset: {
          tile: { width: tileW, height: tileH },
          image: { width: imageW },
        },
      },
    } = this.options;
    return layers.map(
      ({ zIndex, tiles }: { zIndex: number; tiles: number[] }) => {
        const layerContainer = new PixiJS.Container();
        layerContainer.zIndex = zIndex;
        return tiles.reduce((c, tileId, i) => {
          if (tileId === 0) return c;

          const pos = tileId - 1;
          const tileX = pos * tileW;
          const tileSprite = new PixiJS.Sprite(
            new PixiJS.Texture(
              baseTexture,
              new PixiJS.Rectangle(
                tileX % imageW,
                Math.floor(tileX / imageW) * tileH,
                tileW,
                tileH
              )
            )
          );
          const mapRealW = mapW * tileW;
          const spriteX = i * tileW;
          tileSprite.position.set(
            spriteX % mapRealW,
            Math.floor(spriteX / mapRealW) * tileH
          );
          c.addChild(tileSprite);

          return c;
        }, layerContainer);
      }
    );
  }

  init() {
    return new Promise<this>((resolve) =>
      this.pixi.loader
        .add(
          Array.from(Object.entries(this.options.resources)).map(
            ([name, url]) => ({
              name,
              url,
            })
          )
        )
        .load((_, resources) => {
          document.getElementById("canvas")?.appendChild(this.pixi.view);
          this.pixi.view.style.display = "block";
          this.pixi.view.style.margin = "auto";
          this.pixi.stage.sortableChildren = true;

          const foreground = new PixiJS.Container();
          foreground.sortableChildren = true;
          foreground.zIndex = 10;
          this.pixi.stage.addChild(foreground);

          const viewport = new Viewport({
            screenWidth: this.options.width,
            screenHeight: this.options.height,
            worldWidth: this.options.width,
            worldHeight: this.options.height,
          });
          this.pixi.stage.addChild(viewport.fit());

          const tilesetImage =
            resources[this.options.map.tileset.image.resource].texture;
          if (tilesetImage) {
            viewport.addChild(...this.createBackground(tilesetImage));
          }

          const world = new PixiJS.Container();
          world.sortableChildren = true;
          world.zIndex = 1;
          viewport.addChild(world);

          const utils = {
            playAnimation: playAnimation(resources, this.options.sprites),
            playSound: playSound(resources),
          };
          const keys = keyboard({
            KeyW: "w",
            KeyS: "s",
            KeyA: "a",
            KeyD: "d",
          });
          keys.on((data) => this.channel.emit("key", data, { reliable: true }));
          const tap = new Tap(document.body);
          tap.on.move(({ position: { x, y } }) => {
            const person = this.stage.persons.hash.get(this.options.me);
            if (!person) return;
            const { offsetLeft, offsetTop } = this.pixi.view;
            const position = { x: person.x, y: person.y };
            this.channel.emit("rotate", {
              x: x - offsetLeft + viewport.left - position.x,
              y: y - offsetTop + viewport.top - position.y,
            });
          });
          tap.on.down(() =>
            this.channel.emit(
              "key",
              { type: "down", key: "tap" },
              { reliable: true }
            )
          );
          tap.on.up(() =>
            this.channel.emit(
              "key",
              { type: "up", key: "tap" },
              { reliable: true }
            )
          );

          const menu = UIView.MenuView({
            persons: this.stage.persons.hash,
            me: this.options.me,
            keyboard: keys.keyboard,
          });
          menu.position.set(5, 5);
          foreground.addChild(menu);
          menu.onPersonFocus((person) => {
          })
          menu.onPersonBlur((person) => {
          })
          const state = UIView.StateView({
            persons: this.stage.persons.hash,
            me: this.options.me,
            weapons: this.options.weapons,
          });
          state.position.set(
            this.options.width - 150,
            this.options.height - 70
          );
          foreground.addChild(state);

          WorldView.SoundView({
            sounds: this.stage.sounds.hash,
            resources,
            center: () => viewport.center,
          });
          world.addChild(
            WorldView.PersonView({
              persons: this.stage.persons.hash,
              playAnimation: utils.playAnimation,
            })
          );
          world.addChild(
            WorldView.ItemView({
              items: this.stage.items.hash,
            })
          );
          world.addChild(
            WorldView.BulletView({
              bullets: this.stage.bullets.hash,
              playAnimation: utils.playAnimation,
            })
          );
          world.addChild(
            WorldView.WallView({
              walls: this.stage.walls.hash,
            })
          );
          this.stage.persons.hash.onUpdate(
            ({ id, x, y }) =>
              id === this.options.me && viewport.moveCenter(x, y)
          );

          resolve(this);
        })
    );
  }
}
