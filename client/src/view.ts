import { ClientChannel } from "@geckos.io/client";
import * as PixiJS from "pixi.js";
import { Tap } from "@yandeu/tap";
import { signal } from "../../server/src/signal";
import serializer from "../../server/src/model/schema";
import { Render, Room, Stage } from "./render";
import { Sprite, keyboard } from "./utils";

export const personView = () =>
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
      const r = 10;
      const view = new PixiJS.Container();
      view.zIndex = 1;
      view.position.set(x, y);
      view.rotation = angle;

      const collision = new PixiJS.Graphics();
      collision.beginFill(0x0000ff);
      collision.drawCircle(0, 0, r);
      view.addChild(collision);

      const target = new PixiJS.Graphics();
      target.lineStyle(1, 0x00ff00, 1);
      target.moveTo(0, 0);
      target.lineTo(r * 2, 0);
      view.addChild(target);

      return { view, child: { collision, target }, sprite, animation, hp };
    },
    ({ x, y, angle, hp }, view) => {
      view.view.position.set(x, y);
      view.view.rotation = angle;
      if (hp !== view.hp) {
        view.hp = hp;
        view.child.collision.alpha = 0.8;
        setTimeout(() => (view.child.collision.alpha = 1), 100);
      }
    }
  );

export const bulletView = () =>
  new Render(
    ({ x, y }: { id: string; x: number; y: number }) => {
      const r = 3;
      const view = new PixiJS.Container();
      view.zIndex = 1;
      view.position.set(x, y);

      const collision = new PixiJS.Graphics();
      collision.beginFill(0xff0000);
      collision.drawCircle(0, 0, r);
      view.addChild(collision);

      return { view, child: { collision } };
    },
    ({ x, y }, { view }) => view.position.set(x, y)
  );

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
      sprites: { [n: number]: Sprite };
    }
  ) {
    this.pixi = new PixiJS.Application({
      width: options.width,
      height: options.height,
    });
  }

  init() {
    return Promise.resolve(this.create({}));
  }

  create(resources: PixiJS.utils.Dict<PixiJS.LoaderResource>) {
    document.getElementById("canvas")?.appendChild(this.pixi.view);
    this.pixi.view.style.display = "block";
    this.pixi.view.style.margin = "auto";
    this.pixi.stage.sortableChildren = true;
    const foreground = new PixiJS.Container();
    foreground.sortableChildren = true;
    foreground.zIndex = 1;
    this.pixi.stage.addChild(foreground);

    const stage = new Stage(
      {
        persons: {
          SIDeep: "x y",
          render: personView(),
        },
        bullets: {
          SIDeep: "x y",
          render: bulletView(),
        },
        walls: {
          render: wallView(),
        },
      },
      { channel: this.channel, serializer, fps: this.options.fps }
    );
    stage.onAdd(({ view }: any) => foreground.addChild(view));
    stage.onDelete(({ view }: any) => foreground.removeChild(view));

    keyboard({
      KeyW: "w",
      KeyS: "s",
      KeyA: "a",
      KeyD: "d",
    }).on((data) => this.channel.emit("key", data, { reliable: true }));

    const tap = new Tap(document.body);
    tap.on.move(({ position }) => {
      const me = stage.views.persons.render.views.get(this.options.me);
      if (!me) return;

      const target = {
        x: Math.max(0, position.x - this.pixi.view.offsetLeft),
        y: Math.max(0, position.y - this.pixi.view.offsetTop),
      };
      const { x, y } = me.view.position;
      this.channel.emit("rotate", Math.atan2(target.y - y, target.x - x));
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
