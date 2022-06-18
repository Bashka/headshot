import * as PixiJS from "pixi.js";
import { BulletState } from "../model";
import { Hash } from "../../stage";
import { playAnimation } from "../../utils";

export interface Params {
  bullets: Hash<BulletState>;
  playAnimation: ReturnType<typeof playAnimation>;
}

export default function ({ bullets, playAnimation }: Params) {
  const container = new PixiJS.Container();
  const views = new Map<string, { view: PixiJS.Container; sprite: number }>();

  bullets.onAdd(({ id, x, y, angle, sprite }) => {
    const view = new PixiJS.Container();
    view.zIndex = 1;
    view.position.set(x, y);
    view.rotation = angle;
    view.addChild(playAnimation(sprite, 0));

    views.set(id, { view, sprite });
    container.addChild(view);
  });
  bullets.onDelete(({ id }) => {
    const view = views.get(id);
    views.delete(id);
    if (!view) return;
    container.removeChild(view.view);
  });
  bullets.onUpdate(({ id, x, y, sprite }) => {
    const view = views.get(id);
    if (!view) return;
    view.view.position.set(x, y);
    if (sprite !== view.sprite) {
      view.sprite = sprite;
      view.view.removeChildren();
      view.view.addChild(playAnimation(sprite, 0));
    }
  });

  return container;
}
