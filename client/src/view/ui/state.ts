import * as PixiJS from "pixi.js";
import { PersonState } from "../model";
import { Hash } from "../../stage";

export interface Params {
  persons: Hash<PersonState>;
  me: string;
  weapons: { [i: number]: string };
}

export default function ({ persons, me, weapons }: Params) {
  const container = new PixiJS.Container();
  const views: {
    hp?: PixiJS.Text;
    ammo?: PixiJS.Text;
    weapon?: PixiJS.Text;
  } = {};

  persons.onAdd(({ id, hp, ammo, weapon }) => {
    if (id !== me) return;

    views.weapon = new PixiJS.Text(`${weapons[weapon]}`, {
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
      align: "right",
    });
    views.weapon.position.set(5, 5);
    views.weapon.visible = Boolean(weapon);
    views.hp = new PixiJS.Text(`hp: ${hp}`, {
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
      align: "right",
    });
    views.hp.position.set(5, 25);
    views.ammo = new PixiJS.Text(`ammo: ${ammo}`, {
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
      align: "right",
    });
    views.ammo.position.set(5, 45);

    container.addChild(views.weapon, views.hp, views.ammo);
  });
  persons.onUpdate(({ id, hp, ammo, weapon }) => {
    if (id !== me) return;

    views.weapon && (views.weapon.text = `${weapons[weapon]}`);
    views.weapon && (views.weapon.visible = Boolean(weapon));
    views.hp && (views.hp.text = `hp: ${hp}`);
    views.ammo && (views.ammo.text = `ammo: ${ammo}`);
  });

  return container;
}
