import * as PixiJS from "pixi.js";
import { SoundState } from "../model";
import { Hash } from "../../stage";

export interface Params {
  sounds: Hash<SoundState>;
  resources: PixiJS.utils.Dict<PixiJS.LoaderResource>;
  center: () => { x: number; y: number };
}

export default function ({ sounds, resources, center }: Params) {
  const views = new Map<string, { audio: HTMLAudioElement }>();
  sounds.onAdd(({ id, resource, volume }) => {
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

    views.set(id, { audio });
  });
  sounds.onUpdate(({ id, volume, range, x, y, isPlayed }) => {
    const view = views.get(id);
    if (!view) return;
    if (isPlayed) {
      if (view.audio.paused) {
        const { x: cx, y: cy } = center();
        const distance = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
        view.audio.volume = volume * (1 - Math.min(1, distance / range));
        view.audio.currentTime = 0;
        view.audio.play();
      }
    } else {
      if (!view.audio.paused) {
        view.audio.pause();
      }
    }
  });
  sounds.onDelete(({ id }) => views.delete(id));
}
