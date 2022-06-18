import * as PixiJS from "pixi.js";
import { ItemState } from "../model";
import { Hash } from "../../stage";

export interface Params {
  items: Hash<ItemState>;
}

export default function ({ items }: Params) {
  const container = new PixiJS.Container();
  const views = new Map<string, { view: PixiJS.Container }>();

  items.onAdd(({ id, x, y }) => {
    const view = new PixiJS.Container();
    view.zIndex = 1;
    view.position.set(x, y);

    const collision = new PixiJS.Graphics();
    collision.beginFill(0xff0000);
    collision.drawRect(0, 0, 10, 10);
    view.addChild(collision);

    views.set(id, { view });
    container.addChild(view);
  });
  items.onDelete(({ id }) => {
    const view = views.get(id);
    views.delete(id);
    if (!view) return;
    container.removeChild(view.view);
  });

  return container;
}
