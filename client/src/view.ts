import { ClientChannel } from "@geckos.io/client";
import * as PixiJS from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Tap } from "@yandeu/tap";
import { signal } from "../../server/src/signal";
import serializer from "../../server/src/model/schema";
import { Render, Room, Stage } from "./render";
import { Sprite, keyboard, playAnimation, playSound } from "./utils";

interface Context {
  playAnimation: ReturnType<typeof playAnimation>;
  playSound: ReturnType<typeof playSound>;
}

export const soundView = ({
  viewport,
  resources,
}: Context & {
  viewport: Viewport;
  resources: PixiJS.utils.Dict<PixiJS.LoaderResource>;
}) =>
  new Render(
    ({
      id,
      resource,
      volume,
    }: {
      id: string;
      resource: string;
      volume: number;
      range: number;
      x: number;
      y: number;
      isPlayed: boolean;
    }) => {
      const prototype = resources[resource.trimEnd()].data;
      if (!prototype) {
        throw new Error(`Audio "${resource}:${id}" not found`);
      }

      const audio = new Audio();
      const src = document.createElement("source");
      src.type = prototype.firstChild.type;
      src.src = prototype.firstChild.src;
      audio.appendChild(src);
      audio.volume = volume;

      return { audio };
    },
    ({ volume, range, x, y, isPlayed }, view) => {
      if (isPlayed) {
        if (view.audio.paused) {
          const distance = Math.sqrt(
            Math.pow(x - viewport.center.x, 2) +
              Math.pow(y - viewport.center.y, 2)
          );
          view.audio.volume = volume * (1 - Math.min(1, distance / range));
          view.audio.currentTime = 0;
          view.audio.play();
        }
      } else {
        if (!view.audio.paused) {
          view.audio.pause();
        }
      }
    }
  );

export const personView = ({ playAnimation }: Context) =>
  new Render(
    ({
      x,
      y,
      angle,
      sprite,
      animation,
      hp,
    }: {
      id: string;
      sprite: number;
      animation: number;
      x: number;
      y: number;
      angle: number;
      hp: number;
    }) => {
      const view = new PixiJS.Container();
      view.zIndex = 1;
      view.position.set(x, y);
      view.rotation = angle;
      const collision = playAnimation(sprite, animation);
      collision.angle = 90;
      view.addChild(collision);

      return {
        view,
        sprite,
        animation,
        hp,
      };
    },
    ({ x, y, angle, hp, sprite, animation }, view) => {
      view.view.position.set(x, y);
      view.view.rotation = angle;
      if (hp !== view.hp) {
        view.hp = hp;
        view.view.alpha = 0.5;
        setTimeout(() => (view.view.alpha = 1), 100);
      }
      if (sprite !== view.sprite || animation !== view.animation) {
        view.sprite = sprite;
        view.animation = animation;
        view.view.removeChildren();
        const collision = playAnimation(sprite, animation);
        collision.angle = 90;
        view.view.addChild(collision);
      }
    }
  );

export const weaponView = ({
  me,
  weapons,
  height,
}: Context & {
  me: string;
  weapons: { [n: number]: string };
  width: number;
  height: number;
}) =>
  new Render(
    ({
      owner,
      bullets,
      type,
    }: {
      id: string;
      owner: string;
      bullets: number;
      type: number;
    }) => {
      if (me !== owner) return {};
      const view = new PixiJS.Container();
      view.position.set(20, height - 40);

      const text = new PixiJS.Text(`${weapons[type]}: ${bullets}`, {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "right",
      });
      view.addChild(text);
      if (type === 0) text.visible = false;

      return { view, child: { text } };
    },
    ({ type, bullets }, view) => {
      if (!view.child) return;
      if (type === 0) view.child.text.visible = false;
      view.child.text.text = `${weapons[type]}: ${bullets}`;
    }
  );

export const bulletView = ({ playAnimation }: Context) =>
  new Render(
    ({
      x,
      y,
      angle,
      sprite,
    }: {
      id: string;
      x: number;
      y: number;
      angle: number;
      sprite: number;
    }) => {
      const view = new PixiJS.Container();
      view.zIndex = 1;
      view.position.set(x, y);
      view.rotation = angle;

      const collision = playAnimation(sprite, 0);
      view.addChild(collision);

      return { view, child: { collision }, sprite };
    },
    ({ x, y, sprite }, view) => {
      view.view.position.set(x, y);
      if (sprite !== view.sprite) {
        view.sprite = sprite;
        view.view.removeChildren();
        const collision = playAnimation(sprite, 0);
        view.view.addChild(collision);
      }
    }
  );

export const itemView = () =>
  new Render(({ x, y }: { id: string; x: number; y: number }) => {
    const view = new PixiJS.Container();
    view.zIndex = 1;
    view.position.set(x, y);

    const collision = new PixiJS.Graphics();
    collision.beginFill(0xff0000);
    collision.drawRect(0, 0, 10, 10);
    view.addChild(collision);

    return { view, child: { collision } };
  });

