import * as PixiJS from "pixi.js";
import { WallState } from "../model";
import { Hash } from "../../stage";

export interface Params {
  walls: Hash<WallState>;
}

export default function ({ walls }: Params) {
  const container = new PixiJS.Container();
  const views = new Map<string, { view: PixiJS.Container }>();

  walls.onAdd(({ id, x, y, width, height }) => {
    const view = new PixiJS.Container();
    view.zIndex = 1;
    view.position.set(x, y);

    const collision = new PixiJS.Graphics();
    collision.beginFill(0x00ff00);
    collision.drawRect(0, 0, width, height);
    view.addChild(collision);

    views.set(id, { view });
    container.addChild(view);
  });
  walls.onDelete(({ id }) => {
    const view = views.get(id);
    views.delete(id);
    if (!view) return;
    container.removeChild(view.view);
  });

  return container;
}
