import * as PixiJS from "pixi.js";
import { PersonState } from "../model";
import { Hash } from "../../stage";
import { playAnimation } from "../../utils";

export interface Params {
  persons: Hash<PersonState>;
  playAnimation: ReturnType<typeof playAnimation>;
}

export default function ({ persons, playAnimation }: Params) {
  const container = new PixiJS.Container();
  const views = new Map<
    string,
    {
      view: PixiJS.Container;
      focus: PixiJS.Graphics;
      sprite: number;
      animation: number;
    }
  >();

  persons.onAdd(({ id, x, y, angle, sprite, animation }) => {
    const view = new PixiJS.Container();
    view.zIndex = 1;
    view.position.set(x, y);
    view.rotation = angle;

    const collision = playAnimation(sprite, animation);
    collision.angle = 90;
    view.addChildAt(collision, 0);

    const focus = new PixiJS.Graphics();
    focus.lineStyle({ color: 0x00ff00, width: 2 });
    focus.drawCircle(0, 0, 20);
    view.addChildAt(focus, 1);

    views.set(id, { view, focus, sprite, animation });
    container.addChild(view);
  });
  persons.onDelete(({ id }) => {
    const view = views.get(id);
    views.delete(id);
    if (!view) return;
    container.removeChild(view.view);
  });
  persons.onUpdate(({ id, x, y, angle, sprite, animation }) => {
    const view = views.get(id);
    if (!view) return;
    view.view.position.set(x, y);
    view.view.rotation = angle;
    if (sprite !== view.sprite || animation !== view.animation) {
      view.sprite = sprite;
      view.animation = animation;
      view.view.removeChildAt(0);
      const collision = playAnimation(sprite, animation);
      collision.angle = 90;
      view.view.addChildAt(collision, 0);
    }
  });

  return container;
}