export const wallView = () =>
  new Render(
    ({
      x,
      y,
      width,
      height,
    }: {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }) => {
      const view = new PixiJS.Container();
      view.zIndex = 1;
      view.position.set(x, y);

      const collision = new PixiJS.Graphics();
      collision.beginFill(0x00ff00);
      collision.drawRect(0, 0, width, height);
      view.addChild(collision);

      return { view, child: { collision } };
    }
  );

export default class implements Room {
  public readonly pixi: PixiJS.Application;

  public readonly onCreated = signal<Stage<any> | Error>();

  constructor(
    public readonly channel: ClientChannel,
    public readonly options: {
      fps: number;
      width: number;
      height: number;
      me: string;
      map: any;
      resources: { [n: string]: string };
      sprites: { [n: number]: Sprite };
      weapons: { [n: number]: string };
    }
  ) {
    this.pixi = new PixiJS.Application({
      width: options.width,
      height: options.height,
    });
  }

  init() {
    return new Promise((resolve) =>
      this.pixi.loader
        .add(
          Array.from(Object.entries(this.options.resources)).map(
            ([name, url]) => ({
              name,
              url,
            })
          )
        )
        .load((_, resources) => resolve(this.create(resources)))
    );
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

  create(resources: PixiJS.utils.Dict<PixiJS.LoaderResource>) {
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
      interaction: this.pixi.renderer.plugins.interaction,
    });
    viewport.fit();
    this.pixi.stage.addChild(viewport);

    const tilesetImage =
      resources[this.options.map.tileset.image.resource].texture;
    if (tilesetImage) {
      viewport.addChild(...this.createBackground(tilesetImage));
    }

    const world = new PixiJS.Container();
    world.sortableChildren = true;
    world.zIndex = 1;
    viewport.addChild(world);

    const context: Context = {
      playAnimation: playAnimation(resources, this.options.sprites),
      playSound: playSound(resources),
    };
    const stage = new Stage(
      {
        sounds: {
          render: soundView({ ...context, viewport, resources }),
        },
        persons: {
          SIDeep: "x y angle(rad)",
          render: personView(context),
        },
        weapons: {
          render: weaponView({
            ...context,
            width: this.options.width,
            height: this.options.height,
            weapons: this.options.weapons,
            me: this.options.me,
          }),
        },
        bullets: {
          SIDeep: "x y",
          render: bulletView(context),
        },
        items: {
          render: itemView(),
        },
        walls: {
          render: wallView(),
        },
      },
      { channel: this.channel, serializer, fps: this.options.fps }
    );
    stage.views.persons.render.onAdd(
      ({ view }: any) => view && world.addChild(view)
    );
    stage.views.persons.render.onDelete(
      ({ view }: any) => view && world.removeChild(view)
    );
    stage.views.bullets.render.onAdd(
      ({ view }: any) => view && world.addChild(view)
    );
    stage.views.bullets.render.onDelete(
      ({ view }: any) => view && world.removeChild(view)
    );
    stage.views.walls.render.onAdd(
      ({ view }: any) => view && world.addChild(view)
    );
    stage.views.walls.render.onDelete(
      ({ view }: any) => view && world.removeChild(view)
    );
    stage.views.items.render.onAdd(
      ({ view }: any) => view && world.addChild(view)
    );
    stage.views.items.render.onDelete(
      ({ view }: any) => view && world.removeChild(view)
    );
    stage.views.weapons.render.onAdd(
      ({ view }: any) => view && foreground.addChild(view)
    );
    stage.views.weapons.render.onDelete(
      ({ view }: any) => view && foreground.removeChild(view)
    );
    stage.animator.onFrame(() => {
      const person = stage.views.persons.render.views.get(this.options.me);
      if (person) viewport.center = person.view.position;
    });

    keyboard({
      KeyW: "w",
      KeyS: "s",
      KeyA: "a",
      KeyD: "d",
    }).on((data) => this.channel.emit("key", data, { reliable: true }));

    const tap = new Tap(document.body);
    tap.on.move(({ position: { x, y } }) => {
      const person = stage.views.persons.render.views.get(this.options.me);
      if (!person) return;
      const { offsetLeft, offsetTop } = this.pixi.view;
      const position = person.view.position;
      this.channel.emit("rotate", {
        x: x - offsetLeft + viewport.left - position.x,
        y: y - offsetTop + viewport.top - position.y,
      });
    });
    tap.on.down(() =>
      this.channel.emit("key", { type: "down", key: "tap" }, { reliable: true })
    );
    tap.on.up(() =>
      this.channel.emit("key", { type: "up", key: "tap" }, { reliable: true })
    );

    this.onCreated(stage);
  }
}
